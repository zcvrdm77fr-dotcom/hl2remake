import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { SourceMovement } from './physics.js';
import { buildCity, openGate, animateWorld } from './world.js';
import { makeCombine, makeWeapon, makeEnemyBolt } from './entities.js';

const $ = (id) => document.getElementById(id);
const ui = {
  start: $('startScreen'), pause: $('pauseScreen'), end: $('endScreen'),
  startButton: $('startButton'), resume: $('resumeButton'), restart: $('restartButton'),
  hud: $('hud'), objective: $('objective'), detail: $('objectiveDetail'),
  progress: $('progressFill'), prompt: $('interactionPrompt'), subtitles: $('subtitles'),
  health: $('healthValue'), healthFill: $('healthFill'), ammo: $('ammoValue'),
  speed: $('speedValue'), state: $('movementState'), crosshair: $('crosshair'),
  mute: $('muteButton'), quality: $('qualitySelect'), sound: $('soundSelect'),
  jump: $('jumpButton'), fire: $('fireButton'), mobile: $('mobileControls'),
  hit: $('hitFlash'), toast: $('toast')
};

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.domElement.id = 'gameCanvas';
$('gameRoot').appendChild(renderer.domElement);

const sceneBundle = buildCity(THREE);
const scene = sceneBundle.scene;
const camera = new THREE.PerspectiveCamera(88, window.innerWidth / window.innerHeight, 0.08, 190);
camera.rotation.order = 'YXZ';
scene.add(camera);
const controls = new PointerLockControls(camera, renderer.domElement);
controls.pointerSpeed = 0.85;
controls.minPolarAngle = 0.12;
controls.maxPolarAngle = Math.PI - 0.12;

const physics = new SourceMovement(camera);
const weapon = makeWeapon(camera);
const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);
const direction = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const enemyBolts = [];
const enemies = [];
const tracers = [];
let running = false;
let started = false;
let paused = false;
let elapsed = 0;
let previousTime = performance.now();
let health = 100;
let ammo = 30;
let shotCooldown = 0;
let hurtCooldown = 0;
let hitTimer = 0;
let cellsInstalled = 0;
let cellsCarried = 0;
let wave = 0;
let kills = 0;
let gameWon = false;
let mobileLook = null;
let voiceEnabled = true;
let audioContext = null;
let muted = false;
let toastTimer = 0;
let objectiveStep = 'cells';
let currentSubtitle = '';
let subtitleTimer = 0;

const subtitleLines = {
  arrival: ['ASEMAN KUULUTUS', 'Matkustajat, juna raiteelta kolme on myöhässä. Pysykää laiturialueella.'],
  firstCell: ['JUNANLÄHETTÄJÄ', 'Virtakennot ovat yhä ehjiä. Tuo ne releelle, niin saan portin auki.'],
  secondCell: ['KAJO', 'Kuulitko? Ratapihalla on vastarintaa. Pääset sinne vanhan huoltoportin kautta.'],
  yard: ['SÄRÖ', 'Me pidämme vaihteen auki. Ota kivääri ja pysäytä Combine-partiot.'],
  wave: ['COMBINE', 'Valvontakeskus yksiköille. Tunkeilija havaittu. Sulkekaa alue.'],
  clear: ['KAJO', 'Portti on vapaa. Jatka terminaalin läpi.'],
  finale: ['G-MAN', 'Teillä on kiire, herra Freeman. Aina on.']
};

function ensureAudio() {
  if (muted || !voiceEnabled) return;
  if (!audioContext) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioContext = new AC();
  }
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
}

function beep(frequency = 220, duration = 0.12, waveform = 'sine', gainValue = 0.07) {
  if (muted) return;
  ensureAudio();
  if (!audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = waveform;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  gain.gain.setValueAtTime(gainValue, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration + 0.01);
}

function showSubtitle(key, duration = 5) {
  const line = subtitleLines[key];
  if (!line) return;
  currentSubtitle = line[1];
  $('subtitleName').textContent = line[0];
  $('subtitleText').textContent = line[1];
  ui.subtitles.classList.add('visible');
  subtitleTimer = duration;
  if (voiceEnabled && !muted && 'speechSynthesis' in window) {
    const voice = speechSynthesis.getVoices().find(item => /^fi([-_]|$)/i.test(item.lang));
    if (voice) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(line[1]);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = 0.95;
      utterance.volume = 0.82;
      speechSynthesis.speak(utterance);
    }
  }
}

