const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(process.argv[2] || path.join(__dirname, '../construidas-src/src/main.js'), 'utf8').replace(/^import .*;\r?\n/gm, '');
function setup() {
  let y = 0;
  const frames = [], timers = [], commands = [], nodes = new Map();
  const node = key => {
    if (nodes.has(key)) return nodes.get(key);
    const events = new Map(), properties = new Map();
    const n = {textContent:'',scrollLeft:0,clientWidth:350,offsetHeight:key==='created-1'?600:330,offsetLeft:0,firstChild:null,
      style:{setProperty:(k,v)=>properties.set(k,v),removeProperty:k=>properties.delete(k)}, properties,
      classList:{add(){},remove(){}},setAttribute(){},removeAttribute(){},append(){},insertAdjacentHTML(){},
      getBoundingClientRect:()=>({top:key==='journey'?1000-y:0,width:350,height:600}),
      addEventListener:(k,fn)=>{if(!events.has(k))events.set(k,[]);events.get(k).push(fn);},
      emit:(k,e={})=>(events.get(k)||[]).forEach(fn=>fn(e)),
      scrollTo({left}){n.scrollLeft=left;n.emit('scroll');},
    };
    nodes.set(key,n);return n;
  };
  const cards=node('cards'), journey=node('journey'), steps=Array.from({length:5},(_,i)=>{const n=node('step'+i);n.offsetLeft=i*362;return n;});
  const links=Array.from({length:5},(_,i)=>node('link'+i));
  let created=0;
  const mobile={matches:true,addEventListener(){}},reduced={matches:false,addEventListener(){}};
  const selectors={'#steps':cards,'.journey':journey};
  const globalEvents=new Map();
  const context={
    stages:Array.from({length:5},(_,i)=>({number:String(i+1),label:'stage-'+i,title:'Título'})), event:{checkoutUrl:''},
    innerWidth:390,innerHeight:844,location:{hash:''},console,
    document:{querySelector:k=>selectors[k]||node(k),querySelectorAll:k=>k==='.step'?steps:k==='.stage-nav a'?links:[],createElement:()=>node('created-'+created++),documentElement:{classList:{add(){},remove(){}}}},
    matchMedia:q=>q.includes('max-width')?mobile:reduced,
    IntersectionObserver:class{observe(){} disconnect(){}},ResizeObserver:class{observe(){}},
    requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},
    setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},
    addEventListener:(k,fn)=>{if(!globalEvents.has(k))globalEvents.set(k,[]);globalEvents.get(k).push(fn);},
  };
  Object.defineProperty(context,'scrollY',{get:()=>y});
  context.window={scrollTo:args=>{commands.push(args);y=args.top;(globalEvents.get('scroll')||[]).forEach(fn=>fn());}};
  const flush=()=>{let count=0;while(frames.length){assert(++count<50,'Unexpected rendering loop');frames.shift()();}};
  vm.runInNewContext(source,context);flush();
  return {node,cards,commands,context,reduced,links,
    flush,
    move:target=>{y=target;(globalEvents.get('scroll')||[]).forEach(fn=>fn());flush();},
    resize:height=>{context.innerHeight=height;(globalEvents.get('resize')||[]).forEach(fn=>fn());flush();},
    idle:()=>{let count=0;while(timers.length){assert(++count<50,'Unexpected navigation loop');timers.shift()();flush();}},
    y:()=>y,
  };
}
const app=setup(), start=1000-72, stride=844*.65;
for(const index of [0,1,2,3,4,3,2,1,0,4]) {
  const target=start+(index+.3)*stride;
  app.move(target);
  assert.equal(app.node('.cards-status').textContent,`${index+1} de 5`);
  // Delayed scroll events from an old horizontal position must not navigate.
  app.cards.scrollLeft=0;app.cards.emit('scroll');app.idle();
  assert.equal(app.y(),target,'Page jumped back to a stale card');
}
app.move(start+stride*5+900);app.cards.emit('scroll');app.idle();
assert.equal(app.commands.length,0,'Leaving the section must not trigger navigation');
app.move(start+stride*2.1);
app.resize(780); // Safari address bar opening/closing must not change the stage.
assert.equal(app.node('.cards-status').textContent,'3 de 5');
app.cards.emit('pointerdown',{isPrimary:true,pointerType:'touch',pointerId:1,clientX:200,clientY:300});
app.cards.emit('pointerup',{pointerId:1,clientX:190,clientY:100});app.flush();
assert.equal(app.commands.length,0,'Vertical gestures must not navigate');
app.cards.emit('pointerdown',{isPrimary:true,pointerType:'touch',pointerId:2,clientX:250,clientY:300});
app.cards.emit('pointerup',{pointerId:2,clientX:70,clientY:306});app.flush();
assert.equal(app.commands.length,1,'Horizontal gestures must advance exactly once');
assert.equal(app.node('.cards-status').textContent,'4 de 5');
app.cards.emit('scroll');app.idle();assert.equal(app.commands.length,1);
app.reduced.matches=true;
app.node('.card-next').emit('click');app.flush();
assert.equal(app.commands.at(-1).behavior,'instant');
assert.equal(app.node('.cards-status').textContent,'5 de 5');
console.log('PASS: vertical progress and reverse, stable exit, Safari toolbar resize, distinct gestures and reduced motion.');
