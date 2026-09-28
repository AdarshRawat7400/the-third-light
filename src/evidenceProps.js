import * as THREE from 'three';

// All visible evidence is built from original geometry and generated labels.
// A clue can still be inspected through the existing interaction system; this
// module only gives it a physical presence in the scene.
const DOCUMENT_IDS = new Set([
  'iris_note', 'lodge_supply_chit', 'lodge_unsent_card', 'operator_note',
]);
const BOARD_IDS = new Set([
  'arrival_registry', 'north_jetty_sounding', 'alignment_solution',
  'archive_chart', 'tower_training_card',
]);
// The short text visible on each prop states only what that source establishes.
// Full wording and provenance remain in the inspect panel and case journal.
export const EVIDENCE_FACE_FACTS = Object.freeze({
  typed_log: Object.freeze(['21:14  MAIN REAR ACTIVE', 'STANDBY  DISABLED', 'ORIGINAL COLUMN MISSING']),
  captain_testimony: Object.freeze(['LOWER LIGHT HELD STEADY', 'TWO POSSIBLE UPPER LIGHTS', 'MARGIN: UNCORROBORATED']),
  draft_memo: Object.freeze(['LAMP STATUS UNRESOLVED', 'OBTAIN RELAY ORIGINAL', 'REMOVED BEFORE SIGNING']),
  signed_summary: Object.freeze(['TYPED EXPORT ACCEPTED', 'WARNING REMOVED', 'CIRCUIT STATE UNPROVED']),
  revision_stamp: Object.freeze(['REPRINTED TWO DAYS LATER', 'E. WARD OPERATOR ACCOUNT', 'VALUE NEEDS ORIGINAL']),
  witness_addendum: Object.freeze(['FILED ONE MONTH LATER', 'SECOND HIGH LIGHT SEEN', 'AFTER INQUIRY CLOSED']),
  intake_ledger: Object.freeze(['WRECK MORNING INTAKE', 'LOWER + TWO UPPER LIGHTS', 'BEFORE PRESS COVERAGE']),
  gale_reel: Object.freeze(['21:14  CROSSWIND + RAIN', 'BOTH HIGH LIGHTS VISIBLE', 'WESTERN REEF OBSCURED']),
  failover_tag: Object.freeze(['SHARED EMERGENCY FEED', 'PUMP + STANDBY REAR', 'WARN INCOMING VESSELS']),
  training_card: Object.freeze(['FRONT + WEST MAIN: DEEP', 'FRONT + EAST REAR: REEF', 'VERIFY AT BOTH STAKES']),
  sounding_board: Object.freeze(['DEEP WATER AT BERTH', 'WESTERN SHELF SHALLOWS', 'KEEP TRUE PAIR IN LINE']),
  waterline_stain: Object.freeze(['FRESH SILT ABOVE OLD LINE', 'TUNNEL WATER RISING', 'PUMP BEFORE GATE']),
});
// The authored clue anchors remain unchanged for interaction. Only the visible
// model is inset where a full-size record would otherwise meet an inner wall.
const VISUAL_INSETS = Object.freeze({
  archive_signing_finding: [-0.55, 1.35],
  island_loop_ledger: [-0.55, 0],
  radio_unsent_call: [-0.70, 0.16],
  pump_service_order: [0, 0.65],
  pump_iris_route: [1.20, 0],
  tower_failover_tag: [0.38, -0.27],
  tower_training_card: [-0.35, 0.28],
  // Keep the interaction anchor by the berth, but mount its small sign along
  // the seaward starboard edge so it does not fill the player's approach view.
  north_jetty_sounding: [1.25, -2.4],
});

function evidenceKind(clue) {
  const { id, category = '' } = clue;
  if (id === 'archive_reconstruction') return 'desk_folder';
  if (id === 'archive_signing_finding') return 'signed_summary';
  if (id === 'tunnel_signal' || id === 'iris_rescued') return 'hatch';
  if (id === 'iris_handoff') return 'sealed_case';
  if (id === 'window_reflection') return 'lamp';
  if (id === 'lodge_photo') return 'photograph';
  if (id === 'headland_view' || id === 'east_ridge_view') return 'survey';
  if (id === 'west_gale_chart') return 'gale_reel';
  if (id === 'tunnel_water_mark') return 'waterline_stain';
  if (id === 'east_benchmark') return 'benchmark';
  if (id === 'tunnel_chalk') return 'chalk';
  if (id === 'official_log') return 'typed_log';
  if (id === 'captain_statement') return 'captain_testimony';
  if (id === 'archive_draft_memo') return 'draft_memo';
  if (id === 'archive_revision_stamp') return 'revision_stamp';
  if (id === 'archive_witness_addendum') return 'witness_addendum';
  if (id === 'prison_intake_ledger') return 'intake_ledger';
  if (id === 'tower_failover_tag') return 'failover_tag';
  if (id === 'tower_training_card') return 'training_card';
  if (id === 'north_jetty_sounding') return 'sounding_board';
  if (id === 'lamp_strip') return 'relay_strip';
  if (id === 'island_loop_ledger') return 'loop_ledger';
  if (id === 'radio_unsent_call') return 'distress_form';
  if (id === 'pump_service_order') return 'service_order';
  if (id === 'pump_iris_route') return 'bypass_sketch';
  if (id === 'daybreak_report') return 'correction_terminal';
  if (id === 'radio_patch' || id === 'launch_guided') return 'radio';
  if (id === 'radio_switchboard' || id === 'radio_route_verified') return 'switchboard';
  if (id === 'radio_iris_recording') return 'recorder';
  if (id === 'tower_panel' || id === 'pump_power') return 'control';
  if (BOARD_IDS.has(id)) return 'board';
  if (DOCUMENT_IDS.has(id) || /DOCUMENT|RECORD|TESTIMONY|LETTER|NOTE|CHART|TRANSCRIPT/.test(category)) return 'document';
  return 'document';
}

