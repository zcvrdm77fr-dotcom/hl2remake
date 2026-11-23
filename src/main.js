import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { SourceMovement } from './physics.js?v=campaign-6';
import { buildSector, openDoor, openLiftCar, animateSector } from './world.js?v=art-2';
import { buildChapterTwo, activatePumps, closePressureValve, startTram, animateChapterTwo } from './chapter2.js?v=art-2';
import { makeEchoStalker, makeResonanceCrawler, makeCrowbar, makePistol } from './entities.js?v=art-2';
import { STORY, OBJECTIVES } from './story.js?v=art-2';
import { RetroAudio } from './audio/RetroAudio.js?v=art-2';

const audio = new RetroAudio();

const $ = (id) => document.getElementById(id);
const ui = {
  start: $('startScreen'), pause: $('pauseScreen'), end: $('endScreen'), hud: $('hud'),
  startButton: $('startButton'), resume: $('resumeButton'), retry: $('retryButton'), fade: $('levelFade'),
  objective: $('objectiveTitle'), detail: $('objectiveDetail'), progress: $('progressFill'),
  health: $('healthValue'), healthFill: $('healthFill'),
  ammo: $('ammoValue'), ammoReadout: $('ammoReadout'), weaponName: $('weaponName'),
  prompt: $('interactionPrompt'), promptLabel: $('promptLabel'), subtitles: $('subtitles'), subtitleName: $('subtitleName'),
  subtitleText: $('subtitleText'), toast: $('toast'), hit: $('hitFlash'), weaponLabel: $('weaponLabel')
};

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.domElement.id = 'gameCanvas';
$('gameRoot').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const world = buildSector(scene);
world.lower = buildChapterTwo(world, scene);
const camera = new THREE.PerspectiveCamera(76, window.innerWidth / window.innerHeight, 0.08, 220);
camera.rotation.order = 'YXZ';
scene.add(camera);
const controls = new PointerLockControls(camera, renderer.domElement);
controls.pointerSpeed = 0.82;
const physics = new SourceMovement(camera, world.colliders);
const weapon = makeCrowbar(camera);
const pistol = makePistol(camera);
pistol.root.visible = false;
const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);
const viewDirection = new THREE.Vector3();
const enemyMeshes = [];
const enemies = [];
const movementKeys = new Set();

let started = false, running = false, finished = false;
let stage = 0, hasBadge = false, hasCoil = false, hasFuse = false, hasPistol = false;
let enemy = null, activeWeapon = 'crowbar', pistolAmmo = 18, pistolShotClock = 0;
let lowerChapterStarted = false, tramRide = false, tramLastZ = 0;
let health = 100, elapsed = 0, previousTime = performance.now();
let attackCooldown = 0, invulnerability = 0, hitFlash = 0, footstepClock = 0;
let subtitleClock = 0, subtitleFullText = '', subtitleIndex = 0, toastClock = 0;
let muted = false;
let liftEndingClock = 0, tramEndingClock = 0, steamDamageClock = 0, outroSpoken = false;

function setObjective() {
  const item = OBJECTIVES[Math.max(0, Math.min(OBJECTIVES.length - 1, stage))];
  ui.objective.textContent = item[0];
  ui.detail.textContent = item[1];
  ui.progress.style.width = (Math.min(1, stage / (OBJECTIVES.length - 1)) * 100) + '%';
}
function toast(message, seconds = 2.4) {
  ui.toast.textContent = message; ui.toast.classList.add('visible'); toastClock = seconds;
}
function say(message, seconds = 6.5) {
  ui.subtitleName.textContent = message.speaker;
  subtitleFullText = message.line; subtitleIndex = 0; ui.subtitleText.textContent = '';
  ui.subtitles.classList.add('visible'); subtitleClock = seconds;
  if (!muted) audio.play('radio');
}
function ensureAudio() { if (!muted) audio.unlock(); }
function radioBlip() { audio.play('radio'); }
function impactSound() { audio.play('impact'); }

function getLookedAtInteractable() {
  raycaster.setFromCamera(screenCenter,camera);
  const hits=raycaster.intersectObjects(world.interactables.filter(item=>item.visible),true);
  for(const hit of hits) {
    if(hit.distance>3.35) break;
    let node=hit.object;
    while(node && !node.userData.kind) node=node.parent;
    if(node && node.userData.kind) return {node,distance:hit.distance};
  }
  return null;
}

