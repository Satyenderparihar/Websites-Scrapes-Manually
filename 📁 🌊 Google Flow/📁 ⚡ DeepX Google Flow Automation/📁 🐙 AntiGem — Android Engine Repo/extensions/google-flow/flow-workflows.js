// Flow workflows adapted from the Chrome flow_mcp bridge. All page work uses the shared WebView APIs.
import { analyzeAndBreakdownScript, setLocalAssetIndex } from './storyboard-analyzer.js';
import { IMAGE_MODELS, VIDEO_MODELS } from './flow-client.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const handleOf=value=>String(value||'').replace(/^[@#]/,'').trim().toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu,'_');
const safeName=value=>String(value||'output').replace(/[\\/:*?"<>|]/g,'_').replace(/^\.+/,'').slice(0,120)||'output';
export function createFlowWorkflows({chrome,client,execute,jobs,enqueue,normalize,awaitJobs,snapshot}) {
  let registryPromise;
  const registry=()=>registryPromise ||= chrome.storage.local.get({characters:{}}).then(r=>r.characters);
  const remember=async entry=>{const data=await registry();data[entry.project_id+':'+entry.handle]=entry;await chrome.storage.local.set({characters:data});return entry;};
  client.referenceResolver=async value=>{
    if(typeof value!=='string')throw new Error('Reference must be a media ID, handle or local path');
    const data=Object.values(await registry()).filter(c=>c.handle===handleOf(value));
    if(data.length===1)return data[0].media_id||value;
    if(data.length>1){const project=client.currentProjectId;const exact=data.find(c=>c.project_id===project);if(exact)return exact.media_id||value;throw new Error('Reference handle exists in several projects; pass its media ID: '+value);}
    return value;
  };
  function workflow(kind,args,run) {
    const job={job_id:crypto.randomUUID().slice(0,8),type:'workflow',kind,status:'queued',stage:'queued',request:args,abort:new AbortController(),files:[],media_ids:[],child_job_ids:[],credits_used:0};
    jobs.set(job.job_id,job);
    job.completion=Promise.resolve().then(async()=>{job.abort.signal.throwIfAborted();job.status='running';const tab=await client.tab();await client.begin(tab);try{await run(job);job.abort.signal.throwIfAborted();job.status='done';job.stage=args.dry_run?'dry run complete':'done';}finally{await client.end(tab);}}).catch(e=>{if(job.status!=='cancelled'){job.status='failed';job.stage='failed';job.error=e.message;}});
    return awaitJobs([job],args.wait_seconds??(args.wait_for_completion?45:0));
  }
  async function settle(child,parent) {
    parent.child_job_ids.push(child.job_id);
    const abort=()=>{child.abort.abort();child.status='cancelled';child.stage='cancelled';};
    parent.abort.signal.addEventListener('abort',abort,{once:true});
    try{parent.abort.signal.throwIfAborted();await child.completion;parent.abort.signal.throwIfAborted();parent.credits_used+=(child.credits_used||0);if(child.status!=='done')throw new Error(child.error||'Generation was cancelled');parent.project_id=child.project_id;return child;}finally{parent.abort.signal.removeEventListener('abort',abort);}
  }
  async function downloadFiles(files,args,index) {
    if(!args.download_folder&&!args.filename&&!args.tag_filenames)return files;
    const folder=String(args.download_folder||'flow-media').replace(/^~\//,'').replace(/^\/+|\/+$/g,'');
    if(folder.split('/').includes('..'))throw new Error('Download folder cannot contain ..');
    const output=[];
    for(let n=0;n<files.length;n++){
      const file=files[n],ext=file.type==='video'?'mp4':'jpg';
      const name=args.filename&&files.length===1?args.filename:`${String(index+1).padStart(3,'0')}_${args.tag_filenames?safeName(args.prompt?.match(/#([\w-]+)/)?.[1]||'scene'):file.media_id}${files.length>1?'_'+(n+1):''}.${ext}`;
      const saved=await chrome.antigem.copyFile({from:file.path,to:`~/${folder}/${safeName(name)}`});output.push({...file,path:saved.path});
    }
    return output;
  }
  const imageModel=value=>{
    const model=String(value||'Nano Banana 2.1').replace(/^🍌\s*/,'');
    if(['imagen-3','NARWHAL'].includes(model))return 'Nano Banana 2.1';
    if(!IMAGE_MODELS.includes(model))throw new Error('Unsupported image model: '+model);return model;
  };
  const videoModel=value=>({ 'veo-omni':'Omni 1.1 Flash','veo-quality':'Veo 3.1 - Quality','veo-lite':'Veo 3.1 - Lite','veo-fast':'Veo 3.1 - Fast' }[value]||value||'Omni 1.1 Flash');
  function generation(args,video) {
    const model=video?videoModel(args.model):imageModel(args.model);
    const duration=args.duration??(model.includes('Omni')?4:8);
    if(args.seed!=null)throw new Error('seed cannot be selected by the current Flow website UI');
    const references=args.no_references?[]:(args.references||args.reference_media_ids||args.reference_assets||args.hero_references||[]);
    return {...args,prompt:args.prompt||args.action_prompt,model,duration,count:args.count??args.output_count??1,aspect_ratio:args.aspect_ratio||'16:9',references,start_frame:args.start_frame||args.start_image_id,end_frame:args.end_frame||args.end_image_id};
  }
  async function childGeneration(args,video,parent,budget) {
    if(budget&&(!Number.isFinite(budget.limit)||budget.limit<0))throw new Error('max_credits must be non-negative');
    const request=generation(args,video);const child=enqueue(normalize({...request,budget},video));
    try{return await settle(child,parent);}catch(error){error.flow_job_id=child.job_id;throw error;}
  }
  async function registerCharacter(name,id,projectId,extra={}) {
    const handle=handleOf(name);if(!handle)throw new Error('character_name is required');
    if(id)await execute('flow_rename_media',{media_id:id,title:handle});
    client.libraryCache.delete(projectId);
    return remember({handle,name:handle,media_id:id,project_id:projectId,mentionSyntax:'@'+handle,...extra});
  }
  async function characters(args={}) {
    const tabId=await client.tab();const project=args.project_id||(await client.js(tabId,'s.ui()')).projectId;
    const stored=Object.values(await registry()).filter(c=>!project||c.project_id===project);
    const native=await client.evaluate(tabId,()=>Array.from(document.querySelectorAll('flow-character-tile,[data-character-name],.character-tile')).map(el=>{
      const img=el.querySelector('img'),src=img?.currentSrc||img?.src||'';
      return {name:(el.getAttribute('data-character-name')||el.getAttribute('aria-label')||el.innerText||'').split('\n')[0].replace(/accessibility_new|favorite|more_vert|delete/gi,'').trim(),media_id:/\/image\/([^?/#]+)/.exec(src)?.[1]||null,type:'native_character'};
    }).filter(c=>c.name));
    return [...stored,...native.filter(n=>!stored.some(s=>s.handle===handleOf(n.name)))];
  }
  async function studio(args,parent) {
    return client.exclusive(async()=>{
      const tabId=await client.tab();await client.begin(tabId);
      let project;
      try{
        if(args.max_credits!=null&&!args.dry_run)throw new Error('Native Character Studio cannot enforce max_credits; use native_studio=false');
        project=await client.project(tabId,args.project_id);parent.project_id=project;
        parent.stage='opening Character Studio';await client.page(tabId,project,'/character');
        const before=await client.evaluate(tabId,()=>[...document.querySelectorAll('img')].map(i=>i.currentSrc||i.src));
        const prepared=await client.evaluate(tabId,async args=>{
          const box=document.querySelector("textarea[placeholder*='character' i],input[placeholder*='character' i],flow-character-prompt-box [contenteditable=true],div.ProseMirror,[contenteditable=true]");
          if(!box)throw new Error('Character Studio prompt box not found');
          box.focus();if('value'in box){const setter=Object.getOwnPropertyDescriptor(box.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set;setter.call(box,args.prompt);box.dispatchEvent(new Event('input',{bubbles:true}));}else{document.execCommand('selectAll');document.execCommand('insertText',false,args.prompt);}
          if(String(box.value||box.innerText||'').trim()!==args.prompt.trim())throw new Error('Character Studio did not accept the prompt');
          const deadline=Date.now()+5000;
          while(Date.now()<deadline){const buttons=[...document.querySelectorAll('button')];const button=buttons.find(b=>/generate|start generation/i.test(b.getAttribute('aria-label')||''))||buttons.find(b=>b.querySelector('mat-icon')?.textContent.trim()==='arrow_forward');if(button&&!button.disabled){const r=button.getBoundingClientRect(),v=visualViewport,hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);if(r.width>0&&r.height>0&&(hit===button||button.contains(hit)))return {fx:(r.left+r.width/2-(v?.offsetLeft||0))/(v?.width||innerWidth),fy:(r.top+r.height/2-(v?.offsetTop||0))/(v?.height||innerHeight)};}await new Promise(r=>setTimeout(r,30));}
          throw new Error('Character Studio Send is not ready');
        },[args]);
        if(args.dry_run){parent.stage='dry run: Character Studio prepared without sending';parent.request_sent={validated_ui:true,character_name:args.character_name,sent:false};return;}
        parent.abort.signal.throwIfAborted();await chrome.antigem.automation({tabId,tap:prepared});parent.stage='waiting for character candidates';
        await client.wait(async()=>client.evaluate(tabId,()=>!!document.querySelector('flow-character-candidate,.character-candidate-card,.candidate-item,input.name-input,input.editable-text-input,input[aria-label="Character name"]')),180000,500,parent.abort.signal);
        const result=await client.evaluate(tabId,async(name,before)=>{
          const candidate=document.querySelector('flow-character-candidate,.character-candidate-card,.candidate-item');if(candidate)candidate.click();
          const end=Date.now()+12000;let mediaId;
          while(Date.now()<end){const input=document.querySelector('input.name-input,input.editable-text-input,input[aria-label="Character name"]');if(input){Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,name);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}
            const images=[...document.querySelectorAll('flow-character-candidate img,.character-candidate-card img,.character-preview img,img')];const image=images.find(i=>!before.includes(i.currentSrc||i.src)&&/\/image\//.test(i.currentSrc||i.src));mediaId=/\/image\/([^?/#]+)/.exec(image?.currentSrc||image?.src||'')?.[1]||mediaId;
            const done=[...document.querySelectorAll('button')].find(b=>/^(done|save)$/i.test(b.innerText.trim())&&!b.disabled);if(done&&input?.value===name){done.click();return {saved:true,mediaId};}await new Promise(r=>setTimeout(r,50));}
          throw new Error('Character Studio did not offer a ready Save/Done action');
        },[args.character_name,before]);
        if(!result.saved)throw new Error('Character was not saved');
        parent.stage='verifying saved character';await client.wait(async()=>client.evaluate(tabId,name=>[...document.querySelectorAll('flow-character-tile,[data-character-name],.character-tile')].some(tile=>(tile.getAttribute('data-character-name')||tile.innerText||'').trim().toLowerCase().includes(name.toLowerCase())),[args.character_name]),15000,250,parent.abort.signal);
        parent.studio_settings='Current Character Studio configuration';parent.character=await remember({handle:handleOf(args.character_name),name:args.character_name,media_id:result.mediaId,project_id:project,type:'native_character',mentionSyntax:'@'+handleOf(args.character_name)});
        if(result.mediaId){parent.media_ids=[result.mediaId];parent.files=[await client.file(tabId,result.mediaId)];}
      }finally{if(project)await client.page(tabId,project).catch(()=>{});await client.end(tabId);}
    });
  }
  async function analyze(args) {
    const files=[];for(const dir of args.asset_dirs||['~/assets']){try{files.push(...await chrome.antigem.listFiles({path:dir,recursive:true,limit:1000}));}catch(error){if(args.asset_dirs)throw error;}}
    setLocalAssetIndex(files);
    return analyzeAndBreakdownScript({...args,raw_input:args.raw_input||args.script_text});
  }
  async function batch(args) {
    let prompts=args.prompts||args.items||[];
    let analysis;
    const raw=args.script_text||args.raw_input;
    if(!prompts.length&&raw){if(args.auto_breakdown){analysis=await analyze(args);prompts=analysis.storyboard.map(s=>({prompt:s.prompt,references:s.references||[]}));}else prompts=String(raw).split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);}
    if(!prompts.length)throw new Error('prompts, items or script_text is required');if(prompts.length>500)throw new Error('At most 500 scenes per workflow');
    if(args.mode&&!['textToVideo','textToImage'].includes(args.mode))throw new Error('mode must be textToVideo or textToImage');
    const video=args.mode!=='textToImage';
    if(args.is_concat&&!video)throw new Error('is_concat requires video mode');
    const concurrency=Math.max(1,Math.min(8,args.concurrent_prompts??2));
    const pacing=args.pacing_delay_sec??0;if(!Number.isFinite(pacing)||pacing<0||pacing>60)throw new Error('pacing_delay_sec must be 0–60');
    const budget=args._budget||(args.max_credits==null?null:{limit:args.max_credits,used:0});if(budget&&(!Number.isFinite(budget.limit)||budget.limit<0))throw new Error('max_credits must be non-negative');
    return workflow(args.is_concat?'scene_chain':'batch',args,async parent=>{
      parent.total=prompts.length;parent.completed=0;parent.analysis=analysis;parent.scenes=prompts.map((p,index)=>({index,prompt:typeof p==='string'?p:p.prompt,status:'queued'}));
      let previous=args.previous_media_id||null;
      const runScene=async(index)=>{
        parent.abort.signal.throwIfAborted();const item=typeof prompts[index]==='string'?{prompt:prompts[index]}:prompts[index];
        let parameters={...args,...item};if(item.references?.length===0&&!args.no_references)parameters.references=args.hero_references||args.references||[];parent.scenes[index].status='running';
        if(args.is_concat&&previous){const frame=await execute('flow_extract_frame',{media_id:previous,upload:true,project_id:args.project_id});parameters={...parameters,references:[],hero_references:[],start_frame:frame.media_id};}
        let child,error;
        const retryLimit=Math.min(3,Math.max(0,args.max_retries||0));
        for(let attempt=0;attempt<=retryLimit;attempt++){
          try{parent.stage=`scene ${index+1}/${prompts.length}${attempt?' retry '+attempt:''}`;child=await childGeneration(parameters,video,parent,budget);break;}
          catch(e){error=e;const last=jobs.get(e.flow_job_id);if(parent.abort.signal.aborted||attempt===retryLimit||last?.submitted||last?.send_attempted&&!/Request blocked before sending/.test(last?.error||'')||last?.credits_used>0||last?.media_ids?.length||!/not ready|attachment|settings|prompt|picker|before sending|No tab|Cannot access/i.test(e.message))throw e;await sleep(200*(attempt+1));}
        }
        if(!child)throw error;
        parent.project_id=child.project_id;const files=await downloadFiles(child.files,{...args,prompt:item.prompt},index);parent.files.push(...files);parent.media_ids.push(...(child.media_ids||[]));parent.completed++;parent.scenes[index]={...parent.scenes[index],status:'done',files,media_ids:child.media_ids||[],job_id:child.job_id,fast_path:child.fast_path};
        if(args.is_concat){previous=child.media_ids?.[0];if(args.dry_run&&index+1<prompts.length&&!previous){parent.chain_preview={requires_completed_previous_video:true,remaining_scenes:prompts.length-index-1};return false;}}
        return true;
      };
      const run=async index=>{try{return await runScene(index);}catch(error){parent.scenes[index]={...parent.scenes[index],status:parent.abort.signal.aborted?'cancelled':'failed',error:error.message};throw error;}};
      if(args.is_concat){for(let i=0;i<prompts.length;i++){if(await run(i)===false)break;if(pacing)await sleep(pacing*1000);}}
      else if(args.rapid_dispatch!==false){const pending=[];for(let i=0;i<prompts.length;i++){parent.abort.signal.throwIfAborted();pending.push(run(i).then(value=>({value}),error=>({error})));if(pacing)await sleep(pacing*1000);}const results=await Promise.all(pending);const failures=results.filter(r=>r.error);if(failures.length)throw new Error(failures.map(r=>r.error.message).join('; '));}
      else {let next=0;const results=await Promise.allSettled(Array.from({length:Math.min(concurrency,prompts.length)},async()=>{while(next<prompts.length){const index=next++;await run(index);if(pacing)await sleep(pacing*1000);}}));const errors=results.filter(r=>r.status==='rejected');if(errors.length)throw new Error(errors.map(r=>r.reason.message).join('; '));}
    });
  }
  async function call(tool,args={}) {
    const canonical={deepx_status:'flow_status',deepx_get_options:'flow_get_options',deepx_generate_video:'generate_video',deepx_generate_image:'generate_image',deepx_batch_generate:'flow_batch_generate',deepx_rapid_batch_dispatch:'flow_batch_generate',deepx_analyze_and_breakdown_script:'flow_analyze_script',deepx_rapid_storyboard_autopilot:'flow_storyboard',deepx_auto_character_pipeline:'flow_character_pipeline',deepx_check_status:'flow_video_status',deepx_upload_asset:'flow_upload_media',deepx_list_characters:'flow_list_characters',deepx_download_media:'flow_download_media',deepx_cancel_job:'flow_cancel',deepx_rename_project:'flow_rename_project',deepx_open_new_project:'flow_create_project',deepx_rename_character:'flow_rename_character',deepx_upload_character:'flow_upload_character',deepx_generate_character:'flow_generate_character',deepx_attach_library_reference:'flow_attach_references',deepx_attach_references_batch:'flow_attach_references',deepx_auto_chain_scene:'flow_chain_scene',deepx_eval_script:'flow_eval_script'}[tool]||tool;
    if(canonical==='generate_video'||canonical==='generate_image')return execute(canonical==='generate_video'?'flow_generate_video':'flow_generate_image',{...generation(args,canonical==='generate_video'),wait_seconds:args.wait_seconds??(args.wait_for_completion?45:0)});
    if(tool==='deepx_check_status')return execute('flow_video_status',{media_ids:[args.media_id],download:args.download!==false});
    if(tool==='deepx_upload_asset'){const uploaded=await execute('flow_upload_media',{file_paths:[args.file_path],project_id:args.project_id});if(args.file_name){await execute('flow_rename_media',{media_id:uploaded[0].media_id,title:args.file_name});client.libraryCache.clear();}return uploaded;}
    if(tool==='deepx_cancel_job')return execute('flow_cancel',{job_id:args.batch_id||args.job_id});
    if(tool==='deepx_rename_project'){const tab=await client.tab();return execute('flow_rename_project',{project_id:args.project_id||(await client.js(tab,'s.ui()')).projectId,title:args.new_name});}
    if(canonical!==tool&&['flow_status','flow_create_project'].includes(canonical))return execute(canonical,args);
    if(canonical==='flow_get_options')return {image_models:IMAGE_MODELS,video_models:VIDEO_MODELS,image_aspects:['1:1','16:9','9:16','4:3','3:4'],video_aspects:['16:9','9:16'],omni:{durations:[4,6,8,10],resolutions:['360p','720p']},veo:{duration:8,resolution:'720p'},count:[1,2,3,4],references:'Media IDs, local paths or registered @handles; ingredients and start/end frames are separate modes',batch_limit:500,caching:'Settings fingerprint and 30-second tab readiness cache; warm text-only requests fill and send directly',character_modes:['native_studio','named_reference_asset'],dry_run:'Build and validate generation requests without sending to Google'};
    if(canonical==='flow_analyze_script')return analyze(args);
    if(canonical==='flow_batch_generate'){const rapid=tool==='deepx_rapid_batch_dispatch';const image=args.mode==='textToImage'||/banana|imagen/i.test(args.model||'');return batch({...args,...(rapid?{auto_breakdown:args.auto_breakdown!==false,mode:image?'textToImage':'textToVideo',rapid_dispatch:true}:{})});}
    if(canonical==='flow_storyboard')return workflow('storyboard',args,async parent=>{
      const analysis=args.auto_breakdown===false?null:await analyze(args);parent.analysis=analysis;
      const scenes=args.prompts||args.items||(analysis?analysis.storyboard.map(s=>({prompt:s.prompt,references:s.references||[]})):String(args.script_text||args.raw_input||'').split(/\n\s*\n/).filter(Boolean));
      if(!scenes.length)throw new Error('Storyboard has no scenes');
      let hero=args.no_references?[]:(args.hero_references||analysis?.heroReferences||[]);
      const budget=args.max_credits==null?null:{limit:args.max_credits,used:0};
      const available=await registry();const entities=analysis?.entities||[];parent.characters=[];
      if(!args.no_references)for(const name of hero){parent.abort.signal.throwIfAborted();if(Object.values(available).some(c=>c.handle===handleOf(name)&&c.media_id))continue;
        const entity=entities.find(e=>e.handle===handleOf(name));if(!entity)continue;
        parent.stage='preparing character '+entity.handle;
        if(entity.localAssetPath){const entry=await call('flow_upload_character',{file_path:entity.localAssetPath,character_name:entity.handle,project_id:args.project_id});parent.characters.push(entry);}
        else{const child=await childGeneration({...args,prompt:entity.referencePrompt,model:args.image_model||'Nano Banana 2.1',references:[],count:1},false,parent,budget);parent.files.push(...child.files);if(!args.dry_run)parent.characters.push(await registerCharacter(entity.handle,child.media_ids[0],child.project_id,{type:entity.type||'reference_asset'}));}
      }
      if(args.dry_run&&parent.child_job_ids.length){parent.next_stage={scenes:scenes.length,hero_references:hero,requires_generated_reference_ids:true};return;}
      const result=await batch({...args,prompts:scenes,hero_references:hero,references:hero,is_concat:args.is_concat??true,auto_breakdown:false,_budget:budget,wait_seconds:0});const child=jobs.get(result.job_id);await settle(child,parent);parent.files.push(...child.files);parent.media_ids.push(...child.media_ids);parent.scenes=child.scenes;
    });
    if(canonical==='flow_chain_scene'){
      let previous=args.previous_media_id||args.media_id;
      if(!previous){const recent=await execute('flow_get_last_media',{type:'video',count:1});previous=recent[0]?.media_id||recent[0]?.mediaId;}
      if(!previous)throw new Error('No previous video found; provide previous_media_id');
      return batch({...args,prompts:[args.prompt||args.next_prompt],previous_media_id:previous,is_concat:true});
    }
    if(canonical==='flow_list_characters')return characters(args);
    if(canonical==='flow_generate_character'){
      if(!args.character_name||!args.prompt)throw new Error('character_name and prompt are required');
      return workflow('generate_character',args,async parent=>{
        if(args.native_studio!==false){await studio(args,parent);return;}
        const child=await childGeneration({...args,model:imageModel(args.model)},false,parent,args.max_credits==null?null:{limit:args.max_credits,used:0});parent.files=child.files;parent.media_ids=child.media_ids||[];
        if(!args.dry_run)parent.character=await registerCharacter(args.character_name,parent.media_ids[0],child.project_id,{prompt:args.prompt,type:'reference_asset'});
        else parent.request_sent=child.request_sent;
      });
    }
    if(canonical==='flow_upload_character'){
      if(!args.file_path||!args.character_name)throw new Error('file_path and character_name are required');
      const uploaded=await execute('flow_upload_media',{file_paths:[args.file_path],project_id:args.project_id});const tab=await client.tab();return registerCharacter(args.character_name,uploaded[0].media_id,(await client.js(tab,'s.ui()')).projectId,{type:'reference_asset'});
    }
    if(canonical==='flow_rename_character'){
      const old=handleOf(args.old_name),name=handleOf(args.new_name);if(!old||!name)throw new Error('old_name and new_name are required');
      const data=await registry(),tab=await client.tab(),project=args.project_id||(await client.js(tab,'s.ui()')).projectId;const entry=data[project+':'+old];
      if(entry&&entry.type!=='native_character'){if(entry.media_id)await execute('flow_rename_media',{media_id:entry.media_id,title:name});delete data[project+':'+old];return remember({...entry,handle:name,name,mentionSyntax:'@'+name});}
      return client.exclusive(async()=>{await client.begin(tab);try{const result=await client.evaluate(tab,async(oldName,newName)=>{
        const tile=[...document.querySelectorAll('flow-character-tile,[data-character-name],.character-tile')].find(t=>(t.getAttribute('data-character-name')||t.innerText.split('\n')[0]).trim().toLowerCase()===oldName);
        if(!tile)throw new Error('Native character was not found in the current view');const more=tile.querySelector("button[aria-label*='more' i],button.more-button");if(more)more.click();else tile.click();
        const end=Date.now()+5000;while(Date.now()<end){const rename=[...document.querySelectorAll('[role=menuitem],button')].find(b=>/^rename$/i.test(b.innerText.trim()));if(rename)rename.click();const input=document.querySelector("input.character-name-input,input[aria-label*='Character name' i],[role=dialog] input");if(input){Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,newName);input.dispatchEvent(new Event('input',{bubbles:true}));const save=[...document.querySelectorAll('[role=dialog] button')].find(b=>/save|done|confirm/i.test(b.innerText)&&!b.disabled);if(save){save.click();return {old_name:oldName,new_name:newName};}}await new Promise(r=>setTimeout(r,50));}throw new Error('Character rename dialog did not become ready');
      },[args.old_name,name]);if(entry){delete data[project+':'+old];await remember({...entry,handle:name,name,mentionSyntax:'@'+name});}return result;}finally{await client.end(tab);}});
    }
    if(canonical==='flow_character_pipeline'){
      return workflow('character_pipeline',args,async parent=>{
        const analysis=args.characters?.length?null:await analyze(args);const entities=args.characters?.length?args.characters:(analysis.entities||[]).map(e=>({name:e.handle,prompt:e.referencePrompt,local_path:e.localAssetPath}));if(!entities.length)throw new Error('No entities found; provide characters explicitly');
        parent.characters=[];const budget=args.max_credits==null?null:{limit:args.max_credits,used:0};
        for(let i=0;i<entities.length;i++){parent.abort.signal.throwIfAborted();const entity=entities[i];parent.stage=`character ${i+1}/${entities.length}`;
          let character;if(entity.local_path)character=await call('flow_upload_character',{file_path:entity.local_path,character_name:entity.name,project_id:args.project_id});
          else{const child=await childGeneration({...args,prompt:entity.prompt,model:args.image_model||'Nano Banana 2.1',count:1,references:[]},false,parent,budget);parent.files.push(...child.files);parent.media_ids.push(...(child.media_ids||[]));if(!args.dry_run)character=await registerCharacter(entity.name,child.media_ids[0],child.project_id,{prompt:entity.prompt,type:entity.type||'reference_asset'});}
          if(character)parent.characters.push(character);
        }
        if(args.video_scenes?.length){if(args.dry_run){parent.next_stage={video_scenes:args.video_scenes.length,requires_generated_reference_ids:true};return;}const scenes=args.video_scenes.map(s=>({prompt:s.action_prompt,references:['@'+handleOf(s.character_name)]}));const result=await batch({...args,model:args.video_model||'Omni 1.1 Flash',items:scenes,prompts:scenes,is_concat:args.is_concat!==false,_budget:budget,wait_seconds:0});const child=jobs.get(result.job_id);await settle(child,parent);parent.files.push(...child.files);parent.media_ids.push(...child.media_ids);parent.scenes=child.scenes;}
      });
    }
    if(canonical==='flow_attach_references')return client.exclusive(async()=>{
      const tab=await client.tab();await client.begin(tab);try{const project=await client.project(tab,args.project_id);if(args.clear_stale)await client.clear(tab);const values=args.references||args.asset_names||[args.asset_name].filter(Boolean);if(!values.length)throw new Error('references or asset_name is required');const library=await client.contents(tab,project,true);for(const value of values){let id=await client.referenceResolver(value);if(id===value&&!/^[a-f\d-]{30,}$/i.test(value)&&!value.includes('/')){const matches=library.filter(m=>handleOf(m.title)===handleOf(value));if(matches.length!==1)throw new Error('Reference name is missing or ambiguous; use its media ID: '+value);id=matches[0].mediaId;}else id=await client.resolveReference(tab,id);const media=library.find(m=>m.mediaId===id)||await client.media(tab,id);await client.attach(tab,id,media.title||id,args.slot||null);}return {project_id:project,media_ids:await client.js(tab,'s.chipIds()')};}finally{await client.end(tab);}});
    if(canonical==='flow_download_media'){
      if(!args.media_id&&!args.url)throw new Error('media_id or url is required');const tab=await client.tab();const file=args.media_id?await client.file(tab,args.media_id):{...(await chrome.antigem.download({url:args.url,path:`~/${args.folder||'flow-media'}/${safeName(args.filename||'download.mp4')}`,reuse:true})),type:args.url.includes('.mp4')?'video':'image'};return (await downloadFiles([file],{filename:args.filename,download_folder:args.folder||args.download_folder},0))[0];
    }
    if(canonical==='flow_eval_script'){
      const script=args.script||args.expression||args.code;if(typeof script!=='string'||!script.trim())throw new Error('script is required');const tab=await client.tab();return client.exclusive(()=>client.evaluate(tab,source=>(0,eval)(source),[script]));
    }
    return {__unhandled:true};
  }
  return {call};
}
