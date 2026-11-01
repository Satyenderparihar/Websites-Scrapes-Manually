import { RPC, HELPER_VERSION } from './constants.js';
export const IMAGE_MODELS = ['Nano Banana 2.1', 'Nano Banana Pro', 'Nano Banana 2 Lite'];
export const VIDEO_MODELS = ['Omni 1.1 Flash', 'Veo 3.1 - Lite', 'Veo 3.1 - Fast', 'Veo 3.1 - Quality'];
const IMAGE_KEYS = { 'Nano Banana 2.1': 'BELUGA', 'Nano Banana Pro': 'GEM_PIX_2', 'Nano Banana 2 Lite': 'HARBOR_SEAL' };
const IMAGE_ASPECTS = { '1:1':1, '9:16':2, '16:9':3, '3:4':4, '4:3':5 };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const quoted = JSON.stringify;
export class FlowClient {
  constructor(chrome) { this.chrome = chrome; this.uploads = new Map(); this.attached = new Set(); this.pending = 0; this.history = []; this.serial = Promise.resolve(); this.active = new Map(); this.readyTab = null; this.libraryCache = new Map(); }
  exclusive(fn) { const next = this.serial.then(fn, fn); this.serial = next.catch(() => {}); return next; }
  async wait(probe, timeout = 10000, interval = 50, signal) { const end = Date.now() + timeout; do { signal?.throwIfAborted(); const value = await probe(); if (value) return value; await sleep(interval); } while (Date.now() < end); throw new Error('Flow timed out waiting for the page'); }
  async evaluate(tabId, fn, args = []) { try { const results=await this.chrome.scripting.executeScript({target:{tabId},world:'MAIN',func:fn,args});return results[0]?.result; } catch(error){this.readyTab=null;throw error;} }
  async js(tabId, expression) {
    const fn = new Function(`const s=window.__agFlow;if(!s||s.v!==${HELPER_VERSION})return {__missing:true};return (${expression})`);
    const result = await this.evaluate(tabId, fn);
    if (!result?.__missing) return result;
    await this.chrome.scripting.executeScript({ target:{ tabId }, world:'MAIN', files:['page-helpers.js'] });
    return this.evaluate(tabId, fn);
  }
  async tab() {
    if(this.readyTab && Date.now()-this.readyTab.at<30000)return this.readyTab.id;
    let tab = (await this.chrome.tabs.query({})).find(t => { try { return new URL(t.url).hostname === 'flow.google.com'; } catch { return false; } });
    if (!tab) tab = await this.chrome.tabs.create({ url:'https://flow.google.com/', active:true });
    await this.wait(async () => { try { return (await this.js(tab.id, 's.ui()')).ready; } catch { return false; } }, 30000);
    if (!this.attached.has(tab.id)) { await this.chrome.debugger.attach({ tabId:tab.id }, '1.3'); this.attached.add(tab.id); }
    this.readyTab={id:tab.id,at:Date.now()};return tab.id;
  }
  async rpc(tabId, id, args, post = null, timeout = 30000) {
    const key = crypto.randomUUID();
    return this.evaluate(tabId, async (key, id, args, post, timeout) => {
      const s = window.__agFlow;
      if (!s) throw new Error('Flow helper is not installed');
      s.rpcStart(key, id, JSON.stringify(args), post); const end = Date.now() + timeout;
      while (Date.now() < end) { const result = s.result(key); if (result.done) { if (result.error) throw new Error(result.error); return result.value; } await new Promise(r => setTimeout(r, 25)); }
      throw new Error(`Flow RPC ${id} timed out`);
    }, [key, id, args, post, timeout]);
  }
  async page(tabId, projectId, suffix = '') {
    const target = `/project/${projectId}${suffix}`;
    if ((await this.js(tabId, 's.ui()')).path !== target) {
      if (this.pending) await this.wait(() => this.pending === 0, 240000, 100);
      await this.chrome.tabs.update(tabId, { url:'https://flow.google.com' + target });
      await this.wait(async () => { try { const ui = await this.js(tabId, 's.ui()'); return ui.path === target && ui.ready && (ui.prompt || suffix==='/character'&&await this.evaluate(tabId,()=>!!document.querySelector('flow-character-prompt-box,textarea,[contenteditable=true]'))); } catch { return false; } }, 30000);
    }
  }
  async project(tabId,id,fresh=false) {
    let projectId=id;
    if(!projectId&&!fresh)projectId=(await this.js(tabId,'s.ui()')).projectId;
    if(!projectId||fresh)projectId=(await this.createProject(tabId)).projectId;
    await this.page(tabId,projectId);this.currentProjectId=projectId;return projectId;
  }

