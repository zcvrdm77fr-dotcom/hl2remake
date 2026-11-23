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
