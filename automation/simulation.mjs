import assert from 'node:assert/strict'
import {pages,discover,actReview} from './worker.mjs'
const state={tasks:{}}
discover(state,[{key:'old'}]);discover(state,[{key:'old'},{key:'new'}])
assert.equal(state.tasks.old.step,'excluded');assert.equal(state.tasks.new.step,'new')
await assert.rejects(pages(async()=>({records:[],total:1})))
const row={id:'2',assignment:'3',isEvaluated:0,canEnter:1,submitTime:'2026-01-01 08:00:00',rules:{}},cfg={score:5,evaluation:''};let submitted=[],score=0
const peer={rows:async()=>[row],detail:async()=>({score,evaluation:''}),submit:async q=>{submitted.push(q);score=q.score}}
for(const extra of [{isEvaluated:1},{canEnter:0},{score:4}])await actReview({...row,...extra},{step:'new'},()=>{},peer,cfg)
for(const submitTime of [null,'','2099-01-01 08:00:00']){
 await actReview(row,{step:'new'},()=>{},{...peer,rows:async()=>[{...row,submitTime}]},cfg)
}
score=4;await actReview(row,{step:'new'},()=>{},peer,cfg);assert.deepEqual(submitted,[]);score=0;const rt={step:'new'};await actReview(row,rt,()=>{},peer,cfg);await actReview(row,rt,()=>{},peer,cfg);assert.deepEqual(submitted,[{id:'2',score:5,evaluation:''}]);console.log('模拟通过：旧任务排除、互评权限与已有评分、五星空评语')