function showToast(message, duration = 2.2) {
  ui.toast.textContent = message;
  ui.toast.classList.add('visible');
  toastTimer = duration;
}

function setObjective(title, detail, percent) {
  ui.objective.textContent = title;
  ui.detail.textContent = detail;
  ui.progress.style.width = Math.max(0, Math.min(100, percent)) + '%';
}

function setPrompt(text) {
  ui.prompt.textContent = text;
  ui.prompt.classList.toggle('visible', Boolean(text));
}

function setHealth(value) {
  health = Math.max(0, Math.min(100, value));
  ui.health.textContent = Math.round(health) + '%';
  ui.healthFill.style.width = health + '%';
  if (health <= 0) die();
}

function saveBestRun() {
  try {
    const best = Number(localStorage.getItem('aikakatkos.best') || 0);
    if (!best || elapsed < best) localStorage.setItem('aikakatkos.best', String(elapsed));
  } catch {}
}

function startGame() {
  ensureAudio();
  started = true;
  paused = false;
  running = true;
  gameWon = false;
  ui.start.classList.add('hidden');
  ui.pause.classList.add('hidden');
  ui.end.classList.add('hidden');
  controls.lock();
  previousTime = performance.now();
  showSubtitle('arrival', 4.4);
  beep(280, 0.16, 'triangle', 0.05);
}

function pauseGame() {
  if (!running) return;
  running = false;
  paused = true;
  controls.unlock();
  ui.pause.classList.remove('hidden');
  if ('speechSynthesis' in window) speechSynthesis.pause();
}

function resumeGame() {
  if (!started || gameWon || health <= 0) return;
  ui.pause.classList.add('hidden');
  controls.lock();
}

function finishGame(won) {
  running = false;
  gameWon = won;
  controls.unlock();
  ui.end.classList.remove('hidden');
  $('endTitle').textContent = won ? 'Aika liikkuu taas.' : 'Yhteys katkesi.';
  $('endDescription').textContent = won
    ? 'Ratapiha on vapaa. Juna lähtee viimein City 17:stä.'
    : 'Suojapuku ei kestänyt. Kokeile uudelleen ja pidä vauhtisi yllä.';
  if (won) saveBestRun();
}

function die() {
  if (!running) return;
  finishGame(false);
}

function updateObjective() {
  if (objectiveStep === 'cells') {
    const total = cellsInstalled + cellsCarried;
    setObjective('VIRTA PALAUTETTAVA', 'Virtakennot releelle · ' + total + '/2', total * 28);
  } else if (objectiveStep === 'gate') {
    setObjective('HUOLTO-OVI', 'Kulje avautuvasta portista ratapihalle', 58);
  } else if (objectiveStep === 'yard') {
    setObjective('RATAPIHA 09', 'Pysäytä Combine-partiot · Aalto ' + wave + '/3', 58 + (wave / 3) * 25);
  } else {
    setObjective('JUNA LIIKKEELLE', 'Mene päätepuskurille', 100);
  }
}

function currentColliders() {
  if (!sceneBundle.unlocked && objectiveStep !== 'cells') {
    return sceneBundle.colliders.concat(sceneBundle.gateCollider);
  }
  return sceneBundle.colliders;
}

function spawnWave() {
  wave++;
  if (wave > 3) {
    objectiveStep = 'exit';
    showSubtitle('clear', 4);
    updateObjective();
    return;
  }
  showSubtitle('wave', 3.8);
  const positions = [
    [[-8, -72], [0, -80], [8, -74]],
    [[-10, -84], [7, -88], [13, -66]],
    [[-7, -96], [4, -94], [12, -97]]
  ][wave - 1];
  positions.forEach(([x, z], i) => enemies.push(makeCombine(scene, x, z, i)));
  updateObjective();
}

