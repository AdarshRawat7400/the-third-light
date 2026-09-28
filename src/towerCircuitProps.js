import * as THREE from 'three';
import {
  TOWER_CIRCUIT_STATIONS, compareTowerSightlines, restoreTowerCircuitState,
} from './towerCircuit.js';

// Four thin wall plaques share geometry and materials. Their painted diagrams
// keep the tower readable without more shadow casters or floor collisions.
export function createTowerCircuitProps(scene, terrainHeight, towerSite,
  initialState = null, foundIds = []) {
  if (!towerSite || towerSite.id !== 'tower') throw new Error('A tower site is required');
  const group = new THREE.Group();
  group.name = 'Tower circuit and sightline fixtures';
  group.position.set(towerSite.x, terrainHeight(towerSite.x, towerSite.z) + .08, towerSite.z);
  const backingGeometry = new THREE.BoxGeometry(.075, 1.12, 1.42);
  const faceGeometry = new THREE.PlaneGeometry(1.31, 1.01);
  const ledGeometry = new THREE.SphereGeometry(.055, 8, 6);
  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x3c4646,
    metalness: .62, roughness: .6 });
  const amberMaterial = new THREE.MeshStandardMaterial({ color: 0x8e7950,
    emissive: 0x413019, emissiveIntensity: .34, roughness: .45 });
  const greenMaterial = new THREE.MeshStandardMaterial({ color: 0x93b0a1,
    emissive: 0x3a6c5b, emissiveIntensity: .45, roughness: .4 });
  const sharedMaterials = [frameMaterial, amberMaterial, greenMaterial];
  const textures = [];
  const faces = [];
  const indicators = [];
  const boards = [];

  for (const station of TOWER_CIRCUIT_STATIONS) {
    const westWall = station.x < 0;
    const board = new THREE.Group();
    board.name = `Tower ${station.id} plaque`;
    // The Blender tower has a west cabinet whose front is at x=-3.26 and an
    // east paper chart at x=3.21. Mount these two plaques a few centimetres
    // in front of those surfaces; placing all four at the bare wall would
    // hide their painted faces behind the authored fixtures.
    const faceX = station.id === 'wiring' ? -3.22
      : station.id === 'chart' ? 3.17
        : westWall ? -3.48 : 3.48;
    board.position.set(faceX,
      station.id === 'wiring' ? 2.15 : 1.64, station.z);
    group.add(board);
    boards.push(board);
    const back = new THREE.Mesh(backingGeometry, frameMaterial);
    back.name = `${station.name} frame`;
    back.receiveShadow = true;
    board.add(back);

    // The board faces into the room. The text/diagram is in a single canvas
    // draw call per station, rather than many tiny letter and line meshes.
    const face = new THREE.Mesh(faceGeometry, frameMaterial);
    face.name = `${station.name} diagram`;
    face.position.x = westWall ? .043 : -.043;
    face.rotation.y = westWall ? Math.PI / 2 : -Math.PI / 2;
    board.add(face);
    let canvas = null;
    let context = null;
    let texture = null;
    if (typeof document !== 'undefined') {
      canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 384;
      context = canvas.getContext('2d');
      if (context) {
        texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        textures.push(texture);
        const material = new THREE.MeshStandardMaterial({ map: texture,
          roughness: .88, metalness: .03, side: THREE.DoubleSide,
          emissive: 0x28322e, emissiveIntensity: .13 });
        sharedMaterials.push(material);
        face.material = material;
      }
    }
    faces.push({ id: station.id, canvas, context, texture, face });
    const led = new THREE.Mesh(ledGeometry, amberMaterial);
    led.name = `${station.name} status lamp`;
    led.position.set(westWall ? .086 : -.086, -.47, -.61);
    board.add(led);
    indicators.push({ id: station.id, led });
  }

  function line(ctx, points, color, width = 5) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.stroke();
  }

  function letter(ctx, content, x, y, size = 23, color = '#d7d7c3') {
    ctx.font = `bold ${size}px sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(content, x, y);
  }

  function paintBoard(entry, state) {
    const ctx = entry.context;
    if (!ctx) return;
    ctx.fillStyle = '#1c2929';
    ctx.fillRect(0, 0, 512, 384);
    ctx.strokeStyle = '#9b9d89';
    ctx.lineWidth = 6;
    ctx.strokeRect(13, 13, 486, 358);
    const done = entry.id === 'wiring' ? state.wiringTraced
      : entry.id === 'test' ? state.testQualified
      : entry.id === 'overlay' ? state.westTraced && state.eastTraced
      : state.channelCompared;
    ctx.fillStyle = done ? '#95b7a3' : '#b6a67c';
    ctx.fillRect(27, 27, 10, 40);

    if (entry.id === 'wiring') {
      letter(ctx, 'MANUAL FAILOVER BUS', 51, 57, 25);
      letter(ctx, 'MAIN', 45, 127, 22);
      letter(ctx, 'STANDBY', 45, 214, 22);
      line(ctx, [[178, 118], [389, 118], [389, 268]], '#d3b989', 8);
      line(ctx, [[178, 205], [300, 205], [300, 268], [389, 268]], '#9ab1a5', 8);
      ctx.fillStyle = '#c1c5ae';
      ctx.fillRect(366, 267, 48, 17);
      letter(ctx, 'OLD BUS · PHYSICAL LEAD', 45, 333, 18, '#aebdb1');
    } else if (entry.id === 'test') {
      letter(ctx, 'ISOLATED REPEATER', 47, 57, 25);
      line(ctx, [[71, 151], [243, 151], [243, 215], [400, 215]], '#9ab1a5', 7);
      ctx.strokeStyle = '#b5ad8d';
      ctx.lineWidth = 7;
      ctx.strokeRect(362, 178, 74, 74);
      letter(ctx, 'TEST LOAD', 44, 288, 20);
      letter(ctx, 'PRESENT READING ONLY', 44, 331, 21, '#d5aa83');
    } else if (entry.id === 'overlay') {
      letter(ctx, 'TWO FIXED STAKES', 47, 57, 26);
      ctx.fillStyle = '#bcb4a0';
      ctx.fillRect(247, 175, 18, 18);
      line(ctx, [[256, 183], [170, 100], [97, 100]],
        state.westTraced ? '#9ebca7' : '#626d68', 6);
      line(ctx, [[256, 183], [343, 99], [425, 99]],
        state.eastTraced ? '#d2b489' : '#626d68', 6);
      letter(ctx, 'WEST / MAIN', 45, 274, 19,
        state.westTraced ? '#9ebca7' : '#8a938c');
      letter(ctx, 'EAST / STANDBY', 45, 315, 19,
        state.eastTraced ? '#d2b489' : '#8a938c');
      letter(ctx, 'COMMON FRONT LAMP', 45, 354, 17);
    } else {
      letter(ctx, 'NORTH INLET CHART', 47, 57, 25);
      ctx.fillStyle = '#5b6461';
      ctx.fillRect(48, 107, 415, 217);
      ctx.fillStyle = '#394c50';
      ctx.fillRect(205, 107, 225, 217);
      const pair = compareTowerSightlines(-370);
      const mapX = (x) => 48 + (x + 300) / 400 * 415;
      const frontX = mapX(-100);
      const safeSeaX = mapX(pair.safeX);
      const falseSeaX = mapX(pair.falseX);
      line(ctx, [[frontX, 113], [safeSeaX, 309]],
        state.channelCompared ? '#a4c5ae' : '#859f90', 7);
      line(ctx, [[frontX, 113], [falseSeaX, 309]], '#d4a188', 7);
      letter(ctx, 'DEEP', 313, 286, 18, '#b1c8ba');
      letter(ctx, 'REEF', 70, 286, 18, '#dab098');
      letter(ctx, 'BEARINGS DIVERGE SEAWARD', 46, 355, 17);
    }
    entry.texture.needsUpdate = true;
  }

  scene.add(group);
  let lastSignature = '';
  function update(raw, evidence = []) {
    const state = restoreTowerCircuitState(raw, evidence);
    const signature = [state.wiringTraced, state.testQualified,
      state.westTraced, state.eastTraced, state.channelCompared].join('');
    if (signature === lastSignature) return;
    lastSignature = signature;
    for (const entry of faces) paintBoard(entry, state);
    for (const { id, led } of indicators) {
      const done = id === 'wiring' ? state.wiringTraced
        : id === 'test' ? state.testQualified
        : id === 'overlay' ? state.westTraced && state.eastTraced
        : state.channelCompared;
      led.material = done ? greenMaterial : amberMaterial;
    }
  }
  update(initialState, foundIds);
  return {
    group, update,
    // Wall mounted plaques stay within the authored room footprint and
    // introduce no floor collision or pathfinding obstacles.
    blocksMove: () => false,
    dispose() {
      group.parent?.remove(group);
      backingGeometry.dispose();
      faceGeometry.dispose();
      ledGeometry.dispose();
      for (const material of sharedMaterials) material.dispose();
      for (const texture of textures) texture.dispose();
    },
  };
}
