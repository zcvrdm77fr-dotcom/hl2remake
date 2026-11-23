import * as THREE from 'three';

function texture(THREERef, kind, repeatX = 2, repeatY = 2) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const palettes = {
    concrete: ['#696c69', '#85847b', '#494f50'],
    brick: ['#624a3c', '#8b6b53', '#493c35'],
    metal: ['#3c484b', '#697475', '#263438'],
    asphalt: ['#323a3a', '#454b48', '#222b2e'],
    tile: ['#827d6d', '#a39a83', '#5c615d']
  };
  const p = palettes[kind] || palettes.concrete;
  ctx.fillStyle = p[0];
  ctx.fillRect(0, 0, size, size);
  let seed = kind.length * 193 + 17;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  if (kind === 'brick') {
    const mortar = '#302e2a';
    const brickH = 34;
    for (let y = 0; y < size; y += brickH) {
      const offset = ((y / brickH) % 2) * 46;
      for (let x = -50; x < size + 50; x += 92) {
        const bx = x + offset;
        ctx.fillStyle = mortar;
        ctx.fillRect(bx, y, 88, 30);
        const shade = random() > 0.5 ? p[1] : p[0];
        ctx.fillStyle = shade;
        ctx.fillRect(bx + 2, y + 2, 84, 26);
        ctx.fillStyle = '#c8a08017';
        ctx.fillRect(bx + 3, y + 3, 80, 4);
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = '#1e1a171c';
          ctx.fillRect(bx + 8 + random() * 65, y + 7 + random() * 16, 8 + random() * 13, 2);
        }
      }
    }
  } else if (kind === 'metal') {
    for (let y = 0; y < size; y += 128) {
      for (let x = 0; x < size; x += 128) {
        const grad = ctx.createLinearGradient(x, y, x + 128, y + 128);
        grad.addColorStop(0, p[1]);
        grad.addColorStop(0.5, p[0]);
        grad.addColorStop(1, p[2]);
        ctx.fillStyle = grad;
        ctx.fillRect(x + 3, y + 3, 122, 122);
        ctx.strokeStyle = '#141b1e99';
        ctx.lineWidth = 4;
        ctx.strokeRect(x + 2, y + 2, 124, 124);
        ctx.fillStyle = '#bac3ba88';
        for (const [dx, dy] of [[10, 10], [116, 10], [10, 116], [116, 116]]) {
          ctx.beginPath(); ctx.arc(x + dx, y + dy, 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#20282a55';
        for (let i = 0; i < 8; i++) ctx.fillRect(x + 16 + i * 13, y + 56, 7, 2);
      }
    }
  } else {
    const step = kind === 'tile' ? 64 : kind === 'asphalt' ? 96 : 128;
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        const tint = random() > 0.5 ? p[1] : p[0];
        ctx.fillStyle = kind === 'asphalt' ? tint : '#242b2a55';
        ctx.fillRect(x, y, step, step);
        if (kind !== 'asphalt') {
          ctx.fillStyle = tint;
          ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
          ctx.fillStyle = '#11181933';
          ctx.fillRect(x + 2, y + 2, step - 4, 3);
        }
      }
    }
    if (kind === 'concrete') {
      ctx.strokeStyle = '#222b2a99';
      ctx.lineWidth = 5;
      ctx.strokeRect(8, 8, size - 16, size - 16);
      ctx.strokeStyle = '#b0aaa044';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 210); ctx.lineTo(size, 194); ctx.moveTo(288, 0); ctx.lineTo(300, size); ctx.stroke();
    }
  }

  for (let i = 0; i < 2800; i++) {
    const tone = random() > 0.5 ? '#d4c7a0' : '#111819';
    ctx.fillStyle = tone + (kind === 'asphalt' ? '12' : '20');
    const w = 1 + random() * 5;
    ctx.fillRect(random() * size, random() * size, w, 1 + random() * 3);
  }

  const map = new THREERef.CanvasTexture(canvas);
  map.colorSpace = THREERef.SRGBColorSpace;
  map.wrapS = map.wrapT = THREERef.RepeatWrapping;
  map.repeat.set(repeatX, repeatY);
  map.anisotropy = 4;
  return map;
}

