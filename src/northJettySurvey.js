import * as THREE from 'three';
import { NAV_LIGHTS } from './story.js';

// Temporary sounding floats follow the present-day deep approach measured by
// Iris. They are scene cues, not evidence for the wreck-night circuit state.
const channelX = (z) => NAV_LIGHTS.front.x
  + (z - NAV_LIGHTS.front.z) * (NAV_LIGHTS.main.x - NAV_LIGHTS.front.x)
    / (NAV_LIGHTS.main.z - NAV_LIGHTS.front.z);
export const JETTY_SOUNDING_FLOATS = Object.freeze([-342, -357, -374]
  .map((z) => Object.freeze({ x: channelX(z), z })));

function plankTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#826b57'; ctx.fillRect(0, 0, 512, 128);
  // Grain runs along the *crosswise* board rather than down the length of
  // the entire pier. Sparse dark knots and pale wet streaks survive rain fog.
  for (let i = 0; i < 120; i++) {
    const y = (i * 73) % 128;
    const x = (i * 47) % 512;
    ctx.strokeStyle = i % 4 ? '#ddc4a3' : '#322b28';
    ctx.globalAlpha = 0.09 + (i % 5) * 0.035;
    ctx.lineWidth = 0.5 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + 29, y - 3, x + 69, y + 2, x + 125, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function depthTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 768;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#343d3b'; ctx.fillRect(0, 0, 256, 768);
  ctx.fillStyle = '#f2ead4';
  ctx.font = 'bold 70px Georgia, serif';
  for (let i = 0; i <= 3; i++) {
    const y = 693 - i * 207;
    ctx.fillRect(12, y, 113, 9);
    ctx.fillText(String(i), 148, y + 22);
    for (let j = 1; j < 4 && i < 3; j++) ctx.fillRect(12, y - j * 49, 48, 5);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function mesh(parent, geometry, material, name, x, y, z) {
  const object = new THREE.Mesh(geometry, material);
  object.name = name;
  object.position.set(x, y, z);
  object.castShadow = false;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

export function createNorthJettySurvey(scene, terrainHeight, waterHeight) {
  if (!scene?.add || typeof terrainHeight !== 'function' || typeof waterHeight !== 'function') {
    throw new TypeError('North jetty survey needs a scene, terrain and sea height.');
  }
  const group = new THREE.Group();
  group.name = 'North jetty present-day sounding scene';
  const deckY = terrainHeight(-65, -315) + 0.08 + 0.15;
  const woodMap = plankTexture();
  const rulerMap = depthTexture();
  const wetWood = new THREE.MeshStandardMaterial({
    color: 0xf1e6d7, map: woodMap, roughness: 0.6, metalness: 0.04,
  });
  const seams = new THREE.MeshStandardMaterial({ color: 0x242c2b, roughness: 0.93 });
  const fenderWood = new THREE.MeshStandardMaterial({ color: 0x40392f, roughness: 0.83 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x37494b, roughness: 0.52, metalness: 0.42 });
  const paint = new THREE.MeshStandardMaterial({ color: 0xd7c8a4, roughness: 0.67 });
  const shelfPaint = new THREE.MeshStandardMaterial({ color: 0xb76553, roughness: 0.7 });
  const ruler = new THREE.MeshBasicMaterial({
    color: 0xffffff, map: rulerMap, side: THREE.DoubleSide,
  });
  const materials = [wetWood, seams, fenderWood, iron, paint, shelfPaint, ruler];
  const geometries = [];
  const underlay = new THREE.BoxGeometry(5.9, 0.024, 21.95);
  geometries.push(underlay);
  mesh(group, underlay, seams, 'Shadowed seams between pier planks',
    -65, deckY + 0.01, -322);
  const plankGeometry = new THREE.BoxGeometry(5.72, 0.08, 0.86);
  geometries.push(plankGeometry);
  const boards = new THREE.InstancedMesh(plankGeometry, wetWood, 22);
  boards.name = 'Separated crosswise wet timber planks';
  boards.receiveShadow = true;
  const boardMatrix = new THREE.Matrix4();
  const tones = [0xe2cbb2, 0xf0dcca, 0xd7c2ac, 0xffe8ca, 0xe8d0b4];
  for (let index = 0; index < 22; index++) {
    boardMatrix.makeTranslation(-65, deckY + 0.067, -332.5 + index);
    boards.setMatrixAt(index, boardMatrix);
    boards.setColorAt(index, new THREE.Color(tones[index % tones.length]));
  }
  boards.instanceMatrix.needsUpdate = true;
  boards.instanceColor.needsUpdate = true;
  group.add(boards);

  const curbGeometry = new THREE.BoxGeometry(0.12, 0.18, 21.8);
  const fenderGeometry = new THREE.BoxGeometry(0.22, 1.22, 0.31);
  const strapGeometry = new THREE.BoxGeometry(0.145, 0.035, 0.34);
  geometries.push(curbGeometry, fenderGeometry, strapGeometry);
  for (const x of [-67.96, -62.04]) {
    mesh(group, curbGeometry, fenderWood, 'Low edge timber', x,
      deckY + 0.12, -322);
    for (const z of [-330, -323, -316]) {
      mesh(group, fenderGeometry, fenderWood, 'Pier-side vertical fender', x,
        deckY - 0.30, z);
      mesh(group, strapGeometry, iron, 'Iron fender strap', x,
        deckY + 0.22, z);
    }
  }

  // The graduated face rises above the right-hand edge, so a player walking
  // the deck can read it. Its narrow backing is outside the walking surface.
  const staffBacking = new THREE.BoxGeometry(0.09, 2.42, 0.70);
  const staffGeometry = new THREE.PlaneGeometry(0.64, 2.37);
  geometries.push(staffBacking, staffGeometry);
  mesh(group, staffBacking, fenderWood, 'Depth staff backing',
    -61.94, 1.36, -326);
  const staff = mesh(group, staffGeometry, ruler, 'White numbered depth staff',
    -62.00, 1.36, -326);
  staff.rotation.y = -Math.PI / 2;

  const floatGeometry = new THREE.CylinderGeometry(0.27, 0.38, 0.42, 10);
  const poleGeometry = new THREE.CylinderGeometry(0.035, 0.035, 0.72, 6);
  const capGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.13, 8);
  geometries.push(floatGeometry, poleGeometry, capGeometry);
  const floats = JETTY_SOUNDING_FLOATS.map(({ x, z }, index) => {
    const root = new THREE.Group();
    root.name = `Iris sounding float ${index + 1}`;
    root.position.set(x, 0, z);
    mesh(root, floatGeometry, paint, 'Weathered sounding float', 0, 0, 0);
    mesh(root, poleGeometry, iron, 'Sounding float staff', 0, 0.52, 0);
    mesh(root, capGeometry, shelfPaint, 'Reflective float cap', 0, 0.93, 0);
    group.add(root);
    return root;
  });
  // One red float warns of the western rock shelf. It deliberately sits
  // outside the safe pair's extended bearing.
  const shelf = new THREE.Group();
  shelf.name = 'Western shallow shelf warning float';
  shelf.position.set(-111, 0, -347);
  mesh(shelf, floatGeometry, shelfPaint, 'Shallow shelf float', 0, 0, 0);
  mesh(shelf, poleGeometry, iron, 'Shallow shelf staff', 0, 0.52, 0);
  mesh(shelf, capGeometry, paint, 'Shallow shelf cap', 0, 0.93, 0);
  group.add(shelf);
  const allFloats = [...floats, shelf];
  scene.add(group);

  return {
    group, floats, shelf,
    update(elapsed = 0, cameraPosition = null) {
      const distance = cameraPosition
        ? Math.hypot(cameraPosition.x + 65, cameraPosition.z + 315) : 0;
      group.visible = distance < 190;
      if (!group.visible) return;
      for (const [index, object] of allFloats.entries()) {
        object.position.y = waterHeight(object.position.x, object.position.z, elapsed)
          + 0.24 + Math.sin(elapsed * 1.8 + index * 0.63) * 0.07;
        object.rotation.z = Math.sin(elapsed * 1.3 + index) * 0.05;
      }
    },
    dispose() {
      scene.remove(group);
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      woodMap?.dispose();
      rulerMap?.dispose();
    },
  };
}
