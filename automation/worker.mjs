import fs from 'node:fs'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {fileURLToPath} from 'node:url'
import {handleHealth} from '../agent/session-alert.mjs'
import {checkSession} from '../agent/session-health.mjs'
import {isAbsolute} from 'node:path'
import {createClient} from '../agent/client.js'
import * as commands from '../agent/commands.js'
import {parseBeijingTime as time} from '../src/utils/deadline.js'
import {hasPeerReview,canReview,reviewPayload} from '../src/utils/peer-review.js'
import {pathToFileURL} from 'node:url'
let client=createClient({backend:'https://snoval.link'})
const dir=new URL('./',pathToFileURL(process.cwd()+'/'))
const path=n=>new URL(n,dir)
function read(n,d){try{return JSON.parse(fs.readFileSync(path(n)))}catch(e){if(e.code==='ENOENT')return d;throw e}}
function write(n,v){fs.writeFileSync(path(n+'.tmp'),JSON.stringify(v),{mode:0o600});fs.renameSync(path(n+'.tmp'),path(n))}
export async function pages(fetch){const out=[],seen=new Set();let total
 for(let page=1;;page++){const d=await fetch(page);if(!Array.isArray(d?.records)||d.total==null||!Number.isInteger(+d.total)||+d.total<0||(total!=null&&total!==+d.total))throw Error('分页不完整');total=+d.total
 for(const r of d.records){if(!r.id||seen.has(String(r.id)))throw Error('分页重复');seen.add(String(r.id));out.push(r)}
 if(out.length===total)return out;if(!d.records.length||out.length>total)throw Error('分页不完整')}}
export function discover(state,rows){const initial=!state.ready;for(const r of rows)if(!Object.hasOwn(state.tasks,r.key))state.tasks[r.key]={step:initial?'excluded':'new'};state.ready=true}
const data=async(m,p,opts)=>(await client.request(m,p,opts)).data
const list=(m,p,params)=>pages(current=>data(m,p,{[m==='POST'&&p.endsWith('student/list')?'json':'query']:{...params,current,size:100}}))
const reviews=id=>list('POST','/ykt-site/work/evaluation-list',{assignmentId:id})
export function eligible(r,rules){return [0,2,'0','2'].includes(r.isEvaluated)&&canReview(r,rules)&&!(Number(r.score)>0)}
async function scan(kind,uid){
 if(kind==='quiz'){let out=[];for(const course of await list('GET','/ykt-site/site/list/student/current',{userId:uid,siteRoleCode:2})){
 for(const q of await list('GET','/ykt-site/examination/list-stu',{siteId:course.id,status:-1,state:-1}))out.push({...q,key:'q:'+q.id})}return out}
 let out=[];for(const a of await list('POST','/ykt-site/work/student/list',{})){if(!hasPeerReview(a))continue
 const detail=await data('GET','/ykt-site/work/detail',{query:{assignmentId:a.id}});if(!hasPeerReview(a,detail)||!detail.assignmentMutualEvaluation)continue
 for(const r of await reviews(a.id))out.push({...r,assignment:a.id,rules:detail.assignmentMutualEvaluation,key:'r:'+a.id+':'+r.id})}return out}
export async function actReview(r,t,save,io,config){if(t.step!=='new'||!eligible(r,r.rules))return
 const row=(await io.rows(r.assignment)).find(x=>String(x.id)===String(r.id));if(!row||!eligible(row,r.rules))return
 const submittedAt=time(row.submitTime)
 if(!(submittedAt>0 && submittedAt<=Date.now()))return
 const before=await io.detail(r.id);if(!before||before.score===undefined||!Number.isFinite(Number(before.score))||Number(before.score)>0||before.evaluation)return
 const q=reviewPayload(r.id,t.onSubmission?.score??config.score,t.onSubmission?.evaluation??config.evaluation);if(!canReview(row,r.rules))return;t.step='submitting';save();await io.submit(q)
 const after=await io.detail(r.id);if(Number(after?.score)!==q.score||String(after?.evaluation??'')!==q.evaluation)throw Error('学校未确认');t.step='done';save()}
