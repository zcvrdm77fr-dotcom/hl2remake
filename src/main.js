import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { SourceMovement } from './physics.js';
import { buildSector, openDoor, openLiftCar, animateSector } from './world.js';
import { makeEchoStalker, makeCrowbar } from './entities.js';
import { STORY, OBJECTIVES } from './story.js';

const $ = (id) => document.getElementById(id);
const ui = {
  start: $('startScreen'), pause: $('pauseScreen'), end: $('endScreen'), hud: $('hud'),
  startButton: $('startButton'), resume: $('resumeButton'), retry: $('retryButton'),
  objective: $('objectiveTitle'), detail: $('objectiveDetail'), progress: $('progressFill'),
  health: $('healthValue'), healthFill: $('healthFill'), speed: $('speedValue'), state: $('movementState'),
  prompt: $('interactionPrompt'), subtitles: $('subtitles'), subtitleName: $('subtitleName'),
  subtitleText: $('subtitleText'), toast: $('toast'), hit: $('hitFlash'), weaponLabel: $('weaponLabel')
};

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
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
const camera = new THREE.PerspectiveCamera(78, window.innerWidth / window.innerHeight, 0.08, 170);
camera.rotation.order = 'YXZ';
scene.add(camera);
const controls = new PointerLockControls(camera, renderer.domElement);
controls.pointerSpeed = 0.82;
const physics = new SourceMovement(camera, world.colliders);
const weapon = makeCrowbar(camera);
const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);
const viewDirection = new THREE.Vector3();
const enemyMeshes = [];
const movementKeys = new Set();

let started = false, running = false, finished = false;
let stage = 0, hasBadge = false, hasCoil = false, enemy = null;
let health = 100, elapsed = 0, previousTime = performance.now();
let attackCooldown = 0, invulnerability = 0, hitFlash = 0;
let subtitleClock = 0, subtitleFullText = '', subtitleIndex = 0, toastClock = 0;
let audioContext = null, ambientOsc = null, ambientGain = null, muted = false;
let liftEndingClock = 0;

function setObjective() {
  const item = OBJECTIVES[Math.max(0, Math.min(OBJECTIVES.length - 1, stage))];
  ui.objective.textContent = item[0];
  ui.detail.textContent = item[1];
  ui.progress.style.width = ((stage / 5) * 100) + '%';
}
function toast(message, seconds = 2.4) {
  ui.toast.textContent = message; ui.toast.classList.add('visible'); toastClock = seconds;
}
function say(message, seconds = 6.5) {
  ui.subtitleName.textContent = message.speaker;
  subtitleFullText = message.line; subtitleIndex = 0; ui.subtitleText.textContent = '';
  ui.subtitles.classList.add('visible'); subtitleClock = seconds;
  if (!muted) radioBlip();
}
function ensureAudio() {
  if (muted) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    if (!audioContext) {
      audioContext = new AC(); ambientOsc = audioContext.createOscillator();
      ambientGain = audioContext.createGain();
      const lowpass = audioContext.createBiquadFilter();
      ambientOsc.type = 'sawtooth'; ambientOsc.frequency.value = 41.5;
      lowpass.type = 'lowpass'; lowpass.frequency.value = 105;
      ambientGain.gain.value = 0.012;
      ambientOsc.connect(lowpass).connect(ambientGain).connect(audioContext.destination); ambientOsc.start();
    }
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  } catch (error) {
    console.warn('Audio unavailable; continuing without sound.', error);
    muted = true;
  }
}
function radioBlip() {
  ensureAudio(); if (!audioContext || muted) return;
  const now=audioContext.currentTime,osc=audioContext.createOscillator(),gain=audioContext.createGain();
  osc.type='triangle'; osc.frequency.setValueAtTime(720,now); osc.frequency.exponentialRampToValueAtTime(320,now+0.12);
  gain.gain.setValueAtTime(0.045,now); gain.gain.exponentialRampToValueAtTime(0.0001,now+0.16);
  osc.connect(gain).connect(audioContext.destination); osc.start(now); osc.stop(now+0.17);
}
function impactSound() {
  ensureAudio(); if (!audioContext || muted) return;
  const now=audioContext.currentTime,osc=audioContext.createOscillator(),gain=audioContext.createGain();
  osc.type='square'; osc.frequency.setValueAtTime(92,now); osc.frequency.exponentialRampToValueAtTime(36,now+0.14);
  gain.gain.setValueAtTime(0.075,now); gain.gain.exponentialRampToValueAtTime(0.0001,now+0.16);
  osc.connect(gain).connect(audioContext.destination); osc.start(now); osc.stop(now+0.17);
}

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
  let label=target.node.userData.label||'KÄYTÄ';
  if(target.node.userData.kind==='badge') label=hasBadge?'KULKUKORTTI OTETTU':'POIMI KULKUKORTTI';
  if(target.node.userData.kind==='scanner') label=hasBadge?'SKANNAA KULKUKORTTI':'LUKIJA · VAATII KORTIN';
  if(target.node.userData.kind==='coil') label='OTA JÄÄHDYTYSKELA';
  if(target.node.userData.kind==='power') label=hasCoil?'KÄYNNISTÄ VARAVOIMA':'VARAVOIMA · KELA PUUTTUU';
  if(target.node.userData.kind==='lift') label=world.powerOn?'KÄYNNISTÄ HUOLTOHISSI':'HISSI · EI VIRTOJA';
  ui.prompt.textContent='[ E ]  '+label; ui.prompt.classList.add('visible');
}

