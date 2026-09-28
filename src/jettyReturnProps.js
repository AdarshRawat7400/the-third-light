import * as THREE from 'three';
import { JETTY_RETURN_STATIONS, jettyReturnMilestones, jettyReturnReady } from './jettyReturn.js';

// Small original props keep the last scene walkable and legible at a distance.
// They carry no collisions; the player interacts at the station coordinates.
const STATION = Object.fromEntries(JETTY_RETURN_STATIONS.map((entry) => [entry.id, entry]));

function addBox(parent, material, size, position, name) {
  const object = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  object.position.set(...position);
  object.name = name;
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function addCylinder(parent, material, top, bottom, height, position, name, sides = 8) {
  const object = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, sides), material);
  object.position.set(...position);
  object.name = name;
  object.castShadow = true;
  parent.add(object);
  return object;
}

function labelTexture(lines) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#7e887e'; ctx.fillRect(0, 0, 512, 192);
  ctx.strokeStyle = '#35474a'; ctx.lineWidth = 8; ctx.strokeRect(14, 14, 484, 164);
  ctx.fillStyle = '#192d32'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 42px Georgia, serif';
  lines.forEach((line, index) => ctx.fillText(line, 256, 55 + index * 71, 440));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function addLabel(parent, lines, position, width = 0.9) {
  const texture = labelTexture(lines);
  if (!texture) return null;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 0.375),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false }));
  mesh.position.set(...position);
  mesh.name = lines.join(' / ');
  parent.add(mesh);
  return mesh;
}

function place(station, terrainHeight) {
  const root = new THREE.Group();
  root.position.set(station.x, terrainHeight(station.x, station.z), station.z);
  root.name = `North jetty · ${station.id}`;
  return root;
}

export function createJettyReturnProps(scene, terrainHeight) {
  if (!scene?.add || typeof terrainHeight !== 'function') {
    throw new TypeError('Jetty return props require a scene and terrainHeight(x, z).');
  }
  const group = new THREE.Group();
  group.name = 'Daybreak return to North Inlet Jetty';
  group.visible = false;
  const timber = new THREE.MeshStandardMaterial({ color: 0x615b51, roughness: 0.95 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x34454a, metalness: 0.37, roughness: 0.7 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xc9c2ad, roughness: 0.93 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x536d72, roughness: 0.88 });
  const darkBlue = new THREE.MeshStandardMaterial({ color: 0x344b55, roughness: 0.94 });
  const coat = new THREE.MeshStandardMaterial({ color: 0x68594c, roughness: 0.96 });
  const face = new THREE.MeshStandardMaterial({ color: 0xb4866c, roughness: 0.98 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x3f3a36, roughness: 1 });
  const resources = new Set([timber, iron, cream, blue, darkBlue, coat, face, hair]);

  const berth = place(STATION.berth, terrainHeight);
  addCylinder(berth, timber, 0.18, 0.22, 1.2, [0.85, 0.6, -0.5], 'Mooring bollard', 10);
  addCylinder(berth, iron, 0.23, 0.23, 0.09, [0.85, 1.2, -0.5], 'Mooring cap', 10);
  const line = addCylinder(berth, blue, 0.025, 0.025, 2.3,
    [0.55, 0.78, 0.15], 'Slack rescue line', 6);
  line.rotation.x = Math.PI / 2.9;
  addBox(berth, timber, [1.3, 0.085, 0.75], [-0.85, 0.59, 0], 'Depth board rail');
  addBox(berth, iron, [0.08, 1.05, 0.08], [-1.36, 0.52, 0], 'Depth board rail post');
  addLabel(berth, ['NORTH INLET', 'DEEP BERTH'], [-0.85, 0.72, 0.405], 1.05);
  group.add(berth);

  const caseRoot = place(STATION.case, terrainHeight);
  for (const x of [-0.68, 0.68]) addBox(caseRoot, timber, [0.085, 0.9, 0.08], [x, 0.45, 0], 'Packet table leg');
  addBox(caseRoot, timber, [1.65, 0.09, 0.82], [0, 0.95, 0], 'Iris’s packet table');
  addBox(caseRoot, darkBlue, [0.73, 0.23, 0.43], [-0.38, 1.1, 0], 'Waterproof evidence case');
  addBox(caseRoot, iron, [0.28, 0.035, 0.08], [-0.38, 1.25, 0], 'Case handle');
  const paperSet = new THREE.Group();
  paperSet.name = 'Iris’s matching paper family set';
  caseRoot.add(paperSet);
  addBox(paperSet, cream, [0.48, 0.06, 0.35], [0.43, 1.035, -0.08], 'Authenticated paper family packet');
  addBox(paperSet, blue, [0.5, 0.018, 0.04], [0.43, 1.073, -0.08], 'Blue custody band');
  addLabel(paperSet, ['IRIS HALE', 'FAMILY COPY'], [0.43, 1.09, 0.098], 0.42);
  group.add(caseRoot);

  const family = place(STATION.family, terrainHeight);
  // A quiet, original low-poly figure; the old report stays in her hand.
  addCylinder(family, coat, 0.19, 0.28, 0.69, [0.48, 0.74, -0.38], 'Daughter’s raincoat', 9);
  for (const x of [0.38, 0.58]) addBox(family, darkBlue, [0.095, 0.47, 0.12], [x, 0.24, -0.38], 'Boot');
  addCylinder(family, face, 0.13, 0.12, 0.24, [0.48, 1.26, -0.38], 'Daughter’s face', 9);
  addBox(family, hair, [0.29, 0.1, 0.26], [0.48, 1.41, -0.38], 'Daughter’s short hair');
  addBox(family, coat, [0.12, 0.1, 0.4], [0.25, 0.94, -0.19], 'Sleeve over report');
  addBox(family, cream, [0.28, 0.018, 0.2], [0.27, 0.91, 0.02], 'Folded old finding');
  addBox(family, timber, [1.6, 0.09, 0.4], [-0.4, 0.47, 0.95], 'Jetty waiting bench');
  for (const x of [-1.0, 0.2]) addBox(family, timber, [0.08, 0.47, 0.1], [x, 0.24, 0.95], 'Bench leg');
  group.add(family);

  const receipt = place(STATION.receipt, terrainHeight);
  addBox(receipt, iron, [0.1, 1.2, 0.1], [-0.35, 0.6, 0.1], 'Handoff board post');
  addBox(receipt, timber, [0.95, 0.55, 0.05], [-0.35, 1.17, 0.1], 'Handoff inventory board');
  addLabel(receipt, ['DELIVERY', 'NO RELEASE'], [-0.35, 1.17, 0.135], 0.84);
  addCylinder(receipt, iron, 0.013, 0.013, 0.25,
    [0.3, 0.83, 0.25], 'Pencil for document receipt', 6).rotation.z = 0.9;
  addBox(receipt, timber, [0.5, 0.1, 0.62], [0.27, 0.75, 0.12], 'Handoff board shelf');
  group.add(receipt);

  scene.add(group);
  return {
    group,
    update(raw, context = {}) {
      group.visible = jettyReturnReady(context);
      if (group.visible) {
        const done = jettyReturnMilestones(raw, context).complete;
        paperSet.visible = !done;
      }
    },
    dispose() {
      scene.remove(group);
      group.traverse((object) => {
        if (!object.isMesh) return;
        object.geometry?.dispose();
        if (Array.isArray(object.material)) object.material.forEach((material) => resources.add(material));
        else resources.add(object.material);
      });
      for (const material of resources) {
        material.map?.dispose();
        material.dispose();
      }
    },
  };
}
