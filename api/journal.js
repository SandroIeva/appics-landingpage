import { get, list, put, BlobNotFoundError } from '@vercel/blob';
import { randomUUID, createHash } from 'node:crypto';
import { seed, validatePost, passwordMatches, issueSession, validSession, publicPost } from '../lib/journal.js';
import { renderIndex, renderArticle } from '../lib/journal-views.js';
const attempts=new Map();
const prefix='journal/articles/';
async function storedPosts(){
 if(!process.env.BLOB_READ_WRITE_TOKEN)return [];
 let cursor,blobs=[];
 do {const result=await list({prefix,limit:1000,cursor});blobs.push(...result.blobs);cursor=result.hasMore?result.cursor:undefined;}while(cursor);
 return (await Promise.all(blobs.map(async blob=>{const item=await get(blob.pathname,{access:'private',useCache:false});if(!item||item.statusCode!==200)return null;return {...JSON.parse(await new Response(item.stream).text()),revision:item.blob.etag.replace(/^W\//,'')};}))).filter(Boolean);
}
export async function allPosts(){const map=new Map(seed.map(p=>[p.id,{...p,revision:'seed'}]));for(const p of await storedPosts())map.set(p.id,p);return [...map.values()].sort((a,b)=>(a.order||0)-(b.order||0)||b.updatedAt.localeCompare(a.updatedAt));}
function json(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));}
function sameOrigin(req){if(!req.headers.origin)return false;try{return new URL(req.headers.origin).host===req.headers.host;}catch{return false;}}
function cookie(req,value,maxAge=28800){return `appics_editor=${value}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${maxAge}${req.headers.host?.startsWith('localhost')||req.headers.host?.startsWith('127.0.0.1')?'':'; Secure'}`;}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
 const query=req.query||Object.fromEntries(new URL(req.url,'http://localhost').searchParams);
 const action=query.action||'list';const authenticated=validSession(req.headers.cookie);
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return json(res,405,{error:'Method not allowed.'});}
 if(req.method==='POST'&&!sameOrigin(req))return json(res,403,{error:'This request must come from the editor.'});
 try{
  if(action==='subscribe'&&req.method==='POST'){
   if(req.body?.website)return json(res,200,{subscribed:true});
   const email=String(req.body?.email||'').trim().toLowerCase();
   if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||req.body?.consent!==true)return json(res,400,{error:'Enter a valid email and agree to receive updates.'});
   if(!process.env.BLOB_READ_WRITE_TOKEN)return json(res,503,{error:'Signups are temporarily unavailable. Please try again later.'});
   const key='newsletter:'+String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0],now=Date.now();
   const attempt=attempts.get(key);if(attempt&&attempt.until>now&&attempt.count>=5)return json(res,429,{error:'Please wait a few minutes before trying again.'});
   const entry=attempt&&attempt.until>now?attempt:{count:0,until:now+600000};entry.count++;attempts.set(key,entry);
   const id=createHash('sha256').update(email).digest('hex');
   await put('journal/subscribers/'+id+'.json',JSON.stringify({email,consent:true,consentText:'Signup submitted through the APPICS newsletter form to receive updates.',signedUpAt:new Date().toISOString(),source:'journal',status:'signed-up'}),{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json'});
   return json(res,200,{subscribed:true});
  }
  if(action==='session' &&req.method==='GET')return json(res,200,{authenticated,configured:!!process.env.JOURNAL_PASSWORD_HASH,storage:!!process.env.BLOB_READ_WRITE_TOKEN});
  if(action==='login'&&req.method==='POST'){
   const key=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];const now=Date.now();
   const attempt=attempts.get(key);if(attempt&&attempt.until>now&&attempt.count>=8)return json(res,429,{error:'Too many attempts. Please try again in 15 minutes.'});
   if(!process.env.JOURNAL_PASSWORD_HASH||!process.env.JOURNAL_SESSION_SECRET)return json(res,503,{error:'Editor login is not configured yet.'});
   if(!passwordMatches(req.body?.password)){const a=attempt&&attempt.until>now?attempt:{count:0,until:now+900000};a.count++;attempts.set(key,a);if(attempts.size>1000)for(const[k,v]of attempts)if(v.until<now)attempts.delete(k);return json(res,401,{error:'That password is not correct.'});}
   attempts.delete(key);res.setHeader('Set-Cookie',cookie(req,issueSession()));return json(res,200,{authenticated:true});
  }
  if(action==='logout'&&req.method==='POST'){res.setHeader('Set-Cookie',cookie(req,'',0));return json(res,200,{authenticated:false});}
  if(action==='save'&&req.method==='POST'){
   if(!authenticated)return json(res,401,{error:'Please sign in.'});
   if(!process.env.BLOB_READ_WRITE_TOKEN)return json(res,503,{error:'Article storage is not configured.'});
   const post=validatePost(req.body?.post);const posts=await allPosts();const previous=posts.find(p=>p.id===post.id);
   if(posts.some(p=>p.id!==post.id&&p.slug===post.slug))return json(res,409,{error:'That article URL is already in use.'});
   if(previous&&req.body.revision!==previous.revision)return json(res,409,{error:'This article changed in another session. Reload it before saving.'});
   if(post.status==='published'&&!post.publishedAt)post.publishedAt=previous?.publishedAt||new Date().toISOString();
   if(previous){const {revision,...snapshot}=previous;await put(`journal/history/${post.id}/${Date.now()}-${randomUUID()}.json`,JSON.stringify(snapshot),{access:'private',addRandomSuffix:false,contentType:'application/json'});}
   const result=await put(prefix+post.id+'.json',JSON.stringify(post),{access:'private',addRandomSuffix:false,allowOverwrite:!!previous&&previous.revision!=='seed',...(previous&&previous.revision!=='seed'?{ifMatch:previous.revision}:{}),contentType:'application/json',cacheControlMaxAge:60});
   return json(res,200,{post:{...post,revision:result.etag}});
  }
  if(action==='upload'&&req.method==='POST'){
   if(!authenticated)return json(res,401,{error:'Please sign in.'});
   if(!process.env.BLOB_READ_WRITE_TOKEN)return json(res,503,{error:'Image storage is not configured.'});
   const type=req.body?.type;const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[type];
   if(!extension||typeof req.body?.data!=='string')return json(res,400,{error:'Upload a JPG, PNG, or WebP image.'});
   const buffer=Buffer.from(req.body.data,'base64');if(buffer.length>2800000||buffer.length<12)return json(res,400,{error:'Please use an image smaller than 2.8 MB.'});
   const valid=type==='image/jpeg'?buffer[0]===255&&buffer[1]===216:type==='image/png'?buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP';
   if(!valid)return json(res,400,{error:'The file does not match its image format.'});
   const id=randomUUID()+'.'+extension;await put('journal/media/'+id,buffer,{access:'private',addRandomSuffix:false,contentType:type});return json(res,200,{image:'/api/journal?action=media&id='+id});
  }
  if(action==='media'&&req.method==='GET'){
   const id=String(query.id||'');if(!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(id))return json(res,404,{error:'Image not found.'});
   if(!authenticated){const posts=await allPosts();if(!posts.some(p=>p.status==='published'&&p.image==='/api/journal?action=media&id='+id))return json(res,404,{error:'Image not found.'});}
   const file=await get('journal/media/'+id,{access:'private'});if(!file)return json(res,404,{error:'Image not found.'});
   res.setHeader('Content-Type',file.blob.contentType);res.setHeader('Cache-Control',authenticated?'private, no-store':'public, max-age=86400');res.end(Buffer.from(await new Response(file.stream).arrayBuffer()));return;
  }
  if(action==='list'&&req.method==='GET'){
   if(query.admin==='1'&&!authenticated)return json(res,401,{error:'Please sign in.'});
   const posts=await allPosts();return json(res,200,{posts:query.admin==='1'?posts:posts.filter(p=>p.status==='published').map(publicPost)});
  }
  if((action==='index'||action==='article'||action==='preview')&&req.method==='GET'){
   if(action==='preview'&&!authenticated)return json(res,401,{error:'Please sign in to preview drafts.'});
   const posts=await allPosts();const published=posts.filter(p=>p.status==='published');let html;
   if(action==='index')html=renderIndex(published);
   else{const p=posts.find(p=>p.slug===query.slug&&(p.status==='published'||action==='preview'));if(!p){res.statusCode=404;res.setHeader('Content-Type','text/html; charset=utf-8');return res.end('<!doctype html><html lang="en"><meta charset="utf-8"><title>Story not found — APPICS</title><link rel="stylesheet" href="/journal/journal.css"><main style="padding:10vw"><h1>This story is not here.</h1><p style="margin-top:24px"><a href="/journal/">Back to the journal ↗</a></p></main></html>');}html=renderArticle(p,published,action==='preview');}
   res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;
  }
  return json(res,404,{error:'Not found.'});
 }catch(error){
  console.error('Journal request failed:',error.name,error.message);
  const conflict=error.status===412||error.name==='BlobPreconditionFailedError';
  if(conflict)return json(res,409,{error:'This article changed in another session. Reload before saving.'});
  if(action==='save'&&['Error'].includes(error.name)&&/^(Add|Choose|An article)/.test(error.message))return json(res,400,{error:error.message});
  if(error instanceof BlobNotFoundError)return json(res,404,{error:'Not found.'});
  return json(res,503,{error:'The journal is temporarily unavailable. Your unsaved draft is still in the editor. Please try again.'});
 }
}