function updatePrompt() {
  if(!running){ui.prompt.classList.remove('visible');return}
  const target=getLookedAtInteractable();
  if(!target){ui.prompt.classList.remove('visible');return}
  let label=target.node.userData.label||'USE';
  if(target.node.userData.kind==='badge') label=hasBadge?'KEYCARD ACQUIRED':'TAKE KEYCARD';
  if(target.node.userData.kind==='scanner') label=hasBadge?'USE korttia lukijaan':'CARD REQUIRED';
  if(target.node.userData.kind==='coil') label='TAKE COOLANT COIL';
  if(target.node.userData.kind==='power') label=hasCoil?'RESTORE BACKUP POWER':'COOLANT COIL REQUIRED';
  if(target.node.userData.kind==='lift') label=world.powerOn?'CALL MAINTENANCE LIFT':'LIFT HAS NO POWER';
  if(target.node.userData.kind==='fuse') label=hasFuse?'FUSE ACQUIRED':'TAKE SPARE FUSE';
  if(target.node.userData.kind==='pistol') label=hasPistol?'PISTOL ACQUIRED':'TAKE 9MM PISTOL';
  if(target.node.userData.kind==='ammo') label='TAKE 9MM AMMO';
  if(target.node.userData.kind==='pump') label=hasFuse?'START COOLANT PUMPS':'SPARE FUSE REQUIRED';
  if(target.node.userData.kind==='valve') label=world.lower.pumpOn?'CLOSE PRESSURE VALVE':'START THE PUMPS FIRST';
  if(target.node.userData.kind==='tram') label=world.lower.valveClosed?'START SERVICE TRAM':'PRESSURE VALVE IS OPEN';
  if(target.node.userData.kind==='shaftRecording') label='LISTEN TO SHAFT LOG';
  ui.promptLabel.textContent=label; ui.prompt.classList.add('visible');
}

function spawnEnemy(factory,x,z) {
  const created=factory(scene,x,z);
  enemies.push(created);enemyMeshes.push(created.root);
  if(!enemy)enemy=created;
  return created;
}

function setWeapon(type) {
  if(type==='pistol' && !hasPistol){toast('You have not found the pistol yet.');return}
  activeWeapon=type;
  weapon.root.visible=type==='crowbar';
  pistol.root.visible=type==='pistol';
  ui.weaponName.textContent=type==='pistol'?'9mm Pistol':'Crowbar';
  ui.ammoReadout.classList.toggle('hidden',type!=='pistol');
  updateAmmo();
}
function updateAmmo(){
  ui.ammo.textContent=String(pistolAmmo);
}
function enterLowerChapter(){
  liftEndingClock=0;lowerChapterStarted=true;running=false;
  ui.fade.classList.add('active');
  window.setTimeout(()=>{
    movementKeys.clear();camera.rotation.set(0,0,0);
    physics.reset(new THREE.Vector3(0,0,-119));
    stage=5;setObjective();
    toast('The freight lift has stopped.',3.5);
    running=true;previousTime=performance.now();
    window.setTimeout(()=>ui.fade.classList.remove('active'),90);
  },270);
}

