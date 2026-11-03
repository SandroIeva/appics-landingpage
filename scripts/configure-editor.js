import {randomBytes,scryptSync} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const cli='/Users/sandroieva/.npm/_npx/69f9afb961c37556/node_modules/.bin/vercel';
let env=readFileSync('.env.local','utf8');
if(env.includes('JOURNAL_PASSWORD_HASH=')){console.log('Editor credentials already configured.');process.exit(0)}
const password=randomBytes(24).toString('base64url');const salt=randomBytes(16).toString('hex');
const values={JOURNAL_PASSWORD_HASH:`${salt}:${scryptSync(password,salt,32).toString('hex')}`,JOURNAL_SESSION_SECRET:randomBytes(48).toString('hex')};
for(const[name,value]of Object.entries(values)){
 const result=spawnSync(cli,['env','add',name,'--environment','production,preview,development','--sensitive','--yes'],{input:value+'\n',encoding:'utf8'});
 if(result.status!==0){console.error('Could not configure '+name);process.exit(1)}
 env+=`\n${name}="${value}"\n`;
}
writeFileSync('.env.local',env,{mode:0o600});
writeFileSync('.editor-access.txt',`APPICS JOURNAL — EDITOR ACCESS\n\nEditor: https://appics-landingpage.vercel.app/journal/editor/\nLocal preview: http://127.0.0.1:4180/journal/editor/\n\nPassword: ${password}\n\nKeep this file private. This file is excluded from Git and deployment.\n`,{mode:0o600});
console.log('Editor login configured. Access details saved privately in .editor-access.txt.');
