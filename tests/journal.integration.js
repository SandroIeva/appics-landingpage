import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {del,list} from '@vercel/blob';
process.loadEnvFile('.env.local');
const base=process.env.JOURNAL_TEST_URL||'http://127.0.0.1:4180';
const password=readFileSync('.editor-access.txt','utf8').match(/Password: (.+)/)[1];
async function call(action,body,cookie=''){const response=await fetch(base+'/api/journal?action='+action,{method:body?'POST':'GET',headers:{Origin:base,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});return {response,data:await response.json()};}
const unauthorized=await call('list&admin=1');assert.equal(unauthorized.response.status,401);
const denied=await call('save',{post:{}});assert.equal(denied.response.status,401);
const login=await call('login',{password});assert.equal(login.response.status,200);const cookie=login.response.headers.get('set-cookie').split(';')[0];
const session=await call('session',null,cookie);assert.equal(session.data.authenticated,true);
const seed=(await call('list&admin=1',null,cookie)).data.posts[0];
const id='integration-check-'+Date.now();const post={...seed,id,slug:id,title:'Integration check — disposable draft',status:'draft',featured:false};delete post.revision;
let saved;let uploadedId;
try{
 const image=readFileSync('dist'+seed.image).toString('base64');
 const uploaded=await call('upload',{type:'image/webp',data:image},cookie);assert.equal(uploaded.response.status,200,JSON.stringify(uploaded.data));uploadedId=uploaded.data.image.split('id=')[1];post.image=uploaded.data.image;
 saved=await call('save',{post},cookie);assert.equal(saved.response.status,200,JSON.stringify(saved.data));
 const privateMedia=await fetch(base+post.image);assert.equal(privateMedia.status,404);
 const publicList=await call('list');assert.equal(publicList.data.posts.some(p=>p.id===id),false);
 const preview=await fetch(base+'/api/journal?action=preview&slug='+id,{headers:{Cookie:cookie}});assert.equal(preview.status,200);assert.ok((await preview.text()).includes('DRAFT PREVIEW'));
 const conflict=await call('save',{post,revision:'wrong'},cookie);assert.equal(conflict.response.status,409);
 const published=await call('save',{post:{...saved.data.post,status:'published'},revision:saved.data.post.revision},cookie);assert.equal(published.response.status,200,JSON.stringify(published.data));
 const publicMedia=await fetch(base+post.image);assert.equal(publicMedia.status,200);
 const listed=await call('list');assert.ok(listed.data.posts.some(p=>p.id===id));
 const draftAgain=await call('save',{post:{...published.data.post,status:'draft'},revision:published.data.post.revision},cookie);assert.equal(draftAgain.response.status,200);
 const hidden=await fetch(base+'/journal/story/'+id+'/');assert.equal(hidden.status,404);
 const logout=await call('logout',{},cookie);assert.equal(logout.response.status,200);
 console.log('PASS: optimized image upload, private image access, authentication, private drafts, preview, conflict protection, publication, unpublish, and logout.');
}finally{
 const result=await list({prefix:'journal/history/'+id+'/'});const paths=result.blobs.map(b=>b.url);paths.push('journal/articles/'+id+'.json');if(uploadedId)paths.push('journal/media/'+uploadedId);await del(paths);
}