function interact() {
  if (!running) return;
  raycaster.setFromCamera(center, camera);
  const targets = sceneBundle.interactables.filter(item => item.visible);
  const intersections = raycaster.intersectObjects(targets, true).filter(hit => hit.distance < 3.8);
  const hit = intersections[0];
  if (!hit) {
    showToast('Tähtää esineeseen ja paina E.');
    return;
  }
  let object = hit.object;
  while (object && !object.userData.kind) object = object.parent;
  if (!object) return;

  if (object.userData.kind === 'cell') {
    if (cellsCarried >= 1) {
      showToast('Kanna yksi virtakenno kerrallaan.');
      return;
    }
    object.visible = false;
    cellsCarried++;
    updateObjective();
    showToast('Virtakenno poimittu. Vie se releelle.');
    beep(460, 0.13, 'triangle');
    return;
  }

  if (object.userData.kind === 'relay') {
    if (!cellsCarried) {
      showToast('Rele tarvitsee kaksi virtakennoa.');
      return;
    }
    cellsCarried = 0;
    cellsInstalled++;
    sceneBundle.relayCore.material = cellsInstalled === 2 ? sceneBundle.mats.cyan : sceneBundle.mats.orange;
    sceneBundle.relayLight.intensity = 1.8 + cellsInstalled * 2.0;
    updateObjective();
    showToast('Virtakenno asennettu · ' + cellsInstalled + '/2');
    beep(520 + cellsInstalled * 80, 0.22, 'sine');
    if (cellsInstalled === 2) {
      objectiveStep = 'gate';
      openGate(sceneBundle);
      showSubtitle('secondCell', 4.6);
      updateObjective();
    }
  }
}

function shoot() {
  if (!running || shotCooldown > 0 || ammo <= 0) return;
  shotCooldown = 0.115;
  ammo--;
  ui.ammo.textContent = String(ammo).padStart(2, '0');
  weapon.kick = 1;
  beep(118, 0.075, 'sawtooth', 0.08);
  raycaster.setFromCamera(center, camera);
  const meshList = enemies.filter(e => !e.dead).map(e => e.root);
  const hits = raycaster.intersectObjects(meshList, true);
  const muzzle = camera.localToWorld(new THREE.Vector3(0.02, -0.07, -0.8));
  let end = muzzle.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(48));
  if (hits.length) {
    const hit = hits[0];
    end = hit.point.clone();
    const enemy = hit.object.userData.enemy;
    if (enemy && !enemy.dead) {
      enemy.health--;
      enemy.flash = 0.12;
      hit.object.material = hit.object.material;
      if (enemy.health <= 0) {
        enemy.dead = true;
        scene.remove(enemy.root);
        kills++;
        if (enemies.every(e => e.dead) && wave < 3) spawnWave();
        else if (enemies.every(e => e.dead) && wave === 3) {
          objectiveStep = 'exit';
          updateObjective();
          showSubtitle('finale', 5);
        }
      }
    }
  }
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([muzzle, end]);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffbd7b, transparent: true, opacity: 0.95 });
  const line = new THREE.Line(lineGeometry, lineMaterial);
  scene.add(line);
  tracers.push({ line, life: 0.055, max: 0.055 });
  if (ammo === 0) showToast('Lipas tyhjä · paina R');
}

function reload() {
  if (!running || ammo === 30) return;
  showToast('Ladataan...');
  setTimeout(() => {
    if (!started || gameWon) return;
    ammo = 30;
    ui.ammo.textContent = '30';
    beep(360, 0.1, 'triangle');
  }, 850);
}

