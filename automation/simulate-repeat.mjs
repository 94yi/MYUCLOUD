import assert from 'node:assert/strict'
import {actQuiz} from './worker.mjs'
const now=Date.now(),id='fixture',base={stem:'模拟判断',type:'判断',options:[{key:'A',id:'a',content:'是'},{key:'B',id:'b',content:'否'}]},t={step:'feedback'}
const old={...base,id:'old',yourAnswer:['A'],result:'wrong'},fresh={...base,id:'fresh',options:[{key:'A',id:'x',content:'否'},{key:'B',id:'y',content:'是'}]}
let submitted=0,starts=0
const io={info:async()=>({submitted:true,allowRepeat:true,endAt:new Date(now+360000).toISOString()}),result:async()=>({score:submitted?10:0,totalPoints:10,questions:[old]}),start:async()=>{starts++;return {questions:[fresh],remainingSeconds:60}},save:async(i,a)=>{assert.deepEqual(JSON.parse(a),{fresh:['x']});return {unsaved:[]}},submit:async()=>submitted++}
await actQuiz({id},t,()=>{},io,()=>now);assert.equal(submitted,1);await actQuiz({id},t,()=>{},io,()=>now+61000);assert.equal(t.step,'done');assert.equal(starts,1)
const once={step:'feedback'};await actQuiz({id},once,()=>{},{...io,info:async()=>({allowRepeat:false})},()=>now);assert.equal(once.step,'done');assert.equal(starts,1);console.log('repeat flow verified')
