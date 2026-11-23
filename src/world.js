import * as THREE from 'three';

function pixelTexture(kind, repeatX, repeatY) {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const palettes = {
    concrete: [[91,99,86],[119,119,102],[68,75,68],[143,132,110]],
    tile: [[91,96,83],[117,116,96],[63,71,64],[135,126,104]],
    steel: [[51,61,58],[79,88,78],[34,43,42],[114,111,94]],
    brick: [[90,66,51],[117,82,61],[61,48,42],[143,101,70]],
    hazard: [[183,129,39],[28,36,33],[211,160,63],[18,25,24]],
    rubber: [[32,40,37],[53,58,49],[23,30,29],[81,78,62]]
  };
  const p = palettes[kind] || palettes.concrete;
  let seed = 0x1234567 + kind.length * 7919;
  const random = () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
  for (let y=0;y<size;y++) for (let x=0;x<size;x++) {
    let tone=0;
    if (kind==='brick') {
      const row=Math.floor(y/16), col=Math.floor((x+(row%2)*16)/32);
      tone=(y%16<2)||((x+(row%2)*16)%32<2)?2:((row*7+col*3)%2);
    } else if (kind==='tile') {
      const edge=(x%32<2)||(y%32<2);
      tone=edge?2:((Math.floor(x/32)+Math.floor(y/32))%2);
    } else if (kind==='steel') {
      const panel=(x%32<2)||(y%32<2);
      tone=panel?2:((Math.floor(x/32)+Math.floor(y/32))%3===0?1:0);
    } else if (kind==='hazard') tone=((x+y)%28<14)?0:1;
    else tone=random()>0.7?1:random()>0.94?3:0;
    const base=p[tone], noise=Math.floor((random()-0.5)*(kind==='rubber'?15:24)), i=(y*size+x)*4;
    data[i]=THREE.MathUtils.clamp(base[0]+noise,0,255);
    data[i+1]=THREE.MathUtils.clamp(base[1]+noise,0,255);
    data[i+2]=THREE.MathUtils.clamp(base[2]+noise,0,255);
    data[i+3]=255;
  }
  const tex=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
  tex.colorSpace=THREE.SRGBColorSpace; tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.repeat.set(repeatX,repeatY); tex.magFilter=THREE.NearestFilter;
  tex.minFilter=THREE.NearestMipmapNearestFilter; tex.generateMipmaps=true; tex.anisotropy=4; tex.needsUpdate=true;
  return tex;
}

