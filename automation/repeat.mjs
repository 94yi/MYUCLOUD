// Compare option text, never letters or transient option IDs, between attempts.
const signature=q=>JSON.stringify([q.stem,q.part??'',q.type,q.blankCount??0,(q.options??[]).map(o=>o.content).sort()])
function portable(q,raw){
 if(!q.options)return raw
 const keys=(Array.isArray(raw)?raw:String(raw).split(',')).map(String)
 if(!keys.length)return null
 const matches=keys.map(k=>q.options.find(o=>o.key===k.trim()||String(o.id)===k.trim()))
 return matches.every(Boolean)?matches.map(o=>o.content).sort():null
}
export async function planRepeat(paper,solve){
 const plan={}, hard=[]
 if(!paper.questions?.length||!paper.questions.every(q=>['correct','wrong','partial'].includes(q.result)))return null
 for(const q of paper.questions){
  const key=signature(q)
  if(Object.hasOwn(plan,key))return null
  let a
  if(q.result==='correct')a=q.yourAnswer
  else if(q.rightKeys?.length)a=q.rightKeys
  else if(q.result==='wrong'&&q.options?.length===2&&q.yourAnswer?.length===1&&['判断','单选'].includes(q.type))a=q.options.filter(o=>!q.yourAnswer.includes(o.key)).map(o=>o.key)
  else hard.push(q)
  plan[key]=a==null?null:portable(q,a)
 }
 if(hard.length){
  const revised=JSON.parse(await solve(hard.map(q=>({...q,instruction:'上次答案未得满分；根据反馈重新解题。'}))))
  for(const q of hard)plan[signature(q)]=portable(q,revised[q.id])
 }
 if(Object.values(plan).some(a=>a==null||a===''||(Array.isArray(a)&&!a.length)))return null
 if(!paper.questions.some(q=>q.result!=='correct'&&JSON.stringify(plan[signature(q)])!==JSON.stringify(portable(q,q.yourAnswer))))return null
 return plan
}
export async function applyPlan(questions,plan,solve){
 const out={},unknown=[]
 for(const q of questions){
  const a=plan[signature(q)]
  if(a==null){unknown.push(q);continue}
  if(!q.options){out[q.id]=a;continue}
  const opts=a.map(text=>q.options.filter(o=>o.content===text))
  if(opts.some(list=>list.length!==1))unknown.push(q)
  else out[q.id]=opts.map(list=>list[0].id)
 }
 if(unknown.length)Object.assign(out,JSON.parse(await solve(unknown)))
 return JSON.stringify(out)
}
