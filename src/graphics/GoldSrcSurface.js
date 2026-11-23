import * as THREE from 'three';

const PALETTES = {
  concrete: [[76,81,73],[105,108,95],[57,63,57],[132,126,107]],
  tile: [[82,88,78],[112,111,94],[53,61,55],[139,132,111]],
  steel: [[43,52,50],[69,78,72],[27,34,32],[104,91,72]],
  brick: [[94,65,48],[119,83,61],[57,42,35],[145,102,68]],
  hazard: [[184,132,45],[29,35,31],[213,165,70],[18,24,23]],
  rubber: [[26,33,31],[45,52,46],[18,23,22],[72,68,55]],
  wood: [[91,65,43],[119,88,58],[61,43,31],[143,105,68]],
  bone: [[151,137,108],[181,167,137],[104,94,77],[208,192,157]],
  flesh: [[78,49,43],[110,67,56],[51,34,33],[145,89,69]],
  cloth: [[58,68,52],[82,94,67],[38,47,38],[113,116,81]],
  leather: [[41,35,28],[66,52,39],[24,25,22],[91,70,49]]
};

function makeRandom(seed) {
  let state = (seed * 1664525 + 1013904223) >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function bolt(ctx, x, y, r = 2.2) {
  ctx.fillStyle = '#191f1b';
  ctx.beginPath(); ctx.arc(x + 1, y + 1, r + .5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#a6a18a';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3a4039'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x - r * .55, y); ctx.lineTo(x + r * .55, y); ctx.stroke();
}

function makeCanvas(kind, seed = 1, size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d', { alpha: false });
  const random = makeRandom(seed + kind.length * 7919);
  const palette = PALETTES[kind] || PALETTES.concrete;
  const color = index => 'rgb(' + palette[index].join(',') + ')';
  ctx.fillStyle = color(0); ctx.fillRect(0, 0, size, size);

  if (kind === 'tile') {
    for (let y = 0; y < size; y += 32) for (let x = 0; x < size; x += 32) {
      ctx.fillStyle = color((Math.floor(x / 32) + Math.floor(y / 32)) % 2 ? 1 : 0);
      ctx.fillRect(x + 2, y + 2, 28, 28);
      ctx.fillStyle = 'rgba(12,16,14,.45)';
      ctx.fillRect(x, y, 32, 2); ctx.fillRect(x, y, 2, 32);
      ctx.fillStyle = 'rgba(193,184,154,.14)';
      ctx.fillRect(x + 3, y + 3, 25, 1);
    }
  } else if (kind === 'steel') {
    ctx.fillStyle = color(0); ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 64) for (let x = 0; x < size; x += 64) {
      ctx.fillStyle = color((x / 64 + y / 64) % 2 ? 1 : 0);
      ctx.fillRect(x + 2, y + 2, 60, 60);
      ctx.fillStyle = 'rgba(0,0,0,.32)';
      ctx.fillRect(x + 2, y + 2, 60, 3); ctx.fillRect(x + 2, y + 2, 3, 60);
      ctx.fillStyle = 'rgba(191,190,166,.16)';
      ctx.fillRect(x + 5, y + 5, 54, 1);
      bolt(ctx, x + 8, y + 8); bolt(ctx, x + 56, y + 8);
      bolt(ctx, x + 8, y + 56); bolt(ctx, x + 56, y + 56);
    }
  } else if (kind === 'brick') {
    ctx.fillStyle = '#51483d'; ctx.fillRect(0, 0, size, size);
    for (let row = 0; row < 8; row++) {
      const y = row * 16, offset = row % 2 ? -16 : 0;
      for (let col = -1; col < 5; col++) {
        const x = col * 32 + offset;
        ctx.fillStyle = color((row + col + 4) % 2 ? 0 : 1);
        ctx.fillRect(x + 2, y + 2, 29, 13);
        ctx.fillStyle = 'rgba(25,22,19,.42)';
        ctx.fillRect(x + 2, y + 13, 29, 2);
        ctx.fillStyle = 'rgba(218,166,117,.10)';
        ctx.fillRect(x + 4, y + 3, 24, 1);
      }
    }
  } else if (kind === 'hazard') {
    ctx.fillStyle = color(1); ctx.fillRect(0, 0, size, size);
    for (let x = -size; x < size * 2; x += 30) {
      ctx.fillStyle = color(0);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 15, 0); ctx.lineTo(x - 35, size); ctx.lineTo(x - 50, size); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,226,146,.25)'; ctx.lineWidth = 2;
    for (let x = -size; x < size * 2; x += 30) { ctx.beginPath(); ctx.moveTo(x + 1, 0); ctx.lineTo(x - 49, size); ctx.stroke(); }
  } else if (kind === 'rubber') {
    ctx.fillStyle = color(0); ctx.fillRect(0, 0, size, size);
    for (let x = 0; x < size; x += 8) {
      ctx.fillStyle = x % 16 ? 'rgba(0,0,0,.28)' : 'rgba(157,153,124,.12)';
      ctx.fillRect(x, 0, 3, size);
    }
    for (let y = 0; y < size; y += 32) {
      ctx.fillStyle = 'rgba(0,0,0,.26)'; ctx.fillRect(0, y, size, 2);
    }
  } else if (kind === 'wood') {
    ctx.fillStyle = color(0); ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 32) {
      ctx.fillStyle = color(y % 64 ? 1 : 0); ctx.fillRect(0, y + 2, size, 28);
      ctx.strokeStyle = 'rgba(31,23,17,.43)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
      for (let k = 0; k < 9; k++) {
        const gy = y + 5 + random() * 22, gx = random() * size;
        ctx.strokeStyle = 'rgba(34,22,14,' + (.12 + random() * .18) + ')'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(gx - 18, gy); ctx.bezierCurveTo(gx - 6, gy - 3, gx + 8, gy + 3, gx + 24, gy); ctx.stroke();
      }
      bolt(ctx, 7, y + 8, 1.5); bolt(ctx, 120, y + 23, 1.5);
    }
  } else if (kind === 'bone' || kind === 'flesh' || kind === 'cloth' || kind === 'leather') {
    for (let i = 0; i < 36; i++) {
      const x = random() * size, y = random() * size, r = 3 + random() * 15;
      ctx.fillStyle = 'rgba(' + (kind === 'flesh' ? '35,12,13,' : kind === 'bone' ? '53,42,25,' : '10,15,12,') + (.04 + random() * .12) + ')';
      ctx.beginPath(); ctx.ellipse(x, y, r * 1.25, r * .62, random() * 3, 0, Math.PI * 2); ctx.fill();
    }
    if (kind === 'flesh') {
      ctx.strokeStyle = 'rgba(35,16,18,.42)'; ctx.lineWidth = 1;
      for (let i = 0; i < 16; i++) {
        const x = random() * size, y = random() * size;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 8, y - 10, x - 7, y + 11, x + 18, y + 20); ctx.stroke();
      }
      for (let i = 0; i < 13; i++) {
        const x = random() * size, y = random() * size;
        ctx.fillStyle = 'rgba(25,10,12,.32)'; ctx.beginPath(); ctx.ellipse(x, y, 3 + random() * 4, 2 + random() * 3, 0, 0, Math.PI * 2); ctx.fill();
      }
    } else if (kind === 'cloth') {
      ctx.strokeStyle = 'rgba(190,185,139,.12)'; ctx.lineWidth = 1;
      for (let p = 0; p < size; p += 4) { ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke(); }
    } else if (kind === 'bone') {
      ctx.strokeStyle = 'rgba(62,49,32,.25)'; ctx.lineWidth = 2;
      for (let y = 8; y < size; y += 21) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y - 5); ctx.stroke(); }
    }
  } else {
    // Concrete: poured panels, salt marks, fine cracks and darker water staining.
    for (let y = 0; y < size; y += 64) for (let x = 0; x < size; x += 64) {
      ctx.fillStyle = color((x / 64 + y / 64) % 3 === 0 ? 1 : 0);
      ctx.fillRect(x + 1, y + 1, 62, 62);
      ctx.strokeStyle = 'rgba(20,24,21,.38)'; ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, 62, 62);
    }
    for (let i = 0; i < 7; i++) {
      const x = random() * size, y = random() * size;
      const gradient = ctx.createRadialGradient(x, y, 1, x, y, 11 + random() * 18);
      gradient.addColorStop(0, 'rgba(25,29,24,.22)'); gradient.addColorStop(1, 'rgba(25,29,24,0)');
      ctx.fillStyle = gradient; ctx.fillRect(x - 28, y - 28, 56, 56);
    }
    ctx.strokeStyle = 'rgba(24,27,22,.62)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(17, 12); ctx.lineTo(23, 21); ctx.lineTo(19, 28); ctx.lineTo(31, 38); ctx.lineTo(28, 50); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(91, 69); ctx.lineTo(83, 78); ctx.lineTo(88, 84); ctx.lineTo(78, 97); ctx.stroke();
  }

  // Low-resolution mineral grain, chipped paint and surface dirt.
  for (let i = 0; i < 1050; i++) {
    const x = random() * size, y = random() * size, v = random();
    ctx.fillStyle = v > .56 ? 'rgba(8,11,9,.16)' : 'rgba(211,202,168,.12)';
    const s = random() > .86 ? 2 : 1;
    ctx.fillRect(x, y, s, s);
  }
  if (kind === 'steel' || kind === 'wood') {
    ctx.strokeStyle = 'rgba(15,18,16,.42)'; ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const x = random() * size, y = random() * size;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - .5) * 22, y + (random() - .5) * 4); ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 1;
  texture.needsUpdate = true;
  return texture;
}

export function makeGoldSrcTexture(kind, repeatX = 1, repeatY = 1, seed = 1) {
  const texture = makeCanvas(kind, seed);
  texture.repeat.set(repeatX, repeatY);
  return texture;
}

export function makeOrganicMaterial(kind = 'flesh', color = 0xffffff) {
  return new THREE.MeshLambertMaterial({
    map: makeCanvas(kind, 17),
    color,
    flatShading: true
  });
}
