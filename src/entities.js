import * as THREE from 'three';
import { makeGoldSrcTexture, makeOrganicMaterial } from './graphics/GoldSrcSurface.js?v=art-2';

const flesh = makeOrganicMaterial('flesh', 0xb18a75);
const paleFlesh = makeOrganicMaterial('flesh', 0xc19b80);
const bone = makeOrganicMaterial('bone', 0xc2b18e);
const darkBone = new THREE.MeshLambertMaterial({ color: 0x554b3e, flatShading: true });
const chitin = new THREE.MeshLambertMaterial({ map: makeGoldSrcTexture('leather', 1, 1, 7), color: 0x8a7960, flatShading: true });
const chitinEdge = new THREE.MeshLambertMaterial({ color: 0x5c5142, flatShading: true });
const eyeMat = new THREE.MeshLambertMaterial({ color: 0xffa35b, emissive: 0x7e210c, emissiveIntensity: 1.25 });
const crawlerEye = new THREE.MeshLambertMaterial({ color: 0xb8c77b, emissive: 0x526529, emissiveIntensity: 1.05 });
const darkWet = new THREE.MeshLambertMaterial({ color: 0x171916, flatShading: true });
const steel = new THREE.MeshLambertMaterial({ map: makeGoldSrcTexture('steel', 1, 1, 5), color: 0xa1a294 });
const wornSteel = new THREE.MeshLambertMaterial({ color: 0x868a7f });
const redPaint = new THREE.MeshLambertMaterial({ color: 0x763c2d });
const glove = new THREE.MeshLambertMaterial({ map: makeGoldSrcTexture('leather', 1, 1, 4), color: 0xa69b7e });
const sleeve = new THREE.MeshLambertMaterial({ map: makeGoldSrcTexture('cloth', 1, 1, 8), color: 0xb18a54 });
const gunmetal = new THREE.MeshLambertMaterial({ map: makeGoldSrcTexture('steel', 1, 1, 13), color: 0x515b59 });
const blackMetal = new THREE.MeshLambertMaterial({ color: 0x202723 });
const pistolGrip = new THREE.MeshLambertMaterial({ map: makeGoldSrcTexture('rubber', 1, 1, 3), color: 0x555346 });

function addMesh(parent, geometry, mat, position, scale = null) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(...position);
  if (scale) mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function sphere(parent, position, scale, mat, width = 9, height = 7) {
  return addMesh(parent, new THREE.SphereGeometry(1, width, height), mat, position, scale);
}

function rod(parent, a, b, radius, mat, sides = 7, endRadius = radius) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const delta = end.clone().sub(start);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(endRadius, radius, delta.length(), sides), mat);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function lightViewmodel(camera, root) {
  camera.layers.enable(1);
  root.traverse(object => { if (object.isMesh) object.layers.enable(1); });
  const light = new THREE.PointLight(0xd8d2b8, 1.65, 3.1, 2);
  light.position.set(.12, .34, -1.05);
  light.layers.set(1);
  camera.add(light);
}

function curvedRib(parent, points, radius, mat) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, radius, 5, false), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeClawedHand(parent, x, y, z, direction = -1) {
  sphere(parent, [x, y, z], [.13, .105, .15], flesh, 7, 6);
  for (let i = 0; i < 3; i++) {
    const spread = (i - 1) * .09;
    rod(parent, [x + spread, y - .01, z], [x + spread * 1.45, y - .08, z + direction * .22], .045, flesh, 6, .025);
    rod(parent, [x + spread * 1.45, y - .08, z + direction * .22], [x + spread * 1.6, y - .16, z + direction * .34], .026, darkBone, 5, .004);
  }
  rod(parent, [x - direction * .08, y, z], [x - direction * .19, y - .1, z + direction * .12], .045, flesh, 6, .025);
}

