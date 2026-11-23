import * as THREE from 'three';

function box(parent,x,y,z,w,h,d,material,cast=true,receive=true){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  mesh.position.set(x,y,z);mesh.castShadow=cast;mesh.receiveShadow=receive;parent.add(mesh);return mesh;
}
function cylinder(parent,x,y,z,rt,rb,h,material,sides=8,rotationX=0){
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,sides),material);
  mesh.position.set(x,y,z);mesh.rotation.x=rotationX;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function rod(parent,a,b,r,material,sides=7){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),sides),material);
  mesh.position.copy(start).add(end).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function boundsCollider(x,z,w,d,minY=0,maxY=4.8){
  return {minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY,maxY};
}
function wall(world,x,z,w,d,h=4.8,material=world.mats.concrete){
  box(world.worldGroup,x,h/2,z,w,h,d,material);
  world.colliders.push(boundsCollider(x,z,w,d,0,h));
}
function room(world,scene,x,z,w,d){
  const group=world.worldGroup,m=world.mats;
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(w,d),m.tile);
  floor.rotation.x=-Math.PI/2;floor.position.set(x,-.075,z);floor.receiveShadow=true;group.add(floor);
  const ceiling=new THREE.Mesh(new THREE.PlaneGeometry(w,d),m.concrete);
  ceiling.rotation.x=Math.PI/2;ceiling.position.set(x,4.75,z);ceiling.receiveShadow=true;group.add(ceiling);
}
function sign(parent,x,y,z,w,h,rotationY,title,subtitle,accent="#d9a257"){
  const c=document.createElement("canvas");c.width=256;c.height=96;
  const g=c.getContext("2d");
  g.fillStyle="#343b31";g.fillRect(0,0,256,96);
  g.fillStyle=accent;g.fillRect(0,0,256,7);
  g.strokeStyle="#89917a";g.lineWidth=4;g.strokeRect(3,3,250,90);
  g.fillStyle="#e0ddc5";g.font="bold 23px Arial";g.fillText(title,14,43);
  g.fillStyle=accent;g.font="15px Arial";g.fillText(subtitle,14,70);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
  mesh.position.set(x,y,z);mesh.rotation.y=rotationY;parent.add(mesh);return mesh;
}
function lamp(world,scene,x,z,color=0xe4b978){
  const group=world.worldGroup,m=world.mats;
  box(group,x,4.45,z,1.7,.13,.48,m.dark,false);
  box(group,x,4.36,z,1.35,.045,.27,m.lightGlow,false,false);
  const light=new THREE.PointLight(color,1.25,10,2);light.position.set(x,4.05,z);scene.add(light);
  world.lights.push({light,base:1.1,phase:x*.6+z*.11});return light;
}
function terminal(world,x,z,kind,title){
  const root=new THREE.Group();root.position.set(x,0,z);world.worldGroup.add(root);
  const m=world.mats;
  box(root,0,1.05,0,.94,2.1,.62,m.dark);
  box(root,0,1.83,-.34,.78,.53,.06,m.steel,false);
  const screen=box(root,0,1.84,-.38,.64,.35,.035,m.screen,false,false);
  const status=new THREE.Mesh(new THREE.SphereGeometry(.07,6,5),m.redGlow);
  status.position.set(.32,1.28,-.36);root.add(status);
  box(root,0,2.14,-.36,.74,.04,.045,m.amber,false,false);
  for(let i=0;i<3;i++)box(root,-.2+i*.2,.65,-.33,.11,.08,.04,m.lightSteel,false,false);
  root.userData.kind=kind;root.userData.label=title;root.userData.statusLight=status;
  world.interactables.push(root);
  world.colliders.push(boundsCollider(x,z,1.05,.78,0,2.15));
  return root;
}
function medkitPickup(world,x,z){
  const root=new THREE.Group();root.position.set(x,0,z);world.worldGroup.add(root);
  const m=world.mats;
  box(root,0,.16,0,.62,.3,.42,m.dark,false);
  box(root,0,.34,-.02,.55,.1,.37,m.lightSteel,false,false);
  box(root,0,.43,-.215,.17,.035,.035,m.redGlow,false,false);
  box(root,0,.43,.215,.17,.035,.035,m.redGlow,false,false);
  box(root,0,.43,0,.055,.035,.37,m.redGlow,false,false);
  const glow=new THREE.PointLight(0xc95e49,.32,2.8);glow.position.set(0,.65,0);root.add(glow);
  root.userData.kind="medkit";root.userData.label="Käytä ensiapupakkaus";world.interactables.push(root);return root;
}
function fusePickup(world,x,z){
  const root=new THREE.Group();root.position.set(x,0,z);world.worldGroup.add(root);
  const m=world.mats;
  box(root,0,.12,0,.58,.18,.34,m.dark,false);
  box(root,0,.31,0,.39,.32,.22,m.amber);
  box(root,0,.31,-.13,.13,.21,.035,m.lightSteel,false,false);
  for(const side of [-1,1])box(root,side*.25,.31,0,.05,.38,.28,m.lightSteel,false,false);
  const glow=new THREE.PointLight(0xe7a34e,.6,3);glow.position.set(0,.55,0);root.add(glow);
  root.userData.kind="fuse";root.userData.label="Ota varasulake";world.interactables.push(root);
  return root;
}
function valveWheel(world,x,z){
  const root=new THREE.Group();root.position.set(x,1.45,z);world.worldGroup.add(root);
  const m=world.mats;
  cylinder(root,0,0,0,.14,.14,.52,m.lightSteel,8,Math.PI/2);
  const wheel=new THREE.Group();wheel.position.set(0,0,-.28);root.add(wheel);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.48,.055,5,10),m.amber);wheel.add(rim);
  cylinder(wheel,0,0,0,.12,.12,.16,m.dark,8,Math.PI/2);
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    rod(wheel,[0,0,-.1],[Math.cos(a)*.47,Math.sin(a)*.47,-.1],.035,m.lightSteel,6);
  }
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(.09,6,5),m.redGlow);lamp.position.set(0,.72,-.31);root.add(lamp);
  root.userData.kind="valve";root.userData.label="Sulje paineventtiili";root.userData.wheel=wheel;root.userData.statusLight=lamp;
  world.interactables.push(root);
  world.colliders.push(boundsCollider(x,z,.95,.65,0,2.2));
  return root;
}
function staticCrate(world,x,z,w=1.35,h=1.25){
  const m=world.mats,g=world.worldGroup;
  box(g,x,h/2,z,w,h,w,m.wood);
  for(const y of [.12,h-.12])box(g,x,y,z,w+.06,.09,w+.06,m.lightSteel,false);
  for(const side of [-1,1]){
    box(g,x+side*w*.32,h/2,z,w*.09,h*.72,w+.08,m.dark,false);
    box(g,x,h/2,z+side*w*.32,w+.08,h*.72,w*.09,m.dark,false);
  }
  world.colliders.push(boundsCollider(x,z,w+.1,w+.1,0,h));
}
function pickupToken(world,x,z,kind,label,color=0xd59b4e){
  const root=new THREE.Group();root.position.set(x,0,z);world.worldGroup.add(root);
  const m=world.mats;
  box(root,0,.14,0,.46,.22,.3,m.dark,false);
  const token=box(root,0,.31,0,.32,.28,.2,m.amber);
  token.material=new THREE.MeshLambertMaterial({color,emissive:color,emissiveIntensity:.22});
  box(root,0,.48,0,.12,.08,.12,m.lightSteel,false,false);
  const halo=new THREE.PointLight(color,.4,2.6);halo.position.set(0,.55,0);root.add(halo);
  root.userData.kind=kind;root.userData.label=label;world.interactables.push(root);return root;
}
function movableDrum(world,x,z){
  const m=world.mats,root=new THREE.Group();root.position.set(x,0,z);world.worldGroup.add(root);
  cylinder(root,0,.56,0,.43,.43,1.12,m.brick,10);
  cylinder(root,0,1.13,0,.39,.39,.07,m.dark,10);
  for(const y of [.22,.86]){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.435,.035,4,12),m.lightSteel);
    ring.rotation.x=Math.PI/2;ring.position.y=y;root.add(ring);
  }
  box(root,0,.03,0,.78,.05,.78,m.dark,false,false);
  const c=boundsCollider(x,z,.92,.92,0,1.16);world.colliders.push(c);
  const prop={root,velocity:new THREE.Vector3(),radius:.48,collider:c,mass:1.1,kind:"drum"};
  root.userData.physicsProp=prop;
  world.physicsProps.push(prop);return prop;
}
function workerCorpse(world,x,z){
  const g=world.worldGroup,m=world.mats,root=new THREE.Group();root.position.set(x,0,z);root.rotation.y=-.72;g.add(root);
  const coat=new THREE.MeshLambertMaterial({color:0x77796b});
  const dark=new THREE.MeshLambertMaterial({color:0x252c27});
  const skin=new THREE.MeshLambertMaterial({color:0x9b8064});
  const torso=new THREE.Mesh(new THREE.BoxGeometry(.62,.34,1.0),coat);
  torso.position.set(0,.34,0);torso.rotation.x=.12;root.add(torso);
  const head=new THREE.Mesh(new THREE.IcosahedronGeometry(.22,1),skin);
  head.position.set(0,.32,-.68);head.scale.set(1,.7,.85);root.add(head);
  rod(root,[-.2,.3,-.27],[-.48,.13,-.82],.12,coat,6);
  rod(root,[.2,.3,-.27],[.55,.12,.35],.12,coat,6);
  rod(root,[-.18,.3,.3],[-.24,.12,1.0],.13,dark,6);
  rod(root,[.18,.3,.3],[.42,.12,.86],.13,dark,6);
  box(root,0,.51,.12,.35,.13,.4,m.amber,false,false);
  const stain=new THREE.Mesh(new THREE.CircleGeometry(.92,12),new THREE.MeshBasicMaterial({color:0x381a18,transparent:true,opacity:.48,depthWrite:false}));
  stain.rotation.x=-Math.PI/2;stain.position.set(0,.014,.08);g.add(stain);
  return root;
}
function steamCloud(world,x,z,phase){
  const root=new THREE.Group();root.position.set(x,0,z);world.worldGroup.add(root);
  for(let i=0;i<8;i++){
    const material=new THREE.MeshBasicMaterial({color:0xb7b9a6,transparent:true,opacity:.0,depthWrite:false});
    const puff=new THREE.Mesh(new THREE.IcosahedronGeometry(.18+(i%3)*.05,1),material);
    puff.position.set(Math.sin(i*2.4)*.28,.5+i*.31,Math.cos(i*1.7)*.22);
    puff.scale.set(1.1,.8,1.1);root.add(puff);
  }
  root.visible=false;
  return {root,phase};
}
function buildTram(world){
  const m=world.mats,g=world.worldGroup,root=new THREE.Group();root.position.set(0,0,-273);g.add(root);
  box(root,0,1.65,0,8.8,3.25,15,m.dark);
  box(root,0,3.27,0,8.6,.12,14.8,m.lightSteel);
  box(root,0,.18,0,8.45,.25,14.7,m.steel);
  for(const x of [-3.15,3.15]){
    box(root,x,1.95,-.12,1.65,1.45,12.2,m.steel);
    for(let z=-5;z<=5;z+=2.5){
      box(root,x,2.15,z,1.2,1.0,.08,m.glass,false);
    }
    box(root,x,3.0,0,1.8,.12,13,m.amber,false);
  }
  for(const z of [-6.3,6.3]){
    box(root,0,1.7,z,8.9,3.0,.22,m.lightSteel);
    for(const x of [-2.4,0,2.4])box(root,x,2.95,z-.14,.7,.18,.08,m.lightGlow,false,false);
  }
  for(const x of [-2,2]){
    box(root,x,1.1,0,.12,.08,8,m.amber,false);
    for(const z of [-4,-2,0,2,4])box(root,x,1.7,z,.1,.9,.1,m.dark);
  }
  // Platform guide rails and sleeper plates.
  for(const x of [-2.7,2.7]){
    const rail=cylinder(g,x,.08,-273,.07,.07,52,m.lightSteel,8,Math.PI/2);
    rail.rotation.set(Math.PI/2,0,0);rail.scale.set(1,1,1);
  }
  for(let z=-293;z<=-247;z+=2.2)box(g,0,.035,z,6.8,.08,.18,m.dark,false);
  return root;
}