let quizHandler
async function loadQuizHandler() {
 const file=process.env.SNOVAL_QUIZ_MODULE
 if(!file || !isAbsolute(file))throw Error('测验未配置服务端处理模块')
 const plugin=await import(pathToFileURL(file).href)
 return plugin.createQuizHandler({getClient:()=>client,time,commands})
}
const reviewIO={rows:reviews,detail:id=>data('GET','/ykt-site/work/evaluation-view',{query:{id}}),submit:query=>data('POST','/ykt-site/work/evaluation-submit',{query})}
async function lane(kind){let last='',nextScan=0,rows=[],s,uid;const file=kind+'-state.json';const save=()=>write(file,s)
 if(kind==='quiz'){setInterval(()=>{if(!s||!quizHandler||!read('settings.json',{}).quiz?.enabled)return
 for(const [key,t] of Object.entries(s.tasks))if(t.step==='saved')quizHandler({id:key.slice(2)},t,save).catch(()=>console.error('quiz 交卷待核对',key))
 },1000).unref()}
 for(;;){try{const c=read('settings.json',{})[kind];if(!c?.enabled){s=null;nextScan=0;rows=[];if(fs.existsSync(path(file)))fs.unlinkSync(path(file));throw Error('已关闭')}
 if(kind==='quiz'&&!quizHandler)quizHandler=await loadQuizHandler()
 if(!client.session?.token){client=createClient({backend:'https://snoval.link'});if(!client.session?.token)throw Error('等待学校登录')}
 if(Date.now()>=nextScan){uid=(await data('GET','/ykt-basics/info')).id;if(!uid)throw Error('未确认学校账号');s??=read(file,{uid,ready:false,tasks:{}});if(s.uid!==uid)throw Error('学校账号已变更')
 rows=await scan(kind,uid);discover(s,rows);save();nextScan=Date.now()+60000}
 for(const r of [...rows].sort((a,b)=>(s.tasks[a.key].due??Infinity)-(s.tasks[b.key].due??Infinity))){const t=s.tasks[r.key];if(['done','excluded'].includes(t.step))continue
 try{if(kind==='quiz'&&t.step==='saved')continue;if(kind==='quiz')await quizHandler(r,t,save);else await actReview(r,t,save,reviewIO,c)}catch{console.error(kind,'任务处理未完成',r.key,t.step)}}
 last=''}catch(e){const msg=(!client.session?.token?'等待学校登录':e.message==='已关闭'?e.message:'等待下次核对');if(msg!==last)console.log(kind,msg);last=msg}
 await new Promise(resolve=>setTimeout(resolve,3000))}}
async function monitorSession(){let previous
 for(;;){const status=await checkSession(client);write('session-health.json',status)
 try{await handleHealth(status,{
  read:()=>read('qq-login-incident.json',null),write:v=>write('qq-login-incident.json',v),
  notify:(id,reason)=>{
   if(!process.env.SNOVAL_QQ_PYTHON)throw Error('未配置 QQ 通知')
   return promisify(execFile)(process.env.SNOVAL_QQ_PYTHON,[fileURLToPath(new URL('./qq_notice.py',import.meta.url)),id,reason],{env:{PATH:'/usr/bin:/bin',PYTHONPATH:process.env.SNOVAL_COMPANION_SRC||'',SNOVAL_OWNER_CONFIG:process.env.SNOVAL_OWNER_CONFIG,SNOVAL_AUTHORITY_DB:process.env.SNOVAL_AUTHORITY_DB},timeout:30000})
  }
 })}catch{console.error('学校登录提醒未能入队，下次检查重试')}
 if(status.state!==previous){console.log('学校登录状态:',status.state);previous=status.state}
 await new Promise(resolve=>setTimeout(resolve,300000))}}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)await Promise.all([monitorSession(),lane('quiz'),lane('review')])