function interact() {
  if(!running) return;
  const target=getLookedAtInteractable();
  if(!target){toast('Nothing to use here.');return}
  const node=target.node,kind=node.userData.kind;

  if(kind==='badge') {
    if(stage!==0){toast('The keycard is already secured.');return}
    hasBadge=true;world.badge.visible=false;stage=1;setObjective();audio.play('pickup');
    toast('KEYCARD: MAINTENANCE TECHNICIAN 17');say(STORY.warning,8.5);return;
  }
  if(kind==='scanner') {
    if(!hasBadge){toast('Lukija vaatii kulkukortin.');return}
    if(stage>1){toast('The service door is already open.');return}
    stage=2;openDoor(world,'security');setObjective();audio.play('door');
    toast('ACCESS GRANTED.');say(STORY.card,8.2);return;
  }
  if(kind==='coil') {
    if(stage<2){toast('The door is still locked.');return}
    if(hasCoil){toast('The coolant coil is already secured.');return}
    hasCoil=true;world.coil.visible=false;stage=3;setObjective();audio.play('pickup');
    world.redAlarm.visible=true;world.sideAlarm.visible=true;
    enemy=spawnEnemy(makeEchoStalker,world.enemySpawn.x,world.enemySpawn.z);
    toast('COOLANT COIL ACQUIRED');say(STORY.breach,8.0);
    window.setTimeout(()=>{if(running&&enemies.some(item=>item.alive))say(STORY.coil,8.0)},4300);return;
  }
  if(kind==='power') {
    if(!hasCoil||stage<3){toast('COOLANT COIL REQUIRED.');return}
    if(world.powerOn){toast('Backup power is already online.');return}
    world.powerOn=true;stage=4;openDoor(world,'lift');audio.play('door');
    world.reactorCore.material.emissiveIntensity=2.1;world.reactorLight.intensity=16;
    setObjective();toast('BACKUP POWER RESTORED');say(STORY.power,8.5);return;
  }
  if(kind==='lift') {
    if(!world.powerOn||stage<4){toast('LIFT HAS NO POWER.');return}
    stage=5;setObjective();openLiftCar(world);audio.play('door');say(STORY.liftStart,8.0);
    toast('The maintenance lift is moving.');liftEndingClock=4.0;return;
  }
  if(kind==='fuse') {
    if(stage<6){toast('Search the freight hall first.');return}
    if(hasFuse){toast('Varasulake on jo mukana.');return}
    hasFuse=true;world.lower.fuse.visible=false;stage=7;setObjective();audio.play('pickup');
    toast('SPARE FUSE ACQUIRED');say(STORY.fuseFound,7.8);return;
  }
  if(kind==='pistol') {
    if(hasPistol){toast('The pistol is already secured.');return}
    hasPistol=true;world.lower.pistolPickup.visible=false;pistolAmmo=Math.max(pistolAmmo,18);audio.play('pickup');
    setWeapon('pistol');toast('9MM PISTOL ACQUIRED');say(STORY.pistolFound,6.5);return;
  }
  if(kind==='ammo') {
    if(!hasPistol){toast('Find the pistol first.');return}
    node.visible=false;pistolAmmo=Math.min(60,pistolAmmo+12);updateAmmo();audio.play('pickup');
    toast('+12 patruunaa');return;
  }
  if(kind==='medkit') {
    if(health>=100){toast('Save the medkit until you need it.');return}
    node.visible=false;setHealth(Math.min(100,health+35));audio.play('pickup');toast('HEALTH RESTORED');impactSound();return;
  }
  if(kind==='recording') {
    node.visible=false;toast('MAINTENANCE LOG RECOVERED',2.4);say(STORY.freightLog,10.5);return;
  }
  if(kind==='shaftRecording') {
    node.visible=false;toast('SHAFT RECORDING RECOVERED',2.4);say(STORY.shaftLog,10.5);return;
  }
  if(kind==='pump') {
    if(!hasFuse||stage<7){toast('The pumps need a replacement fuse.');return}
    if(world.lower.pumpOn){toast('The pumps are already running.');return}
    activatePumps(world.lower,world);stage=8;setObjective();audio.play('alarm');audio.play('door');
    spawnEnemy(makeResonanceCrawler,-8.6,-230.5);
    toast('COOLANT PUMPS ONLINE');say(STORY.pumpStarted,8.2);return;
  }
  if(kind==='valve') {
    if(!world.lower.pumpOn||stage<8){toast('Start the pumps before closing the valve.');return}
    if(world.lower.valveClosed){toast('The pressure valve is already closed.');return}
    closePressureValve(world.lower,world);stage=9;setObjective();audio.play('door');
    toast('Paine tasaantuu.');say(STORY.valveClosed,8.0);return;
  }
  if(kind==='tram') {
    if(!world.lower.valveClosed||stage<9){toast('The service tram has no power yet.');return}
    stage=10;setObjective();startTram(world.lower,world);audio.play('tram');
    tramRide=true;tramLastZ=world.lower.tram.position.z;movementKeys.clear();
    camera.rotation.set(0,0,0);physics.reset(new THREE.Vector3(0,0,-273));
    toast('THE SERVICE TRAM IS STARTING');say(STORY.tramStarted,8.0);tramEndingClock=8.5;outroSpoken=false;
  }
}

