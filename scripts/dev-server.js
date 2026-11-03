import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
try{process.loadEnvFile('.env.local')}catch{}
const {default:handler}=await import('../api/journal.js');
const root=resolve('dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 try{
  if(url.pathname==='/api/journal'||url.pathname==='/journal/'||url.pathname==='/journal'||url.pathname.startsWith('/journal/story/')){
   req.query=Object.fromEntries(url.searchParams);
   if(url.pathname==='/journal'||url.pathname==='/journal/')req.query.action='index';
   if(url.pathname.startsWith('/journal/story/')){req.query.action='article';req.query.slug=url.pathname.split('/')[3]}
   if(req.method==='POST'){let body='';for await(const chunk of req){body+=chunk;if(body.length>4000000){res.statusCode=413;res.end('{"error":"Upload too large."}');return}}try{req.body=JSON.parse(body)}catch{res.statusCode=400;res.end('{"error":"Invalid request."}');return}}
   return await handler(req,res);
  }
  let path=resolve(root,'.'+decodeURIComponent(url.pathname));if(path!==root&&!path.startsWith(root+sep)){res.statusCode=403;res.end();return}
  const info=await stat(path);if(info.isDirectory())path=resolve(path,'index.html');
  const file=await readFile(path);res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');res.end(file);
 }catch{res.statusCode=404;res.end('Not found')}
});
server.listen(Number(process.env.PORT)||4180,'127.0.0.1',()=>console.log('APPICS preview: http://127.0.0.1:'+(Number(process.env.PORT)||4180)));