export function buildChapterTwo(world,scene){
  const g=world.worldGroup,m=world.mats;
  world.physicsProps=world.physicsProps||[];

  // Lift transfer shaft: exposed guide rails, cable ladder and maintenance lamps.
  room(world,scene,0,-132,14.4,40);
  wall(world,-7.35,-132,.55,40);wall(world,7.35,-132,.55,40);
  for(const x of [-5.8,-5.25,5.25,5.8]){
    const rail=cylinder(g,x,2.4,-132,.085,.085,39,m.lightSteel,8,Math.PI/2);
    rail.rotation.set(Math.PI/2,0,0);
  }
  for(let z=-116;z>=-148;z-=4){
    box(g,0,4.42,z,13.8,.12,.22,m.dark,false);
    for(const x of [-6.2,6.2])box(g,x,2.35,z,.16,4.3,.28,m.lightSteel);
  }
  for(const z of [-120,-132,-144])lamp(world,scene,0,z,0xd5c18f);
  for(const x of [-4.7,4.7])rod(g,[x,4.15,-116],[x,4.15,-151],.095,m.brick,7);
  sign(g,-7.04,3.25,-121,2.4,.85,Math.PI/2,"TRANSFER SHAFT","LOWER SERVICE / -2");
  sign(g,7.04,3.25,-145,2.4,.85,-Math.PI/2,"FREIGHT LEVEL","AUTHORIZED STAFF","#bd7e4c");

  // Freight receiving hall: overhead gantry, cargo stacks and a shallow coolant spill.
  room(world,scene,0,-174,34,44);
  wall(world,-17.25,-174,.6,44);wall(world,17.25,-174,.6,44);
  room(world,scene,0,-197,34,2.2);
  sign(g,-16.9,3.35,-160,3.0,1.05,Math.PI/2,"FREIGHT BAY","RECEIVING / B-02");
  sign(g,16.9,3.35,-188,3.0,1.05,-Math.PI/2,"MATERIALS","KEEP CLEAR","#bd7e4c");
  // Gantry beam and triangular bracing.
  for(const x of [-13,13])box(g,x,4.25,-174,.4,.48,37,m.dark);
  box(g,0,4.42,-174,26,.28,.42,m.lightSteel);
  for(let z=-188;z<=-160;z+=7){
    rod(g,[-13,3.9,z],[0,4.38,z],.065,m.steel,6);
    rod(g,[0,4.38,z],[13,3.9,z],.065,m.steel,6);
  }
  box(g,-1.7,3.55,-177,1.45,.13,1.45,m.amber);
  rod(g,[-1.7,3.5,-177],[-1.7,2.5,-177],.045,m.dark,6);
  for(const [x,z] of [[-13,-166],[-13,-170],[-10,-166],[12,-165],[12,-169],[9,-190],[-14,-190]])staticCrate(world,x,z,1.35,1.3);
  staticCrate(world,11,-182,1.75,1.7);
  staticCrate(world,13,-185,1.35,1.3);
  staticCrate(world,-13,-185,1.5,1.45);
  movableDrum(world,-4.7,-184);
  movableDrum(world,5.6,-167);
  // Spill puddles use flat transparent meshes and are deliberately shallow.
  const puddleMat=new THREE.MeshLambertMaterial({color:0x54726b,transparent:true,opacity:.34,side:THREE.DoubleSide});
  for(const [x,z,w,d] of [[-1,-184,8,5],[8,-177,3.5,2.4],[-8,-165,2.8,1.8]]){
    const puddle=new THREE.Mesh(new THREE.PlaneGeometry(w,d),puddleMat);
    puddle.rotation.x=-Math.PI/2;puddle.position.set(x,.012,z);g.add(puddle);
    for(let i=0;i<3;i++){
      const ripple=new THREE.Mesh(new THREE.TorusGeometry(.25+i*.22,.012,4,18),m.lightSteel);
      ripple.rotation.x=Math.PI/2;ripple.position.set(x+(i-1)*.65,.022,z);g.add(ripple);
    }
  }
  for(const z of [-158,-173,-189])lamp(world,scene,0,z,0xe0bc7d);
  workerCorpse(world,-7.4,-163.2);
  const fuse=fusePickup(world,12.6,-178.5);
  const pistolPickup=pickupToken(world,-12.6,-174.2,"pistol","Ota 9 mm pistooli",0x87908a);
  const ammoPickups=[
    pickupToken(world,-9.2,-185.7,"ammo","Ota 9 mm ammuksia",0xd8c078),
    pickupToken(world,13.7,-190.1,"ammo","Ota 9 mm ammuksia",0xd8c078)
  ];
  const medkit=medkitPickup(world,5.3,-190.8);
  const recorder=terminal(world,-14.8,-162.2,"recording","Toista huoltopäiväkirja");
  const steamClouds=[steamCloud(world,1.5,-210.2,0),steamCloud(world,-2.8,-230.0,1)];
  const steamZones=[{x:1.5,z:-210.2,radius:1.8},{x:-2.8,z:-230.0,radius:1.7}];
  recorder.userData.label="Kuuntele tallenne";
  // A half-open tool locker tells the player where the replacement fuse came from.
  box(g,13.5,.95,-179.5,1.15,1.9,.82,m.steel);
  box(g,13.5,1.82,-179.05,1.0,.12,.12,m.amber);
  box(g,13.5,.42,-179.05,.92,.08,.12,m.dark,false);

  // Pump gallery: broad pipes, pressure tanks, paired gauges and a hand valve.
  room(world,scene,0,-220,24,44);
  wall(world,-12.25,-220,.6,44);wall(world,12.25,-220,.6,44);
  sign(g,-11.9,3.3,-207,2.8,1.0,Math.PI/2,"PUMP GALLERY","COOLANT RETURN");
  sign(g,11.9,3.3,-232,2.8,1.0,-Math.PI/2,"PRESSURE LINE","MANUAL ISOLATION","#bd7e4c");
  for(const x of [-8.6,-6.9,6.9,8.6]){
    const z=-220;
    cylinder(g,x,1.45,z,.68,.68,2.9,m.dark,12);
    cylinder(g,x,2.95,z,.75,.75,.18,m.lightSteel,12);
    cylinder(g,x,.18,z,.78,.78,.18,m.lightSteel,12);
    world.colliders.push(boundsCollider(x,z,1.55,1.55,0,3.1));
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;
      cylinder(g,x+Math.cos(a)*.58,1.45,z+Math.sin(a)*.58,.045,.045,2.55,m.amber,6);
    }
    addPoint(scene,0x87bdb5,.5,4,x,2.1,z);
  }
  for(const x of [-9.8,9.8])rod(g,[x,3.45,-201],[x,3.45,-238],.13,m.lightSteel,8);
  for(let z=-204;z>=-236;z-=8){
    for(const x of [-10.8,10.8])box(g,x,4.15,z,.22,.2,.3,m.dark);
  }
  const pumpConsole=terminal(world,9.3,-216,"pump","Käynnistä jäähdytyspumput");
  const valve=valveWheel(world,-8.8,-224);
  const pressurePipe=rod(g,[-10.4,2.2,-224],[-2.2,2.2,-224],.22,m.lightSteel,10);
  const pipeJoint=cylinder(g,-2.25,2.2,-224,.42,.42,.42,m.amber,10,Math.PI/2);
  box(g,-2.25,1.95,-224,.65,.12,.65,m.dark);
  for(const z of [-206,-218,-230])lamp(world,scene,0,z,0xd0d6a4);
  // A coolant sluice divides the pump chamber from the tram approach.
  const sluice=box(g,0,2.25,-241,23.6,4.5,.4,m.steel);
  for(let i=0;i<9;i++)box(g,-4.6+i*1.15,2.25,-240.75,.045,4.0,.05,m.dark,false);
  const sluiceCollider=boundsCollider(0,-241,23.7,.55,0,4.6);world.colliders.push(sluiceCollider);

  // Tram hall and a battered electric service car.
  room(world,scene,0,-268,30,52);
  wall(world,-15.25,-268,.6,52);wall(world,15.25,-268,.6,52);wall(world,0,-294,30,.6);
  sign(g,-14.9,3.35,-254,3.0,1.05,Math.PI/2,"SERVICE TRAM","OUTBOUND / PLATFORM 1");
  sign(g,14.9,3.35,-283,3.0,1.05,-Math.PI/2,"NO RETURN","EMERGENCY ROUTE","#bd7e4c");
  const tram=buildTram(world);
  const tramCollider=boundsCollider(0,-273,9.1,15.2,0,3.35);world.colliders.push(tramCollider);
  for(const z of [-249,-266,-284])lamp(world,scene,0,z,0xd5c08f);
  const tramConsole=terminal(world,0,-255,"tram","Käynnistä huoltoraitiovaunu");
  const exitGate=box(g,0,2.25,-290,29.6,4.5,.35,m.steel);
  const exitCollider=boundsCollider(0,-290,29.7,.6,0,4.7);world.colliders.push(exitCollider);
  for(let x=-5;x<=5;x+=1.25)box(g,x,4.45,-289.7,.05,4.0,.05,m.amber,false);
  // Side emergency beacon and a dim maintenance sign.
  const red=new THREE.PointLight(0xff4937,0,13);red.position.set(0,3.8,-258);scene.add(red);
  const green=new THREE.PointLight(0x80c6a2,.2,8);green.position.set(0,2.6,-276);scene.add(green);
  const tramCollider=boundsCollider(0,-273,9.1,15.2,0,3.35);world.colliders.push(tramCollider);
  const lower={fuse,pistolPickup,ammoPickups,medkit,recorder,steamClouds,steamZones,pumpConsole,valve,tramConsole,tram,tramCollider,sluice,sluiceCollider,exitGate,exitCollider,
    pumpOn:false,valveClosed:false,tramRunning:false,red,green,elapsed:0};
  return lower;
}

