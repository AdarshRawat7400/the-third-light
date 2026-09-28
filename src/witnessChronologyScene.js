import * as THREE from 'three';
import { WITNESS_CHRONOLOGY_STATION } from './witnessChronology.js';

// A small case-reference board fastened to the east face of the existing
// gatehouse intake plinth. It shares that plinth's physical collider and leaves
// the gate lane and the historical ledger's inspection point unobstructed.
export function createWitnessChronologyScene(scene, terrainHeight) {
  if (!scene?.add || typeof terrainHeight !== 'function') {
    throw new TypeError('Witness chronology board needs a scene and terrain height.');
  }
  const group = new THREE.Group();
  group.name = 'Gatehouse witness chronology board';
  const x = -70.73;
  const z = WITNESS_CHRONOLOGY_STATION.z;
  const y = terrainHeight(-72, z) + 1.60;

  const frameGeometry = new THREE.BoxGeometry(0.11, 1.72, 1.35);
  const faceGeometry = new THREE.PlaneGeometry(1.24, 1.59);
  const hoodGeometry = new THREE.BoxGeometry(0.31, 0.08, 1.49);
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x434c4a, roughness: 0.81, metalness: 0.34,
  });
  const hoodMaterial = new THREE.MeshStandardMaterial({
    color: 0x62594e, roughness: 0.89, metalness: 0.12,
  });
  const backing = new THREE.Mesh(frameGeometry, frameMaterial);
  backing.name = 'Corroded intake plinth file frame';
  backing.position.set(x - 0.02, y, z);
  backing.castShadow = false;
  group.add(backing);

  let texture = null;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 640;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#a7a18f';
      context.fillRect(0, 0, 512, 640);
      context.fillStyle = '#c5bca5';
      context.fillRect(21, 18, 470, 601);
      context.strokeStyle = '#5b625e';
      context.lineWidth = 6;
      context.strokeRect(21, 18, 470, 601);
      context.fillStyle = '#394a49';
      context.font = 'bold 38px Georgia, serif';
      context.fillText('WITNESS FILE', 46, 67);
      context.font = '19px Arial, sans-serif';
      context.fillText('COMPARE DATES  /  KEEP SOURCES APART', 48, 94);
      const rows = [
        ['01', 'WRECK MORNING', 'INTAKE · SIGNED ENTRY'],
        ['02', 'ORIGINAL HEARING', 'CAPTAIN · TRANSCRIPT'],
        ['03', 'ONE MONTH LATER', 'DECKHAND · ADDENDUM'],
        ['04', 'ASSESSMENT', 'DRAFT · MARGINAL NOTE'],
      ];
      for (let index = 0; index < rows.length; index++) {
        const top = 119 + index * 117;
        context.fillStyle = index % 2 ? '#ddd2b9' : '#e6d9bd';
        context.fillRect(39, top, 434, 102);
        context.fillStyle = index === 3 ? '#8b5448' : '#536d68';
        context.fillRect(39, top, 8, 102);
        context.fillStyle = '#435250';
        context.font = 'bold 20px Arial, sans-serif';
        context.fillText(rows[index][0], 62, top + 33);
        context.fillText(rows[index][1], 111, top + 32);
        context.font = '17px Arial, sans-serif';
        context.fillText(rows[index][2], 111, top + 67);
      }
      context.fillStyle = '#4b5651';
      context.font = 'italic 18px Georgia, serif';
      context.fillText('Compare the dates before drawing a finding.', 42, 608);
      // Deterministic surface wear stays off the text columns.
      for (let i = 0; i < 34; i++) {
        context.fillStyle = i % 2 ? '#8e8d7c' : '#d3c8ad';
        context.globalAlpha = 0.18;
        context.fillRect(24 + (i * 73) % 16, 112 + (i * 47) % 455, 2, 4 + i % 11);
      }
      context.globalAlpha = 1;
      texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
    }
  }
  const faceMaterial = new THREE.MeshStandardMaterial({
    color: 0xe1d7c1, map: texture, roughness: 0.82,
    side: THREE.DoubleSide,
  });
  const face = new THREE.Mesh(faceGeometry, faceMaterial);
  face.name = 'Dated witness source cards';
  face.rotation.y = Math.PI / 2;
  face.position.set(x + 0.048, y, z);
  face.receiveShadow = true;
  group.add(face);

  const hood = new THREE.Mesh(hoodGeometry, hoodMaterial);
  hood.name = 'Weather lip above witness file';
  hood.position.set(x + 0.12, y + 0.89, z);
  group.add(hood);
  scene.add(group);
  return {
    group,
    update(cameraPosition, chapter = 1) {
      group.visible = chapter >= 1 && (!cameraPosition || Math.hypot(cameraPosition.x - x,
        cameraPosition.z - z) < 130);
    },
    dispose() {
      scene.remove(group);
      frameGeometry.dispose(); faceGeometry.dispose(); hoodGeometry.dispose();
      frameMaterial.dispose(); faceMaterial.dispose(); hoodMaterial.dispose();
      texture?.dispose();
    },
  };
}
