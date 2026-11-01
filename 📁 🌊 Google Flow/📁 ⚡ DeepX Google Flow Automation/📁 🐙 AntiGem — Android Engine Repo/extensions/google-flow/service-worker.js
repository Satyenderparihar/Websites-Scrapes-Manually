import { FlowClient, IMAGE_MODELS, VIDEO_MODELS } from './flow-client.js';
import { RPC } from './constants.js';
import { createFlowWorkflows } from './flow-workflows.js';

const client = new FlowClient(chrome), jobs = new Map();
const finished = job => ['done','failed','cancelled'].includes(job.status);
const snapshot = job => Object.fromEntries(Object.entries(job).filter(([key]) => !['abort','request','completion','tabId','reserved'].includes(key)));
const workflows=createFlowWorkflows({chrome,client,execute,jobs,enqueue,normalize:request,awaitJobs,snapshot});
const sleep = ms => new Promise(r => setTimeout(r,ms));
function request(args, video) {
  const model = args.model || (video ? VIDEO_MODELS[0] : IMAGE_MODELS[0]);
  if (!(video?VIDEO_MODELS:IMAGE_MODELS).includes(model)) throw new Error('Unknown Flow model: ' + model);
  const prompt = String(args.prompt || '').trim(); if(!prompt)throw new Error('prompt is required');
  const aspect=args.aspect_ratio || '16:9';if(!(video?['16:9','9:16']:['16:9','4:3','1:1','3:4','9:16']).includes(aspect))throw new Error('Unsupported aspect ratio');
  const count=args.count??1;if(!Number.isInteger(count)||count<1||count>4)throw new Error('count must be 1–4; use items for different prompts');
  const references=args.references || [];if(!Array.isArray(references)||references.some(x=>typeof x!=='string'||!x.trim()))throw new Error('references must contain image ids or paths');
  if(args.end_frame&&!args.start_frame)throw new Error('end_frame requires start_frame');if(video&&references.length&&args.start_frame)throw new Error('Use ingredients or start/end frames, not both');
  if(video&&references.length&&model.includes('Quality'))throw new Error('Veo Quality does not support ingredients');
  const duration=args.duration??8,resolution=args.resolution||'720p';if(video&&model.includes('Omni')&&(![4,6,8,10].includes(duration)||!['360p','720p'].includes(resolution)))throw new Error('Unsupported Omni duration or resolution');
  if(video&&!model.includes('Omni')&&(duration!==8||resolution!=='720p'))throw new Error('Veo generation supports 8 seconds at 720p');
  if(args.seed!=null)throw new Error('seed cannot be selected by the current Flow website UI');
  return {...args,prompt,video,model,aspect,count,references,duration,resolution};
}
function enqueue(req) {
  const job={job_id:crypto.randomUUID().slice(0,8),status:'queued',stage:'waiting in queue',type:req.video?'video':'image',model:req.model,prompt:req.prompt?.slice(0,200)||'',files:[],request:req,abort:new AbortController()};
  jobs.set(job.job_id,job);if(jobs.size>2000)for(const [id,j] of jobs){if(finished(j))jobs.delete(id);if(jobs.size<=2000)break;}
  const submission=client.exclusive(async()=>{if(job.abort.signal.aborted)return null;job.status='running';return req.action ? client.submitEdit(job) : client.submit(job);});
  job.completion=submission.then(async sub=>{if(sub)await client.collect(job,sub);}).catch(error=>{if(job.status!=='cancelled'){job.status='failed';job.stage='failed';job.error=error.message;}});
  return job;
}
async function awaitJobs(selected,seconds=45){if(!selected.length)return[];await Promise.race([Promise.all(selected.map(j=>j.completion)),sleep(Math.max(0,Math.min(50,seconds))*1000)]);return selected.length===1?snapshot(selected[0]):selected.map(snapshot);}
async function readBlob(tabId, result, filename) {
  if(!result?.len)throw new Error('Flow export contains no file');
  try{for(let at=0;at<result.len;at+=512*1024){const data=await client.js(tabId,`s.blobChunk(${JSON.stringify(result.key)},${at},${512*1024})`);await chrome.antigem.writeFile({path:filename,data,encoding:'base64',append:at>0});}return(await chrome.antigem.stat({path:filename})).path;}finally{await client.js(tabId,`s.blobDrop(${JSON.stringify(result.key)})`);}
}
async function execute(tool,args={}) {
  if(tool.startsWith("deepx_")||["flow_get_options","flow_analyze_script","flow_batch_generate","flow_storyboard","flow_character_pipeline","flow_list_characters","flow_generate_character","flow_upload_character","flow_rename_character","flow_attach_references","flow_chain_scene","flow_download_media","flow_eval_script"].includes(tool)){const value=await workflows.call(tool,args);if(!value?.__unhandled)return value;}
  if(tool==='flow_generate_image'||tool==='flow_generate_video'){
    const items=args.items?.length?args.items:[args];if(items.length>500)throw new Error('At most 500 items per call');
    const budget=args.max_credits==null?null:{limit:args.max_credits,used:0};if(budget&&(!Number.isFinite(budget.limit)||budget.limit<0))throw new Error('max_credits must be non-negative');
    const requests=items.map(item=>request({...args,...(typeof item==='string'?{prompt:item}:item),budget},tool==='flow_generate_video'));
    if(args.new_project){const project=await client.exclusive(async()=>{const tabId=await client.tab();const p=await client.createProject(tabId,args.title);await client.page(tabId,p.projectId);return p;});for(const req of requests){req.project_id=project.projectId;req.new_project=false;}}
    // One lease covers the queue, including gaps between dry-run or very fast results.
    if(requests.length>1){
      const tab=await client.tab();await client.begin(tab);
      const selected=requests.map(enqueue);
      Promise.all(selected.map(job=>job.completion)).finally(()=>client.end(tab)).catch(console.error);
      return awaitJobs(selected,args.wait_seconds??45);
    }
    return awaitJobs(requests.map(enqueue),args.wait_seconds??45);
  }
  if(tool==='flow_get_job'){const ids=[...(args.job_ids||[]),...(args.job_id?[args.job_id]:[])];if(!ids.length)throw new Error('job_id or job_ids required');const selected=ids.map(id=>{const job=jobs.get(id);if(!job)throw new Error('Unknown job_id: '+id);return job;});return awaitJobs(selected,args.wait_seconds??45);}
  if(tool==='flow_cancel'){let count=0;const selected=new Set(args.job_id?[args.job_id]:[...jobs.keys()]);for(const id of selected)for(const child of jobs.get(id)?.child_job_ids||[])selected.add(child);for(const job of jobs.values())if(!finished(job)&&selected.has(job.job_id)){job.status='cancelled';job.stage='cancelled';job.abort.abort();count++;}return{cancelled:count};}
  if(['flow_edit_image','flow_edit_video','flow_extend_video','flow_upscale_image','flow_upscale_video'].includes(tool)){
    if(!args.media_id)throw new Error('media_id required');const video=tool.endsWith('video'),action=tool.includes('upscale')?'upscale_'+(video?'video':'image'):tool.includes('extend')?'extend':'edit';
    if(!tool.includes('upscale')&&!args.prompt?.trim())throw new Error('prompt required');
    const req={...args,action,video,references:args.references||[],resolution:args.resolution||(video?'720p':'2K'),aspect:args.aspect_ratio};
    return awaitJobs([enqueue(req)],args.wait_seconds??45);
  }
  if(tool==='flow_status'){
    const tabId=await client.tab(),ui=await client.js(tabId,'s.ui()');return{logged_in:ui.ready,account:ui.account,project_id:ui.projectId,settings:ui.settingsText,queued_jobs:[...jobs.values()].filter(j=>j.status==='queued').length,running_jobs:[...jobs.values()].filter(j=>j.status==='running').map(snapshot),extension:chrome.runtime.id};
  }
  if(tool==='flow_list_models')return client.rpc(await client.tab(),RPC.MODELS,[],'models');
  if(tool==='flow_list_projects')return client.rpc(await client.tab(),RPC.PROJECTS,['projects/*',args.limit??20,null,null,null,null,[1]],'projects');
  if(tool==='flow_get_settings')return client.js(await client.tab(),'s.ui().settingsText');
  if(tool==='flow_get_media'){const tabId=await client.tab();if(!args.media_id)throw new Error('media_id required');const file=await client.file(tabId,args.media_id);if(args.view&&file.type==='image')return{content:[{type:'text',text:JSON.stringify(file)},{type:'image',data:await chrome.antigem.readFile({path:file.path,encoding:'base64'}),mimeType:'image/jpeg'}]};return file;}
  if(tool==='flow_list_media'||tool==='flow_get_last_media'){
    const tabId=await client.tab(),project=args.project_id||(await client.js(tabId,'s.ui()')).projectId;if(!project)throw new Error('Open a project first');
    let media=await client.contents(tabId,project);media=media.filter(m=>(args.include_trashed||!m.trashed)&&(!args.type||m.type===args.type)&&(!args.pending_only||m.pending)&&(!args.query||`${m.title} ${m.prompt}`.toLowerCase().includes(args.query.toLowerCase())));
    if(tool==='flow_get_last_media'){const history=client.history.filter(m=>!args.type||m.type===args.type).toReversed();const seen=new Set(history.map(m=>m.media_id));return[...history,...media.toReversed().filter(m=>!seen.has(m.mediaId))].slice(0,args.count??1);}
    return media;
  }
  if(tool==='flow_video_status'){const tabId=await client.tab();if(!args.media_ids?.length)throw new Error('media_ids required');const statuses=await client.statusVideos(tabId,args.media_ids);return Promise.all(statuses.map(async m=>({...m,state:m.status===3?'done':[1,2,6].includes(m.status)?'pending':'failed',...(m.status===3&&args.download!==false?await client.file(tabId,m.mediaId):{})})));}
  return client.exclusive(async()=>{
    const tabId=await client.tab();await client.begin(tabId);
    try{
      if(tool==='flow_create_project'){const p=await client.createProject(tabId,args.title);if(args.open!==false)await client.page(tabId,p.projectId);return p;}
      if(tool==='flow_open_project'){if(!args.project_id)throw new Error('project_id required');await client.page(tabId,args.project_id);return{project_id:args.project_id};}
      if(tool==='flow_rename_project')return client.rpc(tabId,RPC.RENAME_PROJECT,[`projects/${args.project_id}`,[args.title],[['project_title']],[null,22]],'renamed');
      if(tool==='flow_upload_media'){if(!args.file_paths?.length)throw new Error('file_paths required');await client.project(tabId,args.project_id);const output=[];for(const file of args.file_paths)output.push({file,media_id:await client.resolveReference(tabId,file)});return output;}
      if(tool==='flow_rename_media'){const m=await client.media(tabId,args.media_id);return client.rpc(tabId,RPC.RENAME_WORKFLOW,[[m.workflowId,null,null,[args.title],m.projectId],[['metadata.display_name']]],'ok');}
      if(tool==='flow_trash_media'||tool==='flow_restore_media'){if(!args.media_ids?.length)throw new Error('media_ids required');const entries=[];for(const id of args.media_ids){const m=await client.media(tabId,id);entries.push([m.workflowId,null,null,[null,null,tool==='flow_trash_media'],m.projectId]);}await client.rpc(tabId,RPC.UPDATE_WORKFLOWS,[entries,[['metadata.archived']]],'ok');return{updated:entries.length};}
      if(tool==='flow_lock_tab'){await chrome.antigem.automation({tabId,locked:!!args.locked});return{locked:!!args.locked};}
      if(tool==='flow_extract_frame'){const video=await client.file(tabId,args.media_id);const result=await chrome.antigem.mediaFrame({path:video.path,at_seconds:args.at_seconds});if(args.upload){await client.project(tabId,args.project_id);result.media_id=await client.resolveReference(tabId,result.path);}return result;}
      if(tool==='flow_video_to_gif'){const result=await client.rpc(tabId,RPC.GIF,[null,args.media_id],'gif',120000);return{path:await readBlob(tabId,result,`~/flow-media/flow_${args.media_id}.gif`)};}
      if(tool==='flow_combine_videos'){if(!args.clips?.length)throw new Error('clips required');const clips=[];for(const clip of args.clips){let end=clip.end;if(end==null){const file=await client.file(tabId,clip.media_id);end=(await chrome.antigem.mediaInfo({path:file.path})).duration;}clips.push([clip.media_id,null,clip.start==null?[]:[clip.start],[end]]);}const started=await client.rpc(tabId,RPC.CONCAT,[clips],'concatStart');const result=await client.wait(async()=>{const r=await client.rpc(tabId,RPC.CONCAT_STATUS,[[[started.job]]],'concatStatus');return r.state===3&&r.len&&r;},300000,2000);const file=await readBlob(tabId,result,`~/flow-media/combined_${Date.now()}.mp4`);return{path:file,...(args.upload_back?{media_id:await client.resolveReference(tabId,file)}:{})};}
      if(tool==='flow_create_scene'){if(!args.media_ids?.length)throw new Error('media_ids required');const medias=await Promise.all(args.media_ids.map(id=>client.media(tabId,id)));if(medias.some(m=>m.projectId!==medias[0].projectId))throw new Error('Scene media must belong to the same project');return client.rpc(tabId,RPC.CREATE_SCENE,[`projects/${medias[0].projectId}`,medias.map(m=>m.workflowId),null,args.aspect_ratio==='9:16'?1:2],'scene');}
      throw new Error('Unknown Flow tool: '+tool);
    }finally{await client.end(tabId);}
  });
}
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(message.type!=='mcp_tool_call')return;
  execute(message.tool,message.args||{}).then(sendResponse,error=>sendResponse({isError:true,content:[{type:'text',text:error.message}]}));
  return true;
});