  async createProject(tabId, title) { return this.rpc(tabId, RPC.CREATE_PROJECT, ['projects/*',[null,[title || new Date().toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', hour12:false })]],[null,22]], 'created'); }
  async contents(tabId, projectId, cached = false) { const c=this.libraryCache.get(projectId);if(cached&&c&&Date.now()-c.at<5000)return c.value;const value=await this.rpc(tabId,RPC.PROJECT_CONTENTS,[`projects/${projectId}`],'contents')||[];this.libraryCache.set(projectId,{at:Date.now(),value});return value; }
  async media(tabId, id) { return this.rpc(tabId, RPC.GET_MEDIA, [id], 'media'); }
  async statusVideos(tabId, ids) { return this.rpc(tabId, RPC.VIDEO_STATUS, [null,null,ids.map(id => [id])], 'videoStatus'); }
  async begin(tabId) {
    const count = this.active.get(tabId) || 0; this.active.set(tabId, count + 1);
    if (!count) try { await this.chrome.antigem.automation({ tabId, busy:true }); await this.js(tabId, 's.freezeZoom(true)'); } catch(error) { this.active.delete(tabId); throw error; }
    if(!this.heartbeat)this.heartbeat=setInterval(()=>{for(const tabId of this.active.keys())this.chrome.antigem.automation({tabId,busy:true}).catch(console.error);},15000);
  }
  async end(tabId) { const count = Math.max(0, (this.active.get(tabId) || 0) - 1); if (count) { this.active.set(tabId,count); return; } this.active.delete(tabId); if(!this.active.size){clearInterval(this.heartbeat);this.heartbeat=null;} await this.js(tabId, '(s.blurAll(),s.freezeZoom(false))').catch(() => {}); await this.chrome.antigem.automation({ tabId,busy:false }).catch(() => {}); }
  async clear(tabId) {
    await this.evaluate(tabId, async () => { const s = window.__agFlow; if (s.clearPromptFast().ok) return; s.clickAria('Clear prompt'); const until = Date.now() + 2000; while (s.chipIds().length && Date.now() < until) await new Promise(r => setTimeout(r,30)); if (s.chipIds().length) throw new Error('Old reference chips could not be cleared'); if (!s.setPrompt('').ok) throw new Error('Prompt could not be cleared'); s.blurAll(); });
  }
  async settings(tabId, req) {
    return this.evaluate(tabId, async req => {
      const s = window.__agFlow, pause = () => new Promise(r => setTimeout(r,30));
      const wait = async probe => { const end = Date.now() + 4000; do { if (probe()) return; await pause(); } while (Date.now() < end); throw new Error('Flow settings did not become ready'); };
      const key = JSON.stringify([req.video,req.model,req.aspect,req.resolution,req.duration,req.count,!!req.references.length]);
      const cached = s.cachedSettings(key); if (cached.matches) return cached.cost;
      s.invalidateSettings();
      if (!s.ui().settingsOpen) { if (!s.clickAria('Settings trigger').ok) throw new Error('Flow settings button was not found'); await wait(() => s.ui().settingsOpen); }
      const radio = async (label, optional = false) => { const pattern = '(^|\\s)' + label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '( info)?$'; const clicked = s.clickRadio(pattern); if (!clicked.ok) { if (optional) return; throw new Error('Flow has no setting: ' + label); } await wait(() => s.radio(pattern).checked); };
      const matches = label => { const text = label.toLowerCase(), model = req.model.toLowerCase(), i = text.indexOf(model); if (i < 0) return false; const rest = text.slice(i + model.length).trimStart(); return !rest.startsWith('.') && !(rest.startsWith('lite') && !model.endsWith('lite')); };
      let cost;
      try {
        await radio(req.video ? 'Video' : 'Image'); if (req.video) await radio(req.references.length ? 'Ingredients' : 'Frames');
        if (!matches(s.modelButton().label || '')) { if (!s.clickModelButton().ok) throw new Error('Model selector unavailable'); await wait(() => s.ui().menuOpen); if (!s.menuClick(req.model).ok) throw new Error('Flow model unavailable: ' + req.model); await wait(() => matches(s.modelButton().label || '')); }
        await radio(req.aspect);
        if (req.video && req.model.includes('Omni')) { await radio(req.resolution,true); await radio(req.duration + 's',true); }
        await radio('x' + req.count); cost = s.cost().cost;
      } finally { s.escape(); await wait(() => !s.ui().settingsOpen); }
      s.rememberSettings(key,cost); return cost;
    }, [req]);
  }
  async attach(tabId, id, title, slot = null) {
    return this.evaluate(tabId, async (id,title,slot) => {
      const s = window.__agFlow, pause = () => new Promise(r => setTimeout(r,30)), before = s.chipIds();
      if (!slot && before.includes(id)) return;
      if (slot) {
        s.closeAddMenu(); s.escape();
        if (!s.clickEl(s.byText('^\\s*' + slot + '\\s*$')).ok) throw new Error('Frame slot unavailable: ' + slot);
        const readyBy = Date.now() + 5000;
        while (!s.ui().pickerOpen) { if (Date.now() >= readyBy) throw new Error('Frame picker did not open: ' + slot); await pause(); }
      }
      const key = crypto.randomUUID(); s.attachStart(key,title,id); let result;
      const until = Date.now() + 12000;
      try { while (Date.now() < until) { const r = s.result(key); if (r.done) { result = r; break; } await pause(); }
        if (!result?.value?.success) throw new Error(result?.error || result?.value?.reason || 'Reference attachment timed out');
        while (Date.now() < until) { const ids = s.chipIds(); if (ids.length === before.length + 1 && ids.slice(0,-1).every((v,i) => v === before[i]) && ids.at(-1) === id) return; await pause(); }
        throw new Error('Attached reference does not match requested media id: ' + id);
      } finally { s.closeAddMenu(); s.escape(); }
    }, [id,title,slot]);
  }
  async resolveReference(tabId, value) {
    if(this.referenceResolver)value=await this.referenceResolver(value);
    if (/^[a-zA-Z0-9_-]{20,}$/.test(value) && !value.includes('/')) return value;
    const file = await this.chrome.antigem.stat({ path:value }); const key = `${this.currentProjectId||''}|${file.path}|${file.size}|${file.modified}`;
    if (this.uploads.has(key)) return this.uploads.get(key);
    const mark = await this.js(tabId, 's.capMark().n');
    // Match flow_mcp's upload path: composer Upload -> DataTransfer, with CDP fallback.
    const name=file.path.split('/').at(-1), extension=name.split('.').at(-1).toLowerCase();
    const mime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',mp4:'video/mp4',mov:'video/quicktime'}[extension]||'application/octet-stream';
    const base64=file.size<=8*1024*1024?await this.chrome.antigem.readFile({path:file.path,encoding:'base64'}):null;
    let chooser;const onChooser=(source,event,params)=>{if(source.tabId===tabId&&event==='Page.fileChooserOpened')chooser=params;};
    this.chrome.debugger.onEvent.addListener(onChooser);
    try {
      await this.chrome.debugger.sendCommand({tabId},'Page.setInterceptFileChooserDialog',{enabled:true});
      const prepared=await this.evaluate(tabId,async({name,mime,base64})=>{
        const pause=()=>new Promise(r=>setTimeout(r,20));
        const visible=el=>el&&el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0;
        let upload;
        const findUpload=()=>[...document.querySelectorAll('.sidebar-upload-btn,button[aria-label*="Upload" i],.cdk-overlay-pane button[role="menuitem"]')].find(el=>visible(el)&&(el.classList.contains('sidebar-upload-btn')||/^upload(?: media| files)?$/i.test((el.querySelector('.label')?.textContent||el.getAttribute('aria-label')||el.innerText).trim())));
        upload=findUpload();
        if(!upload){const add=document.querySelector('button[aria-label="Add media menu"]')||[...document.querySelectorAll('button[aria-label*="Add ingredients" i],button.add-menu-trigger,flow-add-menu button')].find(visible);if(!add)throw new Error('Flow Add ingredients button was not found');add.click();}
        const deadline=Date.now()+6000;
        while(!(upload=findUpload())&&Date.now()<deadline)await pause();
        if(!upload)throw new Error('Flow upload button did not become ready');
        const before=new Set(document.querySelectorAll('input[type=file]'));let input;
        // Port catchUploadFile.js too: Flow may click a detached input, invisible to DOM queries.
        const originalClick=HTMLInputElement.prototype.click;
        const capture=function(...args){if(this.type==='file'){window.__agFlowUploadInput=this;return;}return originalClick.apply(this,args);};
        HTMLInputElement.prototype.click=capture;
        try{
          upload.click();
          const inputDeadline=Date.now()+400;while(Date.now()<inputDeadline){const inputs=[...document.querySelectorAll('input[type=file]')];input=window.__agFlowUploadInput||inputs.find(i=>!before.has(i))||inputs.at(-1);if(input)break;await pause();}
        }finally{if(HTMLInputElement.prototype.click===capture)HTMLInputElement.prototype.click=originalClick;}
        if(!input){
          // Current XAP upload controls require a trusted click and keep their input detached.
          window.__agFlow?.escape();const add=document.querySelector('button[aria-label="Add media menu"]')||document.querySelector('button.add-menu-trigger');
          if(add)add.click();const until=Date.now()+4000;while(!(upload=findUpload())&&Date.now()<until)await pause();
          if(!upload)throw new Error('Flow upload button is not ready for trusted file selection');
          const r=upload.getBoundingClientRect(),v=visualViewport;
          return {injected:false,tap:{fx:(r.left+r.width/2-(v?.offsetLeft||0))/(v?.width||innerWidth),fy:(r.top+r.height/2-(v?.offsetTop||0))/(v?.height||innerHeight)}};
        }
        window.__agFlowUploadInput=input;
        if(!base64)return {injected:false};
        let transfer;
        try{const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));transfer=new DataTransfer();transfer.items.add(new File([bytes],name,{type:mime}));input.files=transfer.files;}catch(error){return {injected:false,reason:error.message};}
        input.dispatchEvent(new Event('change',{bubbles:true}));return {injected:true};
      },[{name,mime,base64}]);
      if(!prepared.injected&&prepared.tap){
        if(!chooser?.backendNodeId)await this.chrome.antigem.automation({tabId,tap:prepared.tap});
        await this.wait(()=>chooser?.backendNodeId,6000,20);
        await this.chrome.debugger.sendCommand({tabId},'DOM.setFileInputFiles',{files:[file.path],backendNodeId:chooser.backendNodeId});
      }else if(!prepared.injected){
        const object=await this.chrome.debugger.sendCommand({tabId},'Runtime.evaluate',{expression:'window.__agFlowUploadInput',returnByValue:false});
        if(!object.result?.objectId)throw new Error('Flow upload input disappeared before file binding');
        await this.chrome.debugger.sendCommand({tabId},'DOM.setFileInputFiles',{files:[file.path],objectId:object.result.objectId});
      }
      const id=await this.wait(async()=>{const r=await this.js(tabId,`s.uploadsAfter(${mark})`);if(r.errors?.length)throw new Error(r.errors.join('; '));return r.ids?.[0];},180000,100);
      await this.media(tabId,id);this.uploads.set(key,id);this.libraryCache.clear();return id;
    } finally {
      this.chrome.debugger.onEvent.removeListener(onChooser);
      await this.chrome.debugger.sendCommand({tabId},'Page.setInterceptFileChooserDialog',{enabled:false}).catch(()=>{});
      await this.js(tabId,'(delete window.__agFlowUploadInput,s.escape(),s.closeAddMenu())').catch(()=>{});
    }
  }

  expectation(req, refs, start, end) {
    const exp = { count:req.count, dryRun:req.dry_run };
    if (!req.video) return { ...exp,rpcs:[RPC.GENERATE_IMAGES], modelKey:IMAGE_KEYS[req.model],aspect:IMAGE_ASPECTS[req.aspect],refs };
    const kind = start && end ? 'VIDEO_START_END' : start ? 'VIDEO_START' : refs.length ? 'VIDEO_REFERENCES' : 'VIDEO_TEXT';
    const must = start && end ? ['first_last|_fl$|interpolation'] : start ? ['i2v'] : refs.length ? ['r2v'] : ['t2v'];
    const mustNot = start && !end ? ['first_last|_fl$|interpolation'] : [];
    if (req.model.includes('Omni')) { must.push('^(abra|omni)_','_' + req.duration + 's'); if(req.resolution==='360p')must.push('_360p$');else mustNot.push('_360p'); }
    else if(req.model.includes('Lite'))must.push('^veo_3_1_.*lite');
    else{must.push(req.model.includes('Fast')?'^veo_3_1_.*fast':'^veo_3_1_');if(!req.model.includes('Fast'))mustNot.push('lite|fast');if(req.aspect==='9:16')must.push('portrait');else mustNot.push('portrait');}
    return { ...exp,rpcs:[RPC[kind]],aspect:req.aspect === '9:16' ? 1 : 2,keyMust:must,keyMustNot:mustNot,refs:refs.length ? refs : undefined,start,end };
  }
  async send(tabId, expectation, trigger, prepared) {
    const armed = prepared || await this.js(tabId, `(s.expect(${quoted(quoted(expectation))}),s.capMark())`);
    try {
      if (trigger) await trigger();
      else {
        const target = prepared?.target || await this.evaluate(tabId, async () => { const s = window.__agFlow; const end = Date.now() + 10000; let previous;
          while (Date.now() < end) { const info = s.submitInfo(); if (info.canTap && !info.disabled && previous && Math.abs(previous.fx-info.fx)<0.002 && Math.abs(previous.fy-info.fy)<0.002) return info; previous=info; await new Promise(r => requestAnimationFrame(r)); } throw new Error('Flow Send button is not ready'); });
        // Preserve Android's trusted touch path and CSS-to-viewport conversion.
        await this.chrome.antigem.automation({ tabId, tap:{ fx:target.fx,fy:target.fy } });
      }
      const outcome = await this.evaluate(tabId,async n=>{const end=Date.now()+30000;while(Date.now()<end){const r=window.__agFlow.capSent(n);if(r.found)return r;await new Promise(r=>setTimeout(r,15));}throw new Error('Flow did not issue a generation request');},[armed.n]);
      if (outcome.blocked && outcome.problems?.[0] !== 'dry-run') { await this.js(tabId,'s.invalidateSettings()'); throw new Error('Request blocked before sending: ' + outcome.problems.join('; ')); }
      if (outcome.problems?.[0] === 'dry-run') return { ...outcome,dryRun:true,sent:{ ...outcome.sent,guard_ok:outcome.problems.length === 1,guard_problems:outcome.problems.slice(1) } };
      this.pending++; return outcome;
    } finally { await this.js(tabId,'s.clearExpect()'); }
  }
  async submit(job) {
    const req = job.request, tabId = await this.tab(); job.tabId = tabId; await this.begin(tabId);
    try {
      // Warm batches need one page evaluation to fill, validate cached settings and locate Send.
      if(!req.new_project&&!req.references.length&&!req.start_frame&&!req.end_frame){
        const expectation=this.expectation(req,[],null,null);
        const fast=await this.evaluate(tabId,async(req,expectation)=>{
          const s=window.__agFlow;if(!s)return null;
          const ui=s.ui();if(!ui.projectId||req.project_id&&ui.projectId!==req.project_id||ui.path!=='/project/'+ui.projectId||ui.agentOn||s.chipIds().length)return null;
          const key=JSON.stringify([req.video,req.model,req.aspect,req.resolution,req.duration,req.count,false]);
          const cached=s.cachedSettings(key);if(!cached.matches)return null;
          if(req.budget&&cached.cost!=null&&!req.dry_run&&req.budget.used+cached.cost>req.budget.limit)throw new Error('Skipped: max_credits would be exceeded');
          if(!s.fastInsertPrompt(req.prompt).success)return null;
          let target,previous;const end=Date.now()+3000;
          while(Date.now()<end){target=s.submitInfo();if(target.canTap&&!target.disabled&&previous&&Math.abs(previous.fx-target.fx)<.002&&Math.abs(previous.fy-target.fy)<.002)break;previous=target;await new Promise(r=>requestAnimationFrame(r));}
          if(!target?.canTap||target.disabled)return null;
          s.expect(JSON.stringify(expectation));return {...s.capMark(),target,projectId:ui.projectId,cost:cached.cost};
        },[req,expectation]);
        if(fast){job.abort.signal.throwIfAborted();this.currentProjectId=fast.projectId;job.fast_path=true;job.project_id=fast.projectId;job.credits_used=req.dry_run?0:fast.cost;if(req.budget&&fast.cost!=null&&!req.dry_run){req.budget.used+=fast.cost;job.reserved=fast.cost;}job.stage='submitting';job.send_attempted=true;const sub=await this.send(tabId,expectation,null,fast);if(!sub.dryRun){job.reserved=0;job.submitted=true;}return sub;}
      }
      job.fast_path=false;
      job.stage = 'opening project'; const projectId = await this.project(tabId,req.project_id,req.new_project); job.project_id=projectId;this.currentProjectId=projectId;
      await this.js(tabId,'s.agentOff()');
      job.stage='resolving references'; const refs=[]; for(const ref of req.references) refs.push(await this.resolveReference(tabId,ref));
      const start=req.start_frame ? await this.resolveReference(tabId,req.start_frame) : null, end=req.end_frame ? await this.resolveReference(tabId,req.end_frame) : null;
      const ids=[...refs,...[start,end].filter(Boolean)], library=ids.length ? await this.contents(tabId,projectId,true) : [];
      const names=new Map(library.map(m=>[m.mediaId,m.title || m.mediaId])); for(const id of ids) if(!names.has(id)){const m=await this.media(tabId,id);names.set(id,m.title || id);}
      job.stage='applying settings'; await this.clear(tabId); const cost=await this.settings(tabId,req); job.credits_used=req.dry_run ? 0 : cost;
      if(req.budget && cost!=null && !req.dry_run){if(req.budget.used+cost>req.budget.limit)throw new Error('Skipped: max_credits would be exceeded');req.budget.used+=cost;job.reserved=cost;}
      job.stage='entering prompt'; if(!(await this.js(tabId,`s.fastInsertPrompt(${quoted(req.prompt)})`)).success)throw new Error('Flow did not accept the prompt');
      job.stage='attaching references';for(const id of refs)await this.attach(tabId,id,names.get(id));if(start)await this.attach(tabId,start,names.get(start),'Start');if(end)await this.attach(tabId,end,names.get(end),'End');
      if(ids.length)await this.settings(tabId,req);
      const actual=await this.js(tabId,'s.chipIds()'); if(JSON.stringify(actual)!==JSON.stringify(ids))throw new Error('The attached reference ids differ from the request');
      if((await this.js(tabId,'s.promptValue().value'))!==req.prompt.replace(/\s+/g,' ').trim())if(!(await this.js(tabId,`s.fastInsertPrompt(${quoted(req.prompt)})`)).success)throw new Error('Prompt was lost while attaching references');
      job.abort.signal.throwIfAborted();job.stage='submitting';job.send_attempted=true;const sub=await this.send(tabId,this.expectation(req,refs,start,end));if(!sub.dryRun){job.reserved=0;job.submitted=true;}return sub;
    } catch(error) { if(job.reserved&&(!job.send_attempted||/Request blocked before sending/.test(error.message))){req.budget.used-=job.reserved;job.credits_used=0;}else if(!job.send_attempted)job.credits_used=0;await this.end(tabId);throw error; }
  }
  async collect(job, sub) {
    const tabId=job.tabId;
    try {
      if(sub.dryRun){job.request_sent=sub.sent;job.status='done';job.stage='dry run: blocked before sending';return;}
      job.stage=job.request.video?'submitting video':'generating image';let reply;
      try{reply=await this.wait(async()=>{const r=await this.js(tabId,`s.capResult(${sub.seq})`);if(r.lost)throw new Error('Flow page reloaded before its reply; check flow_list_media before retrying');return r.done&&r;},job.request.video?60000:240000,500,job.abort.signal);}finally{this.pending=Math.max(0,this.pending-1);}
      if(reply.error)throw new Error(reply.error);
      if(reply.images){job.media_ids=reply.images.map(x=>x.mediaId);job.files=[];for(const image of reply.images)job.files.push(await this.file(tabId,image.mediaId,image.url));}
      else if(reply.mediaId && !job.request.video){job.media_ids=[reply.mediaId];job.files=[await this.file(tabId,reply.mediaId)];}
      else {let ids=reply.mediaIds || [];if(!ids.length&&job.request.action==='upscale_video')ids=await this.wait(async()=>{const items=await this.contents(tabId,job.project_id);const fresh=items.filter(m=>m.type==='video'&&!job.knownMedia.includes(m.mediaId)).map(m=>m.mediaId);return fresh.length&&fresh;},120000,1000,job.abort.signal);if(!ids.length)throw new Error('Flow response contained no media ids');job.media_ids=ids;job.files=[];
        await this.wait(async()=>{const statuses=await this.statusVideos(tabId,ids);for(const id of ids){if(job.files.some(f=>f.media_id===id))continue;const status=statuses.find(s=>s.mediaId===id)?.status;if(status===3)job.files.push(await this.file(tabId,id));else if(status!=null&&![1,2,6].includes(status))throw new Error(`Flow video ${id} failed (status ${status})`);}job.stage=`generating video (${job.files.length}/${ids.length})`;return job.files.length===ids.length;},1200000,2000,job.abort.signal);
      }
      this.history.push(...job.files);this.history=this.history.slice(-200);job.status='done';job.stage='done';
    } finally { await this.end(tabId); }
  }
  async file(tabId,id,url) { const media=await this.media(tabId,id),type=media.type==='video'?'video':'image';const filename=`~/flow-media/flow_${id}.${type==='video'?'mp4':'jpg'}`;const saved=await this.chrome.antigem.download({url:url || media.url,path:filename,reuse:true});return {media_id:id,type,path:saved.path,title:media.title || ''}; }
  async tileAction(tabId,title,steps) { await this.js(tabId,`s.gridSearch(${quoted(title)})`);await this.wait(async()=> (await this.js(tabId,`s.tileCount(${quoted(title)})`)).count===1,6000);await this.wait(async()=> (await this.js(tabId,`s.tileMenu(${quoted(title)})`)).ok,4000);for(const step of steps)await this.wait(async()=>{const r=await this.js(tabId,`s.menuClick(${quoted(step)})`);if(r.disabled)throw new Error('Flow action is disabled: '+step);return r.ok;},4000); }
  async submitEdit(job) {
    const req=job.request,tabId=await this.tab();job.tabId=tabId;await this.begin(tabId);
    try {
      const media=await this.media(tabId,req.media_id);job.project_id=media.projectId;
      const up=req.action.startsWith('upscale');
      if(up){await this.page(tabId,media.projectId);job.knownMedia=(await this.contents(tabId,media.projectId)).map(m=>m.mediaId);return await this.send(tabId,{rpcs:[req.video?RPC.UPSCALE_VIDEO:RPC.UPSCALE_IMAGE],mediaId:req.media_id,dryRun:req.dry_run},()=>this.tileAction(tabId,media.title || req.media_id,['Download',req.video?req.resolution:req.resolution+' Upscaled']));}
      if(req.action==='extend'&&!media.modelKey?.startsWith('veo'))throw new Error('Extend requires a Veo clip; use extract_frame and start_frame for Omni');
      await this.page(tabId,media.projectId,`/edit/${media.workflowId}`);await this.js(tabId,'s.agentOff()');
      if(req.action==='extend'){await this.wait(async()=> (await this.js(tabId,"s.clickAria('Add clip')")).ok,8000);await this.wait(async()=> (await this.js(tabId,"s.menuClick('Extend')")).ok,4000);}
      if(!req.video){const versions=(await this.contents(tabId,media.projectId)).filter(m=>m.workflowId===media.workflowId);if(versions.at(-1)?.mediaId!==req.media_id){await this.js(tabId,'s.openHistory()');const count=(await this.js(tabId,'s.historyCount()')).count;let found=false;for(let i=count-1;i>=0;i--){await this.js(tabId,`s.historyClick(${i})`);try{await this.wait(async()=> (await this.js(tabId,'s.mainImageId()')).id===req.media_id,1500);found=true;break;}catch{}}if(!found)throw new Error('Requested image version was not found');}}
      await this.clear(tabId);await this.js(tabId,`s.fastInsertPrompt(${quoted(req.prompt)})`);
      const refs=[];for(const value of req.references||[]){const id=await this.resolveReference(tabId,value),m=await this.media(tabId,id);await this.attach(tabId,id,m.title||id);refs.push(id);}
      const expectation={rpcs:[req.action==='extend'?RPC.EXTEND_VIDEO:req.video?RPC.EDIT_VIDEO:RPC.GENERATE_IMAGES],mediaId:req.media_id,dryRun:req.dry_run};
      if(!req.video)Object.assign(expectation,{count:1,refs:[req.media_id,...refs],workflowId:media.workflowId,...(req.model?{modelKey:IMAGE_KEYS[req.model]}:{}),...(req.aspect?{aspect:IMAGE_ASPECTS[req.aspect]}:{})});
      return await this.send(tabId,expectation);
    }catch(error){await this.end(tabId);throw error;}
  }
}