function hasClearShot(distance){
  const direction=camera.getWorldDirection(viewDirection);
  for(let d=.25;d<distance-.25;d+=.22){
    const x=camera.position.x+direction.x*d,y=camera.position.y+direction.y*d,z=camera.position.z+direction.z*d;
    for(const c of world.colliders){
      if(y<c.minY||y>c.maxY)continue;
      if(x>c.minX&&x<c.maxX&&z>c.minZ&&z<c.maxZ)return false;
    }
  }
  return true;
}
function damageEnemy(target,damage){
  target.health-=damage;target.phase+=1;target.halo.intensity=4.5;target.root.scale.setScalar(1.07);
  impactSound();
  if(target.health<=0){
    target.alive=false;target.root.visible=false;
    toast('CREATURE DOWN',2.0);
  }else toast('WOUNDS: '+target.health,0.75);
}
function hitPhysicsProp(range,force){
  if(!world.physicsProps.length)return false;
  raycaster.setFromCamera(screenCenter,camera);
  const hits=raycaster.intersectObjects(world.physicsProps.map(p=>p.root),true);
  const hit=hits.find(h=>h.distance<=range);
  if(!hit)return false;
  let root=hit.object;
  while(root&&!root.userData.physicsProp)root=root.parent;
  const prop=world.physicsProps.find(item=>item.root===root)||world.physicsProps.find(item=>item.root===hit.object.parent);
  if(!prop)return false;
  prop.velocity.addScaledVector(camera.getWorldDirection(viewDirection),force/prop.mass);
  impactSound();toast('DRUM MOVED',.7);return true;
}
function firePistol(){
  if(!hasPistol)return;
  if(pistolAmmo<=0){toast('MAGAZINE EMPTY',.85);radioBlip();return}
  attackCooldown=.24;pistolAmmo--;updateAmmo();pistol.recoil=1;pistol.muzzle.intensity=3.6;
  ensureAudio();audio.play('pistol');
  raycaster.setFromCamera(screenCenter,camera);
  const hits=raycaster.intersectObjects(enemyMeshes,true);
  const hit=hits.find(h=>h.distance<38&&h.object.userData.enemy?.alive&&hasClearShot(h.distance));
  if(hit){
    const target=hit.object.userData.enemy;
    damageEnemy(target,1);
    const impact=new THREE.PointLight(0xffd08a,.7,1.8);scene.add(impact);
    impact.position.copy(hit.point);window.setTimeout(()=>scene.remove(impact),55);
  }else{
    const propHit=raycaster.intersectObjects(world.physicsProps.map(p=>p.root),true).find(h=>h.distance<28&&hasClearShot(h.distance));
    if(propHit){
      let current=propHit.object;while(current&&!current.userData.physicsProp)current=current.parent;
      const prop=world.physicsProps.find(item=>item.root===current);
      if(prop)prop.velocity.addScaledVector(camera.getWorldDirection(viewDirection),5.2/prop.mass);
    }
  }
}
function attack() {
  if(!running||tramRide||attackCooldown>0)return;
  if(activeWeapon==='pistol'){firePistol();return}
  attackCooldown=.48;weapon.swing=1;audio.play('crowbar');
  raycaster.setFromCamera(screenCenter,camera);
  const hits=raycaster.intersectObjects(enemyMeshes,true);
  const hit=hits.find(h=>h.distance<=2.75&&h.object.userData.enemy?.alive);
  if(hit){damageEnemy(hit.object.userData.enemy,1);return}
  if(hitPhysicsProp(2.8,4.6))return;
  toast('MISS',.65);
}

function blockedEnemy(x,z) {
  const radius=0.34;
  for(const c of world.colliders) {
    if(1.8<=c.minY || 0>=c.maxY) continue;
    const nx=THREE.MathUtils.clamp(x,c.minX,c.maxX),nz=THREE.MathUtils.clamp(z,c.minZ,c.maxZ);
    const dx=x-nx,dz=z-nz;
    if(dx*dx+dz*dz<radius*radius) return true;
  }
  return false;
}

