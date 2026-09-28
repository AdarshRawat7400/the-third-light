import * as THREE from 'three';
import { WITNESS_RADIO_SITE, WITNESS_STATION } from './witnessConfrontation.js';

// A low-poly radio-house worktable. Its three movable papers correspond to
// source classes the player compares, rather than conjuring new evidence.
export function createWitnessTableProps(scene, terrainHeight) {
  const root = new THREE.Group();
  root.name = 'Radio-house witness worktable';
  const x = WITNESS_RADIO_SITE.x + WITNESS_STATION.x;
  const z = WITNESS_RADIO_SITE.z + WITNESS_STATION.z;
  root.position.set(x, terrainHeight(WITNESS_RADIO_SITE.x, WITNESS_RADIO_SITE.z) + 0.025, z);
  scene.add(root);

  const resources = { geometries: new Set(), materials: new Set(), textures: new Set() };
  const shape = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 10),
    sphere: new THREE.SphereGeometry(1, 10, 8),
    plane: new THREE.PlaneGeometry(1, 1),
  };
  Object.values(shape).forEach((geometry) => resources.geometries.add(geometry));
  const material = (color, metalness = 0, roughness = 0.85, extra = {}) => {
    const value = new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
    resources.materials.add(value);
    return value;
  };
  const timber = material(0x635446);
  const edge = material(0x3d3f3c, 0.18, 0.75);
  const brass = material(0xa78c61, 0.58, 0.42);
  const paper = material(0xcfc7ae, 0, 0.96);
  const ink = material(0x343c3e, 0, 0.95);
  const red = material(0x965445, 0, 0.88);
  const glass = material(0x768a88, 0.1, 0.22, { transparent: true, opacity: 0.42,
    depthWrite: false });
  const bulb = material(0xffd7a0, 0, 0.3, { emissive: 0xe7aa5f, emissiveIntensity: 0.44 });

  function mesh(parent, type, mat, px, py, pz, sx, sy, sz) {
    const item = new THREE.Mesh(shape[type], mat);
    item.position.set(px, py, pz);
    item.scale.set(sx, sy, sz);
    item.castShadow = type !== 'plane';
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }
  function rod(parent, mat, start, end, width) {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const axis = b.clone().sub(a);
    const item = mesh(parent, 'cylinder', mat,
      (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2,
      width, axis.length(), width);
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize());
    return item;
  }
  function caption(label, parent) {
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#cfc7ae';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#313a3b';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(label, 12, 42);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    resources.textures.add(texture);
    const labelMat = material(0xffffff, 0, 1, { map: texture, side: THREE.DoubleSide });
    const tag = mesh(parent, 'plane', labelMat, 0, 0.019, -0.105, 0.31, 0.075, 1);
    tag.rotation.x = -Math.PI / 2;
    tag.castShadow = false;
  }

  // One narrow table in the free center-left aisle. Its 0.9 m depth leaves
  // the radio route cabinet and its E prompt almost three metres away.
  mesh(root, 'box', timber, 0, 0.76, 0, 1.55, 0.09, 0.88);
  mesh(root, 'box', edge, 0, 0.705, 0, 1.47, 0.025, 0.80);
  for (const px of [-0.65, 0.65]) for (const pz of [-0.32, 0.32]) {
    mesh(root, 'box', timber, px, 0.365, pz, 0.075, 0.73, 0.075);
  }
  mesh(root, 'box', edge, 0, 0.815, 0, 1.32, 0.015, 0.70);
  mesh(root, 'box', glass, 0.04, 0.832, 0, 1.18, 0.007, 0.59);

  // The desk lamp and local microphone set make this an operator's actual
  // workplace. Their shapes are original primitives and use no external art.
  mesh(root, 'cylinder', brass, -0.58, 0.84, -0.27, 0.115, 0.035, 0.115);
  rod(root, brass, [-0.58, 0.87, -0.27], [-0.48, 1.27, -0.19], 0.021);
  rod(root, brass, [-0.48, 1.27, -0.19], [-0.23, 1.20, -0.12], 0.018);
  const shade = mesh(root, 'cylinder', edge, -0.23, 1.18, -0.12, 0.18, 0.085, 0.18);
  shade.rotation.z = -0.22;
  mesh(root, 'sphere', bulb, -0.23, 1.125, -0.12, 0.074, 0.042, 0.074);
  mesh(root, 'box', edge, -0.57, 0.852, 0.27, 0.22, 0.065, 0.18);
  rod(root, brass, [-0.57, 0.887, 0.26], [-0.53, 1.02, 0.20], 0.013);
  const mic = mesh(root, 'cylinder', edge, -0.53, 1.04, 0.20, 0.045, 0.10, 0.045);
  mic.rotation.x = 0.23;
  rod(root, ink, [-0.58, 0.84, 0.35], [-0.74, 0.80, 0.36], 0.012);

  const cards = new Map();
  const cardSpecs = [
    ['voiceCompared', 'VOICE', -0.19, -0.18],
    ['orderCompared', 'ORDER', 0.20, 0.02],
    ['relayCompared', 'RELAY', 0.33, 0.25],
  ];
  for (const [flag, title, px, pz] of cardSpecs) {
    const card = new THREE.Group();
    card.name = `${title} source card`;
    card.position.set(px, 0.847, pz);
    mesh(card, 'box', paper, 0, 0, 0, 0.37, 0.007, 0.29);
    mesh(card, 'box', title === 'RELAY' ? red : brass, 0, 0.008, -0.133, 0.11, 0.008, 0.021);
    for (let row = 0; row < 3; row++) {
      mesh(card, 'box', ink, -0.02, 0.009, -0.032 + row * 0.055,
        0.26 - row * 0.035, 0.001, 0.004);
    }
    caption(title, card);
    root.add(card);
    cards.set(flag, card);
  }
  const quoteCard = new THREE.Group();
  quoteCard.name = 'Elias testimony note';
  quoteCard.position.set(0.54, 0.846, -0.19);
  mesh(quoteCard, 'box', paper, 0, 0, 0, 0.30, 0.006, 0.22);
  mesh(quoteCard, 'box', red, -0.105, 0.008, -0.07, 0.018, 0.001, 0.055);
  caption('ACCOUNT', quoteCard);
  root.add(quoteCard);

  function update({ chapter = 0, inside = null, witness = null, elapsed = 0 } = {}) {
    const room = typeof inside === 'string' ? inside : inside?.id;
    root.visible = chapter >= 3 && room === 'radio';
    const state = witness && typeof witness === 'object' ? witness : {};
    for (const [flag, card] of cards) {
      const compared = state[flag] === true;
      card.position.y = compared ? 0.864 : 0.847;
      card.rotation.z = compared ? -0.055 : 0;
    }
    quoteCard.visible = state.accountTaken === true;
    quoteCard.position.y = state.accountTested === true ? 0.864 : 0.846;
    bulb.emissiveIntensity = root.visible ? 0.42 + 0.055 * Math.sin(elapsed * 0.8) : 0.42;
  }
  update();

  function dispose() {
    scene.remove(root);
    for (const geometry of resources.geometries) geometry.dispose();
    for (const mat of resources.materials) mat.dispose();
    for (const texture of resources.textures) texture.dispose();
  }
  return { group: root, cards, update, dispose };
}
