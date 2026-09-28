import * as THREE from 'three';
import { restoreLodgeSequenceState } from './lodgeSequence.js';

// Original geometry only. These details sit against the authored lodge's
// walls or on its rear table. The two objects that project into the room
// expose small collision footprints; wall-mounted details remain behind the
// lodge's existing wall collision envelope.
export function createLodgeScene(scene, terrainHeight, lodgeSite, initialState = null, foundIds = []) {
  if (!lodgeSite || lodgeSite.id !== 'lodge') throw new Error('A lodge site is required');
  const group = new THREE.Group();
  group.name = 'Keeper lodge investigation fixtures';
  group.position.set(lodgeSite.x, terrainHeight(lodgeSite.x, lodgeSite.z) + .08, lodgeSite.z);
  const material = {
    timber: new THREE.MeshStandardMaterial({ color: 0x554b3e, roughness: .91 }),
    oak: new THREE.MeshStandardMaterial({ color: 0x796b55, roughness: .84 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x3d4544, roughness: .62, metalness: .58 }),
    brass: new THREE.MeshStandardMaterial({ color: 0x9c8252, roughness: .5, metalness: .65 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xd8cfb5, roughness: .97, side: THREE.DoubleSide }),
    carbon: new THREE.MeshStandardMaterial({ color: 0xa7a8a0, roughness: .96, side: THREE.DoubleSide }),
    shade: new THREE.MeshStandardMaterial({ color: 0xb7aa8e, roughness: .82, side: THREE.DoubleSide }),
    ink: new THREE.MeshStandardMaterial({ color: 0x4b5859, roughness: .95 }),
    oilGlass: new THREE.MeshStandardMaterial({ color: 0x9c9a83, roughness: .24, metalness: .06,
      transparent: true, opacity: .68, depthWrite: false }),
  };
  const geometries = [];
  const add = (geometry, mat, x, y, z, name, parent = group) => {
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const box = (w, h, d, mat, x, y, z, name, parent) =>
    add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, name, parent);

  // A little inner latch holds the exterior shutter in its open position.
  box(.09, .31, .45, material.iron, 7.47, 1.65, -2.55, 'shutter hinge plate');
  const shutterCatch = new THREE.Group();
  shutterCatch.position.set(7.37, 1.67, -2.55);
  group.add(shutterCatch);
  box(.32, .08, .085, material.brass, -.09, 0, 0, 'shutter latch handle', shutterCatch);
  for (const z of [-2.72, -2.38]) {
    add(new THREE.SphereGeometry(.035, 6, 4), material.brass, 7.42, 1.65, z, 'shutter screw');
  }

  // The existing rear table carries a small storm lamp. Rotating its metal
  // shade changes the false image on the wet pane without changing the lamps
  // outside the room.
  const lamp = new THREE.Group();
  lamp.position.set(1.35, .87, -3.35);
  lamp.name = 'keeper table lamp';
  group.add(lamp);
  add(new THREE.CylinderGeometry(.22, .24, .07, 12), material.brass, 0, .04, 0, 'lamp foot', lamp);
  add(new THREE.CylinderGeometry(.105, .13, .47, 12), material.oilGlass, 0, .29, 0, 'lamp reservoir', lamp);
  add(new THREE.CylinderGeometry(.038, .038, .28, 10), material.brass, 0, .62, 0, 'lamp stem', lamp);
  const lampShade = new THREE.Group();
  lampShade.position.set(0, .80, 0);
  lamp.add(lampShade);
  add(new THREE.CylinderGeometry(.16, .34, .27, 14, 1, true), material.shade,
    0, 0, 0, 'movable lamp shade', lampShade);
  add(new THREE.CylinderGeometry(.18, .18, .035, 14), material.brass,
    0, .15, 0, 'shade rim', lampShade);
  const warmLamp = new THREE.PointLight(0xffd2a0, .58, 4.2, 2);
  warmLamp.position.set(0, .75, 0);
  lamp.add(warmLamp);

  // A shallow file box and carbon copy rest against the wall beneath the
  // stairs. Their sub-metre depth leaves the walking path clear.
  box(.94, .075, .43, material.timber, -5.35, .75, -4.16, 'file shelf');
  box(.77, .34, .33, material.oak, -5.35, .97, -4.16, 'case file box');
  const folderLid = new THREE.Group();
  folderLid.position.set(-5.35, 1.16, -4.34);
  group.add(folderLid);
  box(.79, .055, .37, material.timber, 0, 0, .19, 'file box lid', folderLid);
  const filePaper = box(.56, .018, .25, material.carbon,
    -5.35, 1.165, -4.13, 'working carbon sheet');
  box(.55, .045, .025, material.ink, -5.35, 1.045, -3.97, 'case file label edge');

  // The comparison surface is a slim wall board left of the front doorway.
  // It holds the signed summary and, once recovered, the earlier carbon.
  box(1.70, 1.08, .07, material.timber, -2.28, 1.62, 5.12, 'case comparison board');
  box(.72, .88, .015, material.paper, -2.69, 1.62, 5.07, 'signed summary');
  const deskCarbon = box(.72, .88, .015, material.carbon,
    -1.87, 1.62, 5.07, 'working carbon comparison');
  for (let row = 0; row < 5; row++) {
    box(.54 - row * .035, .012, .006, material.ink,
      -2.75 + row * .013, 1.90 - row * .15, 5.055, 'signed summary line');
    const carbonLine = box(.54 - row * .035, .012, .006, material.ink,
      -1.94 + row * .013, 1.90 - row * .15, 5.055, 'carbon copy line');
    carbonLine.visible = false;
    deskCarbon.userData[`line${row}`] = carbonLine;
  }
  const crossedLine = box(.57, .018, .006, material.ink,
    -1.96, 1.58, 5.047, 'crossed out qualification');
  crossedLine.rotation.z = .11;
  box(.14, .055, .08, material.brass, -2.69, 2.12, 5.035, 'summary clip');
  box(.14, .055, .08, material.brass, -1.87, 2.12, 5.035, 'carbon clip');

  scene.add(group);
  const obstacles = [
    { x: lodgeSite.x + 1.35, z: lodgeSite.z - 3.35, radius: .30 },
    { x: lodgeSite.x - 5.35, z: lodgeSite.z - 4.16, radius: .48 },
  ];
  function update(raw, evidence = []) {
    const state = restoreLodgeSequenceState(raw, evidence);
    shutterCatch.rotation.z = state.shutterLatched ? .42 : -.20;
    lampShade.rotation.y = state.lampRedirected ? 1.1 : -.55;
    folderLid.rotation.x = state.folderRetrieved ? -1.0 : 0;
    filePaper.visible = state.folderRetrieved;
    deskCarbon.visible = state.folderRetrieved;
    for (let row = 0; row < 5; row++) deskCarbon.userData[`line${row}`].visible = state.folderRetrieved;
    crossedLine.visible = state.folderRetrieved;
    warmLamp.intensity = state.lampRedirected ? .48 : .58;
  }
  update(initialState, foundIds);
  return {
    group, obstacles, update,
    blocksMove(x, z, radius = .32) {
      return obstacles.some((obstacle) => Math.hypot(x - obstacle.x, z - obstacle.z) < radius + obstacle.radius);
    },
    dispose() {
      group.parent?.remove(group);
      for (const geometry of geometries) geometry.dispose();
      for (const value of Object.values(material)) value.dispose();
    },
  };
}