function box(parent,x,y,z,w,h,d,mat,cast=true,receive=true) {
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  mesh.position.set(x,y,z); mesh.castShadow=cast; mesh.receiveShadow=receive; parent.add(mesh); return mesh;
}
function collider(x,z,w,d,minY=0,maxY=4.8) {
  return {minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY,maxY};
}
function plane(parent,x,y,z,w,d,mat,up=true) {
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,d),mat);
  mesh.rotation.x=up?-Math.PI/2:Math.PI/2; mesh.position.set(x,y,z); mesh.receiveShadow=true; parent.add(mesh); return mesh;
}
function cylinder(parent,x,y,z,rTop,rBottom,height,mat,sides=8,rotationX=0) {
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rTop,rBottom,height,sides),mat);
  mesh.position.set(x,y,z); mesh.rotation.x=rotationX; mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
}
function addPoint(parent,color,intensity,distance,x,y,z) {
  const light=new THREE.PointLight(color,intensity,distance,2); light.position.set(x,y,z); parent.add(light); return light;
}
function makeDoor(scene,worldGroup,colliders,name,z,width,mats) {
  const root=new THREE.Group(); root.position.set(0,0,z); worldGroup.add(root);
  const panel=box(root,0,2.25,0,width,4.5,0.55,mats.steel);
  for(let i=0;i<9;i++) box(root,-width/2+0.34+i*(width-0.68)/8,2.25,0.3,0.035,4.0,0.035,mats.dark,false);
  box(root,0,4.35,0.34,width-0.6,0.12,0.08,mats.amber,false);
  for(const x of [-width/2+0.36,width/2-0.36]) box(root,x,2.2,0.37,0.13,4.05,0.07,mats.dark);
  const lamp=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.12,0.11),mats.redGlow);
  lamp.position.set(0,4.66,0.38); root.add(lamp);
  const light=addPoint(root,0xff513c,2.2,5,0,4.55,0.5);
  const hitbox=collider(0,z,width,0.75,0,4.8); colliders.push(hitbox);
  return {name,root,panel,hitbox,light,progress:0,opening:false,open:false};
}
function addCeilingLamp(parent,scene,x,z,mats,lights,phase=0) {
  box(parent,x,4.48,z,2.3,0.12,0.48,mats.dark,false);
  const diffuser=box(parent,x,4.4,z,1.92,0.035,0.31,mats.lightGlow,false,false);
  diffuser.material.emissiveIntensity=1.8;
  lights.push({light:addPoint(scene,0xffdca9,8.5,8.6,x,4.13,z),base:8.5,phase});
}
function addPipe(parent,x,y,z,length,radius,mat,horizontal=true) {
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,7),mat);
  mesh.position.set(x,y,z); if(horizontal)mesh.rotation.x=Math.PI/2; else mesh.rotation.z=Math.PI/2;
  mesh.castShadow=true; parent.add(mesh); return mesh;
}
function addTerminal(parent,x,z,mats,kind) {
  const root=new THREE.Group(); root.position.set(x,0,z); parent.add(root);
  box(root,0,0.66,0,1.42,1.32,0.78,mats.dark);
  box(root,0,1.32,0.02,1.35,0.12,0.74,mats.steel);
  const screen=box(root,0,1.79,-0.26,1.06,0.74,0.12,mats.screen); screen.rotation.x=-0.12;
  box(root,0,1.31,0.42,0.34,0.06,0.14,mats.amber);
  const status=box(root,-0.47,1.32,0.42,0.09,0.06,0.13,kind==='scanner'?mats.redGlow:mats.cyanGlow,false);
  const glow=addPoint(root,kind==='scanner'?0xff6c45:0x63d4cf,0.55,2.4,0,1.5,0.5);
  root.userData.kind=kind; root.userData.statusLight=status; root.userData.screen=screen; root.userData.glow=glow;
  return root;
}
function addDesk(parent,x,z,mats) {
  const root=new THREE.Group(); root.position.set(x,0,z); parent.add(root);
  box(root,0,0.92,0,3.2,0.16,1.45,mats.wood);
  for(const px of [-1.42,1.42]) for(const pz of [-0.58,0.58]) box(root,px,0.43,pz,0.12,0.9,0.12,mats.dark);
  box(root,0,0.72,-0.18,2.7,0.08,1.05,mats.dark);
  return root;
}
function makeBadge(parent,x,z,mats,interactables) {
  const root=new THREE.Group(); root.position.set(x,1.12,z); parent.add(root);
  box(root,0,0,0,0.32,0.035,0.22,mats.ivory,true,false);
  box(root,-0.07,0.022,-0.01,0.08,0.008,0.12,mats.redGlow,false,false);
  addPoint(root,0xffa85a,0.65,2.1,0,0.3,0);
  root.userData.kind='badge'; root.userData.label='POIMI KULKUKORTTI'; interactables.push(root); return root;
}
function makeCoil(parent,x,z,mats,interactables) {
  const root=new THREE.Group(); root.position.set(x,0,z); parent.add(root);
  cylinder(root,0,0.4,0,0.42,0.42,0.8,mats.dark,9);
  cylinder(root,0,0.86,0,0.35,0.35,0.12,mats.steel,9);
  cylinder(root,0,1.3,0,0.23,0.23,0.78,mats.cyan,8);
  for(let i=0;i<4;i++){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(0.32,0.045,5,12),mats.lightSteel);
    ring.rotation.x=Math.PI/2; ring.position.set(0,1.05+i*0.16,0); root.add(ring);
  }
  addPoint(root,0x65dbdc,2.2,4.8,0,1.25,0.12);
  root.userData.kind='coil'; root.userData.label='OTA JÄÄHDYTYSKELA'; interactables.push(root); return root;
}


