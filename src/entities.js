import * as THREE from 'three';

function material(color, roughness = 0.82, metalness = 0.04, emissive = 0x000000) {
  return new THREE.MeshLambertMaterial({ color, roughness, metalness, emissive, emissiveIntensity: emissive ? 0.8 : 0 });
}

function rod(parent, a, b, radius, mat, sides = 6) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const delta = new THREE.Vector3().subVectors(end, start);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), sides), mat);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

export function makeCrowbar(camera) {
  const root = new THREE.Group();
  root.position.set(0.42, -0.37, -0.64);
  root.rotation.set(-0.1, -0.1, -0.12);
  camera.add(root);
  const steel = material(0x596267, 0.36, 0.82);
  const worn = material(0x8b8a7a, 0.54, 0.64);
  const grip = material(0x6f3426, 0.88);
  rod(root, [0, -0.16, 0.12], [0.02, 0.24, -0.28], 0.032, steel, 7);
  rod(root, [0.02, 0.24, -0.28], [-0.14, 0.39, -0.4], 0.032, steel, 7);
  rod(root, [-0.14, 0.39, -0.4], [-0.31, 0.32, -0.4], 0.032, worn, 7);
  rod(root, [-0.02, -0.12, 0.08], [0, 0.04, -0.03], 0.045, grip, 7);
  const hand = new THREE.Mesh(new THREE.IcosahedronGeometry(0.105, 1), material(0x7c5947, 0.96));
  hand.position.set(0.015, -0.19, 0.15);
  hand.scale.set(1.0, 0.75, 1.1);
  root.add(hand);
  return { root, basePosition: root.position.clone(), baseRotation: root.rotation.clone(), swing: 0 };
}

export function makeEchoStalker(scene, x, z) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  scene.add(root);
  const hide = material(0x34332f, 0.94, 0.02);
  const hideLight = material(0x554b3d, 0.9, 0.02);
  const bone = material(0x9b8969, 0.9, 0.0);
  const eye = new THREE.MeshLambertMaterial({ color: 0xe88c45, emissive: 0xff5117, emissiveIntensity: 2.1, roughness: 0.4 });
  const wet = material(0x20272a, 0.3, 0.3);

  const torso = new THREE.Mesh(new THREE.IcosahedronGeometry(0.57, 1), hide);
  torso.position.set(0, 1.05, 0.08); torso.scale.set(0.82, 1.28, 0.72); torso.castShadow = true; root.add(torso);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.39, 1), hideLight);
  head.position.set(0, 1.9, -0.19); head.scale.set(0.8, 0.77, 1.1); head.castShadow = true; root.add(head);

  for (const side of [-1, 1]) {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.105, 7, 5), wet);
    socket.position.set(side * 0.19, 1.94, -0.5); root.add(socket);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), eye);
    iris.position.set(side * 0.19, 1.94, -0.575); root.add(iris);
    rod(root, [side * 0.32, 1.35, -0.01], [side * 0.67, 0.72, -0.33], 0.13, hideLight, 6);
    rod(root, [side * 0.67, 0.72, -0.33], [side * 0.76, 0.17, -0.58], 0.085, hide, 6);
    rod(root, [side * 0.22, 0.7, 0.03], [side * 0.34, 0.14, 0.27], 0.13, hide, 6);
    rod(root, [side * 0.34, 0.14, 0.27], [side * 0.48, 0.08, -0.04], 0.075, hideLight, 6);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.58, 5), bone);
    horn.position.set(side * 0.27, 2.24, 0.06); horn.rotation.z = side * -0.42; horn.castShadow = true; root.add(horn);
  }
  const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.48, 6), bone);
  jaw.position.set(0, 1.56, -0.45); jaw.rotation.x = -Math.PI / 2; root.add(jaw);
  for (let i = 0; i < 4; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.42, 5), hideLight);
    spike.position.set(-0.23 + i * 0.15, 1.25 + Math.sin(i) * 0.08, 0.55);
    spike.rotation.x = Math.PI / 2.5; root.add(spike);
  }
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), eye);
  core.position.set(0, 1.12, 0.58); root.add(core);
  const halo = new THREE.PointLight(0xff7135, 1.4, 5);
  halo.position.set(0, 1.6, 0.5); root.add(halo);

  const enemy = { root, health: 5, alive: true, attackCooldown: 0.8, speed: 2.65, halo, phase: 0 };
  root.traverse(object => { if (object.isMesh) object.userData.enemy = enemy; });
  return enemy;
}