function updateEnemies(dt){
  if(!running||tramRide)return;
  for(const creature of enemies){
    if(!creature.alive)continue;
    creature.attackCooldown=Math.max(0,creature.attackCooldown-dt);
    creature.halo.intensity=1.35+Math.sin(elapsed*6.5+creature.phase)*.55;
    const pos=creature.root.position;
    const dx=physics.feet.x-pos.x,dz=physics.feet.z-pos.z,distance=Math.hypot(dx,dz);
    creature.animate?.(elapsed);
    creature.growlClock=(creature.growlClock??4)-dt;
    if(distance<13&&creature.growlClock<=0){audio.play('monster',Math.max(.25,1-distance/22));creature.growlClock=5+Math.random()*5}
    // Distant chapter-one creatures stay behind instead of teleporting through
    // a sealed bulkhead to the new level.
    if(distance>64)continue;
    if(distance>1.42){
      const step=Math.min(creature.speed*dt,distance-1.35);
      const nx=pos.x+dx/Math.max(.001,distance)*step,nz=pos.z+dz/Math.max(.001,distance)*step;
      if(!blockedEnemy(nx,pos.z))pos.x=nx;
      if(!blockedEnemy(pos.x,nz))pos.z=nz;
      else if(!blockedEnemy(pos.x+Math.sign(dx)*step,pos.z))pos.x+=Math.sign(dx)*step;
      creature.root.rotation.y=Math.atan2(-dx,-dz);
      creature.root.position.y=Math.abs(Math.sin(elapsed*8+creature.phase))*.045;
      creature.root.scale.set(1,1+Math.sin(elapsed*8+creature.phase)*.025,1);
    }else if(creature.attackCooldown<=0&&invulnerability<=0){
      creature.attackCooldown=1.12;invulnerability=.7;
      setHealth(health-(creature.damage||16));hitFlash=.22;
      const shove=new THREE.Vector3(-dx,0,-dz).normalize();
      physics.velocity.addScaledVector(shove,creature.kind==='crawler'?2.2:3.0);
      impactSound();toast('The creature hit you. HEV suit integrity is falling.',1.1);
    }
  }
}

function setHealth(value) {
  health=Math.max(0,Math.min(100,value));
  ui.health.textContent=Math.round(health); ui.healthFill.style.width=health+'%';
  if(health<=0 && running) finishGame(false);
}

function finishGame(won) {
  running=false;finished=true;tramRide=false;controls.unlock();
  ui.hud.classList.remove('active'); ui.weaponLabel.classList.remove('active');
  ui.end.classList.remove('hidden');
  $('endTitle').textContent=won?'ESCAPED THE KALLIO ANNEX':'HEV SUIT FAILURE';
  $('endDescription').textContent=won
    ? 'The service tram disappears into the tunnel. Aino remains on the radio: "This was not the last test."'
    : 'You are trapped on the lower service levels. Find cover and follow the radio.';
  $('endTime').textContent='TIME '+Math.floor(elapsed/60)+':'+String(Math.floor(elapsed%60)).padStart(2,'0');
}
function openPause() {
  if(!running) return;
  running=false; controls.unlock(); movementKeys.clear(); ui.pause.classList.remove('hidden');
}
function resumeGame() {
  if(!started || finished || health<=0) return;
  ui.pause.classList.add('hidden');running=true;previousTime=performance.now();controls.lock();
}
function moveDynamicProps(dt){
  for(const prop of world.physicsProps){
    const velocity=prop.velocity;
    velocity.multiplyScalar(Math.exp(-2.9*dt));
    const attempt=(axis,delta)=>{
      if(Math.abs(delta)<.00001)return;
      const next=prop.root.position[axis]+delta;
      const c=prop.collider;
      const half=prop.radius;
      let blocked=false;
      for(const other of world.colliders){
        if(other===c||other.maxY<=0||other.minY>=1.15)continue;
        const closestX=THREE.MathUtils.clamp(axis==='x'?next:prop.root.position.x,other.minX,other.maxX);
        const closestZ=THREE.MathUtils.clamp(axis==='z'?next:prop.root.position.z,other.minZ,other.maxZ);
        const px=axis==='x'?next:prop.root.position.x,pz=axis==='z'?next:prop.root.position.z;
        const dx=px-closestX,dz=pz-closestZ;
        if(dx*dx+dz*dz<half*half){blocked=true;break}
      }
      if(blocked)velocity[axis]*=-.12;else prop.root.position[axis]=next;
    };
    attempt('x',velocity.x*dt);attempt('z',velocity.z*dt);
    if(Math.abs(velocity.x)+Math.abs(velocity.z)>.15){
      prop.root.rotation.z+=velocity.x*dt*.7;
      prop.root.rotation.x-=velocity.z*dt*.7;
    }else{prop.root.rotation.z*=.92;prop.root.rotation.x*=.92}
    const x=prop.root.position.x,z=prop.root.position.z,c=prop.collider;
    c.minX=x-prop.radius;c.maxX=x+prop.radius;c.minZ=z-prop.radius;c.maxZ=z+prop.radius;
  }
}
function pushPropsFromPlayer(dt){
  if(!physics.wish.lengthSq())return;
  for(const prop of world.physicsProps){
    const dx=prop.root.position.x-physics.feet.x,dz=prop.root.position.z-physics.feet.z;
    const distance=Math.hypot(dx,dz),reach=physics.radius+prop.radius+.18;
    if(distance>reach||distance<.001)continue;
    const toward=(physics.wish.x*dx+physics.wish.z*dz)/distance;
    if(toward>0)prop.velocity.addScaledVector(new THREE.Vector3(dx/distance,0,dz/distance),toward*4.6*dt/prop.mass);
  }
}
function enterFreightHall(){
  if(stage!==5||physics.feet.z>-153)return;
  stage=6;setObjective();
  toast('FREIGHT LEVEL. FIND THE SPARE FUSE.',3.4);
  say(STORY.freightArrival,8.5);
  spawnEnemy(makeEchoStalker,-3.5,-188.2);
}
function startGame() {
  if (started) return;

  // The level starts even if the browser rejects pointer lock.
  started = true;
  running = true;
  finished = false;
  elapsed = 0;
  ui.start.classList.add('hidden');
  ui.pause.classList.add('hidden');
  ui.end.classList.add('hidden');
  ui.hud.classList.add('active');
  ui.weaponLabel.classList.add('active');
  previousTime = performance.now();

  ensureAudio();
  say(STORY.intro, 6.3);
  try {
    const lockRequest = controls.lock();
    if (lockRequest && typeof lockRequest.catch === 'function') {
      lockRequest.catch(error => {
        console.warn('Pointer lock unavailable; game continues without mouse capture.', error);
        toast('Mouse capture failed. Click the game to retry.', 4);
      });
    }
  } catch (error) {
    console.warn('Pointer lock unavailable; game continues without mouse capture.', error);
    toast('Mouse capture failed. Click the game to retry.', 4);
  }
}

