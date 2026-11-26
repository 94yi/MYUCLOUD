"""Run interactively on the server. Credentials never appear in shell arguments."""
import getpass
import json
import subprocess
import sys
if not sys.stdin.isatty():
    sys.exit("请在服务器的交互终端运行。")
if sys.argv[1:] == ["--renew"]:
    from pathlib import Path
    refresh = getpass.getpass("请输入网页「复制给 Agent」中 --refresh 后的值（隐藏输入）：").strip()
    if not refresh:
        sys.exit("已取消，未更改现有登录。")
    result = subprocess.run(["node", str(Path(__file__).resolve().with_name("confirm-renewal.mjs"))], input=refresh, text=True)
    if result.returncode:
        sys.exit(result.returncode)
    sys.exit(subprocess.run(["systemctl", "--user", "restart", "snoval-automation.service"]).returncode)
token = getpass.getpass("Snoval 网页登录凭据 Blade-Auth（隐藏输入）：").strip().removeprefix("Bearer ").strip()
if not token:
    sys.exit("未输入，已取消。")
refresh = getpass.getpass("refresh_token（隐藏输入；没有可留空）：").strip()
code = """
import fs from 'node:fs';
import {createClient,createSessionStore} from '../agent/client.js';
const s=JSON.parse(fs.readFileSync(0,'utf8'));
const store=createSessionStore();
const c=createClient({backend:s.backend,store:{read:()=>s,write:v=>Object.assign(s,v)}});
try{const d=await c.request('GET','/ykt-basics/info');if(!d?.data?.id)throw Error();store.write(s);console.log('学校登录已验证。')}
catch{console.error('学校身份未验证，未保存新凭据。');process.exitCode=1}
"""
from pathlib import Path
result = subprocess.run(["node", "--input-type=module", "-e", code], cwd=Path(__file__).resolve().parent, input=json.dumps(dict(token=token, refreshToken=refresh, backend="https://snoval.link")), text=True)
sys.exit(result.returncode)