function makeRetroSignMaterial(title, subtitle, accent = "#d69a4d") {
  const canvas=document.createElement("canvas");
  canvas.width=128; canvas.height=64;
  const ctx=canvas.getContext("2d");
  ctx.fillStyle="#242b25"; ctx.fillRect(0,0,128,64);
  ctx.fillStyle=accent; ctx.fillRect(0,0,128,5);
  ctx.strokeStyle="#85907a"; ctx.lineWidth=2; ctx.strokeRect(2,2,124,60);
  ctx.fillStyle="#e0ddbd"; ctx.font="bold 11px monospace";
  ctx.fillText(String(title).slice(0,18),7,26);
  ctx.fillStyle=accent; ctx.font="8px monospace";
  ctx.fillText(String(subtitle).slice(0,24),7,43);
  ctx.fillStyle="#6f7c68"; ctx.fillRect(7,51,114,3);
  ctx.fillStyle=accent; ctx.fillRect(7,51,76,3);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.magFilter=THREE.NearestFilter;
  texture.minFilter=THREE.NearestFilter;
  texture.generateMipmaps=false;
  return new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
}
function wallSign(parent,x,y,z,w,h,rotationY,title,subtitle,accent) {
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),makeRetroSignMaterial(title,subtitle,accent));
  mesh.position.set(x,y,z); mesh.rotation.y=rotationY;
  mesh.castShadow=false; parent.add(mesh); return mesh;
}
function addWallVent(parent,x,y,z,w,h,rotationY,mats) {
  const root=new THREE.Group(); root.position.set(x,y,z); root.rotation.y=rotationY; parent.add(root);
  box(root,0,0,0,w,h,0.09,mats.dark,false);
  box(root,0,h/2-0.09,0.06,w-0.12,0.05,0.035,mats.lightSteel,false);
  box(root,0,-h/2+0.09,0.06,w-0.12,0.05,0.035,mats.lightSteel,false);
  for(let i=0;i<7;i++) box(root,0,-h*0.36+i*h*0.12,0.07,w-0.18,0.035,0.035,mats.lightSteel,false);
  return root;
}