window.__startGame = startGame;

function update(dt) {
  elapsed+=dt;
  moveDynamicProps(dt);
  attackCooldown=Math.max(0,attackCooldown-dt);
  invulnerability=Math.max(0,invulnerability-dt);
  hitFlash=Math.max(0,hitFlash-dt);
  subtitleClock=Math.max(0,subtitleClock-dt);
  toastClock=Math.max(0,toastClock-dt);
  if(subtitleClock<=0) ui.subtitles.classList.remove('visible');
  if(toastClock<=0) ui.toast.classList.remove('visible');
  if(subtitleClock>0 && subtitleIndex<subtitleFullText.length) {
    subtitleIndex=Math.min(subtitleFullText.length,subtitleIndex+dt*44);
    ui.subtitleText.textContent=subtitleFullText.slice(0,Math.floor(subtitleIndex));
  }

  const input={
    forward:Number(movementKeys.has('KeyW')||movementKeys.has('ArrowUp'))-Number(movementKeys.has('KeyS')||movementKeys.has('ArrowDown')),
    right:Number(movementKeys.has('KeyD'))-Number(movementKeys.has('KeyA'))
  };
  const direction=camera.getWorldDirection(viewDirection);
  const result=tramRide
    ? {speed:0,grounded:true,verticalSpeed:0,jumpHeight:physics.feet.y}
    : physics.update(dt,direction,input,movementKeys.has('Space'),movementKeys.has('ShiftLeft')||movementKeys.has('ShiftRight'));
  if(tramRide){movementKeys.clear();physics.velocity.set(0,0,0)}
  pushPropsFromPlayer(dt);
  if(result.grounded&&result.speed>1.3){
    footstepClock-=dt;
    if(footstepClock<=0){footstepClock=result.speed>7.6?.34:.48;footstepSound(result.speed)}
  }else footstepClock=Math.min(footstepClock,.08);

  weapon.swing=Math.max(0,weapon.swing-dt*4.4);
  const swing=Math.sin((1-weapon.swing)*Math.PI)*weapon.swing;
  weapon.root.position.copy(weapon.basePosition); weapon.root.rotation.copy(weapon.baseRotation);
  weapon.root.rotation.x-=swing*0.96; weapon.root.rotation.z-=swing*1.45;
  weapon.root.position.y-=swing*0.18;
  weapon.root.position.x+=Math.sin(elapsed*10)*(result.grounded?0.012:0.004);
  pistol.recoil=Math.max(0,pistol.recoil-dt*8.5);
  pistol.muzzle.intensity=Math.max(0,pistol.muzzle.intensity-dt*28);
  pistol.root.position.copy(pistol.basePosition);
  pistol.root.rotation.copy(pistol.baseRotation);
  pistol.root.position.z+=pistol.recoil*.085;
  pistol.root.rotation.x-=pistol.recoil*.11;

  updateEnemies(dt);
  updatePrompt();
  enterFreightHall();
  animateSector(world,dt,elapsed);
  animateChapterTwo(world.lower,dt,elapsed);
  if(tramRide){
    const z=world.lower.tram.position.z;
    physics.feet.z+=z-tramLastZ;tramLastZ=z;physics.syncCamera();
  }
  if(world.lower.pumpOn){
    steamDamageClock=Math.max(0,steamDamageClock-dt);
    const hot=world.lower.steamZones.some(zone=>Math.hypot(physics.feet.x-zone.x,physics.feet.z-zone.z)<zone.radius);
    if(hot&&steamDamageClock<=0){steamDamageClock=1.45;setHealth(health-5);hitFlash=.12;audio.play('steam');toast('HOT STEAM!',.8)}
  }
  if(liftEndingClock>0){liftEndingClock-=dt;if(liftEndingClock<=0&&running)enterLowerChapter()}
  if(tramEndingClock>0){
    tramEndingClock-=dt;
    if(tramEndingClock<5.6&&!outroSpoken){outroSpoken=true;say(STORY.ending,5.8)}
    if(tramEndingClock<=0&&running)finishGame(true);
  }

  ui.hit.classList.toggle('visible',hitFlash>0);
  ui.hud.classList.toggle('lowHealth',health<=35);
}



