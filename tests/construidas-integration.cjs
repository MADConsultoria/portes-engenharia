const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const root = path.resolve(__dirname, '..');
let handler;
vm.runInNewContext(fs.readFileSync(path.join(root,'_server.js'),'utf8'),{
  require: name => name === 'http' ? { createServer(fn){handler=fn;return {listen(){}};} } : name === './clickup-lead' ? require('../clickup-lead') : require(name),
  __dirname:root,process:{env:{}},console:{log(){},error(){}},Buffer,URL,AbortSignal,
  fetch(){throw Error('Requisições externas não são permitidas neste teste.');},
});
function request(url,method='GET') {
  return new Promise((resolve,reject)=>{
    const req = Object.assign(new EventEmitter(),{url,method,headers:{}});
    let status,headers;
    const result = handler(req,{writeHead(code,values){status=code;headers=values||{};},end(body){resolve({status,headers,body:Buffer.isBuffer(body)?body.toString('utf8'):body||''});}});
    Promise.resolve(result).catch(reject);
  });
}
async function run(){
  const home=await request('/');
  assert.equal(home.status,200);
  assert.doesNotMatch(home.body,/<a\b[^>]*href="construidas\/"/);
  assert.match(home.body,/class="header-cta" href="analise\/"/);
  assert.equal((await request('/analise/')).status,200);
  const redirect=await request('/construidas?utm_source=teste');
  assert.equal(redirect.status,308);
  assert.equal(redirect.headers.Location,'/construidas/?utm_source=teste');
  assert.equal((await request('/construidas','HEAD')).status,308);
  const lp=await request('/construidas/');
  assert.equal(lp.status,200);
  assert.match(lp.body,/<title>Construa-se/);
  assert.match(lp.headers['Content-Type'],/text\/html/);
  assert.doesNotMatch(lp.body,/href="\.\.\/"/);
  assert(!lp.body.includes('src="/images/'));
  assert(!lp.body.includes('/src/main.js'));
  for(const match of lp.body.matchAll(/(?:src|href)="\.\/([^"]+)"/g)){
    const response=await request('/construidas/'+match[1]);
    assert.equal(response.status,200,match[1]);
    if(match[1].endsWith('.js')) assert.match(response.headers['Content-Type'],/javascript/);
  }
  const assets=fs.readdirSync(path.join(root,'construidas','assets'));
  assert(assets.some(f=>f.startsWith('scene-')&&f.endsWith('.js')),'Chunk 3D ausente');
  for(const file of assets.filter(f=>f.endsWith('.js'))){
    const content=fs.readFileSync(path.join(root,'construidas','assets',file),'utf8');
    for(const match of content.matchAll(/import\("\.\/([^\"]+)"\)/g)){
      assert.equal((await request('/construidas/assets/'+match[1])).status,200);
    }
  }
  const head=await request('/construidas/','HEAD');
  assert.equal(head.status,200);assert.equal(head.body,'');
  assert.equal((await request('/construidas/arquivo-inexistente.js')).status,404);
  assert.equal((await request('/construidas/','POST')).status,405);
  console.log('PASS: navegação, análise existente, redirecionamento, imagens, CSS, módulos 3D, HEAD e erros. Nenhuma chamada externa.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