export function buildSector(scene) {
  scene.background=new THREE.Color(0x3d4942);
  scene.fog=new THREE.Fog(0x3d4942,24,118);
  const tex={
    concrete:pixelTexture('concrete',3,3),tile:pixelTexture('tile',14,16),
    steel:pixelTexture('steel',2,2),brick:pixelTexture('brick',3,3),
    hazard:pixelTexture('hazard',3,1),rubber:pixelTexture('rubber',5,6)
  };
  const mats={
    concrete:new THREE.MeshLambertMaterial({map:tex.concrete,color:0xb4b5a1}),
    tile:new THREE.MeshLambertMaterial({map:tex.tile,color:0xaaa58f}),
    steel:new THREE.MeshLambertMaterial({map:tex.steel,color:0xa0a38f}),
    brick:new THREE.MeshLambertMaterial({map:tex.brick,color:0xa38a70}),
    dark:new THREE.MeshLambertMaterial({map:tex.rubber,color:0x8a8e7c}),
    wood:new THREE.MeshLambertMaterial({color:0x66513c}),
    ivory:new THREE.MeshLambertMaterial({color:0xc5c0a9}),
    glass:new THREE.MeshLambertMaterial({color:0x648282,transparent:true,opacity:0.42}),
    screen:new THREE.MeshLambertMaterial({color:0x5ac6a7,emissive:0x164b34,emissiveIntensity:1.0}),
    amber:new THREE.MeshLambertMaterial({color:0xc4863e,emissive:0x75401c,emissiveIntensity:0.7}),
    cyan:new THREE.MeshLambertMaterial({color:0x65c9c2,emissive:0x1b6965,emissiveIntensity:1.0}),
    redGlow:new THREE.MeshLambertMaterial({color:0xff624b,emissive:0x9c211a,emissiveIntensity:1.45}),
    cyanGlow:new THREE.MeshLambertMaterial({color:0x8af3d0,emissive:0x248c72,emissiveIntensity:1.3}),
    lightGlow:new THREE.MeshLambertMaterial({color:0xffefc9,emissive:0xa97843,emissiveIntensity:1.8}),
    lightSteel:new THREE.MeshLambertMaterial({color:0x829083}),
    hazard:new THREE.MeshLambertMaterial({map:tex.hazard})
  };
  const worldGroup=new THREE.Group(); scene.add(worldGroup);
  const colliders=[],interactables=[],lights=[],doors=[];
  scene.add(new THREE.HemisphereLight(0xa7b4a3,0x25251b,0.58));
  const keyLight=new THREE.DirectionalLight(0xdcc9a0,0.92);
  keyLight.position.set(-12,28,18); keyLight.castShadow=true;
  keyLight.shadow.mapSize.set(2048,2048); keyLight.shadow.camera.left=-28; keyLight.shadow.camera.right=28;
  keyLight.shadow.camera.top=36; keyLight.shadow.camera.bottom=-110; keyLight.shadow.bias=-0.00025; scene.add(keyLight);
  const coolFill=new THREE.DirectionalLight(0x718c78,0.2); coolFill.position.set(18,12,-58); scene.add(coolFill);

  function wall(x,z,w,d,height=4.8,mat=mats.concrete){
    box(worldGroup,x,height/2,z,w,height,d,mat);
    colliders.push(collider(x,z,w,d,0,height));
  }
  function shell(x,z,w,d){
    plane(worldGroup,x,-0.08,z,w,d,mats.tile,true);
    plane(worldGroup,x,4.72,z,w,d,mats.concrete,false);
  }
  function trim(x,y,z,w,d,mat=mats.dark){box(worldGroup,x,y,z,w,0.12,d,mat,false,true);}

  // Area 01: arrival lobby and security office.
  shell(0,16,31,36);
  wallSign(worldGroup,-15.34,3.28,18.2,2.9,1.12,Math.PI/2,"KALLIO ANNEX","SECTOR 09 / STAFF");
  wallSign(worldGroup,15.34,3.28,18.2,2.9,1.12,-Math.PI/2,"SECURITY","ACCESS LEVEL 3","#c36e48");
  addWallVent(worldGroup,-15.34,2.05,5.5,1.8,1.05,Math.PI/2,mats);
  addWallVent(worldGroup,15.34,2.05,5.5,1.8,1.05,-Math.PI/2,mats);
  wall(-15.7,16,0.6,36); wall(15.7,16,0.6,36); wall(0,34,31,0.6);
  wall(-10,-2,11.4,0.6); wall(10,-2,11.4,0.6);
  for(const z of [6,18,30]){trim(-15.35,0.42,z,0.16,10);trim(15.35,0.42,z,0.16,10);}
  addDesk(worldGroup,10.8,14.5,mats);
  colliders.push(collider(10.8,14.5,3.2,1.45,0,1.1));
  const securityMonitor=box(worldGroup,10.8,1.74,14.1,0.86,0.72,0.12,mats.screen,false);
  securityMonitor.rotation.x=-0.18;
  box(worldGroup,9.35,1.25,12.8,0.45,0.42,0.36,mats.dark);
  const chair=new THREE.Group(); chair.position.set(12.8,0,13.2); worldGroup.add(chair);
  box(chair,0,0.58,0,0.8,0.12,0.75,mats.dark);
  box(chair,0,1.08,0.28,0.8,0.94,0.12,mats.dark);
  cylinder(chair,0,0.28,0,0.05,0.05,0.52,mats.lightSteel,7);
  for(const x of [-0.28,0.28]) cylinder(chair,x,0.07,0,0.035,0.035,0.24,mats.dark,6);
  const body=box(worldGroup,12.9,0.34,15.8,0.5,0.55,0.84,mats.brick); body.rotation.x=-0.42;
  cylinder(worldGroup,12.9,0.72,15.55,0.23,0.24,0.4,mats.ivory,7,Math.PI/2);
  const badge=makeBadge(worldGroup,10.1,14.2,mats,interactables);

  // Area 02: service corridor.
  shell(0,-18,12.8,32);
  wallSign(worldGroup,-6.17,3.15,-20.5,2.6,0.92,Math.PI/2,"SERVICE TUNNEL","AUTHORIZED ONLY");
  wallSign(worldGroup,6.17,3.15,-9.6,2.6,0.92,-Math.PI/2,"CAUTION","LOW CLEARANCE","#c36e48");
  addWallVent(worldGroup,-6.17,2.0,-29.0,1.9,1.12,Math.PI/2,mats);
  addWallVent(worldGroup,6.17,2.0,-14.0,1.9,1.12,-Math.PI/2,mats); wall(-6.5,-18,0.6,32); wall(6.5,-18,0.6,32);
  for(const z of [-7,-15,-23,-31]){trim(-6.17,0.48,z,0.12,7.4,mats.dark);trim(6.17,0.48,z,0.12,7.4,mats.dark);}

  // Area 03: test chamber and resonance cage.
  shell(0,-57,32,46);
  wallSign(worldGroup,-16.18,3.25,-49,3.1,1.0,Math.PI/2,"TEST CHAMBER","RESONANCE LAB","#bb7850");
  wallSign(worldGroup,16.18,3.25,-65,3.1,1.0,-Math.PI/2,"BIOHAZARD","AUTHORIZED STAFF","#bb7850");
  addWallVent(worldGroup,16.18,2.0,-48,2.1,1.25,-Math.PI/2,mats); wall(-16.5,-57,0.6,46); wall(16.5,-57,0.6,46);
  wall(-11,-80,10.6,0.6); wall(11,-80,10.6,0.6);
  box(worldGroup,-16.16,2.5,-53,0.08,2.4,7.2,mats.glass,false);
  for(const z of [-56.5,-49.5]) box(worldGroup,-16.08,2.5,z,0.18,2.8,0.18,mats.lightSteel,false);
  const reactor=new THREE.Group(); reactor.position.set(0,0,-57.3); worldGroup.add(reactor);
  cylinder(reactor,0,0.42,0,2.8,3.2,0.84,mats.dark,12);
  cylinder(reactor,0,2.25,0,1.9,2.25,2.9,mats.steel,10);
  cylinder(reactor,0,3.86,0,1.58,1.9,0.42,mats.dark,10);
  for(let i=0;i<8;i++){
    const angle=i*Math.PI/4,x=Math.cos(angle)*2.1,z=Math.sin(angle)*2.1;
    cylinder(reactor,x,2.23,z,0.16,0.16,2.5,mats.lightSteel,7);
    cylinder(reactor,x,3.51,z,0.22,0.22,0.16,mats.amber,7);
  }
  const reactorCore=cylinder(reactor,0,2.35,0,0.72,0.72,2.1,mats.cyan,9);
  const reactorLight=addPoint(reactor,0x5bd9de,8,13,0,2.3,0);
  colliders.push(collider(0,-57.3,5.8,5.8,0,4.1));

  box(worldGroup,-8,0.62,-60.2,2.6,1.24,2.0,mats.dark);
  box(worldGroup,-8,1.27,-60.2,2.25,0.08,1.65,mats.lightSteel);
  colliders.push(collider(-8,-60.2,2.6,2.0,0,1.3));
  const coil=makeCoil(worldGroup,-8,-60.2,mats,interactables);

  const powerConsole=addTerminal(worldGroup,8.2,-70.5,mats,'power');
  interactables.push(powerConsole); colliders.push(collider(8.2,-70.5,1.55,0.9,0,2.15));
  box(worldGroup,8.2,2.34,-70.92,1.72,0.08,0.13,mats.amber,false);

  // Area 04: service lift bay and the lift car's inner door.
  shell(0,-96,15,32);
  wallSign(worldGroup,-7.18,3.2,-97,2.5,0.96,Math.PI/2,"MAINTENANCE","LIFT BAY 01");
  wallSign(worldGroup,7.18,3.2,-91,2.5,0.96,-Math.PI/2,"HEV ROUTE","KEEP MOVING","#c36e48"); wall(-7.5,-96,0.6,32); wall(7.5,-96,0.6,32); wall(0,-112,15,0.6);
  const liftFrame=new THREE.Group(); liftFrame.position.set(0,0,-108); worldGroup.add(liftFrame);
  box(liftFrame,-3.2,2.35,0,0.4,4.7,0.65,mats.lightSteel);
  box(liftFrame,3.2,2.35,0,0.4,4.7,0.65,mats.lightSteel);
  box(liftFrame,0,4.55,0,6.8,0.35,0.65,mats.lightSteel);
  const liftDoor=box(liftFrame,0,2.25,0.24,5.9,4.2,0.28,mats.steel);
  for(let i=0;i<7;i++) box(liftFrame,-2.4+i*0.8,2.25,0.4,0.04,3.8,0.03,mats.dark,false);
  const liftDoorCollider=collider(0,-108,5.9,0.55,0,4.5); colliders.push(liftDoorCollider);
  const liftConsole=addTerminal(worldGroup,4.7,-101.3,mats,'lift');
  interactables.push(liftConsole); colliders.push(collider(4.7,-101.3,1.55,0.9,0,2.15));

  for(const z of [-9,-20,-31,-40,-50,-61,-71,-89,-99]) addCeilingLamp(worldGroup,scene,0,z,mats,lights,z*0.14);
  for(const x of [-4.5,-3.8,3.8,4.5]) addPipe(worldGroup,x,4.17,-18,31,0.11,mats.lightSteel,true);
  for(const x of [-13.5,13.5]) addPipe(worldGroup,x,3.86,-57,43,0.15,mats.dark,true);
  for(const z of [-42,-66,-91]) for(const x of [-5.3,5.3]) addPipe(worldGroup,x,4.14,z,5.0,0.105,mats.amber,true);

  for(const z of [-13,-25,-45,-73,-93]){
    const x=z < -34 && z > -80 ? -14.8 : (z < -80 ? -6.2 : 5.8);
    box(worldGroup,x,1.12,z,0.54,2.2,0.72,mats.steel);
    for(let y=0.35;y<1.8;y+=0.42) box(worldGroup,x,y,z-0.39,0.34,0.06,0.035,mats.amber,false);
    addPoint(scene,0xffaa5a,0.45,2.8,x,2.25,z);
  }
  for(const z of [-6,-18,-30,-42,-54,-66,-90,-102]){
    box(worldGroup,-6.05,4.31,z,0.22,0.42,0.46,mats.dark);
    box(worldGroup,6.05,4.31,z,0.22,0.42,0.46,mats.dark);
    box(worldGroup,0,4.58,z,12.2,0.12,0.32,mats.lightSteel,false);
  }
  for(let i=0;i<12;i++) box(worldGroup,-5.3+i*0.96,0.015,-36,0.38,0.025,0.32,mats.hazard,false,false);

  for(const x of [-13.8,13.8]){
    box(worldGroup,x,1.25,-45.8,1.2,2.5,2.2,mats.dark);
    for(let y=0.55;y<2.5;y+=0.62){
      box(worldGroup,x,y,-45.8,1.34,0.08,2.34,mats.lightSteel);
      cylinder(worldGroup,x-0.28,y+0.28,-46.1,0.15,0.15,0.48,mats.glass,8);
      cylinder(worldGroup,x+0.26,y+0.28,-45.5,0.15,0.15,0.48,mats.glass,8);
    }
    colliders.push(collider(x,-45.8,1.2,2.2,0,2.5));
  }

  const bulkhead=makeDoor(scene,worldGroup,colliders,'security',-2,8.5,mats);
  const liftGate=makeDoor(scene,worldGroup,colliders,'lift',-80,12,mats);
  const scanner=addTerminal(worldGroup,-5.1,-1.55,mats,'scanner');
  scanner.rotation.y=Math.PI; scanner.userData.label='KÄYTÄ KULKUKORTTIA';
  interactables.push(scanner);

  const redAlarm=addPoint(scene,0xff392a,2.1,18,0,3.7,-50);
  const sideAlarm=addPoint(scene,0xff392a,1.4,12,-15,3.8,-60);
  redAlarm.visible=false; sideAlarm.visible=false;

  return {
    mats,colliders,interactables,doors:[bulkhead,liftGate],lights,worldGroup,
    badge,coil,scanner,powerConsole,liftConsole,reactorCore,reactorLight,
    redAlarm,sideAlarm,enemySpawn:new THREE.Vector3(0,0,-47),powerOn:false,
    liftDoor,liftDoorCollider,liftDoorOpening:false,liftDoorProgress:0
  };
}