export function makeCrowbar(camera) {
  const root = new THREE.Group();
  root.position.set(.39, -.38, -.64);
  root.rotation.set(-.16, -.12, -.19);
  camera.add(root);

  // A worn, painted steel bar with a flattened split claw at the business end.
  rod(root, [.02, -.29, .12], [-.055, .04, -.12], .039, redPaint, 8);
  rod(root, [-.055, .04, -.12], [-.17, .34, -.31], .039, redPaint, 8);
  curvedRib(root, [[-.17,.34,-.31],[-.26,.42,-.34],[-.38,.40,-.36],[-.43,.32,-.36],[-.38,.25,-.36],[-.31,.25,-.35]], .035, wornSteel);
  rod(root, [.02, -.24, .06], [.02, -.1, -.02], .047, glove, 8);
  for (const y of [-.19,-.13]) rod(root, [.0,y,.015], [.025,y+.006,-.035], .009, wornSteel, 5);

  // A visible HEV sleeve, wrist cuff and wrapped glove keep the weapon grounded.
  const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(.105, .32, 3, 8), sleeve);
  forearm.position.set(.055, -.14, .32);
  forearm.rotation.set(-.36, -.08, -.08);
  forearm.castShadow = true;
  root.add(forearm);
  sphere(root, [.02, -.09, .05], [.16, .12, .16], glove, 8, 6);
  for (let i = 0; i < 4; i++) {
    const x = -.09 + i * .072;
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(.027, .105, 2, 6), glove);
    finger.position.set(x, -.035, -.015 + Math.abs(i - 1.5) * .02);
    finger.rotation.x = -.46;
    finger.rotation.z = (i - 1.5) * .13;
    root.add(finger);
  }
  sphere(root, [-.11, -.12, .09], [.055, .09, .09], glove, 7, 5);
  lightViewmodel(camera, root);
  return { root, basePosition: root.position.clone(), baseRotation: root.rotation.clone(), swing: 0 };
}

export function makePistol(camera) {
  const root = new THREE.Group();
  root.position.set(.38, -.32, -.62);
  root.rotation.set(-.04, -.055, -.055);
  camera.add(root);

  // Late-90s service sidearm: slide, ejection port, sights, trigger and textured grip.
  const slide = addMesh(root, new THREE.BoxGeometry(.205, .16, .49), gunmetal, [0, .055, -.28]);
  slide.scale.set(1, 1, 1);
  addMesh(root, new THREE.BoxGeometry(.18, .045, .27), wornSteel, [0, .145, -.30]);
  addMesh(root, new THREE.BoxGeometry(.12, .055, .18), blackMetal, [.032, .04, -.47]);
  addMesh(root, new THREE.BoxGeometry(.12, .035, .09), blackMetal, [-.028, .055, -.17]);
  addMesh(root, new THREE.BoxGeometry(.155, .24, .18), pistolGrip, [0, -.135, -.12]).rotation.x = -.22;
  addMesh(root, new THREE.BoxGeometry(.16, .025, .19), blackMetal, [0, -.23, -.13]).rotation.x = -.22;

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.047, .047, .37, 9), blackMetal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, .045, -.62);
  barrel.castShadow = true;
  root.add(barrel);
  const muzzleRing = new THREE.Mesh(new THREE.TorusGeometry(.049, .009, 5, 10), wornSteel);
  muzzleRing.position.set(0, .045, -.80);
  root.add(muzzleRing);
  addMesh(root, new THREE.BoxGeometry(.045, .05, .055), wornSteel, [0, .16, -.48]);
  addMesh(root, new THREE.BoxGeometry(.035, .055, .05), wornSteel, [0, .16, -.08]);
  addMesh(root, new THREE.BoxGeometry(.13, .035, .08), blackMetal, [0, .15, -.58]);
  addMesh(root, new THREE.BoxGeometry(.065, .12, .06), blackMetal, [.11, .04, -.22]);
  addMesh(root, new THREE.BoxGeometry(.045, .035, .09), wornSteel, [-.104, .03, -.25]);

  const trigger = new THREE.Mesh(new THREE.TorusGeometry(.074, .012, 5, 12, Math.PI), wornSteel);
  trigger.position.set(0, -.055, -.18);
  trigger.rotation.x = Math.PI / 2;
  root.add(trigger);
  rod(root, [0, -.045, -.12], [0, -.1, -.19], .012, wornSteel, 5);
  for (let y = -.18; y < -.04; y += .045) addMesh(root, new THREE.BoxGeometry(.115, .012, .012), blackMetal, [0, y, -.025]);

  const sleeveMesh = new THREE.Mesh(new THREE.CapsuleGeometry(.105, .27, 3, 8), sleeve);
  sleeveMesh.position.set(.015, -.15, .23);
  sleeveMesh.rotation.set(-.38, 0, -.03);
  root.add(sleeveMesh);
  sphere(root, [.015, -.075, .015], [.145, .12, .16], glove, 8, 6);
  for (let i = 0; i < 4; i++) {
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(.025, .11, 2, 6), glove);
    finger.position.set(-.09 + i * .06, -.02, -.075 + Math.abs(i - 1.5) * .022);
    finger.rotation.x = -.62;
    root.add(finger);
  }

  const muzzle = new THREE.PointLight(0xffbd75, 0, 2.6);
  muzzle.position.set(0, .05, -.84);
  root.add(muzzle);
  lightViewmodel(camera, root);
  return { root, basePosition: root.position.clone(), baseRotation: root.rotation.clone(), muzzle, recoil: 0 };
}