function enemyAttack(enemy, dt) {
  const position = enemy.root.position;
  const delta = new THREE.Vector3(physics.feet.x - position.x, 0, physics.feet.z - position.z);
  const distance = delta.length();
  if (distance > 4.7) {
    delta.normalize();
    const step = enemy.speed * dt;
    const nx = position.x + delta.x * step;
    const nz = position.z + delta.z * step;
    const collision = currentColliders().some(c => nx > c.minX - 0.35 && nx < c.maxX + 0.35 && nz > c.minZ - 0.35 && nz < c.maxZ + 0.35);
    if (!collision) {
      position.x = nx;
      position.z = nz;
    }
    enemy.root.rotation.y = Math.atan2(-delta.x, -delta.z);
  } else {
    enemy.attackTimer -= dt;
    if (enemy.attackTimer <= 0) {
      enemy.attackTimer = 1.35;
      setHealth(health - 12);
      hitTimer = 0.18;
      showToast('Osuma · HEV-suojapuku vaurioitui', 1.1);
      const from = position.clone().add(new THREE.Vector3(0, 1.5, 0));
      const to = camera.position.clone();
      const bolt = makeEnemyBolt(scene, from, to);
      enemyBolts.push({ mesh: bolt, life: 0.12 });
      beep(70, 0.1, 'square', 0.06);
    }
  }
}

function onInteractKey(event) {
  if (event.code === 'KeyE' && !event.repeat) interact();
  if (event.code === 'KeyR' && !event.repeat) reload();
  if (event.code === 'KeyF' && !event.repeat) shoot();
  if (event.code === 'Escape' && running) pauseGame();
}

function inputState() {
  return {
    forward: Number(keyboard.has('KeyW') || keyboard.has('ArrowUp')) - Number(keyboard.has('KeyS') || keyboard.has('ArrowDown')),
    right: Number(keyboard.has('KeyD')) - Number(keyboard.has('KeyA'))
  };
}

const keyboard = new Set();
document.addEventListener('keydown', event => {
  if (!running) return;
  if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','KeyE','KeyF','KeyR'].includes(event.code)) event.preventDefault();
  keyboard.add(event.code);
  onInteractKey(event);
});
document.addEventListener('keyup', event => keyboard.delete(event.code));
document.addEventListener('contextmenu', event => event.preventDefault());

renderer.domElement.addEventListener('mousedown', event => {
  if (!running || !controls.isLocked) return;
  if (event.button === 0) shoot();
  if (event.button === 2) interact();
});
controls.addEventListener('unlock', () => {
  keyboard.clear();
  if (running) pauseGame();
});

ui.startButton.addEventListener('click', startGame);
ui.resume.addEventListener('click', resumeGame);
ui.restart.addEventListener('click', () => {
  window.location.reload();
});
ui.mute.addEventListener('click', () => {
  muted = !muted;
  ui.mute.textContent = muted ? 'ÄÄNET POIS' : 'ÄÄNET PÄÄLLÄ';
  if (muted && 'speechSynthesis' in window) speechSynthesis.cancel();
});
ui.sound.addEventListener('change', () => { voiceEnabled = ui.sound.value === 'on'; });
ui.quality.addEventListener('change', () => {
  const scale = Number(ui.quality.value);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, scale));
  renderer.setSize(window.innerWidth, window.innerHeight);
});
ui.jump.addEventListener('pointerdown', event => { event.preventDefault(); keyboard.add('Space'); });
for (const name of ['pointerup','pointercancel','lostpointercapture']) ui.jump.addEventListener(name, () => keyboard.delete('Space'));
ui.fire.addEventListener('pointerdown', event => { event.preventDefault(); shoot(); });

for (const button of document.querySelectorAll('[data-key]')) {
  const code = button.dataset.key;
  button.addEventListener('pointerdown', event => { event.preventDefault(); keyboard.add(code); button.classList.add('pressed'); });
  for (const name of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(name, () => { keyboard.delete(code); button.classList.remove('pressed'); });
}

const mobileLookArea = $('lookArea');
mobileLookArea.addEventListener('pointerdown', event => {
  if (!running || controls.isLocked) return;
  mobileLook = { id: event.pointerId, x: event.clientX, y: event.clientY };
  mobileLookArea.setPointerCapture(event.pointerId);
});
mobileLookArea.addEventListener('pointermove', event => {
  if (!mobileLook || event.pointerId !== mobileLook.id) return;
  const dx = event.clientX - mobileLook.x;
  const dy = event.clientY - mobileLook.y;
  camera.rotation.y -= dx * 0.0045;
  camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - dy * 0.0038, -1.35, 1.35);
  mobileLook.x = event.clientX;
  mobileLook.y = event.clientY;
});
mobileLookArea.addEventListener('pointerup', () => { mobileLook = null; });
mobileLookArea.addEventListener('pointercancel', () => { mobileLook = null; });