function interact() {
  if(!running) return;
  const target=getLookedAtInteractable();
  if(!target){toast('Tähtää kohteeseen ja paina E.');return}
  const kind=target.node.userData.kind;

  if(kind==='badge') {
    if(stage!==0){toast('Kulkukortti on jo otettu.');return}
    hasBadge=true; world.badge.visible=false; stage=1; setObjective();
    toast('KULKUKORTTI · TEKNIKKO 17'); say(STORY.warning,7.5); return;
  }
  if(kind==='scanner') {
    if(!hasBadge){toast('Lukija vaatii sektorin 09 kulkukortin.');return}
    if(stage>1){toast('Bulkhead on jo avattu.');return}
    stage=2; openDoor(world,'security'); setObjective();
    toast('TUNNISTE HYVÄKSYTTY · BULKHEAD AVAUTUU'); say(STORY.card,6.7); return;
  }
  if(kind==='coil') {
    if(stage<2){toast('Jäähdytyskela on lukitun alueen takana.');return}
    if(hasCoil){toast('Jäähdytyskela on jo mukana.');return}
    hasCoil=true; world.coil.visible=false; stage=3; setObjective();
    world.redAlarm.visible=true; world.sideAlarm.visible=true;
    enemy=makeEchoStalker(scene,world.enemySpawn.x,world.enemySpawn.z); enemyMeshes.push(enemy.root);
    toast('JÄÄHDYTYSKELA POIMITTU · POIKKEAMA AKTIVOITUI');
    say(STORY.breach,7.1);
    window.setTimeout(()=>{if(running && enemy && enemy.alive) say(STORY.coil,7.1)},4300);
    return;
  }
  if(kind==='power') {
    if(!hasCoil || stage<3){toast('Varavoima tarvitsee sinisen jäähdytyskelan.');return}
    if(world.powerOn){toast('Varavoima on jo palautettu.');return}
    world.powerOn=true; stage=4; openDoor(world,'lift');
    world.reactorCore.material.emissiveIntensity=2.1; world.reactorLight.intensity=16;
    setObjective(); toast('VARAVOIMA PALAUTETTU · HISSIN LUKKO AUKI'); say(STORY.power,7.2); return;
  }
  if(kind==='lift') {
    if(!world.powerOn || stage<4){toast('Hissi ei saa vielä virtaa.');return}
    stage=5; setObjective(); openLiftCar(world); say(STORY.ending,6.8);
    toast('HUOLTOHISSI KÄYNNISTYY'); liftEndingClock=3.3;
  }
}

