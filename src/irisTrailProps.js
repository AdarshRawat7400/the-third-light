import * as THREE from 'three';
import { IRIS_TRAIL_STATIONS } from './irisTrail.js';

// Four original, lightweight field props that make the optional route visible
// without adding collisions, downloads, or borrowed art. Text is painted into
// small canvas maps once; the same few geometries and materials are reused.
const LABELS = Object.freeze({
  radio: ['I. HALE  /  18:40', 'FIELD SPOOL 14', 'PUMP • CONDUIT'],
  road: ['FIELD', '14'],
  pump: ['BYPASS MARGIN', 'PUMP + STANDBY', 'SHARED FEED'],
  hatch: ['CONDUIT', '← PUMP'],
});

function labelMap(lines, colors) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = colors.paper;
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 8;
  ctx.strokeRect(17, 17, 478, 222);
  ctx.fillStyle = colors.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 33px Georgia, serif';
  const height = 174 / Math.max(1, lines.length);
  lines.forEach((line, index) => ctx.fillText(line, 256, 49 + height * (index + 0.5), 430));
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

function addMesh(group, geometry, material, x, y, z, name) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.name = name;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function createIrisTrailProps(scene, terrainHeight) {
  if (!scene?.add || typeof terrainHeight !== 'function') {
    throw new TypeError('Iris trail props require a scene and terrainHeight(x, z).');
  }
  const group = new THREE.Group();
  group.name = 'Iris route evidence props';
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x34434a, metalness: 0.35, roughness: 0.7 });
  const fadedBlue = new THREE.MeshStandardMaterial({ color: 0x557a80, metalness: 0, roughness: 0.92 });
  const wetStone = new THREE.MeshStandardMaterial({ color: 0x4b5556, metalness: 0, roughness: 0.94 });
  const post = new THREE.CylinderGeometry(0.045, 0.057, 0.91, 7);
  const flatBoard = new THREE.BoxGeometry(0.82, 0.48, 0.045);
  const narrowBoard = new THREE.BoxGeometry(0.36, 0.42, 0.037);
  const stoneSlab = new THREE.DodecahedronGeometry(0.52, 0);
  const labelGeometry = new THREE.PlaneGeometry(0.73, 0.36);
  const smallLabelGeometry = new THREE.PlaneGeometry(0.29, 0.32);
  const maps = [];
  const labelMaterials = [];
  const colors = {
    radio: { paper: '#a99d7f', border: '#4a5554', ink: '#202c2c' },
    road: { paper: '#577e83', border: '#afc6bc', ink: '#e3e4d7' },
    pump: { paper: '#aaad9d', border: '#48575b', ink: '#283332' },
    hatch: { paper: '#6d7977', border: '#b9c7bc', ink: '#e3e7d9' },
  };
  for (const station of IRIS_TRAIL_STATIONS) {
    const x = station.x;
    const z = station.z;
    const ground = terrainHeight(x, z);
    const base = new THREE.Group();
    base.name = `Iris route · ${station.id}`;
    group.add(base);
    if (station.id === 'hatch') {
      const rock = addMesh(base, stoneSlab, wetStone, x, ground + 0.18, z, 'Conduit marker stone');
      rock.scale.set(1.05, 0.45, 0.74);
      rock.rotation.y = -0.23;
    } else {
      const stem = addMesh(base, post, station.id === 'road' ? darkMetal : fadedBlue,
        x, ground + 0.49, z, 'Evidence-marker stem');
      stem.rotation.z = station.id === 'road' ? -0.055 : 0;
      addMesh(base, station.id === 'road' ? narrowBoard : flatBoard,
        station.id === 'road' ? fadedBlue : darkMetal,
        x, ground + 1.00, z, 'Weathered evidence plate');
    }
    const map = labelMap(LABELS[station.id], colors[station.id]);
    if (!map) continue;
    maps.push(map);
    const material = new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide, toneMapped: false });
    labelMaterials.push(material);
    const label = addMesh(base, station.id === 'road' ? smallLabelGeometry : labelGeometry,
      material, x, ground + (station.id === 'hatch' ? 0.43 : 1.0),
      z + (station.id === 'hatch' ? 0.12 : 0.03), 'Hand-marked field label');
    if (station.id === 'hatch') {
      label.scale.set(0.72, 0.72, 1);
      label.rotation.x = -0.47;
    }
  }
  scene.add(group);
  return {
    group,
    dispose() {
      scene.remove(group);
      post.dispose(); flatBoard.dispose(); narrowBoard.dispose(); stoneSlab.dispose();
      labelGeometry.dispose(); smallLabelGeometry.dispose();
      maps.forEach((map) => map.dispose());
      labelMaterials.forEach((material) => material.dispose());
      darkMetal.dispose(); fadedBlue.dispose(); wetStone.dispose();
    },
  };
}