function update(dt) {
  elapsed += dt;
  shotCooldown = Math.max(0, shotCooldown - dt);
  hurtCooldown = Math.max(0, hurtCooldown - dt);
  hitTimer = Math.max(0, hitTimer - dt);
  toastTimer -= dt;
  subtitleTimer -= dt;
  if (toastTimer <= 0) ui.toast.classList.remove('visible');
  if (subtitleTimer <= 0) ui.subtitles.classList.remove('visible');

  const currentInput = inputState();
  const viewDirection = camera.getWorldDirection(direction);
  const movement = physics.update(dt, viewDirection, currentInput, currentColliders(), keyboard.has('Space'), keyboard.has('ShiftLeft') || keyboard.has('ShiftRight'));
  if (movement.grounded && movement.speed > 1.8 && Math.random() < dt * 2.2) beep(42 + Math.random() * 12, 0.035, 'triangle', 0.014);

  if (weapon.kick > 0) {
    weapon.kick = Math.max(0, weapon.kick - dt * 7);
    weapon.group.position.z = weapon.base.z + weapon.kick * 0.055;
    weapon.group.rotation.x = -0.04 + weapon.kick * 0.06;
    weapon.light.intensity = 0.8 + weapon.kick * 1.6;
  }
  weapon.group.position.x = weapon.base.x + Math.sin(elapsed * 8) * Math.min(0.018, movement.speed * 0.0015);
  weapon.group.position.y = weapon.base.y + (movement.grounded ? Math.sin(elapsed * 13) * Math.min(0.012, movement.speed * 0.001) : 0);

  if (objectiveStep === 'gate' && sceneBundle.openProgress >= 1) {
    objectiveStep = 'yard';
    updateObjective();
    showSubtitle('yard', 5);
  }
  if (objectiveStep === 'yard' && physics.feet.z < -58 && wave === 0) spawnWave();
  if (objectiveStep === 'exit' && physics.feet.z < -106) finishGame(true);

  for (const enemy of enemies) {
    if (!enemy.dead) enemyAttack(enemy, dt);
    if (enemy.flash > 0) enemy.flash -= dt;
  }
  for (let i = tracers.length - 1; i >= 0; i--) {
    const t = tracers[i];
    t.life -= dt;
    t.line.material.opacity = Math.max(0, t.life / t.max);
    if (t.life <= 0) { scene.remove(t.line); t.line.geometry.dispose(); t.line.material.dispose(); tracers.splice(i, 1); }
  }
  for (let i = enemyBolts.length - 1; i >= 0; i--) {
    enemyBolts[i].life -= dt;
    if (enemyBolts[i].life <= 0) { scene.remove(enemyBolts[i].mesh); enemyBolts.splice(i, 1); }
  }

  if (objectiveStep === 'cells' && cellsInstalled + cellsCarried === 2) setPrompt('[ E ]  ASETA VIRTOKENNO RELEESEEN');
  else if (cellsCarried) setPrompt('[ E ]  ASETA VIRTOKENNO');
  else setPrompt(nearInteractable() ? '[ E ]  POIMI / KÄYTÄ' : '');

  ui.speed.textContent = movement.speed.toFixed(1);
  ui.state.textContent = movement.grounded ? 'GROUND' : 'AIR';
  ui.hit.classList.toggle('visible', hitTimer > 0);
  animateWorld(sceneBundle, dt, elapsed);
}

function nearInteractable() {
  raycaster.setFromCamera(center, camera);
  return raycaster.intersectObjects(sceneBundle.interactables.filter(item => item.visible), true).some(hit => hit.distance < 3.8);
}

function renderFrame(time) {
  const dt = Math.min(0.05, Math.max(0, (time - previousTime) / 1000));
  previousTime = time;
  if (running) update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(renderFrame);
}
requestAnimationFrame(renderFrame);

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);

updateObjective();
ui.mobile.classList.toggle('visible', matchMedia('(pointer: coarse)').matches);