function standard(mat, map, roughness = 0.92, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color: 0xffffff, map, roughness, metalness });
}

function box(THREERef, parent, x, y, z, w, h, d, material, cast = true, receive = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  parent.add(mesh);
  return mesh;
}

function collider(x, z, width, depth) {
  return { minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2 };
}

function addWindow(THREERef, parent, x, y, z, w, h, depth, glass, frame) {
  box(THREERef, parent, x, y, z, w + 0.16, h + 0.16, depth, frame, false, true);
  const pane = box(THREERef, parent, x, y, z - depth * 0.52, w, h, 0.06, glass, false, true);
  pane.material = glass;
}

function addBuilding(THREERef, group, x, z, w, d, h, material, windows, colliders) {
  box(THREERef, group, x, h / 2, z, w, h, d, material);
  colliders.push(collider(x, z, w, d));
  const floors = Math.max(2, Math.floor(h / 3.4));
  for (let floor = 0; floor < floors; floor++) {
    const y = 1.5 + floor * 3.1;
    if (y > h - 1) continue;
    const count = Math.max(2, Math.floor(w / 3.1));
    for (let i = 0; i < count; i++) {
      const px = x - w / 2 + (i + 0.5) * w / count;
      const lit = ((i * 7 + floor * 3 + Math.floor(Math.abs(x))) % 9) < 2;
      addWindow(THREERef, group, px, y, z - d / 2 - 0.045, Math.min(1.3, w / count * 0.5), 1.4, 0.1,
        lit ? windows.warm : windows.dark, windows.frame);
    }
  }
  const roof = box(THREERef, group, x, h + 0.22, z, w + 0.4, 0.44, d + 0.4, windows.frame);
  roof.castShadow = true;
}

function addLamp(THREERef, group, x, z, lamps) {
  const poleMat = new THREERef.MeshStandardMaterial({ color: 0x303a39, metalness: 0.72, roughness: 0.42 });
  const glassMat = new THREERef.MeshStandardMaterial({ color: 0xf0d7a0, emissive: 0xffba68, emissiveIntensity: 2.4 });
  const pole = new THREERef.Mesh(new THREERef.CylinderGeometry(0.065, 0.11, 5.8, 8), poleMat);
  pole.position.set(x, 2.9, z); pole.castShadow = true; group.add(pole);
  const arm = box(THREERef, group, x + 0.45, 5.55, z, 0.95, 0.07, 0.08, poleMat);
  arm.rotation.z = -0.15;
  const bulb = new THREERef.Mesh(new THREERef.BoxGeometry(0.48, 0.14, 0.34), glassMat);
  bulb.position.set(x + 0.88, 5.48, z); group.add(bulb);
  const light = new THREERef.PointLight(0xffc783, 16, 13, 2);
  light.position.set(x + 0.88, 5.25, z); group.add(light);
  lamps.push(light);
}

function addTrain(THREERef, group, x, z, mats, colliders) {
  const car = new THREERef.Group();
  car.position.set(x, 0, z);
  group.add(car);
  const body = box(THREERef, car, 0, 2.1, 0, 6.4, 3.6, 20, mats.train);
  body.material = mats.train;
  box(THREERef, car, 0, 4.0, 0, 6.0, 0.25, 19.5, mats.metal);
  for (let i = 0; i < 6; i++) {
    const win = new THREERef.Mesh(new THREERef.BoxGeometry(0.72, 0.86, 0.08), mats.window);
    win.position.set(-2.4 + i * 0.96, 2.72, -10.05); car.add(win);
    const win2 = win.clone(); win2.position.z = 10.05; car.add(win2);
  }
  for (let zWheel of [-7, -2.4, 2.4, 7]) {
    const wheel = new THREERef.Mesh(new THREERef.CylinderGeometry(0.55, 0.55, 0.25, 12), mats.darkMetal);
    wheel.rotation.z = Math.PI / 2; wheel.position.set(0, 0.78, zWheel); car.add(wheel);
  }
  colliders.push(collider(x, z, 6.7, 20.6));
  return car;
}

