import * as THREE from 'three';

function standard(color, roughness = 0.84, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export function makeCombine(scene, x, z, index = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  scene.add(root);
  const armor = standard(0x293a40, 0.68, 0.45);
  const armorLight = standard(0x52646a, 0.55, 0.55);
  const black = standard(0x11191d, 0.48, 0.32);
  const orange = new THREE.MeshStandardMaterial({ color: 0xff7d51, emissive: 0xa72f18, emissiveIntensity: 1.5 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.92, 0.38), armor);
  body.position.y = 1.22; body.castShadow = true; root.add(body);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.33, 0.43), armorLight);
  chest.position.set(0, 1.35, -0.03); root.add(chest);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), black);
  head.position.y = 1.92; head.castShadow = true; root.add(head);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.08), orange);
  visor.position.set(0, 1.95, -0.225); root.add(visor);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.77, 0.25), armor);
    arm.position.set(side * 0.47, 1.18, 0); root.add(arm);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.78, 0.3), black);
    leg.position.set(side * 0.2, 0.4, 0.01); root.add(leg);
    const knee = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.31), armorLight);
    knee.position.set(side * 0.2, 0.53, -0.06); root.add(knee);
  }
  const health = 3;
  const enemy = { root, health, speed: 1.25 + index * 0.05, attackTimer: 1 + index * 0.42, dead: false, flash: 0 };
  root.traverse(object => { if (object.isMesh) object.userData.enemy = enemy; });
  enemy.mats = [armor, armorLight, black];
  return enemy;
}

export function makeWeapon(camera) {
  const group = new THREE.Group();
  group.position.set(0.36, -0.31, -0.58);
  group.rotation.set(-0.04, -0.08, -0.015);
  camera.add(group);
  const dark = standard(0x222f35, 0.42, 0.72);
  const steel = standard(0x586a6e, 0.36, 0.82);
  const orange = new THREE.MeshStandardMaterial({ color: 0xc66b3b, roughness: 0.5, metalness: 0.48 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x8de7dc, emissive: 0x31d6cf, emissiveIntensity: 1.75 });
  function part(w, h, d, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); group.add(mesh); return mesh;
  }
  part(0.23, 0.18, 0.58, 0, 0, 0, dark);
  part(0.16, 0.12, 0.46, 0, 0.1, -0.12, steel);
  part(0.12, 0.3, 0.18, 0, -0.19, 0.12, dark).rotation.x = -0.15;
  part(0.08, 0.08, 0.34, 0, 0.01, -0.39, steel);
  part(0.09, 0.05, 0.11, 0, 0.04, -0.56, glow);
  part(0.28, 0.07, 0.16, 0, 0.12, 0.08, orange);
  for (const side of [-1, 1]) {
    part(0.055, 0.055, 0.42, side * 0.15, -0.01, -0.08, steel);
  }
  const light = new THREE.PointLight(0x5cdbd3, 0.8, 2.4);
  light.position.set(0, 0.08, -0.5); group.add(light);
  return { group, light, kick: 0, base: group.position.clone() };
}

export function makeEnemyBolt(scene, from, to) {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  const material = new THREE.MeshBasicMaterial({ color: 0xff704d });
  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, length, 6), material);
  bolt.position.copy(from).add(to).multiplyScalar(0.5);
  bolt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  scene.add(bolt);
  return bolt;
}