function labelTexture(title, kind = 'paper') {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const c = canvas.getContext('2d');
  if (!c) return null;
  const dark = ['chalk', 'machine', 'bypass', 'failover_tag', 'waterline_stain', 'gale_reel', 'sounding_board'].includes(kind);
  c.fillStyle = dark ? (kind === 'chalk' ? '#414c4c' : kind === 'bypass' ? '#344f58' : '#26363b') : '#d9d1b9';
  c.fillRect(0, 0, 512, 384);
  const seed = [...title].reduce((acc, character) => acc + character.charCodeAt(0), 0);
  for (let i = 0; i < 220; i++) {
    const x = (i * 137 + seed * 43) % 512;
    const y = (i * 73 + seed * 19) % 384;
    c.fillStyle = dark ? 'rgba(235,235,210,0.025)' : 'rgba(70,57,36,0.035)';
    c.fillRect(x, y, (i % 3) + 1, (i % 4) + 1);
  }
  c.strokeStyle = dark ? '#778987' : '#aa9f87';
  c.lineWidth = 3;
  c.strokeRect(17, 16, 478, 352);
  c.fillStyle = dark ? '#d6d0b2' : '#584c40';
  c.font = 'bold 18px Georgia, serif';
  c.fillText('GREYWAKE ISLAND  /  CASE MATERIAL', 34, 49, 445);
  c.fillStyle = dark ? '#f0e0b8' : '#353a36';
  c.font = 'bold 32px Georgia, serif';
  c.fillText(title.toUpperCase(), 34, 112, 444);
  if (EVIDENCE_FACE_FACTS[kind]) {
    const lines = EVIDENCE_FACE_FACTS[kind];
    c.font = 'bold 22px Georgia, serif';
    for (const [row, line] of lines.entries()) {
      const y = 177 + row * 62;
      c.fillStyle = row === 2 ? (dark ? '#e4b68b' : '#8e5147') : (dark ? '#e5e0cb' : '#364344');
      c.fillText(line, 38, y, 438);
      c.strokeStyle = dark ? '#73898a' : '#b2aa95';
      c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(36, y + 17); c.lineTo(471, y + 17); c.stroke();
    }
    if (kind === 'draft_memo') {
      c.strokeStyle = '#9b514a';
      c.lineWidth = 5;
      c.beginPath(); c.moveTo(38, 172); c.lineTo(439, 157); c.stroke();
    }
    if (kind === 'revision_stamp' || kind === 'witness_addendum') {
      c.strokeStyle = '#a35448';
      c.lineWidth = 4;
      c.strokeRect(306, 325, 167, 33);
      c.fillStyle = '#a35448';
      c.font = 'bold 16px Georgia, serif';
      c.fillText(kind === 'revision_stamp' ? 'LATER COPY' : 'LATE FILING', 315, 349, 151);
    }
  } else if (kind === 'ledger') {
    c.strokeStyle = '#776b59';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(254, 154); c.lineTo(254, 329); c.stroke();
    c.font = 'bold 20px Georgia, serif';
    c.fillStyle = '#293e44';
    c.fillText('ISLAND LOOP', 38, 181, 205);
    c.fillText('MAINLAND', 278, 181, 198);
    c.font = '18px Georgia, serif';
    for (const [row, time] of ['18:14', '18:27', '18:43', '19:02'].entries()) {
      const y = 218 + row * 31;
      c.strokeStyle = '#b4a992';
      c.beginPath(); c.moveTo(35, y + 5); c.lineTo(474, y + 5); c.stroke();
      c.fillStyle = '#343c39';
      c.fillText(`${time}   LOCAL MIC`, 38, y, 205);
      c.fillStyle = '#8b4a40';
      c.fillText('E.W.', 192, y, 51);
    }
  } else if (kind === 'distress') {
    c.fillStyle = '#973f37';
    c.font = 'bold 26px Georgia, serif';
    c.fillText('UNSENT', 330, 167, 151);
    c.fillStyle = '#343c39';
    c.font = '22px Georgia, serif';
    for (const [row, line] of [
      'TECHNICIAN LOCKED BEHIND GATE',
      'PUMP FAILED / REQUEST LAUNCH',
      'TO SHORE CONTROL:  __________',
    ].entries()) c.fillText(line, 38, 213 + row * 46, 440);
    c.strokeStyle = '#867966';
    c.beginPath(); c.moveTo(38, 349); c.lineTo(278, 349); c.stroke();
  } else if (kind === 'service') {
    c.font = 'bold 22px Georgia, serif';
    c.fillStyle = '#343c39';
    c.fillText('21:10  MAIN REAR FEED UNSTABLE', 38, 177, 436);
    c.fillText('MANUAL STANDBY AUTHORIZED', 38, 222, 436);
    c.fillText('E. WARD', 38, 266, 430);
    c.strokeStyle = '#786a59';
    c.beginPath(); c.moveTo(37, 304); c.lineTo(468, 304); c.stroke();
    c.fillStyle = '#965149';
    c.font = 'bold 20px Georgia, serif';
    c.fillText('HARBOR WARNING:  __________', 38, 340, 430);
  } else if (kind === 'bypass') {
    c.strokeStyle = '#b5cbc9';
    c.lineWidth = 7;
    c.beginPath(); c.moveTo(122, 220); c.lineTo(370, 220); c.stroke();
    for (const x of [122, 370]) {
      c.beginPath(); c.arc(x, 220, 21, 0, Math.PI * 2); c.stroke();
    }
    c.beginPath(); c.moveTo(258, 218); c.lineTo(258, 172); c.stroke();
    c.fillStyle = '#e0e6d8';
    c.font = 'bold 22px Georgia, serif';
    c.fillText('PUMP', 75, 275, 112);
    c.fillText('GATE', 328, 275, 112);
    c.fillText('FALSE LAMP', 197, 168, 192);
    c.font = 'bold 18px Georgia, serif';
    c.fillText('PUMP FIRST  /  HOLD LAUNCH  /  GATE SECOND', 37, 331, 442);
  } else if (kind === 'relay') {
    c.fillStyle = '#363c38';
    c.font = 'bold 24px Georgia, serif';
    c.fillText('21:14  /  TWO REAR CIRCUITS', 38, 174, 439);
    c.font = 'bold 21px Georgia, serif';
    for (const [row, line] of ['MAIN REAR  •  ACTIVE', 'STANDBY REAR  •  ACTIVE'].entries()) {
      const y = 226 + row * 57;
      c.fillText(line, 43, y, 370);
      c.strokeStyle = '#974d43';
      c.lineWidth = 6;
      c.beginPath(); c.arc(445, y - 7, 12, 0, Math.PI * 2); c.stroke();
    }
    c.fillStyle = '#6a6253';
    c.font = '18px Georgia, serif';
    c.fillText('MECHANICAL PUNCH  /  ORIGINAL', 38, 347, 435);
  } else if (kind === 'report') {
    c.fillStyle = '#354b50';
    c.font = 'bold 24px Georgia, serif';
    c.fillText('CORRECTED FINDING', 38, 170, 433);
    c.font = '19px Georgia, serif';
    for (const [row, line] of [
      'SOURCE RECORDS', 'INDEPENDENT BEARINGS',
      'FINDING AND LIMITS', 'SIGNATURE  __________________',
    ].entries()) {
      const y = 211 + row * 39;
      c.fillText(line, 42, y, 420);
      c.strokeStyle = '#b2a995';
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(40, y + 6); c.lineTo(470, y + 6); c.stroke();
    }
  } else if (kind === 'chart') {
    c.strokeStyle = '#798d88';
    c.lineWidth = 5;
    c.beginPath(); c.moveTo(104, 293); c.lineTo(253, 160); c.lineTo(403, 285); c.stroke();
    c.strokeStyle = '#a37063';
    c.beginPath(); c.moveTo(104, 293); c.lineTo(331, 168); c.stroke();
    for (const [x, y] of [[104, 293], [253, 160], [331, 168]]) {
      c.fillStyle = '#d0b07a';
      c.beginPath(); c.arc(x, y, 10, 0, Math.PI * 2); c.fill();
    }
  } else if (kind === 'chalk') {
    c.strokeStyle = '#e0d8bd';
    c.lineWidth = 12;
    c.beginPath(); c.moveTo(95, 245); c.lineTo(382, 245); c.lineTo(325, 198);
    c.moveTo(382, 245); c.lineTo(325, 290); c.stroke();
    c.font = '24px Georgia, serif';
    c.fillText('TWO LAMPS ON BACKUP', 38, 336, 440);
  } else {
    c.strokeStyle = dark ? '#829190' : '#99917d';
    c.lineWidth = 2;
    for (let row = 0; row < 6; row++) {
      const y = 155 + row * 31;
      c.beginPath(); c.moveTo(35, y); c.lineTo(450 - (row * 37 + seed) % 95, y); c.stroke();
    }
    if (kind === 'machine') {
      c.fillStyle = '#b77563';
      c.fillRect(39, 294, 180, 22);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function surfaceTexture(kind) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d');
  if (!c) return null;
  c.fillStyle = kind === 'wood' ? '#d2d0ca' : '#bfc5c3';
  c.fillRect(0, 0, 256, 256);
  let seed = kind === 'wood' ? 0x42b19 : 0x7af40;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  if (kind === 'wood') {
    for (let i = 0; i < 180; i++) {
      const x = random() * 256;
      c.strokeStyle = random() < 0.5 ? 'rgba(38,30,24,0.11)' : 'rgba(255,255,245,0.12)';
      c.lineWidth = 0.5 + random() * 2.5;
      c.beginPath();
      c.moveTo(x, -5);
      c.bezierCurveTo(x + random() * 8 - 4, 65, x + random() * 8 - 4, 180, x + random() * 7 - 3, 261);
      c.stroke();
    }
  } else {
    for (let i = 0; i < 2400; i++) {
      const x = random() * 256;
      const y = random() * 256;
      c.fillStyle = random() < 0.55 ? 'rgba(20,27,29,0.065)' : 'rgba(255,255,255,0.09)';
      c.fillRect(x, y, random() * 4 + 1, random() * 4 + 1);
    }
    for (let i = 0; i < 22; i++) {
      c.strokeStyle = 'rgba(65,57,45,0.07)';
      c.lineWidth = random() * 2 + 0.5;
      c.beginPath();
      c.moveTo(random() * 256, random() * 256);
      c.lineTo(random() * 256, random() * 256);
      c.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

/**
 * Build physical objects for story evidence without external art assets.
 *
 * @param {THREE.Scene} scene
 * @param {Array} sites SITES from story.js
 * @param {Array} clues CLUES from story.js
 * @param {(x:number,z:number)=>number} terrainHeight world terrain sampler
 * @returns {{group:THREE.Group,entries:Map<string,THREE.Group>,update:(state:object)=>void,dispose:()=>void}}
 */
export function createEvidenceProps(scene, sites, clues, terrainHeight) {
  const siteById = new Map(sites.map((site) => [site.id, site]));
  const root = new THREE.Group();
  root.name = 'Physical case evidence';
  scene.add(root);
  const entries = new Map();
  const props = [];
  const resources = { geometry: new Set(), material: new Set(), texture: new Set() };
  const geometry = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
    plane: new THREE.PlaneGeometry(1, 1),
    sphere: new THREE.SphereGeometry(1, 10, 8),
    ring: new THREE.TorusGeometry(1, 0.13, 5, 14),
  };
  Object.values(geometry).forEach((item) => resources.geometry.add(item));
  const woodGrain = surfaceTexture('wood');
  const corrodedMetal = surfaceTexture('metal');
  if (woodGrain) resources.texture.add(woodGrain);
  if (corrodedMetal) resources.texture.add(corrodedMetal);
  const mat = (color, roughness = 0.88, metalness = 0, map = null) => {
    const item = new THREE.MeshStandardMaterial({ color, roughness, metalness, map });
    resources.material.add(item);
    return item;
  };
  const palette = {
    timber: mat(0x75624f, 0.89, 0, woodGrain),
    darkTimber: mat(0x514a3d, 0.91, 0, woodGrain),
    agedSteel: mat(0x647171, 0.65, 0.58, corrodedMetal),
    blackSteel: mat(0x364143, 0.59, 0.53, corrodedMetal),
    brass: mat(0xa18b5f, 0.48, 0.73),
    paper: mat(0xd9d0b8),
    fadedPaper: mat(0xbbb19b),
    leather: mat(0x534841),
    glass: mat(0x829996, 0.18, 0.12),
    ink: mat(0x353b3a),
    chalk: mat(0xd9d5bd),
    red: mat(0x945646, 0.78, 0.12),
    sea: mat(0x5a7779, 0.72, 0.17),
  };

  function mesh(parent, shape, material, x, y, z, sx = 1, sy = 1, sz = 1) {
    const item = new THREE.Mesh(geometry[shape], material);
    item.position.set(x, y, z);
    item.scale.set(sx, sy, sz);
    item.castShadow = shape !== 'plane' && shape !== 'ring';
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }
  function rod(parent, material, from, to, radius = 0.04) {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const direction = b.clone().sub(a);
    const item = mesh(parent, 'cylinder', material,
      (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2,
      radius, direction.length(), radius);
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return item;
  }
  function label(parent, title, kind, x, y, z, width, height, horizontal = false) {
    const texture = labelTexture(title, kind);
    if (texture) resources.texture.add(texture);
    const material = new THREE.MeshStandardMaterial({
      color: texture ? 0xffffff : 0xd9d0b8,
      map: texture,
      roughness: kind === 'machine' ? 0.65 : 0.95,
      side: THREE.DoubleSide,
    });
    resources.material.add(material);
    const item = mesh(parent, 'plane', material, x, y, z, width, height, 1);
    if (horizontal) item.rotation.x = -Math.PI / 2;
    item.castShadow = false;
    return item;
  }
  function documentStand(group, clue, style = 'sheet') {
    mesh(group, 'box', palette.timber, 0, 0.39, 0, 0.98, 0.75, 0.69);
    mesh(group, 'box', palette.darkTimber, 0, 0.78, 0, 1.04, 0.08, 0.75);
    if (style === 'book' || style === 'folder') {
      mesh(group, 'box', style === 'book' ? palette.leather : palette.red,
        0, 0.85, 0, 0.8, 0.065, 0.55);
      mesh(group, 'box', palette.fadedPaper, 0, 0.89, 0, 0.73, 0.018, 0.5);
      label(group, clue.name, 'paper', 0, 0.903, 0, 0.70, 0.48, true);
      if (style === 'book') rod(group, palette.brass, [-0.39, 0.91, -0.25], [-0.39, 0.91, 0.25], 0.012);
    } else {
      mesh(group, 'box', palette.fadedPaper, 0, 0.84, 0, 0.77, 0.028, 0.54);
      label(group, clue.name, 'paper', 0, 0.858, 0, 0.75, 0.52, true);
      mesh(group, 'box', palette.brass, 0, 0.88, -0.25, 0.16, 0.027, 0.08);
    }
  }
  function recordFile(group, clue, kind) {
    // Separate source types are legible before opening the case panel. A flat
    // binder and paper keep these records clear of the archive's low ceiling.
    mesh(group, 'box', palette.darkTimber, 0, 0.39, 0, 0.94, 0.75, 0.68);
    mesh(group, 'box', palette.timber, 0, 0.78, 0, 0.99, 0.05, 0.73);
    const binding = kind === 'typed_log' ? palette.blackSteel
      : kind === 'captain_testimony' ? palette.sea
        : kind === 'draft_memo' ? palette.leather : palette.red;
    mesh(group, 'box', binding, 0, 0.825, 0, 0.81, 0.044, 0.59);
    mesh(group, 'box', palette.fadedPaper, 0.025, 0.856, 0, 0.71, 0.014, 0.53);
    label(group, clue.name, kind, 0.025, 0.869, 0, 0.69, 0.51, true);
    if (kind === 'typed_log') {
      // An empty channel next to the typed copy hints at the missing original.
      mesh(group, 'box', palette.blackSteel, -0.43, 0.86, 0, 0.035, 0.03, 0.51);
      mesh(group, 'box', palette.red, 0.29, 0.879, 0.21, 0.13, 0.012, 0.07);
    } else if (kind === 'captain_testimony') {
      mesh(group, 'box', palette.red, 0.33, 0.88, 0, 0.025, 0.006, 0.45);
      mesh(group, 'box', palette.brass, -0.35, 0.88, -0.23, 0.11, 0.026, 0.055);
    } else if (kind === 'draft_memo') {
      mesh(group, 'box', palette.red, -0.38, 0.875, 0, 0.05, 0.012, 0.52);
      mesh(group, 'box', palette.brass, 0, 0.881, -0.255, 0.16, 0.026, 0.07);
    } else if (kind === 'revision_stamp') {
      mesh(group, 'box', palette.red, 0.26, 0.889, 0.17, 0.30, 0.014, 0.14);
      mesh(group, 'box', palette.brass, -0.35, 0.881, -0.23, 0.14, 0.025, 0.055);
    } else {
      // The late statement is filed separately with its own blue case tab.
      mesh(group, 'box', palette.sea, -0.38, 0.877, 0.16, 0.09, 0.02, 0.17);
      mesh(group, 'box', palette.brass, 0, 0.881, -0.255, 0.16, 0.026, 0.07);
    }
  }
  function intakeLedger(group, clue) {
    // Fits beneath the gatehouse canopy already built at this exact anchor.
    mesh(group, 'box', palette.darkTimber, 0, 0.40, 0, 1.10, 0.77, 0.75);
    mesh(group, 'box', palette.leather, 0, 0.84, 0, 0.89, 0.10, 0.57);
    mesh(group, 'box', palette.fadedPaper, 0.015, 0.905, 0, 0.79, 0.016, 0.51);
    label(group, clue.name, 'intake_ledger', 0.015, 0.918, 0, 0.77, 0.49, true);
    rod(group, palette.brass, [-0.44, 0.93, -0.27], [-0.44, 0.93, 0.27], 0.014);
    mesh(group, 'box', palette.red, 0.37, 0.89, 0.23, 0.13, 0.014, 0.09);
  }
  function galeReel(group, clue) {
    rod(group, palette.agedSteel, [0, 0.04, 0], [0, 1.72, 0], 0.055);
    mesh(group, 'box', palette.blackSteel, 0, 1.42, 0.04, 0.88, 0.85, 0.22);
    mesh(group, 'box', palette.agedSteel, 0, 1.88, 0.09, 1.04, 0.08, 0.49);
    mesh(group, 'box', palette.fadedPaper, 0, 1.39, 0.166, 0.77, 0.71, 0.012);
    label(group, clue.name, 'gale_reel', 0, 1.39, 0.179, 0.74, 0.68);
    for (const x of [-0.37, 0.37]) {
      mesh(group, 'cylinder', palette.brass, x, 1.41, 0.18, 0.037, 0.04, 0.037)
        .rotation.x = Math.PI / 2;
    }
  }
  function failoverTag(group, clue) {
    mesh(group, 'box', palette.blackSteel, 0, 1.10, 0, 0.94, 1.22, 0.15);
    mesh(group, 'box', palette.agedSteel, 0, 1.10, 0.085, 0.85, 0.94, 0.02);
    mesh(group, 'box', palette.red, 0, 0.97, 0.113, 0.78, 0.67, 0.018);
    label(group, clue.name, 'failover_tag', 0, 0.97, 0.124, 0.65, 0.49);
    rod(group, palette.brass, [0, 1.70, 0.12], [0, 1.36, 0.13], 0.012);
    mesh(group, 'ring', palette.brass, 0, 1.33, 0.14, 0.04, 0.04, 0.04);
  }
  function trainingCard(group, clue) {
    mesh(group, 'box', palette.blackSteel, 0, 0.42, 0, 0.82, 0.81, 0.62);
    mesh(group, 'box', palette.timber, 0, 0.85, 0, 0.86, 0.07, 0.66);
    mesh(group, 'box', palette.fadedPaper, 0, 0.90, 0, 0.75, 0.023, 0.55);
    label(group, clue.name, 'training_card', 0, 0.919, 0, 0.73, 0.53, true);
    mesh(group, 'box', palette.red, -0.32, 0.913, 0.23, 0.12, 0.018, 0.09);
  }
  function soundingBoard(group, clue) {
    for (const x of [-0.31, 0.31]) rod(group, palette.agedSteel,
      [x, 0.03, 0], [x, 1.45, 0], 0.035);
    mesh(group, 'box', palette.blackSteel, 0, 1.13, 0, 0.86, 0.68, 0.075);
    label(group, clue.name, 'sounding_board', 0, 1.13, 0.049, 0.79, 0.61);
    for (const y of [0.28, 0.48]) {
      mesh(group, 'box', palette.paper, -0.40, y, 0.055, 0.08, 0.04, 0.04);
    }
  }
  function waterlineStain(group, clue) {
    // This is a tide-stained conduit face, not a mechanical gauge. The fresh
    // line sits above the older high-water mark beside the flooded tunnel.
    // The approach can come from the pump path or the hatch: mark both faces
    // instead of presenting a blank black rear panel to either player route.
    mesh(group, 'box', palette.agedSteel, 0, 0.90, 0, 1.20, 1.75, 0.15);
    mesh(group, 'box', palette.blackSteel, 0, 0.93, 0.087, 1.08, 1.57, 0.012);
    mesh(group, 'box', palette.blackSteel, 0, 0.93, -0.087, 1.08, 1.57, 0.012);
    for (const side of [-1, 1]) {
      mesh(group, 'box', palette.sea, 0, 1.35, side * 0.100, 1.07, 0.16, 0.014);
      mesh(group, 'box', palette.red, 0, 0.82, side * 0.102, 1.08, 0.045, 0.014);
    }
    const face = label(group, clue.name, 'waterline_stain', 0, 0.39, 0.108, 0.80, 0.58);
    face.name = 'Tunnel water mark toward jetty';
    const back = new THREE.Mesh(geometry.plane, face.material);
    back.name = 'Tunnel water mark toward pump';
    back.position.set(0, 0.39, -0.108);
    back.rotation.y = Math.PI;
    back.castShadow = false;
    back.receiveShadow = true;
    group.add(back);
  }
  function loopLedger(group, clue) {
    mesh(group, 'box', palette.darkTimber, 0, 0.35, 0, 0.90, 0.70, 0.66);
    mesh(group, 'box', palette.leather, 0, 0.75, 0, 0.87, 0.095, 0.61);
    mesh(group, 'box', palette.fadedPaper, 0, 0.811, 0, 0.80, 0.025, 0.55);
    mesh(group, 'box', palette.red, -0.38, 0.827, 0, 0.045, 0.01, 0.53);
    label(group, clue.name, 'ledger', 0.025, 0.831, 0, 0.74, 0.52, true);
    rod(group, palette.brass, [-0.47, 0.85, -0.28], [-0.47, 0.85, 0.28], 0.012);
  }
  function distressForm(group, clue) {
    // The draft remains in the radio console under a thin glass cover.
    mesh(group, 'box', palette.blackSteel, 0, 0.37, 0, 0.93, 0.74, 0.67);
    mesh(group, 'box', palette.agedSteel, 0, 0.77, 0, 0.88, 0.07, 0.61);
    mesh(group, 'box', palette.fadedPaper, 0, 0.823, 0, 0.73, 0.016, 0.49);
    label(group, clue.name, 'distress', 0, 0.838, 0, 0.70, 0.46, true);
    const coverMaterial = new THREE.MeshBasicMaterial({
      color: 0xb8d0cc, transparent: true, opacity: 0.12, depthWrite: false,
      side: THREE.DoubleSide,
    });
    resources.material.add(coverMaterial);
    mesh(group, 'plane', coverMaterial, 0, 0.872, 0, 0.77, 0.52, 1).rotation.x = -Math.PI / 2;
    for (const x of [-0.405, 0.405]) {
      mesh(group, 'box', palette.brass, x, 0.86, 0, 0.026, 0.03, 0.55);
    }
  }
  function serviceOrder(group, clue) {
    mesh(group, 'box', palette.blackSteel, 0, 0.09, 0, 0.58, 0.11, 0.41);
    rod(group, palette.agedSteel, [0, 0.13, 0], [0, 1.23, 0], 0.055);
    mesh(group, 'box', palette.agedSteel, 0, 1.29, 0, 0.91, 1.03, 0.08);
    mesh(group, 'box', palette.fadedPaper, 0, 1.29, 0.047, 0.78, 0.91, 0.012);
    label(group, clue.name, 'service', 0, 1.29, 0.056, 0.75, 0.88);
    mesh(group, 'box', palette.brass, 0, 1.79, 0.075, 0.21, 0.055, 0.07);
  }
  function bypassSketch(group, clue) {
    // The note faces into the room from its place near the pump-house wall.
    const board = new THREE.Group();
    board.rotation.y = Math.PI / 2;
    group.add(board);
    rod(board, palette.agedSteel, [-0.38, 0.05, 0], [-0.38, 1.20, 0], 0.035);
    rod(board, palette.agedSteel, [0.38, 0.05, 0], [0.38, 1.20, 0], 0.035);
    mesh(board, 'box', palette.darkTimber, 0, 1.40, 0, 1.08, 0.85, 0.08);
    mesh(board, 'box', palette.fadedPaper, 0, 1.40, 0.047, 0.99, 0.76, 0.012);
    label(board, clue.name, 'bypass', 0, 1.40, 0.056, 0.96, 0.73);
    for (const x of [-0.42, 0.42]) {
      mesh(board, 'cylinder', palette.brass, x, 1.77, 0.067, 0.027, 0.019, 0.027)
        .rotation.x = Math.PI / 2;
    }
  }
  function correctionTerminal(group, clue) {
    mesh(group, 'box', palette.agedSteel, 0, 0.39, 0, 1.02, 0.78, 0.80);
    mesh(group, 'box', palette.blackSteel, 0, 1.17, -0.18, 0.91, 0.75, 0.20);
    mesh(group, 'box', palette.fadedPaper, 0, 1.18, -0.069, 0.76, 0.58, 0.015);
    label(group, clue.name, 'report', 0, 1.18, -0.059, 0.73, 0.55);
    mesh(group, 'box', palette.blackSteel, 0, 0.81, 0.21, 0.79, 0.055, 0.35);
    for (const z of [0.12, 0.22, 0.32]) {
      mesh(group, 'box', palette.brass, 0, 0.852, z, 0.68, 0.013, 0.025);
    }
    mesh(group, 'box', palette.red, 0.38, 0.85, 0.34, 0.07, 0.024, 0.06);
  }
  function archiveDeskFolder(group) {
    // The archive GLB already has a central table at glTF local (0, +1) and a
    // paper surface at y=1.15. Keep this clue flat on that table: a second
    // free-standing board would intersect the furniture and block the view.
    const x = 0.22;
    const z = 0.18;
    mesh(group, 'box', palette.leather, x, 1.105, z, 0.76, 0.026, 0.49);
    mesh(group, 'box', palette.fadedPaper, x + 0.015, 1.123, z + 0.012, 0.70, 0.012, 0.44);
    label(group, 'CASE RECONSTRUCTION', 'paper', x + 0.015, 1.133, z + 0.012, 0.67, 0.42, true);
    mesh(group, 'box', palette.brass, x, 1.147, z - 0.19, 0.17, 0.025, 0.052);
    mesh(group, 'box', palette.red, x + 0.20, 1.143, z + 0.15, 0.11, 0.008, 0.10);
  }
  function signedSummary(group, clue) {
    // The signed conclusion and later comparison occupy opposite halves of
    // the actual central archive table. The working carbon sits farther back
    // on the left; this smaller sheet stays clear of it and the inkstand.
    mesh(group, 'box', palette.leather, 0, 1.105, 0, 0.63, 0.025, 0.32);
    mesh(group, 'box', palette.fadedPaper, 0, 1.123, 0, 0.57, 0.012, 0.28);
    label(group, clue.name, 'signed_summary', 0, 1.135, 0, 0.54, 0.26, true);
    mesh(group, 'box', palette.brass, 0, 1.151, -0.13, 0.13, 0.022, 0.05);
  }
  function standingBoard(group, clue, field = false) {
    const y = field ? 1.38 : 1.53;
    const w = field ? 0.95 : 1.22;
    const h = field ? 0.75 : 0.91;
    if (field) {
      rod(group, palette.timber, [-0.28, 0.04, 0], [-0.28, 1.05, 0], 0.06);
      rod(group, palette.timber, [0.28, 0.04, 0], [0.28, 1.05, 0], 0.06);
    } else {
      rod(group, palette.blackSteel, [-0.37, 0.02, 0], [-0.37, 1.10, 0], 0.035);
      rod(group, palette.blackSteel, [0.37, 0.02, 0], [0.37, 1.10, 0], 0.035);
    }
    mesh(group, 'box', field ? palette.timber : palette.blackSteel, 0, y, 0, w + 0.09, h + 0.1, 0.09);
    label(group, clue.name, /chart|alignment|reconstruction|training/i.test(clue.id) ? 'chart' : 'paper',
      0, y, 0.052, w, h);
  }
  function controlCabinet(group, clue) {
    mesh(group, 'box', palette.agedSteel, 0, 0.70, 0, 0.91, 1.35, 0.5);
    mesh(group, 'box', palette.blackSteel, 0, 1.03, 0.27, 0.78, 0.58, 0.035);
    label(group, clue.name, 'machine', 0, 1.24, 0.295, 0.75, 0.14);
    for (const x of [-0.22, 0, 0.22]) {
      const dial = mesh(group, 'cylinder', palette.brass, x, 1.07, 0.312, 0.088, 0.03, 0.088);
      dial.rotation.x = Math.PI / 2;
      const face = mesh(group, 'cylinder', palette.ink, x, 1.07, 0.336, 0.056, 0.012, 0.056);
      face.rotation.x = Math.PI / 2;
    }
    const lever = new THREE.Group();
    lever.position.set(-0.21, 0.79, 0.31);
    rod(lever, palette.brass, [0, 0, 0], [0, 0.25, 0.08], 0.028);
    mesh(lever, 'sphere', palette.red, 0, 0.25, 0.08, 0.066, 0.066, 0.066);
    group.add(lever);
    return lever;
  }
  function radioSet(group, clue, patch = false) {
    mesh(group, 'box', palette.timber, 0, 0.42, 0, 1.04, 0.8, 0.72);
    mesh(group, 'box', palette.blackSteel, 0, 0.94, 0, 0.85, 0.25, 0.53);
    mesh(group, 'box', palette.agedSteel, 0, 1.07, 0.13, 0.56, 0.18, 0.25);
    for (const x of [-0.24, -0.12, 0, 0.12, 0.24]) {
      rod(group, palette.ink, [x, 1.17, 0.04], [x, 1.17, 0.23], 0.012);
    }
    for (const x of [-0.26, 0.26]) {
      const dial = mesh(group, 'cylinder', palette.brass, x, 0.93, 0.285, 0.08, 0.045, 0.08);
      dial.rotation.x = Math.PI / 2;
    }
    rod(group, palette.agedSteel, [0.33, 1.07, -0.12], [0.45, 1.74, -0.17], 0.012);
    label(group, patch ? 'ISLAND LOOP' : clue.name, 'machine', 0, 0.47, 0.368, 0.74, 0.22);
    if (patch) {
      rod(group, palette.blackSteel, [0.35, 0.90, 0.33], [0.66, 0.78, 0.39], 0.018);
      mesh(group, 'cylinder', palette.brass, 0.68, 0.77, 0.40, 0.04, 0.11, 0.04).rotation.x = Math.PI / 2;
    }
  }
  function surveyHead(group, clue) {
    // The current island already has a survey post here. The instrument sits
    // on top of it rather than placing another post across the narrow trail.
    mesh(group, 'box', palette.brass, 0, 1.60, 0, 0.47, 0.14, 0.33);
    rod(group, palette.brass, [0, 1.63, 0], [0, 1.83, 0], 0.035);
    const left = clue.id === 'headland_view';
    const direction = new THREE.Vector3(left ? 0.46 : -0.81, 0.015, left ? -0.89 : -0.59).normalize();
    const center = new THREE.Vector3(0, 1.87, 0);
    const a = center.clone().addScaledVector(direction, -0.40);
    const b = center.clone().addScaledVector(direction, 0.40);
    rod(group, palette.blackSteel, a.toArray(), b.toArray(), 0.073);
    mesh(group, 'ring', palette.brass, b.x, b.y, b.z, 0.075, 0.075, 0.075)
      .quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
  }
  function hatch(group) {
    mesh(group, 'box', palette.blackSteel, 0, 0.035, 0, 2.12, 0.11, 1.62);
    mesh(group, 'box', palette.agedSteel, 0, 0.105, 0, 1.77, 0.07, 1.24);
    const lid = new THREE.Group();
    lid.position.set(-0.83, 0.16, 0);
    mesh(lid, 'box', palette.blackSteel, 0.83, 0.02, 0, 1.65, 0.08, 1.16);
    for (const z of [-0.45, -0.2, 0.05, 0.3]) {
      mesh(lid, 'box', palette.agedSteel, 0.83, 0.08, z, 1.47, 0.025, 0.045);
    }
    mesh(lid, 'ring', palette.brass, 1.37, 0.09, 0.31, 0.11, 0.11, 0.11).rotation.x = Math.PI / 2;
    group.add(lid);
    for (const x of [-0.88, 0.88]) {
      rod(group, palette.agedSteel, [x, 0.08, -0.66], [x, 1.16, -0.66], 0.038);
    }
    rod(group, palette.agedSteel, [-0.88, 1.16, -0.66], [0.88, 1.16, -0.66], 0.038);
    return lid;
  }
  function sealedCase(group) {
    // Iris sets her weatherproof case beside the open hatch while she decides
    // custody. It is a physical object, not a selectable ownership menu.
    mesh(group, 'box', palette.blackSteel, 0, 0.23, 0, 0.92, 0.42, 0.62);
    mesh(group, 'box', palette.agedSteel, 0, 0.46, 0, 0.96, 0.07, 0.66);
    for (const x of [-0.30, 0.30]) {
      mesh(group, 'box', palette.brass, x, 0.42, 0.32, 0.10, 0.11, 0.035);
    }
    mesh(group, 'box', palette.timber, 0, 0.52, -0.05, 0.28, 0.08, 0.09);
    label(group, 'SEALED ORIGINALS', 'machine', 0, 0.501, 0.04, 0.61, 0.33, true);
  }
  function benchmark(group) {
    mesh(group, 'cylinder', palette.darkTimber, 0, 0.18, 0, 0.34, 0.36, 0.34);
    mesh(group, 'cylinder', palette.brass, 0, 0.37, 0, 0.23, 0.018, 0.23);
    rod(group, palette.ink, [-0.15, 0.385, 0], [0.15, 0.385, 0], 0.008);
    rod(group, palette.ink, [0, 0.385, -0.15], [0, 0.385, 0.15], 0.008);
  }
  function relayStrip(group, clue) {
    mesh(group, 'box', palette.timber, 0, 0.39, 0, 0.98, 0.75, 0.69);
    mesh(group, 'box', palette.agedSteel, 0, 0.81, 0, 0.83, 0.07, 0.54);
    mesh(group, 'box', palette.paper, 0, 0.86, 0, 0.71, 0.018, 0.41);
    label(group, clue.name, 'relay', 0, 0.873, 0, 0.68, 0.38, true);
    for (const x of [-0.38, 0.38]) {
      mesh(group, 'cylinder', palette.brass, x, 0.87, 0, 0.027, 0.44, 0.027)
        .rotation.x = Math.PI / 2;
    }
  }
  function photograph(group) {
    mesh(group, 'box', palette.timber, 0, 0.39, 0, 0.98, 0.75, 0.69);
    mesh(group, 'box', palette.leather, 0, 0.83, 0, 0.67, 0.04, 0.49);
    mesh(group, 'box', palette.fadedPaper, 0, 0.855, 0, 0.59, 0.012, 0.41);
    for (const x of [-0.19, -0.07, 0.06, 0.18]) {
      mesh(group, 'sphere', palette.ink, x, 0.872, -0.08, 0.045, 0.005, 0.055);
      mesh(group, 'box', palette.ink, x, 0.873, 0.035, 0.072, 0.004, 0.16);
    }
    rod(group, palette.red, [-0.21, 0.879, -0.16], [-0.12, 0.879, 0.15], 0.008);
  }
  function lamp(group) {
    mesh(group, 'box', palette.timber, 0, 0.39, 0, 0.86, 0.75, 0.62);
    mesh(group, 'cylinder', palette.brass, 0, 0.82, 0, 0.14, 0.06, 0.14);
    rod(group, palette.brass, [0, 0.84, 0], [0, 1.30, 0], 0.018);
    const bulb = mesh(group, 'sphere', palette.glass, 0, 1.30, 0, 0.19, 0.25, 0.19);
    bulb.material = new THREE.MeshStandardMaterial({
      color: 0xffe5b2, emissive: 0xe1a957, emissiveIntensity: 0.7, roughness: 0.25,
      transparent: true, opacity: 0.83,
    });
    resources.material.add(bulb.material);
    mesh(group, 'cylinder', palette.blackSteel, 0, 1.56, 0, 0.22, 0.04, 0.22);
  }
  function chalk(group) {
    mesh(group, 'box', palette.agedSteel, 0, 0.78, 0, 1.04, 1.48, 0.15);
    label(group, 'PUMP THIS WAY', 'chalk', 0, 0.89, 0.082, 0.92, 0.77);
    rod(group, palette.agedSteel, [-0.51, 0.02, 0], [-0.51, 1.47, 0], 0.04);
  }
  function recorder(group, clue) {
    mesh(group, 'box', palette.timber, 0, 0.39, 0, 0.98, 0.75, 0.69);
    mesh(group, 'box', palette.blackSteel, 0, 0.84, 0, 0.68, 0.19, 0.47);
    for (const x of [-0.18, 0.18]) {
      const spool = mesh(group, 'cylinder', palette.brass, x, 0.97, 0, 0.11, 0.025, 0.11);
      mesh(group, 'sphere', palette.ink, x, 0.988, 0, 0.025, 0.008, 0.025);
    }
    label(group, clue.name, 'machine', 0, 0.75, 0.24, 0.57, 0.17);
  }

  for (const clue of clues) {
    if (clue.id === 'iris_rescued' && entries.has('tunnel_signal')) {
      entries.set(clue.id, entries.get('tunnel_signal'));
      continue;
    }
    const site = clue.room ? siteById.get(clue.room) : null;
    if (clue.room && !site) continue;
    const x = site ? site.x + clue.x : clue.world?.[0];
    const z = site ? site.z + clue.z : clue.world?.[1];
    if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
    const y = site ? terrainHeight(site.x, site.z) : terrainHeight(x, z);
    const kind = evidenceKind(clue);
    const group = new THREE.Group();
    group.name = `Evidence: ${clue.name}`;
    group.position.set(x, y + (kind === 'survey' ? 0 : 0.07), z);
    root.add(group);
    entries.set(clue.id, group);
    const prop = { clue, group, x, z, lid: null, lever: null };
    props.push(prop);
    group.userData.evidenceKind = kind;
    const visual = new THREE.Group();
    visual.name = `${clue.name} model`;
    const inset = VISUAL_INSETS[clue.id];
    if (inset) visual.position.set(inset[0], 0, inset[1]);
    if (kind === 'failover_tag') visual.rotation.y = Math.PI / 2;
    group.add(visual);
    switch (kind) {
      case 'desk_folder': archiveDeskFolder(visual); break;
      case 'signed_summary': signedSummary(visual, clue); break;
      case 'hatch': prop.lid = hatch(visual); break;
      case 'sealed_case': sealedCase(visual); break;
      case 'lamp': lamp(visual); break;
      case 'photograph': photograph(visual); break;
      case 'survey': surveyHead(visual, clue); break;
      case 'typed_log':
      case 'captain_testimony':
      case 'draft_memo':
      case 'revision_stamp':
      case 'witness_addendum': recordFile(visual, clue, kind); break;
      case 'intake_ledger': intakeLedger(visual, clue); break;
      case 'gale_reel': galeReel(visual, clue); break;
      case 'failover_tag': failoverTag(visual, clue); break;
      case 'training_card': trainingCard(visual, clue); break;
      case 'sounding_board': soundingBoard(visual, clue); break;
      case 'waterline_stain': waterlineStain(visual, clue); break;
      case 'benchmark': benchmark(visual); break;
      case 'chalk': chalk(visual); break;
      case 'relay_strip': relayStrip(visual, clue); break;
      case 'loop_ledger': loopLedger(visual, clue); break;
      case 'distress_form': distressForm(visual, clue); break;
      case 'service_order': serviceOrder(visual, clue); break;
      case 'bypass_sketch': bypassSketch(visual, clue); break;
      case 'correction_terminal': correctionTerminal(visual, clue); break;
      case 'radio': radioSet(visual, clue, clue.id === 'radio_patch'); break;
      case 'switchboard': controlCabinet(visual, clue); break;
      case 'recorder': recorder(visual, clue); break;
      case 'control': prop.lever = controlCabinet(visual, clue); break;
      case 'board': standingBoard(visual, clue, Boolean(clue.world)); break;
      default: documentStand(visual, clue,
        /log|ledger|notebook|statement/i.test(clue.name) ? 'book'
          : /memo|draft|reconstruction/i.test(clue.id) ? 'folder' : 'sheet');
    }
  }

  // Correctness of location and case progression remains owned by the main
  // game. Visibility here is strictly presentational, with a generous range
  // so an object does not pop in beside the player.
  function update({ chapter = 0, inside = null, found = [], cameraPosition = null, activeSurveyStake = null } = {}) {
    const discovered = found instanceof Set ? found : new Set(Array.isArray(found) ? found : []);
    const indoorId = typeof inside === 'string' ? inside : inside?.id ?? null;
    for (const prop of props) {
      const { clue, group, x, z } = prop;
      const inChapter = chapter >= clue.minChapter;
      const inRoom = !indoorId || !clue.room || clue.room === indoorId;
      const maxDistance = clue.room ? 68 : 105;
      const nearEnough = !cameraPosition || ((cameraPosition.x - x) ** 2 + (cameraPosition.z - z) ** 2) < maxDistance ** 2;
      // In survey mode the player's eye is effectively at the eyepiece.
      // Keeping the whole instrument visible would fill the camera frame.
      group.visible = inChapter && inRoom && nearEnough && clue.id !== activeSurveyStake;
      if (prop.lid) prop.lid.rotation.z = discovered.has('iris_rescued') ? 1.1 : 0;
      if (prop.lever) prop.lever.rotation.x = discovered.has(clue.id) ? -0.55 : 0.22;
    }
  }
  update();

  function dispose() {
    scene.remove(root);
    for (const item of resources.geometry) item.dispose();
    for (const item of resources.material) item.dispose();
    for (const item of resources.texture) item.dispose();
  }
  return { group: root, entries, update, dispose };
}
