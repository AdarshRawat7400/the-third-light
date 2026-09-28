import * as THREE from 'three';
import { restoreSigningReconstructionState } from './signingReconstruction.js';

// Original, small archival props. They sit against the existing wall or on
// the central GLB table and do not add a new floor-standing obstacle.
export function createSigningRoomScene(scene, terrainHeight, archiveSite, initialState = null, foundIds = []) {
  if (!archiveSite || archiveSite.id !== 'archive') throw new Error('An archive site is required');
  const root = new THREE.Group();
  root.name = 'Signing-room reconstruction fixtures';
  root.position.set(archiveSite.x, terrainHeight(archiveSite.x, archiveSite.z) + .08, archiveSite.z);
  const mats = {
    iron: new THREE.MeshStandardMaterial({ color: 0x3d494a, roughness: .67, metalness: .61 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xd7cfb8, roughness: .96, side: THREE.DoubleSide }),
    carbon: new THREE.MeshStandardMaterial({ color: 0xaeb3ab, roughness: .95, side: THREE.DoubleSide }),
    docket: new THREE.MeshStandardMaterial({ color: 0xcbbe9e, roughness: .96, side: THREE.DoubleSide }),
    timber: new THREE.MeshStandardMaterial({ color: 0x5f5749, roughness: .91 }),
    brass: new THREE.MeshStandardMaterial({ color: 0x9d875e, roughness: .55, metalness: .61 }),
    ink: new THREE.MeshStandardMaterial({ color: 0x3a484b, roughness: .96 }),
    red: new THREE.MeshStandardMaterial({ color: 0x8e5b53, roughness: .87 }),
  };
  const geometries = [];
  const textures = [];
  const add = (geometry, material, x, y, z, name, parent = root) => {
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const box = (w, h, d, material, x, y, z, name, parent) =>
    add(new THREE.BoxGeometry(w, h, d), material, x, y, z, name, parent);
  function label(lines, x, y, z, w, h, facing = 'up') {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#c8bea5';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#8d8979';
    ctx.lineWidth = 5;
    ctx.strokeRect(13, 12, 486, 230);
    ctx.fillStyle = '#344143';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < lines.length; i++) {
      ctx.font = i === 0 ? 'bold 32px Georgia, serif' : '26px Georgia, serif';
      ctx.fillText(lines[i], 30, 71 + i * 58, 450);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    textures.push(texture);
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: .96, side: THREE.DoubleSide });
    mats[`label${textures.length}`] = material;
    const mesh = add(new THREE.PlaneGeometry(w, h), material, x, y, z, `Archive label: ${lines[0]}`);
    if (facing === 'up') mesh.rotation.x = -Math.PI / 2;
    else if (facing === 'right') mesh.rotation.y = -Math.PI / 2;
    else mesh.rotation.y = Math.PI;
    return mesh;
  }

  // Source intake: the export and captain's statement were in the file before
  // Mara signed. The trays now sit on the aisle side of the authored shelves.
  box(.72, .055, 1.07, mats.timber, -6.21, .82, -0.05, 'intake shelf');
  box(.65, .09, .42, mats.iron, -6.21, .91, -0.30, 'typed export tray');
  box(.65, .09, .42, mats.iron, -6.21, .91, 0.22, 'captain testimony tray');
  const typedPage = box(.51, .016, .32, mats.paper, -6.21, .975, -0.30, 'typed status page');
  const captainPage = box(.51, .016, .32, mats.carbon, -6.21, .975, 0.22, 'captain original account');
  label(['TYPED STATUS', '21:14'], -6.21, .989, -0.30, .49, .29);
  label(['CAPTAIN', 'TWO UPPER LIGHTS'], -6.21, .989, 0.22, .49, .29);

  // The missing original is an empty sleeve rather than a recreated relay
  // record. Its face never displays a made-up reading.
  box(.39, .76, .62, mats.iron, 6.14, 1.15, -0.10, 'original-record slot');
  box(.018, .53, .51, mats.paper, 5.936, 1.16, -0.10, 'empty relay sleeve face');
  box(.08, .055, .18, mats.brass, 5.89, 1.19, -0.10, 'sleeve pull');
  label(['ORIGINAL RELAY', 'COLUMN ABSENT'], 5.923, 1.16, -0.10, .48, .40, 'right');
  const sleeveTab = box(.08, .035, .34, mats.red, 5.89, 1.41, -0.10, 'empty sleeve tab');

  // The administrative routing docket records urgency and the surviving
  // permission to carry a qualification. It does not accuse a supervisor.
  box(1.14, .87, .055, mats.timber, -4.6, 1.65, 4.07, 'closure routing board');
  box(.98, .74, .012, mats.docket, -4.6, 1.65, 4.03, 'closure routing slip');
  label(['CLOSE BY FERRY', 'LIST OPEN SOURCES'], -4.6, 1.65, 4.017, .92, .67, 'wall');
  box(.16, .045, .09, mats.brass, -4.6, 2.065, 3.985, 'docket clip');

  // The Blender table is at local glTF z=+1.0. The carbon and inkstand share
  // its surface with the later comparison folder, without entering shelving.
  const carbon = box(.52, .014, .36, mats.carbon, -.66, 1.15, 0.98, 'Mara working carbon on signing table');
  for (let i = 0; i < 4; i++) {
    const line = box(.37 - i * .035, .009, .012, mats.ink,
      -.71 + i * .01, 1.16, 0.86 + i * .08, 'carbon finding line');
    line.visible = false;
    carbon.userData[`line${i}`] = line;
  }
  const strike = box(.41, .01, .013, mats.red, -.69, 1.169, 1.10, 'struck unresolved status');
  strike.rotation.y = -.13;
  add(new THREE.CylinderGeometry(.085, .11, .11, 12), mats.ink,
    -.99, 1.21, 0.78, 'signing ink bottle');
  box(.11, .014, .09, mats.brass, -.99, 1.275, 0.78, 'ink bottle cap');

  scene.add(root);
  // The authored GLB desk is Blender y=-1, which exports to glTF z=+1.
  // Keep the player's body out of the tabletop while preserving the narrow
  // rear-side and wider front-side approaches to the records.
  const deskCollider = { x: archiveSite.x, z: archiveSite.z + 1,
    halfWidth: 1.2, halfDepth: .6 };
  function blocksDesk(x, z, radius) {
    return Math.abs(x - deskCollider.x) < deskCollider.halfWidth + radius
      && Math.abs(z - deskCollider.z) < deskCollider.halfDepth + radius;
  }
  function deskPenetration(x, z, radius) {
    return Math.min(deskCollider.halfWidth + radius - Math.abs(x - deskCollider.x),
      deskCollider.halfDepth + radius - Math.abs(z - deskCollider.z));
  }
  function update(raw, evidence = []) {
    const state = restoreSigningReconstructionState(raw, evidence);
    typedPage.rotation.y = state.intakeSorted ? -.12 : 0;
    captainPage.rotation.y = state.intakeSorted ? .12 : 0;
    sleeveTab.position.y = state.originalChecked ? 1.49 : 1.41;
    carbon.visible = state.intakeSorted && state.originalChecked && state.docketRead;
    for (let i = 0; i < 4; i++) carbon.userData[`line${i}`].visible = carbon.visible;
    strike.visible = state.decisionReconstructed;
  }
  update(initialState, foundIds);
  return {
    group: root, deskCollider, update,
    blocksMove(x, z, radius = .32) {
      return blocksDesk(x, z, radius);
    },
    blocksMoveFrom(fromX, fromZ, toX, toZ, radius = .32) {
      if (!blocksDesk(toX, toZ, radius)) return false;
      if (!blocksDesk(fromX, fromZ, radius)) return true;
      // Old saves may resume at the archive desk before this collider existed.
      // Permit steps that reduce penetration so those players can walk out.
      return deskPenetration(toX, toZ, radius)
        >= deskPenetration(fromX, fromZ, radius) - 1e-6;
    },
    dispose() {
      root.parent?.remove(root);
      for (const geometry of geometries) geometry.dispose();
      for (const material of Object.values(mats)) material.dispose();
      for (const texture of textures) texture.dispose();
    },
  };
}