export function makeEchoStalker(scene, x, z) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  scene.add(root);

  // An emaciated human-shaped specimen: stretched forearms, exposed ribs and a split jaw.
  const torso = sphere(root, [0, 1.16, .02], [.43, .64, .34], flesh, 10, 8);
  sphere(root, [0, .74, .06], [.31, .36, .29], paleFlesh, 9, 7);
  sphere(root, [0, 1.46, .1], [.35, .35, .28], flesh, 9, 7);
  sphere(root, [0, .45, .08], [.28, .25, .24], darkWet, 8, 6);

  // Broken clavicle and a cage of narrow, dirty ribs, silhouetted against the chest.
  rod(root, [-.33, 1.51, -.02], [0, 1.57, -.12], .055, bone, 6);
  rod(root, [0, 1.57, -.12], [.33, 1.51, -.02], .055, bone, 6);
  for (let side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const y = 1.37 - i * .16;
    curvedRib(root, [
      [side * .06, y + .05, -.285],
      [side * .22, y + .04, -.315],
      [side * .35, y - .05, -.22],
      [side * .29, y - .12, -.12]
    ], .026, i === 2 ? darkBone : bone);
  }
  for (let i = 0; i < 6; i++) {
    sphere(root, [0, .74 + i * .16, .315], [.055, .06, .075], darkBone, 6, 5);
  }

  // Head with recessed eye sockets, wet mouth cavity, uneven teeth and a hanging jaw.
  const skull = sphere(root, [0, 1.96, -.13], [.31, .36, .29], paleFlesh, 10, 8);
  sphere(root, [0, 1.76, -.34], [.25, .13, .16], darkWet, 9, 6);
  sphere(root, [0, 1.67, -.29], [.22, .09, .13], flesh, 8, 6);
  for (let side of [-1, 1]) {
    sphere(root, [side * .135, 2.04, -.375], [.105, .105, .045], darkWet, 7, 5);
    sphere(root, [side * .135, 2.04, -.414], [.035, .035, .02], eyeMat, 7, 5);
    rod(root, [side * .10, 1.77, -.44], [side * .08, 1.69, -.49], .022, bone, 5, .008);
    for (let i = 0; i < 3; i++) {
      const tx = side * (.055 + i * .062);
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(.022, .09 + (i % 2) * .025, 5), bone);
      tooth.position.set(tx, 1.755, -.49);
      tooth.rotation.z = Math.PI;
      root.add(tooth);
    }
    const torn = new THREE.Mesh(new THREE.ConeGeometry(.07, .28, 5), darkBone);
    torn.position.set(side * .25, 2.24, -.03);
    torn.rotation.z = side * -.58;
    root.add(torn);
  }
  sphere(root, [0, 1.62, -.39], [.15, .075, .12], darkWet, 8, 6);

  const armPivots = [];
  const legPivots = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * .34, 1.46, .01);
    root.add(shoulder);
    sphere(shoulder, [0, -.04, 0], [.19, .19, .19], flesh, 8, 6);
    rod(shoulder, [0, -.04, 0], [side * .17, -.36, -.05], .145, flesh, 7, .11);
    sphere(shoulder, [side * .17, -.36, -.05], [.12, .12, .13], paleFlesh, 7, 5);
    rod(shoulder, [side * .17, -.36, -.05], [side * .21, -.86, -.27], .105, flesh, 7, .065);
    makeClawedHand(shoulder, side * .21, -.91, -.28, -1);
    armPivots.push({ pivot: shoulder, side });

    const hip = new THREE.Group();
    hip.position.set(side * .19, .72, .08);
    root.add(hip);
    rod(hip, [0, 0, 0], [side * .08, -.31, .06], .15, flesh, 7, .11);
    sphere(hip, [side * .08, -.31, .06], [.12, .12, .14], darkBone, 7, 5);
    rod(hip, [side * .08, -.31, .06], [side * .11, -.62, -.13], .11, paleFlesh, 7, .075);
    sphere(hip, [side * .11, -.62, -.13], [.13, .09, .22], darkBone, 7, 5);
    for (let i = 0; i < 2; i++) rod(hip, [side * (.08 + i * .055), -.62, -.22], [side * (.08 + i * .055), -.67, -.38], .03, bone, 5, .005);
    legPivots.push({ pivot: hip, side });
  }

  // Irregular dorsal growths break the outline; these are not decorative glowing spikes.
  for (let i = 0; i < 5; i++) {
    const xPos = (i - 2) * .105;
    rod(root, [xPos, 1.08 + Math.sin(i) * .2, .25], [xPos + .035, 1.24 + Math.sin(i * 1.7) * .18, .52], .06, darkBone, 5, .012);
  }
  const halo = new THREE.PointLight(0xff7135, .46, 3.3);
  halo.position.set(0, 1.68, -.2);
  root.add(halo);

  const enemy = {
    root, health: 5, alive: true, attackCooldown: .8, speed: 2.45, halo, phase: Math.random() * 4,
    growlClock: 2 + Math.random() * 4, kind: 'stalker',
    animate(time) {
      armPivots.forEach(({ pivot, side }) => { pivot.rotation.x = Math.sin(time * 5.2 + side) * .16; pivot.rotation.z = side * (.08 + Math.sin(time * 2.7) * .045); });
      legPivots.forEach(({ pivot, side }) => { pivot.rotation.x = Math.sin(time * 5.2 + side * Math.PI) * .2; });
      skull.rotation.x = Math.sin(time * 2.4) * .035;
      torso.rotation.z = Math.sin(time * 3.2) * .025;
    }
  };
  root.traverse(object => { if (object.isMesh) object.userData.enemy = enemy; });
  return enemy;
}