export function makeResonanceCrawler(scene,x,z){
  const root=new THREE.Group();root.position.set(x,0,z);scene.add(root);
  const shell=material(0x46443a,.96,.02),shellEdge=material(0x74634a,.91,.02);
  const bone=material(0x9f9274,.95,0),dark=material(0x1c2420,.4,.12);
  const eyeMat=new THREE.MeshLambertMaterial({color:0xb6cf7e,emissive:0x617d29,emissiveIntensity:1.7});
  const body=new THREE.Mesh(new THREE.IcosahedronGeometry(.48,1),shell);
  body.position.set(0,.72,.02);body.scale.set(1.05,.62,1.3);body.castShadow=true;root.add(body);
  const carapace=new THREE.Mesh(new THREE.IcosahedronGeometry(.38,0),shellEdge);
  carapace.position.set(0,.95,.18);carapace.scale.set(.96,.54,1.08);root.add(carapace);
  const head=new THREE.Mesh(new THREE.IcosahedronGeometry(.29,1),bone);
  head.position.set(0,.69,-.53);head.scale.set(.9,.72,.9);root.add(head);
  for(const side of [-1,1]){
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.075,6,5),eyeMat);
    eye.position.set(side*.16,.78,-.77);root.add(eye);
    for(const i of [0,1,2]){
      const z=.4-i*.42,outer=side*(.55+i*.06);
      rod(root,[side*.28,.68,z],[outer,.5,z-.22],.095,shellEdge,5);
      rod(root,[outer,.5,z-.22],[side*(.83+i*.05),.13,z-.4],.065,dark,5);
      const claw=new THREE.Mesh(new THREE.ConeGeometry(.075,.22,5),bone);
      claw.position.set(side*(.83+i*.05),.09,z-.5);claw.rotation.x=Math.PI/2;root.add(claw);
    }
  }
  for(let i=0;i<4;i++){
    const spike=new THREE.Mesh(new THREE.ConeGeometry(.075,.36,5),shellEdge);
    spike.position.set(-.22+i*.145,1.12,.18+i*.08);spike.rotation.x=.4;root.add(spike);
  }
  const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.16,0),eyeMat);
  core.position.set(0,.73,.5);root.add(core);
  const halo=new THREE.PointLight(0xa8ce6d,.8,3.5);halo.position.set(0,.9,.42);root.add(halo);
  const enemy={root,health:4,alive:true,attackCooldown:1.1,speed:3.35,damage:12,kind:'crawler',halo,phase:0};
  root.traverse(o=>{if(o.isMesh)o.userData.enemy=enemy});
  return enemy;
}


export function makePistol(camera){
  const root=new THREE.Group();
  root.position.set(.39,-.32,-.62);
  root.rotation.set(-.045,-.055,-.06);
  camera.add(root);
  const slide=material(0x4b5654,.48,.6);
  const dark=material(0x202724,.86,.08);
  const grip=material(0x493b2c,.94,.02);
  const steel=material(0x8a907f,.42,.52);
  const box=(size,pos,mat)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);o.position.set(...pos);o.castShadow=true;root.add(o);return o};
  // Compact late-90s service pistol, built from simple low-poly parts.
  box([.19,.16,.51],[0,.045,-.28],slide);
  box([.195,.075,.34],[0,.151,-.31],steel);
  box([.15,.24,.17],[0,-.13,-.14],grip).rotation.x=-.22;
  box([.105,.11,.18],[0,-.205,-.13],dark).rotation.x=-.22;
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.043,.043,.32,8),dark);
  barrel.rotation.x=Math.PI/2;barrel.position.set(0,.045,-.62);root.add(barrel);
  box([.22,.035,.07],[0,.15,-.5],dark);
  box([.045,.065,.045],[0,.19,-.49],steel);
  box([.06,.04,.045],[0,.185,-.06],steel);
  const trigger=new THREE.Mesh(new THREE.TorusGeometry(.065,.012,4,8,Math.PI),steel);
  trigger.position.set(0,-.06,-.19);trigger.rotation.x=Math.PI/2;root.add(trigger);
  const hand=new THREE.Mesh(new THREE.IcosahedronGeometry(.12,1),material(0x745642,.95,0));
  hand.position.set(0,-.22,.03);hand.scale.set(1.1,.78,1.2);root.add(hand);
  const muzzle=new THREE.PointLight(0xffc878,0,3);
  muzzle.position.set(0,.05,-.82);root.add(muzzle);
  return {root,basePosition:root.position.clone(),baseRotation:root.rotation.clone(),muzzle,recoil:0};
}