function attack() {
  if(!running || attackCooldown>0) return;
  attackCooldown=0.48; weapon.swing=1; radioBlip();
  if(!enemy || !enemy.alive) return;
  raycaster.setFromCamera(screenCenter,camera);
  const hits=raycaster.intersectObjects(enemyMeshes,true);
  if(!hits.length || hits[0].distance>2.75){toast('Crowbar osuu vain ilmaan.',0.8);return}
  const target=hits[0].object.userData.enemy;
  if(!target || !target.alive) return;
  target.health-=1; target.phase+=1; target.halo.intensity=4.5; target.root.scale.setScalar(1.07);
  toast('OSUMA · OLENTO '+Math.max(0,target.health)+'/5',0.9); impactSound();
  if(target.health<=0){target.alive=false;target.root.visible=false;toast('OLENTO PYSÄYTETTY',2.8)}
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

function updateEnemy(dt) {
  if(!enemy || !enemy.alive || !running) return;
  enemy.attackCooldown=Math.max(0,enemy.attackCooldown-dt);
  enemy.halo.intensity=1.5+Math.sin(elapsed*6.5)*0.6;
  const pos=enemy.root.position;
  const dx=physics.feet.x-pos.x,dz=physics.feet.z-pos.z,distance=Math.hypot(dx,dz);
  if(distance>1.42) {
    const step=enemy.speed*dt,nx=pos.x+dx/Math.max(0.001,distance)*step,nz=pos.z+dz/Math.max(0.001,distance)*step;
    if(!blockedEnemy(nx,pos.z)) pos.x=nx;
    else if(!blockedEnemy(pos.x,nz)) pos.z=nz;
    else {
      const alternate=Math.abs(dx)>Math.abs(dz)?[pos.x,pos.z+Math.sign(dz)*step]:[pos.x+Math.sign(dx)*step,pos.z];
      if(!blockedEnemy(alternate[0],alternate[1])){pos.x=alternate[0];pos.z=alternate[1]}
    }
    enemy.root.rotation.y=Math.atan2(-dx,-dz);
    enemy.root.position.y=Math.abs(Math.sin(elapsed*8))*0.07;
    enemy.root.scale.set(1,1+Math.sin(elapsed*8)*0.035,1);
  } else if(enemy.attackCooldown<=0 && invulnerability<=0) {
    enemy.attackCooldown=1.18; invulnerability=0.72;
    setHealth(health-17); hitFlash=0.22;
    const shove=new THREE.Vector3(-dx,0,-dz).normalize();
    physics.velocity.addScaledVector(shove,3.0);
    impactSound(); toast('OLENTO OSUI · SUOJAPUKU VAURIOITUI',1.2);
  }
}

function setHealth(value) {
  health=Math.max(0,Math.min(100,value));
  ui.health.textContent=Math.round(health)+'%'; ui.healthFill.style.width=health+'%';
  if(health<=0 && running) finishGame(false);
}

function finishGame(won) {
  running=false; finished=true; controls.unlock();
  ui.hud.classList.remove('active'); ui.weaponLabel.classList.remove('active');
  ui.end.classList.remove('hidden');
  $('endTitle').textContent=won?'HUOLTOHISSI · YHTEYS KATKESI':'SUOJAPUKU PETTI';
  $('endDescription').textContent=won
    ? 'Hissi nousee tyhjää kuilua. Radiosta kuuluu vielä yksi viesti, mutta sen aikaleima on huomisaamulta. LUKU 01 PÄÄTTYI.'
    : 'Resonanssikaiku täyttää käytävän. Et ehtinyt hissille. Kokeile uudelleen ja pidä vauhtisi yllä.';
  $('endTime').textContent='AIKA '+Math.floor(elapsed/60)+':'+String(Math.floor(elapsed%60)).padStart(2,'0');
}
function openPause() {
  if(!running) return;
  running=false; controls.unlock(); movementKeys.clear(); ui.pause.classList.remove('hidden');
}
function resumeGame() {
  if(!started || finished || health<=0) return;
  ui.pause.classList.add('hidden'); running=true; previousTime=performance.now(); controls.lock();
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
        toast('HIIRTÄ EI SAATU LUKITTUA — PELI JATKUU SILTI', 4);
      });
    }
  } catch (error) {
    console.warn('Pointer lock unavailable; game continues without mouse capture.', error);
    toast('HIIRTÄ EI SAATU LUKITTUA — PELI JATKUU SILTI', 4);
  }
}

function update(dt) {
  elapsed+=dt;
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
  const result=physics.update(dt,direction,input,movementKeys.has('Space'),movementKeys.has('ShiftLeft')||movementKeys.has('ShiftRight'));

  weapon.swing=Math.max(0,weapon.swing-dt*4.4);
  const swing=Math.sin((1-weapon.swing)*Math.PI)*weapon.swing;
  weapon.root.position.copy(weapon.basePosition); weapon.root.rotation.copy(weapon.baseRotation);
  weapon.root.rotation.x-=swing*0.96; weapon.root.rotation.z-=swing*1.45;
  weapon.root.position.y-=swing*0.18;
  weapon.root.position.x+=Math.sin(elapsed*10)*(result.grounded?0.012:0.004);

  updateEnemy(dt);
  updatePrompt();
  animateSector(world,dt,elapsed);
  if(liftEndingClock>0){liftEndingClock-=dt;if(liftEndingClock<=0 && running)finishGame(true)}

  ui.speed.textContent=result.speed.toFixed(1);
  ui.state.textContent=result.grounded?(result.speed>7?'GROUND / FAST':'GROUND'):'AIR / BHOP';
  ui.hit.classList.toggle('visible',hitFlash>0);
  ui.hud.classList.toggle('lowHealth',health<=35);
}

function updatePrompt() {
  if(!running){ui.prompt.classList.remove('visible');return}
  const target=getLookedAtInteractable();
  if(!target){ui.prompt.classList.remove('visible');return}
  let label=target.node.userData.label||'KÄYTÄ';
  if(target.node.userData.kind==='badge') label=hasBadge?'KULKUKORTTI OTETTU':'POIMI KULKUKORTTI';
  if(target.node.userData.kind==='scanner') label=hasBadge?'SKANNAA KULKUKORTTI':'LUKIJA · VAATII KORTIN';
  if(target.node.userData.kind==='coil') label='OTA JÄÄHDYTYSKELA';
  if(target.node.userData.kind==='power') label=hasCoil?'KÄYNNISTÄ VARAVOIMA':'VARAVOIMA · KELA PUUTTUU';
  if(target.node.userData.kind==='lift') label=world.powerOn?'KÄYNNISTÄ HUOLTOHISSI':'HISSI · EI VIRTOJA';
  ui.prompt.textContent='[ E ]  '+label; ui.prompt.classList.add('visible');
}

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
  if(!running) return;
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','KeyE','KeyF'].includes(event.code)) event.preventDefault();
  movementKeys.add(event.code);
  if(event.code==='KeyE' && !event.repeat) interact();
  if(event.code==='KeyF' && !event.repeat) attack();
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
  if (running) toast('HIIRTÄ EI SAATU LUKITTUA — PELI JATKUU SILTI', 4);
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
ui.health.textContent='100%'; ui.healthFill.style.width='100%'; ui.speed.textContent='0.0';
startLoop();