export function makeResonanceCrawler(scene, x, z) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  scene.add(root);

  // A broad, low alien arthropod with a plated back, exposed belly and six articulated legs.
  sphere(root, [0, .67, .02], [.48, .29, .72], flesh, 9, 7);
  sphere(root, [0, .87, .12], [.49, .22, .61], chitin, 10, 7);
  sphere(root, [0, .96, .23], [.40, .15, .46], chitinEdge, 9, 6);
  sphere(root, [0, .64, -.52], [.28, .22, .29], paleFlesh, 8, 6);
  sphere(root, [0, .58, -.72], [.20, .12, .12], darkWet, 8, 5);

  // Segmented armour plates and an uneven row of dorsal spines.
  for (let i = 0; i < 4; i++) {
    const zPos = -.23 + i * .22;
    const plate = sphere(root, [0, .99, zPos], [.34 - i * .035, .11, .13], i % 2 ? chitin : chitinEdge, 8, 5);
    plate.rotation.x = (i - 1.5) * .035;
    const spine = new THREE.Mesh(new THREE.ConeGeometry(.075, .27 + (i % 2) * .09, 5), bone);
    spine.position.set((i % 2 ? .09 : -.09), 1.13, zPos);
    spine.rotation.z = i % 2 ? -.25 : .25;
    root.add(spine);
  }

  // Six small eyes are recessed beneath the shell edge.
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const eye = sphere(root, [side * (.19 + i * .025), .76 - i * .035, -.64 + i * .12], [.043, .045, .032], darkWet, 6, 5);
    sphere(root, [side * (.205 + i * .025), .765 - i * .035, -.665 + i * .12], [.019, .019, .018], crawlerEye, 6, 5);
  }

  // Mandibles and paired hooked mouthparts.
  for (const side of [-1, 1]) {
    rod(root, [side * .1, .62, -.68], [side * .17, .47, -.88], .065, paleFlesh, 6, .035);
    rod(root, [side * .17, .47, -.88], [side * .08, .43, -.98], .035, darkBone, 5, .004);
  }
  const legs = [];
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const zPos = .38 - i * .38;
    const hip = new THREE.Group();
    hip.position.set(side * .31, .72, zPos);
    root.add(hip);
    sphere(hip, [side * .055, 0, 0], [.12, .13, .15], chitinEdge, 7, 5);
    rod(hip, [0, 0, 0], [side * .43, -.16, -.04], .085, chitin, 7, .06);
    sphere(hip, [side * .43, -.16, -.04], [.075, .075, .08], darkBone, 6, 5);
    rod(hip, [side * .43, -.16, -.04], [side * .64, -.59, -.21], .055, chitinEdge, 6, .027);
    rod(hip, [side * .64, -.59, -.21], [side * .72, -.69, -.36], .028, bone, 5, .004);
    legs.push({ hip, side, index: i });
  }
  const halo = new THREE.PointLight(0xa8ce6d, .34, 2.8);
  halo.position.set(0, .83, -.42);
  root.add(halo);
  const enemy = {
    root, health: 4, alive: true, attackCooldown: 1.1, speed: 3.1, damage: 12,
    kind: 'crawler', halo, phase: Math.random() * 4, growlClock: 1.5 + Math.random() * 3,
    animate(time) {
      legs.forEach(({ hip, side, index }) => {
        hip.rotation.z = side * (.08 + Math.sin(time * 8 + index * 1.7) * .15);
        hip.rotation.x = Math.sin(time * 8 + index * 1.8 + side) * .11;
      });
      root.position.y = Math.abs(Math.sin(time * 7 + this.phase)) * .025;
    }
  };
  root.traverse(object => { if (object.isMesh) object.userData.enemy = enemy; });
  return enemy;
}
