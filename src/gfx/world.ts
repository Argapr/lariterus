// ============================================================
// Dunia: tema, jalan, pemandangan, dekorasi
// ============================================================
import * as THREE from 'three';
import { scene, hemiLight, sunLight } from '../core/three';
import { world, clearList } from '../core/state';
import { ROAD_WIDTH, SPAWN_Z } from '../core/constants';
import { toon, canvasTexture, speckleTex, buildingTex, hazardTex, crateTex, gradientMap } from './textures';
import type { ThemeCfg } from '../types';

let groundPlane: THREE.Mesh | null = null;

scene.add(world.group);
scene.add(world.scenery);

// ============================================================
// Mode studio: latar bersih ala lobi mobile untuk pamer karakter
// (dunia disembunyikan, diganti gradasi hangat + watermark + bayangan lembut)
// ============================================================
let studioOn = false;
let studioGroup: THREE.Group | null = null;
let studioBg: THREE.Texture | null = null;
let savedFog: THREE.Fog | null = null;

function makeStudioAssets() {
  studioBg = canvasTexture(512, 1024, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#ffe9cd');
    grad.addColorStop(0.55, '#ffbe85');
    grad.addColorStop(1, '#ff9257');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // Watermark besar miring, khas lobi mobile game
    ctx.save();
    ctx.translate(w / 2, h * 0.45);
    ctx.rotate(-0.14);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.textAlign = 'center';
    ctx.font = "italic 900 118px 'Archivo Black', 'Archivo', sans-serif";
    ctx.fillText('LARI', 0, -30);
    ctx.fillText('TERUS!', 0, 108);
    ctx.restore();
  });
  studioGroup = new THREE.Group();
  // Blob gelap lembut di kaki karakter
  const blobTex = canvasTexture(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(60,30,10,0.30)');
    g.addColorStop(1, 'rgba(60,30,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  const blob = new THREE.Mesh(new THREE.CircleGeometry(1.7, 36),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.012;
  studioGroup.add(blob);
  // Penangkap bayangan asli dari matahari
  const catcher = new THREE.Mesh(new THREE.CircleGeometry(2.4, 36),
    new THREE.ShadowMaterial({ opacity: 0.25 }));
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.y = 0.02;
  catcher.receiveShadow = true;
  studioGroup.add(catcher);
  scene.add(studioGroup);
}

export function setStudioMode(on: boolean) {
  if (studioOn === on) return;
  studioOn = on;
  if (on && !studioGroup) makeStudioAssets();
  world.group.visible = !on;
  world.scenery.visible = !on;
  if (groundPlane) groundPlane.visible = !on;
  if (studioGroup) studioGroup.visible = on;
  if (on) {
    savedFog = scene.fog as THREE.Fog | null;
    scene.fog = null;
    scene.background = studioBg;
  } else {
    scene.fog = savedFog;
    scene.background = null;
  }
}

export function buildTheme(theme: ThemeCfg) {
  setStudioMode(false); // membangun tema selalu kembali ke dunia normal
  clearList(world.roadSegs);
  clearList(world.decos);
  clearList(world.obstacles);
  clearList(world.coins);
  clearList(world.powerups);
  world.clouds.length = 0;
  world.scenery.clear();
  if (groundPlane) { scene.remove(groundPlane); }

  scene.fog = new THREE.Fog(theme.fog, theme.fogNear, theme.fogFar);
  hemiLight.color.set(theme.hemi[0]);
  hemiLight.groundColor.set(theme.hemi[1]);
  hemiLight.intensity = theme.hemi[2];
  sunLight.color.set(theme.sun[0]);
  sunLight.intensity = theme.sun[1];
  sunLight.position.set(theme.sunPos[0], theme.sunPos[1], theme.sunPos[2]);

  // ----- Kubah langit bergradasi -----
  const skyTex = canvasTexture(16, 256, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, theme.skyTop);
    grad.addColorStop(1, theme.skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(220, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
  );
  world.scenery.add(sky);
  scene.background = null;

  // ----- Tekstur tanah & jalan per tema -----
  let groundTex: THREE.Texture, roadTex: THREE.Texture, stripeColor: number;
  if (theme.id === 'kota') {
    groundTex = speckleTex('#67ab55', ['#5a9c49', '#78bd63', '#4f8f40', '#82c76d'], 1100, [50, 50]);
    roadTex = speckleTex('#5c6270', ['#525866', '#666c7a', '#4e5462'], 700, [2, 3]);
    stripeColor = 0xe8e8e8;
  } else if (theme.id === 'gurun') {
    groundTex = speckleTex('#dfae66', ['#d4a057', '#eabc78', '#c99a50'], 900, [50, 50]);
    roadTex = speckleTex('#8a6f4d', ['#7d6342', '#977b56', '#836847'], 700, [2, 3]);
    stripeColor = 0xf2e2bc;
  } else if (theme.id === 'salju') {
    groundTex = speckleTex('#eef4f8', ['#dde8f0', '#f8fcff', '#cfdde8'], 700, [50, 50]);
    roadTex = speckleTex('#6a7684', ['#5e6a78', '#76828f', '#565f6d'], 600, [2, 3]);
    stripeColor = 0xffffff;
  } else if (theme.id === 'pantai') {
    groundTex = speckleTex('#f0d29a', ['#e5c288', '#f8dfae', '#dcb87a'], 900, [50, 50]);
    roadTex = canvasTexture(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#b5854f'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#8a6238';
      for (let y = 0; y < h; y += 16) ctx.fillRect(0, y, w, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      for (let i = 0; i < 80; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 8, 1.5);
    }, [2, 3]);
    stripeColor = 0xfff0d0;
  } else {
    groundTex = speckleTex('#14142a', ['#1a1a34', '#10101f', '#1e1e3c'], 500, [50, 50]);
    roadTex = speckleTex('#20203c', ['#262646', '#1a1a32', '#2c2c50'], 500, [2, 3]);
    stripeColor = 0x35e0e0;
  }

  groundPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(340, 340),
    new THREE.MeshLambertMaterial({ map: groundTex })
  );
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.position.set(0, -0.06, -60);
  groundPlane.receiveShadow = true;
  scene.add(groundPlane);

  // ----- Aset bersama -----
  const geoms: Record<string, THREE.BufferGeometry> = {
    seg: new THREE.BoxGeometry(ROAD_WIDTH, 0.1, 10),
    stripe: new THREE.BoxGeometry(0.14, 0.02, 2.2),
    curb: new THREE.BoxGeometry(0.3, 0.22, 10),
    barrier: new THREE.BoxGeometry(2.0, 0.8, 0.45),
    crate: new THREE.BoxGeometry(2.0, 2.3, 1.2),
    pole: new THREE.CylinderGeometry(0.09, 0.09, 2.4, 10),
    bar: new THREE.BoxGeometry(2.3, 0.5, 0.45),
    coin: new THREE.CylinderGeometry(0.34, 0.34, 0.08, 20),
    coinRim: new THREE.TorusGeometry(0.34, 0.05, 8, 20),
    bld: new THREE.BoxGeometry(1, 1, 1),
    trunk: new THREE.CylinderGeometry(0.14, 0.2, 1.1, 8),
    leaf: new THREE.SphereGeometry(0.8, 12, 10),
    cactus: new THREE.CapsuleGeometry(0.28, 0.9, 6, 12),
    cactusArm: new THREE.CapsuleGeometry(0.14, 0.4, 4, 10),
    rock: new THREE.DodecahedronGeometry(0.8, 1),
    pillar: new THREE.BoxGeometry(0.7, 1, 0.7),
    cone: new THREE.ConeGeometry(1, 1, 9),
    frond: new THREE.SphereGeometry(0.5, 8, 6),
  };
  const mats: Record<string, THREE.Material> = {
    roadA: new THREE.MeshLambertMaterial({ map: roadTex }),
    roadB: new THREE.MeshLambertMaterial({ map: roadTex, color: 0xcccccc }),
    stripe: new THREE.MeshBasicMaterial({ color: stripeColor }),
    curb: new THREE.MeshLambertMaterial({ color: theme.id === 'neon' ? 0x35e0e0 : 0xb8b8b8 }),
    hazard: new THREE.MeshLambertMaterial({ map: hazardTex }),
    crate: new THREE.MeshLambertMaterial({ map: crateTex }),
    pole: toon(0x8a8f99),
    bar: toon(0xf2c230),
    coin: new THREE.MeshToonMaterial({ color: 0xffd34d, gradientMap, emissive: 0x775500 }),
    trunk: toon(0x7a4f2a),
    leaf1: toon(0x3f9438),
    leaf2: toon(0x57ad4a),
    cactus: toon(0x4a8f3c),
    rock: toon(0xa08a68),
    bldDay1: new THREE.MeshLambertMaterial({ map: buildingTex('#aeb6c2', '#5d6a7c', '#ffe9a8', 0.12) }),
    bldDay2: new THREE.MeshLambertMaterial({ map: buildingTex('#c7b8a4', '#6b6154', '#ffe9a8', 0.1) }),
    bldNight1: new THREE.MeshLambertMaterial({ map: buildingTex('#12121f', '#0a0a14', '#ffd98a', 0.5), emissive: 0x0a0a14 }),
    bldNight2: new THREE.MeshLambertMaterial({ map: buildingTex('#161628', '#0c0c18', '#8ae0ff', 0.45), emissive: 0x0a0a14 }),
    neon1: new THREE.MeshBasicMaterial({ color: 0x35e0e0 }),
    neon2: new THREE.MeshBasicMaterial({ color: 0xc400ff }),
    pine: toon(0x2f6b3f),
    pineSnow: toon(0xf0f6fa),
    palmTrunk: toon(0x9c7040),
    frond: toon(0x3fa050),
    umbrella1: toon(0xe84040),
    umbrella2: toon(0x35b0e0),
  };
  world.themeAssets = { geoms, mats, id: theme.id };

  // ----- Segmen jalan + trotoar -----
  for (let i = 0; i < 14; i++) {
    const seg = new THREE.Mesh(geoms.seg, i % 2 ? mats.roadA : mats.roadB);
    seg.position.set(0, -0.05, 8 - i * 10);
    seg.receiveShadow = true;
    for (const x of [-1.1, 1.1]) {
      for (const dz of [-3, 1]) {
        const st = new THREE.Mesh(geoms.stripe, mats.stripe);
        st.position.set(x, 0.06, dz);
        seg.add(st);
      }
    }
    for (const x of [-ROAD_WIDTH / 2 - 0.15, ROAD_WIDTH / 2 + 0.15]) {
      const curb = new THREE.Mesh(geoms.curb, mats.curb);
      curb.position.set(x, 0.02, 0);
      seg.add(curb);
    }
    world.group.add(seg);
    world.roadSegs.push(seg);
  }

  // ----- Pemandangan statis di cakrawala -----
  if (theme.id === 'kota' || theme.id === 'gurun' || theme.id === 'salju') {
    const mtnColors: Record<string, [number, number]> = { kota: [0x6a8a9c, 0xf0f6fa], gurun: [0x9c6a50, 0xf2d8b8], salju: [0x9cb2c8, 0xffffff] };
    const mtnMat = toon(mtnColors[theme.id][0]);
    const snowMat = toon(mtnColors[theme.id][1]);
    for (let i = 0; i < 8; i++) {
      const x = -110 + i * 32 + (Math.random() - 0.5) * 14;
      const h = 22 + Math.random() * 22;
      const mtn = new THREE.Mesh(new THREE.ConeGeometry(16 + Math.random() * 10, h, 7), mtnMat);
      mtn.position.set(x, h / 2 - 2, -128 - Math.random() * 12);
      world.scenery.add(mtn);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(5.5, h * 0.28, 7), snowMat);
      cap.position.set(x, h - h * 0.14 - 2, mtn.position.z);
      world.scenery.add(cap);
    }
  }
  if (theme.id === 'gurun' || theme.id === 'pantai') {
    const sunBall = new THREE.Mesh(new THREE.SphereGeometry(14, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xffcc66, fog: false }));
    sunBall.position.set(10, 14, -190);
    world.scenery.add(sunBall);
  }
  if (theme.id === 'pantai') {
    const seaMat = new THREE.MeshLambertMaterial({ color: 0x2e7ac9, emissive: 0x0a2a50 });
    for (const sx of [-1, 1]) {
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(120, 340), seaMat);
      sea.rotation.x = -Math.PI / 2;
      sea.position.set(sx * 85, -0.02, -60);
      world.scenery.add(sea);
    }
  }
  world.snow = null;
  if (theme.id === 'salju') {
    const n = 500;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 70;
      pos[i * 3 + 1] = Math.random() * 26;
      pos[i * 3 + 2] = 8 - Math.random() * 100;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    world.snow = new THREE.Points(snowGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.14, transparent: true, opacity: 0.85 }));
    world.scenery.add(world.snow);
  }
  if (theme.id === 'neon') {
    const starGeo = new THREE.BufferGeometry();
    const pos: number[] = [];
    for (let i = 0; i < 350; i++) {
      const a = Math.random() * Math.PI * 2, r = 150 + Math.random() * 50;
      pos.push(Math.cos(a) * r, 25 + Math.random() * 120, -Math.abs(Math.sin(a)) * r - 20);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    world.scenery.add(new THREE.Points(starGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, fog: false })));
    const moon = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xf5f0dc, fog: false }));
    moon.position.set(-55, 75, -160);
    world.scenery.add(moon);
    for (let i = 0; i < 16; i++) {
      const b = new THREE.Mesh(geoms.bld, Math.random() < 0.5 ? mats.bldNight1 : mats.bldNight2);
      const h = 18 + Math.random() * 30;
      b.scale.set(6 + Math.random() * 6, h, 6);
      b.position.set(-120 + i * 16 + (Math.random() - 0.5) * 8, h / 2, -125 - Math.random() * 15);
      world.scenery.add(b);
    }
  }
  // Awan (siang & senja)
  if (theme.id !== 'neon') {
    for (let i = 0; i < 10; i++) {
      const cloud = new THREE.Group();
      const puffMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x666666 });
      const n = 3 + (Math.random() * 3 | 0);
      for (let j = 0; j < n; j++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(1.6 + Math.random() * 1.6, 10, 8), puffMat);
        p.position.set(j * 2.1 - n, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 1.6);
        p.scale.y = 0.62;
        cloud.add(p);
      }
      cloud.position.set((Math.random() - 0.5) * 160, 26 + Math.random() * 22, -40 - Math.random() * 110);
      world.scenery.add(cloud);
      world.clouds.push(cloud);
    }
  }

  // Dekorasi awal di sepanjang lintasan
  for (let z = 0; z > SPAWN_Z; z -= 7) spawnDeco(z);
}

