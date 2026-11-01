import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {SECURITY_HEADERS} from './security.js';
const assets=new Map([['/',['index.html','text/html; charset=utf-8']],['/index.html',['index.html','text/html; charset=utf-8']],['/membership.js',['membership.js','application/javascript; charset=utf-8']],['/membership.css',['membership.css','text/css; charset=utf-8']]]);
const root=new URL('./public/',import.meta.url);
export function createPreviewServer(){
  return http.createServer(async(req,res)=>{
    const item=assets.get(req.url);
    if(req.method!=='GET'||!item){res.writeHead(503,{...SECURITY_HEADERS,'Content-Type':'application/json'});res.end('{"available":false,"error":"membership_unavailable"}');return;}
    try{const body=await readFile(new URL(item[0],root));res.writeHead(200,{...SECURITY_HEADERS,'Content-Type':item[1]});res.end(body);}
    catch{res.writeHead(503,{...SECURITY_HEADERS,'Content-Type':'text/plain'});res.end('Preview unavailable.');}
  });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const server=createPreviewServer();
  server.on('error',()=>{console.error('Could not start the local membership preview.');process.exitCode=1;});
  server.listen(4174,'127.0.0.1',()=>console.log('Read-only membership preview: http://127.0.0.1:4174 . No sign-in, payment, or external API is connected.'));
}