export function openDoor(world,name) {
  const door=world.doors.find(item=>item.name===name);
  if(!door) return;
  door.opening=true;
  if(name==='security') world.scanner.userData.statusLight.material=world.mats.cyanGlow;
  else world.liftConsole.userData.statusLight.material=world.mats.cyanGlow;
}

export function openLiftCar(world) {
  world.liftDoorOpening=true;
}

export function animateSector(world,dt,elapsed) {
  for(const door of world.doors){
    if(!door.opening) continue;
    door.progress=Math.min(1,door.progress+dt*0.82);
    door.root.position.y=door.progress*4.8;
    door.hitbox.minY=door.root.position.y;
    door.hitbox.maxY=door.root.position.y+4.8;
    if(door.progress>=1) door.open=true;
  }
  if(world.liftDoorOpening){
    world.liftDoorProgress=Math.min(1,world.liftDoorProgress+dt*0.9);
    world.liftDoor.position.y=2.25+world.liftDoorProgress*4.5;
    world.liftDoorCollider.minY=world.liftDoorProgress*4.5;
    world.liftDoorCollider.maxY=4.5+world.liftDoorProgress*4.5;
  }
  world.reactorCore.rotation.y=elapsed*0.62;
  world.reactorLight.intensity=7.5+Math.sin(elapsed*2.4)*1.4;
  for(let i=0;i<world.lights.length;i++){
    const item=world.lights[i];
    item.light.intensity=item.base+Math.sin(elapsed*1.7+item.phase)*0.5+Math.sin(elapsed*8.1+i)*0.12;
  }
  if(world.redAlarm.visible){
    world.redAlarm.intensity=1.2+(Math.sin(elapsed*9)>0?5.5:0.3);
    world.sideAlarm.intensity=1.0+(Math.sin(elapsed*9+1.4)>0?4.6:0.2);
  }
}