function footstepSound(speed){ ensureAudio(); audio.play('footstep',Math.min(1.55,.65+speed/12)); }

function startLoop() {
  function frame(time) {
    requestAnimationFrame(frame);
    const dt=Math.min(0.04,Math.max(0,(time-previousTime)/1000));
    previousTime=time;
    if(running) update(dt);
    renderer.render(scene,camera);
  }
  requestAnimationFrame(frame);
}
function pauseToMenu() { window.location.reload(); }

function onKeyDown(event) {
  if(event.code==='Escape'){if(running)openPause();return}
  if(!running)return;
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','KeyE','KeyF','Digit1','Digit2'].includes(event.code))event.preventDefault();
  movementKeys.add(event.code);
  if(event.code==='KeyE'&&!event.repeat)interact();
  if(event.code==='KeyF'&&!event.repeat)attack();
  if(event.code==='Digit1'&&!event.repeat)setWeapon('crowbar');
  if(event.code==='Digit2'&&!event.repeat)setWeapon('pistol');
}
document.addEventListener('keydown',onKeyDown);
document.addEventListener('keyup',event=>movementKeys.delete(event.code));
document.addEventListener('contextmenu',event=>event.preventDefault());

renderer.domElement.addEventListener('mousedown',event=>{
  if(!running) return;
  if(!controls.isLocked){controls.lock();return}
  if(event.button===0) attack();
  if(event.button===2) interact();
});
let pointerLockHasWorked = false;
controls.addEventListener('lock', () => { pointerLockHasWorked = true; });
controls.addEventListener('unlock', () => {
  movementKeys.clear();
  if (pointerLockHasWorked && running) openPause();
});
document.addEventListener('pointerlockerror', () => {
  if (running) toast('Mouse capture failed. Click the game to retry.', 4);
});

ui.startButton.addEventListener('click', (event) => {
  event.preventDefault();
  startGame();
});
ui.resume.addEventListener('click',resumeGame);
ui.retry.addEventListener('click',pauseToMenu);
$('pauseQuitButton').addEventListener('click',pauseToMenu);

function resize() {
  camera.aspect=window.innerWidth/Math.max(1,window.innerHeight);
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
}
window.addEventListener('resize',resize);

setObjective();
ui.health.textContent='100';ui.healthFill.style.width='100%';
ui.weaponName.textContent='Crowbar';ui.ammoReadout.classList.add('hidden');updateAmmo();
startLoop();
