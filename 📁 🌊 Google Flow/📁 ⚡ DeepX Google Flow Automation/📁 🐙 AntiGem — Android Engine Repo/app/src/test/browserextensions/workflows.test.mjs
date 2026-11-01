import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const workflowSource=fs.readFileSync('extensions/google-flow/flow-workflows.js','utf8').replace(/^import .*;\n/gm,'').replace('export function','function');
function fixture({submit}={}) {
  const jobs=new Map(), requests=[], storage={characters:{}}, copied=[];
  const scope={crypto,AbortController,setTimeout,IMAGE_MODELS:['Nano Banana 2.1'],VIDEO_MODELS:['Omni 1.1 Flash'],analyzeAndBreakdownScript:args=>({storyboard:[{prompt:args.raw_input}],entities:[],heroReferences:[]}),setLocalAssetIndex(){}};
  vm.runInNewContext(workflowSource+'\nglobalThis.createFlowWorkflows=createFlowWorkflows;',scope);
  const chrome={storage:{local:{get:async()=>storage,set:async value=>Object.assign(storage,value)}},antigem:{listFiles:async()=>[],copyFile:async p=>{copied.push(p);return {path:p.to}}}};
  const client={begin:async()=>{},end:async()=>{},libraryCache:new Map(),tab:async()=>1,js:async()=>({projectId:'project-a'}),evaluate:async(tab,fn,args)=>fn(...args),exclusive:fn=>fn()};
  const snapshot=j=>Object.fromEntries(Object.entries(j).filter(([k])=>!['abort','completion','request'].includes(k)));
  const awaitJobs=async(selected,seconds)=>{if(seconds)await Promise.all(selected.map(j=>j.completion));return selected.length===1?snapshot(selected[0]):selected.map(snapshot)};
  const enqueue=req=>{requests.push(req);const job={job_id:String(jobs.size),abort:new AbortController(),status:'queued',request:req,files:[],media_ids:[]};jobs.set(job.job_id,job);job.completion=Promise.resolve().then(async()=>{if(submit)await submit(job,requests.length);else{job.status='done';job.project_id='project-a';job.fast_path=requests.length>1;job.media_ids=['media-'+job.job_id];job.files=[{path:'~/source.jpg',media_id:job.media_ids[0],type:'image'}]}});return job};
  const execute=async(tool,args)=>({tool,args});
  const api=scope.createFlowWorkflows({chrome,client,execute,jobs,enqueue,normalize:v=>v,awaitJobs,snapshot});return {api,jobs,requests,client,storage,copied};
}
test('Chrome aliases normalize model names, all reference IDs, no_references and eval code',async()=>{
  const {api}=fixture();const result=await api.call('deepx_generate_image',{prompt:'image',model:'imagen-3',reference_media_ids:['first','second']});
  assert.equal(result.tool,'flow_generate_image');assert.equal(result.args.model,'Nano Banana 2.1');assert.deepEqual([...result.args.references],['first','second']);
  assert.equal((await api.call('deepx_generate_video',{prompt:'video',reference_assets:['a'],no_references:true})).args.references.length,0);
  assert.equal(await api.call('deepx_eval_script',{code:'21*2'}),42);
  await assert.rejects(api.call('deepx_generate_image',{prompt:'x',seed:1}),/seed/);
});
test('rapid batch queues ten prompts with ordered scene records and shared budget',async()=>{
  const {api,requests,jobs}=fixture();let result=await api.call('flow_batch_generate',{mode:'textToImage',prompts:Array.from({length:10},(_,i)=>'scene '+i),max_credits:50,wait_seconds:1,download_folder:'renders',tag_filenames:true});
  const job=jobs.get(result.job_id);await job.completion;result=job;assert.equal(result.status,'done');assert.equal(result.completed,10);assert.equal(requests.length,10);assert.equal(new Set(requests.map(r=>r.budget)).size,1);assert.equal(requests[0].budget.limit,50);assert.deepEqual([...result.scenes].map(s=>s.index),[0,1,2,3,4,5,6,7,8,9]);
});
test('ambiguous Send is never retried, while a known pre-send failure may retry',async()=>{
  for(const ambiguous of [true,false]){
    let tries=0;const {api,requests,jobs}=fixture({submit:async job=>{tries++;if(tries===1){job.status='failed';job.send_attempted=ambiguous;job.error='Flow Send button is not ready';}else{job.status='done';job.project_id='project-a';}}});
    const result=await api.call('flow_batch_generate',{mode:'textToImage',prompts:['one'],max_retries:2,wait_seconds:1});await jobs.get(result.job_id).completion;
    assert.equal(requests.length,ambiguous?1:2);assert.equal(jobs.get(result.job_id).status,ambiguous?'failed':'done');
  }
});
test('cancellation propagates to workflow children and image scene chains reject',async()=>{
  const {api,jobs}=fixture({submit:async job=>{await new Promise(resolve=>job.abort.signal.addEventListener('abort',resolve,{once:true}));job.status='cancelled';}});
  await assert.rejects(api.call('flow_batch_generate',{mode:'textToImage',prompts:['x'],is_concat:true}),/video/);
  const result=await api.call('flow_batch_generate',{prompts:['one','two'],wait_seconds:0});const parent=jobs.get(result.job_id);await new Promise(r=>setTimeout(r,10));parent.status='cancelled';parent.abort.abort();await parent.completion;
  assert.equal(parent.status,'cancelled');for(const id of parent.child_job_ids)assert.equal(jobs.get(id).abort.signal.aborted,true);
});