export function activatePumps(lower,world){
  lower.pumpOn=true;
  lower.pumpConsole.userData.statusLight.material=world.mats.cyanGlow;
  for(const cloud of lower.steamClouds)cloud.root.visible=true;
  lower.red.intensity=1.1;
  for(const prop of world.physicsProps) prop.velocity.multiplyScalar(.25);
}
export function closePressureValve(lower,world){
  lower.valveClosed=true;
  lower.valve.userData.wheel.rotation.z=Math.PI/2;
  lower.valve.userData.statusLight.material=world.mats.cyanGlow;
  lower.sluice.material=world.mats.dark;
  lower.sluice.position.y=4.85;
  lower.sluiceCollider.minY=4.8;lower.sluiceCollider.maxY=9.3;
}
export function startTram(lower,world){
  lower.tramRunning=true;
  lower.tramConsole.userData.statusLight.material=world.mats.cyanGlow;
  lower.exitGate.position.y=4.8;
  lower.exitCollider.minY=4.8;lower.exitCollider.maxY=9.5;
}
export function animateChapterTwo(lower,dt,elapsed){
  lower.elapsed+=dt;
  lower.red.intensity=lower.pumpOn?(0.3+Math.max(0,Math.sin(elapsed*6))*.7):0.05;
  lower.green.intensity=.22+Math.sin(elapsed*2.1)*.08;
  for(const cloud of lower.steamClouds){
    cloud.root.children.forEach((puff,i)=>{
      const t=(elapsed*.72+cloud.phase+i*.19)%2.8;
      puff.position.y=.45+t;
      puff.position.x=Math.sin(elapsed*1.4+cloud.phase+i)*.34;
      puff.material.opacity=lower.pumpOn?Math.max(0,.18*(1-t/2.8)):0;
      puff.scale.setScalar(.85+t*.42);
    });
  }
  if(lower.tramRunning){
    lower.tram.position.z-=dt*3.8;
    lower.tram.rotation.y=Math.sin(elapsed*1.2)*.012;
    const c=lower.tramCollider,z=lower.tram.position.z;
    c.minZ=z-7.6;c.maxZ=z+7.6;
  }
}