// ---------- Dekorasi pinggir jalan ----------
export function spawnDeco(z: number) {
  const { geoms, mats, id } = world.themeAssets!;
  for (const side of [-1, 1]) {
    if (Math.random() < 0.25) continue;
    const x = side * (6 + Math.random() * 9);
    let mesh: THREE.Object3D;
    if (id === 'kota') {
      if (Math.random() < 0.55) {
        const grp = new THREE.Group();
        const trunk = new THREE.Mesh(geoms.trunk, mats.trunk);
        trunk.position.y = 0.55;
        grp.add(trunk);
        const n = 2 + (Math.random() * 2 | 0);
        for (let j = 0; j < n; j++) {
          const leaf = new THREE.Mesh(geoms.leaf, Math.random() < 0.5 ? mats.leaf1 : mats.leaf2);
          const s = 0.7 + Math.random() * 0.5;
          leaf.scale.setScalar(s);
          leaf.position.set((Math.random() - 0.5) * 0.7, 1.35 + Math.random() * 0.7, (Math.random() - 0.5) * 0.7);
          grp.add(leaf);
        }
        grp.position.set(x, 0, z);
        mesh = grp;
      } else {
        const m = new THREE.Mesh(geoms.bld, Math.random() < 0.5 ? mats.bldDay1 : mats.bldDay2);
        const h = 5 + Math.random() * 11;
        m.scale.set(3 + Math.random() * 2.5, h, 3 + Math.random() * 2.5);
        m.position.set(x + side * 4, h / 2 - 0.05, z);
        mesh = m;
      }
    } else if (id === 'gurun') {
      if (Math.random() < 0.55) {
        const grp = new THREE.Group();
        const c = new THREE.Mesh(geoms.cactus, mats.cactus);
        const h = 0.9 + Math.random() * 0.9;
        c.scale.set(1, h, 1);
        c.position.y = h * 0.75;
        grp.add(c);
        for (const asx of Math.random() < 0.7 ? [-1, 1] : [1]) {
          const arm = new THREE.Mesh(geoms.cactusArm, mats.cactus);
          arm.position.set(asx * 0.38, h * 0.8, 0);
          arm.rotation.z = asx * 0.7;
          grp.add(arm);
        }
        grp.position.set(x, 0, z);
        mesh = grp;
      } else {
        const m = new THREE.Mesh(geoms.rock, mats.rock);
        const s = 0.5 + Math.random() * 1.2;
        m.scale.setScalar(s);
        m.rotation.set(Math.random(), Math.random(), Math.random());
        m.position.set(x, s * 0.5 - 0.1, z);
        mesh = m;
      }
    } else if (id === 'salju') {
      if (Math.random() < 0.7) {
        const grp = new THREE.Group();
        const trunk = new THREE.Mesh(geoms.trunk, mats.trunk);
        trunk.position.y = 0.4;
        grp.add(trunk);
        const h = 1.6 + Math.random() * 1.4;
        for (let j = 0; j < 3; j++) {
          const c = new THREE.Mesh(geoms.cone, mats.pine);
          const s = 1.15 - j * 0.3;
          c.scale.set(s, h * 0.42, s);
          c.position.y = 0.8 + j * h * 0.3;
          grp.add(c);
          const snowCap = new THREE.Mesh(geoms.cone, mats.pineSnow);
          snowCap.scale.set(s * 0.7, h * 0.16, s * 0.7);
          snowCap.position.y = 0.8 + j * h * 0.3 + h * 0.16;
          grp.add(snowCap);
        }
        grp.position.set(x, 0, z);
        mesh = grp;
      } else {
        const m = new THREE.Mesh(geoms.rock, mats.pineSnow);
        const s = 0.5 + Math.random() * 1.0;
        m.scale.setScalar(s);
        m.rotation.set(Math.random(), Math.random(), Math.random());
        m.position.set(x, s * 0.5 - 0.1, z);
        mesh = m;
      }
    } else if (id === 'pantai') {
      if (Math.random() < 0.6) {
        const grp = new THREE.Group();
        const h = 2.0 + Math.random() * 1.2;
        const trunk = new THREE.Mesh(geoms.trunk, mats.palmTrunk);
        trunk.scale.set(0.8, h / 1.1, 0.8);
        trunk.position.y = h / 2;
        trunk.rotation.z = (Math.random() - 0.5) * 0.3;
        grp.add(trunk);
        const topX = -trunk.rotation.z * h;
        for (let j = 0; j < 6; j++) {
          const frond = new THREE.Mesh(geoms.frond, mats.frond);
          const a = (j / 6) * Math.PI * 2;
          frond.scale.set(1.6, 0.12, 0.45);
          frond.position.set(topX + Math.cos(a) * 0.7, h + 0.1 - Math.abs(Math.sin(j)) * 0.08, Math.sin(a) * 0.7);
          frond.rotation.y = -a;
          frond.rotation.z = 0.35;
          grp.add(frond);
        }
        grp.position.set(x, 0, z);
        mesh = grp;
      } else {
        const grp = new THREE.Group();
        const pole = new THREE.Mesh(geoms.pole, mats.pole);
        pole.scale.y = 0.7;
        pole.position.y = 0.8;
        grp.add(pole);
        const top = new THREE.Mesh(geoms.cone, Math.random() < 0.5 ? mats.umbrella1 : mats.umbrella2);
        top.scale.set(1.1, 0.45, 1.1);
        top.position.y = 1.6;
        grp.add(top);
        grp.rotation.z = (Math.random() - 0.5) * 0.25;
        grp.position.set(x, 0, z);
        mesh = grp;
      }
    } else { // neon
      if (Math.random() < 0.5) {
        const m = new THREE.Mesh(geoms.bld, Math.random() < 0.5 ? mats.bldNight1 : mats.bldNight2);
        const h = 6 + Math.random() * 12;
        m.scale.set(3 + Math.random() * 2, h, 3 + Math.random() * 2);
        m.position.set(x + side * 4, h / 2 - 0.05, z);
        mesh = m;
      } else {
        const m = new THREE.Mesh(geoms.pillar, Math.random() < 0.5 ? mats.neon1 : mats.neon2);
        const h = 3 + Math.random() * 8;
        m.scale.set(1, h, 1);
        m.position.set(x, h / 2 - 0.05, z);
        mesh = m;
      }
    }
    world.group.add(mesh);
    world.decos.push({ mesh });
  }
}
