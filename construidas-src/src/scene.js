import * as THREE from 'three';

export function createScene(container, initiallyPaused = false) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.setClearColor(0xeee8de, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  container.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const camera = new THREE.OrthographicCamera(-6,6,6,-6,.1,70);
  const house = new THREE.Group();
  scene.add(house);
  const mat = (color, more = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, metalness: 0, ...more });
  const m = { earth:mat('#b99a82'), plot:mat('#cbd1ae'), slab:mat('#e1d2c2'), stone:mat('#d8c9b5'), frame:mat('#a16a64'), wall:mat('#f0e8dc'), roof:mat('#83625d'), olive:mat('#535b30'), dark:mat('#394019'), glass:mat('#b5c2bb',{roughness:.2,metalness:.25}), door:mat('#5a3b35') };
  const groups = Array.from({length:5},()=>new THREE.Group());
  groups.forEach(g=>house.add(g));
  function box(w,h,d,x,y,z,material,group) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    mesh.position.set(x,y,z);mesh.castShadow = true;mesh.receiveShadow = true;group.add(mesh);return mesh;
  }
  function line(points, color, group, opacity = 1) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));
    const obj = new THREE.Line(geometry,new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));group.add(obj);return obj;
  }
  // 01 — terreno: a precise architectural model on an earthy plinth.
  box(6.7,.22,5.3,0,-.17,0,m.earth,groups[0]);
  box(6.6,.07,5.2,0,-.025,0,m.plot,groups[0]);
  box(4.1,.025,3.1,0,.022,0,m.stone,groups[0]);
  for(let i=-3;i<=3;i++) line([[i,.02,-2.55],[i,.02,2.55]],'#8d9470',groups[0],.28);
  for(let i=-2;i<=2;i++) line([[-3.25,.02,i],[3.25,.02,i]],'#8d9470',groups[0],.28);
  line([[-2.13,.05,-1.63],[-2.13,.05,1.63],[2.13,.05,1.63],[2.13,.05,-1.63],[-2.13,.05,-1.63]],'#a16a64',groups[0]);
  // Fine measuring lines at the perimeter.
  line([[-3.1,.08,2.85],[3.1,.08,2.85]],'#a16a64',groups[0],.65);
  [-3.1,3.1].forEach(x=>line([[x-.1,.08,2.72],[x+.1,.08,2.98]],'#a16a64',groups[0],.65));
  line([[3.6,.08,-2.5],[3.6,.08,2.5]],'#a16a64',groups[0],.65);
  // 02 — fundação: footings, perimeter beams and foundation slab.
  for(const x of [-1.8,0,1.8])for(const z of [-1.35,1.35])box(.48,.28,.48,x,.17,z,m.stone,groups[1]);
  box(4.3,.25,3.3,0,.34,0,m.slab,groups[1]);
  box(4.3,.035,3.3,0,.48,0,m.wall,groups[1]);
  box(1.2,.13,.45,1,.12,1.95,m.stone,groups[1]);
  box(1.2,.16,.4,1,.24,1.7,m.slab,groups[1]);
  // 03 — estrutura: rose-colored columns and beams, architectural clarity.
  for(const x of [-1.85,0,1.85])for(const z of [-1.4,1.4])box(.16,2.45,.16,x,1.72,z,m.frame,groups[2]);
  for(const z of [-1.4,1.4])box(3.9,.18,.18,0,2.96,z,m.frame,groups[2]);
  for(const x of [-1.85,0,1.85])box(.17,.18,2.95,x,2.96,0,m.frame,groups[2]);
  // 04 — manutenção: the protective envelope and planted care around the home.
  box(.12,2.32,2.7,-1.76,1.67,0,m.wall,groups[3]);
  box(3.55,2.32,.12,0,1.67,-1.31,m.wall,groups[3]);
  box(1.55,2.32,.1,-.92,1.67,1.31,m.wall,groups[3]);
  box(.1,2.3,2.68,1.76,1.67,0,m.glass,groups[3]);
  box(1.48,2.1,.07,.83,1.57,1.31,m.glass,groups[3]);
  for(const x of [.12,.86,1.6])box(.045,2.15,.11,x,1.58,1.35,m.door,groups[3]);
  box(1.55,.055,.12,.86,2.65,1.35,m.door,groups[3]);
  box(1.55,.055,.12,.86,.52,1.35,m.door,groups[3]);
  // Pitched roof: two pitched slabs with crisp eaves.
  const slope = Math.atan2(.64,1.7), roofLength = Math.hypot(1.7,.64);
  for(const side of [-1,1]) {
    const roof=box(4.35,.14,roofLength,0,3.31,side*.85,m.roof,groups[3]);
    roof.rotation.x=side*slope;
  }
  box(4.4,.12,.12,0,3.63,0,m.frame,groups[3]);
  // 05 — gestão: completed approach, pergola and the wider site.
  for(let i=0;i<4;i++)box(.95,.055,.25,1,.05,2.05+i*.3,m.wall,groups[4]);
  box(1.05,.14,2.45,-2.68,.08,-.1,m.stone,groups[4]);
  box(.07,1.9,.07,-2.95,1.07,1,m.door,groups[4]);
  box(.07,1.9,.07,-2.95,1.07,-1.2,m.door,groups[4]);
  for(let i=0;i<7;i++)box(1.2,.07,.07,-2.4,2.05,-1.2+i*.36,m.door,groups[4]);
  function tree(x,z,scale) {
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.035,.05,.7,7),m.door);trunk.position.set(x,.38,z);groups[4].add(trunk);
    const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(.48*scale,1),m.olive);crown.position.set(x,.8+.15*scale,z);crown.scale.y=1.2; crown.castShadow=true; groups[4].add(crown);
  }
  tree(2.7,-1.8,.9);tree(-2.7,-1.8,1.05);
  for(let i=0;i<5;i++) {const shrub=new THREE.Mesh(new THREE.IcosahedronGeometry(.18,1),m.dark);shrub.position.set(2.65,.18,.05+i*.36);shrub.castShadow=true;groups[4].add(shrub);}

  scene.add(new THREE.HemisphereLight(0xfff7e8,0x8c8676,3));
  const key=new THREE.DirectionalLight(0xffe8cf,4.3);key.position.set(-5,10,6);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=7;key.shadow.camera.bottom=-7;key.shadow.normalBias=.025;key.shadow.bias=-.0002;scene.add(key);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.13}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-.3;shadow.receiveShadow=true;scene.add(shadow);

  let target=0,current=0,paused=initiallyPaused,visible=true,raf=0,disposed=false;
  const ease=x=>x*x*(3-2*x);
  function frame(){
    raf=0;if(disposed||!visible||document.hidden)return;
    current += (target-current)*.075;
    if(Math.abs(target-current)<.001)current=target;
    const amount=paused?5:current;
    for(let i=1;i<groups.length;i++) {
      const p=paused?1:ease(THREE.MathUtils.clamp((amount-i)/.65,0,1));
      groups[i].visible=p>.001;
      groups[i].scale.y=Math.max(.001,p);
      groups[i].position.y=(1-p)*.22;
    }
    const angle=paused?.55:.48+amount*.055;
    camera.position.set(Math.sin(angle)*10,7.8,Math.cos(angle)*10);
    camera.lookAt(0,1.05,0);
    renderer.render(scene,camera);
    if(current!==target&&!paused)raf=requestAnimationFrame(frame);
  }
  function invalidate(){if(!raf&&!disposed)raf=requestAnimationFrame(frame);}
  function resize(){const w=container.clientWidth,h=container.clientHeight;if(w<1||h<1)return;renderer.setSize(w,h,false);const aspect=w/h;const half=innerWidth<=760?4.1:4.6;camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();invalidate();}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)invalidate();});observer.observe(container);
  document.addEventListener('visibilitychange',invalidate);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();container.parentElement.classList.add('fallback-active');renderer.domElement.style.display='none';disposed=true;cancelAnimationFrame(raf);});
  resize();
  return {
    setProgress(value,isPaused){target=value;paused=isPaused;invalidate();},
    setPaused(value){paused=value;invalidate();},
    dispose(){disposed=true;cancelAnimationFrame(raf);resizeObserver.disconnect();observer.disconnect();document.removeEventListener('visibilitychange',invalidate);scene.traverse(obj=>{obj.geometry?.dispose();if(obj.material){const materials=Array.isArray(obj.material)?obj.material:[obj.material];materials.forEach(mat=>mat.dispose());}});renderer.dispose();}
  };
}