export function buildCity(THREERef) {
  const scene = new THREERef.Scene();
  scene.background = new THREERef.Color(0x879195);
  scene.fog = new THREERef.FogExp2(0x879195, 0.0115);

  const textures = {
    concrete: texture(THREERef, 'concrete', 2, 3),
    brick: texture(THREERef, 'brick', 3, 3),
    metal: texture(THREERef, 'metal', 2, 2),
    asphalt: texture(THREERef, 'asphalt', 16, 16),
    tile: texture(THREERef, 'tile', 10, 12)
  };
  const mats = {
    concrete: standard(THREERef, textures.concrete, 0.96),
    brick: standard(THREERef, textures.brick, 0.94),
    metal: standard(THREERef, textures.metal, 0.63, 0.36),
    asphalt: standard(THREERef, textures.asphalt, 1),
    tile: standard(THREERef, textures.tile, 0.96),
    darkMetal: new THREERef.MeshStandardMaterial({ color: 0x263338, roughness: 0.58, metalness: 0.72 }),
    train: new THREERef.MeshStandardMaterial({ color: 0x52615f, roughness: 0.86, metalness: 0.42 }),
    glass: new THREERef.MeshStandardMaterial({ color: 0x34494d, roughness: 0.22, metalness: 0.25 }),
    warmGlass: new THREERef.MeshStandardMaterial({ color: 0xd8a66d, emissive: 0x7f4722, emissiveIntensity: 0.55, roughness: 0.35 }),
    blackGlass: new THREERef.MeshStandardMaterial({ color: 0x17252a, roughness: 0.22, metalness: 0.36 }),
    windowFrame: new THREERef.MeshStandardMaterial({ color: 0x9b9786, roughness: 0.88 }),
    trainGlass: new THREERef.MeshStandardMaterial({ color: 0x8eb4b4, emissive: 0x263d40, emissiveIntensity: 0.4, metalness: 0.45, roughness: 0.2 }),
    orange: new THREERef.MeshStandardMaterial({ color: 0xe18a42, emissive: 0xff7624, emissiveIntensity: 1.7, roughness: 0.35 }),
    cyan: new THREERef.MeshStandardMaterial({ color: 0x6dc8c7, emissive: 0x35cbd2, emissiveIntensity: 1.7, roughness: 0.3 }),
    red: new THREERef.MeshStandardMaterial({ color: 0xb45448, emissive: 0xa62018, emissiveIntensity: 0.8 }),
    green: new THREERef.MeshStandardMaterial({ color: 0x9fd59e, emissive: 0x3fbd66, emissiveIntensity: 1.0 })
  };
  const lamps = [];
  const colliders = [];
  const interactables = [];
  const worldGroup = new THREERef.Group();
  scene.add(worldGroup);

  scene.add(new THREERef.HemisphereLight(0xc9d5dc, 0x302a25, 2.0));
  const sun = new THREERef.DirectionalLight(0xffe0bc, 3.15);
  sun.position.set(-24, 38, 18); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -52; sun.shadow.camera.right = 52;
  sun.shadow.camera.top = 66; sun.shadow.camera.bottom = -120;
  sun.shadow.bias = -0.0002;
  scene.add(sun);
  const fill = new THREERef.DirectionalLight(0x8ab4cb, 0.85);
  fill.position.set(20, 18, -62); scene.add(fill);

  // A real sky dome gives the street a readable horizon instead of a flat clear colour.
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 1024; skyCanvas.height = 512;
  const skyCtx = skyCanvas.getContext('2d');
  const skyGradient = skyCtx.createLinearGradient(0, 0, 0, 512);
  skyGradient.addColorStop(0, '#283845');
  skyGradient.addColorStop(0.42, '#62767d');
  skyGradient.addColorStop(0.78, '#a1a49a');
  skyGradient.addColorStop(1, '#c0b69d');
  skyCtx.fillStyle = skyGradient; skyCtx.fillRect(0, 0, 1024, 512);
  let skySeed = 7331;
  const skyRandom = () => {
    skySeed = (Math.imul(skySeed, 1664525) + 1013904223) >>> 0;
    return skySeed / 4294967296;
  };
  for (let i = 0; i < 170; i++) {
    const x = skyRandom() * 1024, y = 40 + skyRandom() * 330;
    const radius = 25 + skyRandom() * 105;
    const cloud = skyCtx.createRadialGradient(x, y, 0, x, y, radius);
    cloud.addColorStop(0, 'rgba(217,213,197,0.14)');
    cloud.addColorStop(1, 'rgba(217,213,197,0)');
    skyCtx.fillStyle = cloud; skyCtx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  const skyTexture = new THREERef.CanvasTexture(skyCanvas);
  skyTexture.colorSpace = THREERef.SRGBColorSpace;
  const skyDome = new THREERef.Mesh(
    new THREERef.SphereGeometry(155, 48, 24),
    new THREERef.MeshBasicMaterial({ map: skyTexture, side: THREERef.BackSide, depthWrite: false, fog: false })
  );
  skyDome.position.set(0, 0, -25);
  scene.add(skyDome);

  const ground = new THREERef.Mesh(new THREERef.PlaneGeometry(180, 220), mats.tile);
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.08, -29); ground.receiveShadow = true; scene.add(ground);
  const roadway = new THREERef.Mesh(new THREERef.PlaneGeometry(30, 170), mats.asphalt);
  roadway.rotation.x = -Math.PI / 2; roadway.position.set(0, 0.005, -32); roadway.receiveShadow = true; scene.add(roadway);

  // Surrounding City 17 blocks.
  const windows = { warm: mats.warmGlass, dark: mats.blackGlass, frame: mats.windowFrame };
  addBuilding(THREERef, worldGroup, -22, 2, 12, 31, 24, mats.brick, windows, colliders);
  addBuilding(THREERef, worldGroup, 22, -7, 13, 38, 29, mats.concrete, windows, colliders);
  addBuilding(THREERef, worldGroup, -22, -43, 14, 30, 32, mats.concrete, windows, colliders);
  addBuilding(THREERef, worldGroup, 23, -48, 13, 38, 30, mats.brick, windows, colliders);
  addBuilding(THREERef, worldGroup, -19, -82, 17, 29, 26, mats.brick, windows, colliders);
  addBuilding(THREERef, worldGroup, 20, -91, 18, 27, 31, mats.concrete, windows, colliders);

  // The railway station facade, columns and overhead canopy.
  box(THREERef, worldGroup, -10.6, 7, -23.5, 11.8, 14, 2.6, mats.concrete);
  box(THREERef, worldGroup, 10.6, 7, -23.5, 11.8, 14, 2.6, mats.concrete);
  box(THREERef, worldGroup, 0, 13.25, -23.5, 9.4, 1.5, 2.6, mats.concrete);
  colliders.push(collider(-10.6, -23.5, 11.8, 2.6), collider(10.6, -23.5, 11.8, 2.6));
  for (const x of [-14, -9, 9, 14]) {
    const column = new THREERef.Mesh(new THREERef.BoxGeometry(1.1, 12, 1.2), mats.brick);
    column.position.set(x, 6, -21.2); column.castShadow = true; worldGroup.add(column);
    box(THREERef, worldGroup, x, 12.15, -21.2, 1.5, 0.5, 1.6, mats.windowFrame);
  }
  box(THREERef, worldGroup, 0, 13, -21.2, 31, 0.6, 5.4, mats.darkMetal);
  box(THREERef, worldGroup, 0, 10.2, -20.9, 14, 1.3, 0.3, mats.metal);
  const signCanvas = document.createElement('canvas'); signCanvas.width = 512; signCanvas.height = 128;
  const signCtx = signCanvas.getContext('2d');
  signCtx.fillStyle = '#16252a'; signCtx.fillRect(0, 0, 512, 128);
  signCtx.fillStyle = '#c4b89a'; signCtx.font = 'bold 52px monospace'; signCtx.fillText('CITY 17  /  TRANSIT', 24, 80);
  const signTexture = new THREERef.CanvasTexture(signCanvas); signTexture.colorSpace = THREERef.SRGBColorSpace;
  const sign = new THREERef.Mesh(new THREERef.PlaneGeometry(13.7, 3.2), new THREERef.MeshBasicMaterial({ map: signTexture, side: THREERef.DoubleSide }));
  sign.position.set(0, 10.2, -20.72); worldGroup.add(sign);

  // Tall industrial exhaust stacks and a distant Combine spire.
  for (const [x, z, h] of [[-15, -56, 18], [16, -44, 23], [7, -98, 28]]) {
    const stack = new THREERef.Mesh(new THREERef.CylinderGeometry(1.15, 1.8, h, 9), mats.metal);
    stack.position.set(x, h / 2, z); stack.castShadow = true; worldGroup.add(stack);
    for (let y = 3; y < h; y += 5) {
      const ring = new THREERef.Mesh(new THREERef.TorusGeometry(1.23, 0.1, 5, 9), mats.darkMetal);
      ring.rotation.x = Math.PI / 2; ring.position.set(x, y, z); worldGroup.add(ring);
    }
  }
  const spire = new THREERef.Group(); spire.position.set(-2, 0, -104); worldGroup.add(spire);
  const spireBody = new THREERef.Mesh(new THREERef.CylinderGeometry(1.2, 3.4, 39, 7), mats.darkMetal);
  spireBody.position.y = 19.5; spireBody.castShadow = true; spire.add(spireBody);
  const spireHalo = new THREERef.Mesh(new THREERef.TorusGeometry(4.2, 0.22, 8, 32), mats.cyan);
  spireHalo.rotation.x = Math.PI / 2; spireHalo.position.y = 24; spire.add(spireHalo);

  // A small tram line from the square into the industrial yard.
  for (const x of [-2.0, 2.0]) {
    const rail = box(THREERef, worldGroup, x, 0.12, -64, 0.16, 0.22, 76, mats.darkMetal);
    rail.castShadow = true;
  }
  for (let z = -26; z >= -100; z -= 2.8) {
    box(THREERef, worldGroup, 0, 0.055, z, 5.1, 0.11, 0.34, mats.brick, false, true);
  }

  // A derelict freight train and loading platforms.
  const train = new THREERef.Group(); train.position.set(12, 0, -76); worldGroup.add(train);
  box(THREERef, train, 0, 2.2, 0, 7.2, 4.1, 23, mats.train);
  box(THREERef, train, 0, 4.32, 0, 7.0, 0.28, 22.6, mats.darkMetal);
  for (let z of [-8.8, -5.1, -1.4, 2.3, 6.0, 9.7]) {
    const w = new THREERef.Mesh(new THREERef.BoxGeometry(0.12, 1.15, 2.5), mats.trainGlass);
    w.position.set(-3.66, 2.75, z); train.add(w);
    const w2 = w.clone(); w2.position.x = 3.66; train.add(w2);
  }
  for (const z of [-8, -3, 3, 8]) {
    const wheel = new THREERef.Mesh(new THREERef.CylinderGeometry(0.7, 0.7, 0.3, 12), mats.darkMetal);
    wheel.rotation.z = Math.PI / 2; wheel.position.set(0, 0.85, z); train.add(wheel);
  }
  colliders.push(collider(12, -76, 7.4, 23.5));

  for (const z of [-31, -44, -58, -72, -87]) {
    addLamp(THREERef, worldGroup, -9, z, lamps);
    addLamp(THREERef, worldGroup, 9, z, lamps);
  }

  // Clutter, concrete barriers and stacked freight crates.
  for (const [x, z, w, h, d] of [
    [-12, -12, 2.4, 1.7, 2.4], [12, -14, 2.5, 1.5, 2.2],
    [-8, -43, 2.2, 1.8, 2.0], [8, -45, 2.2, 1.8, 2.0],
    [-12, -71, 2.6, 1.8, 2.7], [-14, -74, 2.4, 1.8, 2.4],
    [5, -90, 3.0, 1.2, 1.6], [7, -91, 2.5, 1.2, 1.6]
  ]) {
    const material = h > 1.6 ? mats.brick : mats.concrete;
    box(THREERef, worldGroup, x, h / 2, z, w, h, d, material);
    colliders.push(collider(x, z, w, d));
  }

  // Locked bulkhead: two moving steel leaves.
  const gate = new THREERef.Group(); gate.position.set(0, 0, -34); worldGroup.add(gate);
  const leftLeaf = box(THREERef, gate, -2.55, 3.0, 0, 5.0, 6.0, 0.65, mats.metal);
  const rightLeaf = box(THREERef, gate, 2.55, 3.0, 0, 5.0, 6.0, 0.65, mats.metal);
  for (let i = 0; i < 10; i++) {
    box(THREERef, gate, -4.6 + i * 1.02, 3.0, 0.36, 0.05, 5.5, 0.05, mats.darkMetal, false);
  }
  const gateLamp = new THREERef.PointLight(0xe48c4a, 24, 14);
  gateLamp.position.set(0, 5.7, -35); scene.add(gateLamp);

  // Energy cells and the relay socket are genuine 3D interactables.
  function makeCell(x, z, id) {
    const root = new THREERef.Group(); root.position.set(x, 0, z); worldGroup.add(root);
    const shell = new THREERef.Mesh(new THREERef.BoxGeometry(0.8, 1.25, 0.55), mats.darkMetal);
    shell.position.y = 0.7; shell.castShadow = true; root.add(shell);
    const core = new THREERef.Mesh(new THREERef.BoxGeometry(0.53, 0.88, 0.1), mats.orange);
    core.position.set(0, 0.73, -0.29); root.add(core);
    const top = new THREERef.Mesh(new THREERef.BoxGeometry(0.5, 0.14, 0.42), mats.metal);
    top.position.y = 1.38; root.add(top);
    const glow = new THREERef.PointLight(0xff8e48, 4.5, 4.3); glow.position.y = 1.2; root.add(glow);
    root.userData.kind = 'cell'; root.userData.id = id;
    interactables.push(root);
    return root;
  }
  const cells = [makeCell(-8, 9, 0), makeCell(8, -4, 1)];
  const relay = new THREERef.Group(); relay.position.set(0, 0, -17); worldGroup.add(relay);
  box(THREERef, relay, 0, 0.85, 0, 2.7, 1.7, 2.2, mats.darkMetal);
  box(THREERef, relay, 0, 1.76, 0, 2.25, 0.15, 1.8, mats.metal);
  const relayCore = new THREERef.Mesh(new THREERef.CylinderGeometry(0.49, 0.49, 0.15, 12), mats.red);
  relayCore.rotation.x = Math.PI / 2; relayCore.position.set(0, 1.4, -1.13); relay.add(relayCore);
  const relayLight = new THREERef.PointLight(0x42c9d2, 0.3, 7); relayLight.position.set(0, 2.1, -0.3); relay.add(relayLight);
  relay.userData.kind = 'relay'; interactables.push(relay);

  // Resistance allies stand in the yard and mark the story's next objective.
  function makePerson(x, z, palette) {
    const person = new THREERef.Group(); person.position.set(x, 0, z); worldGroup.add(person);
    const torso = new THREERef.Mesh(new THREERef.BoxGeometry(0.62, 0.9, 0.35), palette.coat);
    torso.position.y = 1.16; torso.castShadow = true; person.add(torso);
    const head = new THREERef.Mesh(new THREERef.SphereGeometry(0.22, 10, 8), palette.skin);
    head.position.y = 1.83; head.castShadow = true; person.add(head);
    for (const side of [-1, 1]) {
      const leg = new THREERef.Mesh(new THREERef.BoxGeometry(0.22, 0.7, 0.25), palette.pants);
      leg.position.set(side * 0.17, 0.42, 0); person.add(leg);
      const arm = new THREERef.Mesh(new THREERef.BoxGeometry(0.18, 0.68, 0.22), palette.coat);
      arm.position.set(side * 0.42, 1.19, 0); person.add(arm);
    }
    return person;
  }
  const allies = [
    makePerson(-5.7, -55, { coat: new THREERef.MeshStandardMaterial({ color: 0x65705b, roughness: 1 }), pants: mats.darkMetal, skin: new THREERef.MeshStandardMaterial({ color: 0xb58c70 }) }),
    makePerson(-4.2, -58, { coat: new THREERef.MeshStandardMaterial({ color: 0x6c5544, roughness: 1 }), pants: mats.darkMetal, skin: new THREERef.MeshStandardMaterial({ color: 0xa97c64 }) })
  ];
  box(THREERef, worldGroup, -12, 1.4, -58, 6, 2.8, 0.5, mats.metal);

  // Street signs, utility pipework and low skyline dressing.
  for (const z of [-7, -26, -48, -66, -92]) {
    for (const x of [-18.2, 18.2]) {
      const pipe = new THREERef.Mesh(new THREERef.CylinderGeometry(0.12, 0.12, 9, 8), mats.darkMetal);
      pipe.position.set(x, 4.5, z); worldGroup.add(pipe);
      for (const y of [1.2, 7.4]) {
        const bracket = new THREERef.Mesh(new THREERef.BoxGeometry(0.5, 0.12, 0.12), mats.metal);
        bracket.position.set(x, y, z); worldGroup.add(bracket);
      }
    }
  }

  const cellStandLight = new THREERef.PointLight(0xffa45b, 8, 12);
  cellStandLight.position.set(-8, 2.8, 9); scene.add(cellStandLight);
  const cellsLight2 = new THREERef.PointLight(0xffa45b, 8, 12);
  cellsLight2.position.set(8, 2.8, -4); scene.add(cellsLight2);

  const colliderWalls = [
    collider(-29.8, -34, 1.2, 150), collider(29.8, -34, 1.2, 150),
    collider(0, 43, 60, 1.2), collider(0, -112, 60, 1.2),
    collider(-15.2, -23.4, 1.0, 2.8), collider(15.2, -23.4, 1.0, 2.8)
  ];
  colliders.push(...colliderWalls);

  const gateCollider = collider(0, -34, 10.1, 0.8);
  return {
    scene, colliders, gateCollider, gate, leftLeaf, rightLeaf, gateLamp, mats,
    cells, relay, relayCore, relayLight, interactables, allies, lamps,
    unlocked: false, installed: 0, worldGroup
  };
}

export function openGate(world) {
  world.unlocked = true;
  world.relayCore.material = world.mats.cyan;
  world.relayLight.intensity = 5.5;
  world.gateLamp.color.setHex(0x5be1a2);
  world.leftLeaf.userData.opening = true;
  world.rightLeaf.userData.opening = true;
}

export function animateWorld(world, dt, elapsed) {
  if (world.unlocked) {
    const slide = Math.min(1, (world.openProgress || 0) + dt * 0.62);
    world.openProgress = slide;
    world.leftLeaf.position.x = -2.55 - slide * 3.0;
    world.rightLeaf.position.x = 2.55 + slide * 3.0;
  }
  world.relayCore.rotation.y = elapsed * 0.6;
  for (let i = 0; i < world.lamps.length; i++) {
    const phase = elapsed * 2.2 + i * 1.7;
    world.lamps[i].intensity = 13.5 + Math.sin(phase) * 1.1;
  }
}
