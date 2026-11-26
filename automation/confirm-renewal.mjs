import fs from 'node:fs'
import {createClient,createSessionStore} from '../agent/client.js'
export async function verifyRenewal({refresh,store,uid,fetch}) {
 if(!refresh||!uid)throw Error('缺少授权')
 const existing=store.read()
 const c=createClient({backend:'https://snoval.link',fetch,store:{read:()=>({...existing,refreshToken:refresh}),write:()=>{}}})
 if(!await c.refresh())throw Error('续期被拒绝')
 const info=await c.request('GET','/ykt-basics/info')
 if(String(info?.data?.id)!==String(uid))throw Error('学校账号不匹配')
 store.write(c.session)
}
import {pathToFileURL} from 'node:url'
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{await verifyRenewal({refresh:fs.readFileSync(0,'utf8').trim(),store:createSessionStore(),uid:JSON.parse(fs.readFileSync('quiz-state.json')).uid});console.log('已实际续期并确认学校账号，正在让服务加载新凭据。')}
 catch{console.error('未能验证续期凭据和学校账号，未替换服务器登录。');process.exitCode=1}
}
