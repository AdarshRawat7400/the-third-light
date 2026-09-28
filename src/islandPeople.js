import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// The four residents use CC0 MakeHuman-derived character assets when nearby;
// procedural figures remain as loading and error fallbacks. Prison occupants
// and ambient drivers are separate original procedural figures.
// The coordinates are metres in the same world space as SITES in story.js.
export const ISLAND_PEOPLE = Object.freeze([
  {
    id: 'tamsin', name: 'Tamsin Reed', role: 'Boat mechanic',
    arrival: [9, 280], storm: [136, 141],
    look: { coat: 0x705641, trim: 0x9a8367, trousers: 0x363f41, skin: 0xc69c7d, hair: 0x302923, height: 1.62, hat: 'wool', prop: 'tool' },
  },
  {
    id: 'oren', name: 'Oren Pike', role: 'Former harbor watchman',
    arrival: [-83, -300],
    look: { coat: 0x40505a, trim: 0x708087, trousers: 0x303a42, skin: 0xa97d64, hair: 0x888786, height: 1.77, hat: 'peak', prop: 'lantern' },
  },
  {
    id: 'elias', name: 'Elias Ward', role: 'Keeper and radio operator',
    arrival: [159, -43],
    look: { coat: 0x4d5648, trim: 0x87927b, trousers: 0x3b403b, skin: 0xb3886c, hair: 0x94918a, height: 1.73, hat: 'peak', prop: 'none' },
  },
  {
    id: 'iris', name: 'Iris Hale', role: 'Island technician',
    arrival: [176, 157],
    look: { coat: 0x536a70, trim: 0xa6bfc0, trousers: 0x343f43, skin: 0xc3997d, hair: 0x754537, height: 1.66, hat: 'hood', prop: 'case' },
  },
]);

const PERSON_BY_ID = Object.fromEntries(ISLAND_PEOPLE.map((person) => [person.id, person]));
const MAX_TALK_DISTANCE = 3.4;

function foundSet(context) {
  const found = context?.foundIds ?? context?.found;
  return found instanceof Set ? found : new Set(Array.isArray(found) ? found : []);
}

function hasEvidence(context, ...ids) {
  const found = foundSet(context);
  return ids.every((id) => found.has(id));
}

function chapterOf(context) {
  return Math.max(0, Math.min(5, Number(context?.chapter) || 0));
}

function isPresent(person, context) {
  const chapter = chapterOf(context);
  if (person.id === 'oren') return chapter >= 1;
  if (person.id === 'elias') return chapter >= 3 && Boolean(context?.choices?.eliasRoute || context?.eliasRoute);
  if (person.id === 'iris') return hasEvidence(context, 'iris_rescued');
  return true;
}

export function listVisiblePeople(context = {}) {
  return ISLAND_PEOPLE.filter((person) => isPresent(person, context)).map((person) => ({
    id: person.id,
    name: person.name,
    role: person.role,
    world: person.id === 'tamsin' && chapterOf(context) >= 3 ? [...person.storm] : [...person.arrival],
  }));
}

export function nearestIslandPerson(x, z, context = {}, maxDistance = MAX_TALK_DISTANCE) {
  let nearest = null;
  let distance = Number.isFinite(maxDistance) ? maxDistance : MAX_TALK_DISTANCE;
  for (const person of listVisiblePeople(context)) {
    const next = Math.hypot(x - person.world[0], z - person.world[1]);
    if (next <= distance) { nearest = person; distance = next; }
  }
  return nearest ? { ...nearest, distance } : null;
}

export function collidesWithIslandPerson(x, z, radius = 0.35, context = {}) {
  return listVisiblePeople(context).some((person) =>
    Math.hypot(x - person.world[0], z - person.world[1]) < 0.47 + radius);
}

// If a chapter change places a figure around the player's current position,
// moving away remains possible instead of trapping the player in its collider.
export function blocksIslandPersonMove(fromX, fromZ, toX, toZ, context = {}, radius = 0.35) {
  return listVisiblePeople(context).some((person) => {
    const before = Math.hypot(fromX - person.world[0], fromZ - person.world[1]);
    const after = Math.hypot(toX - person.world[0], toZ - person.world[1]);
    return after < 0.47 + radius && after < before - 0.00001;
  });
}

export function createPeopleState(saved) {
  const raw = saved?.seenTopics ?? saved?.seen ?? {};
  const seenTopics = {};
  for (const person of ISLAND_PEOPLE) {
    const topics = Array.isArray(raw?.[person.id]) ? raw[person.id] : [];
    seenTopics[person.id] = [...new Set(topics.filter((topic) =>
      typeof topic === 'string' && topic.length < 48 && TOPICS[person.id].some((entry) => entry.id === topic)))];
  }
  return { seenTopics };
}

export function serializePeopleState(state) {
  return createPeopleState(state);
}

// A source label is part of every reply so a witness's memory never silently
// becomes the same kind of evidence as a physical record.
const TOPICS = {
  tamsin: [
    {
      id: 'arrival', label: 'ASK WHY SHE STAYED', source: 'FIRSTHAND',
      available: () => true,
      line: 'The ferry is waiting out the weather at the south pier. I stayed to service the island skiff. When this weather closes the cove, a boat is no use until the tide turns.',
      journal: 'Tamsin says the ferry is weatherbound at the south pier and the island skiff needs service. This is her account of today, not evidence about the old wreck.',
    },
    {
      id: 'compound', label: 'ASK ABOUT THE OLD COMPOUND', source: 'LOCAL KNOWLEDGE',
      available: (context) => hasEvidence(context, 'official_log'),
      line: 'The detention annex is open through the south gate. The gatehouse kept an intake book from the wreck investigation. If the archive copy troubles you, compare what was written there before the papers got hold of the story.',
      journal: 'Tamsin points to a contemporaneous intake ledger in the old compound; I still need to inspect the physical book.',
    },
    {
      id: 'iris', label: 'ASK ABOUT IRIS', source: 'FIRSTHAND',
      available: (context) => hasEvidence(context, 'iris_note'),
      line: 'I gave Iris two waterproof sleeves last week. She wrote WEST and EAST on them. I watched her pack survey prints, but I never saw what was in the prints.',
      journal: 'Tamsin personally saw Iris preparing two marked survey envelopes; she did not inspect their contents.',
    },
    {
      id: 'approach', label: 'ASK ABOUT THE TWO APPROACHES', source: 'PRACTICAL KNOWLEDGE',
      available: (context) => hasEvidence(context, 'headland_view', 'east_ridge_view'),
      line: 'A pair of lights only tells a pilot where the line is. The chart tells you whether that line has water beneath it. I would hold offshore until someone checks both.',
      journal: 'Tamsin explains why a visually convincing alignment still requires a depth chart before a launch can use it.',
    },
    {
      id: 'pump', label: 'ASK ABOUT THE PUMP', source: 'FIRSTHAND',
      available: (context) => chapterOf(context) >= 4,
      line: 'I checked the exterior feed. The breaker runs to the old lamp circuit as well as the pump. I can keep the generator steady; tell the launch about the extra light before you throw it.',
      journal: 'Tamsin checked the external breaker and warns the pump feed also supplies the standby lamp. The wiring should be verified inside.',
    },
  ],
  oren: [
    {
      id: 'soundings', label: 'ASK ABOUT THE NORTH BERTH', source: 'FIRSTHAND',
      available: () => true,
      line: 'I took the soundings this morning. The north inlet still has deep water beside the jetty; a rock shelf rises to the west. My marks are on the board if you want to check them.',
      journal: 'Oren says he measured the north-inlet depths today. His marked depth board can corroborate the claim.',
    },
    {
      id: 'wreck', label: 'ASK WHAT HE SAW ON THE WRECK NIGHT', source: 'LIMITED MEMORY',
      available: (context) => hasEvidence(context, 'captain_statement'),
      line: 'I was not on this jetty that night. I read the captain’s words after the hearing. I cannot tell you which lamps burned from a story someone else told me.',
      journal: 'Oren did not witness the wreck-night lamps. His recollection of the captain’s account is not independent confirmation.',
    },
    {
      id: 'standby', label: 'ASK WHETHER THE STANDBY COULD HAVE LIT', source: 'TECHNICAL MEMORY',
      available: (context) => hasEvidence(context, 'tower_panel'),
      line: 'In my watch years, the standby had a separate manual switch. That tells you it could be lit, not that anyone used it during the wreck. You need the relay record for that.',
      journal: 'Oren recalls the standby switch but cannot establish its wreck-night status without the mechanical record.',
    },
    {
      id: 'rescue', label: 'ASK ABOUT THE INCOMING LAUNCH', source: 'FIRSTHAND',
      available: (context) => hasEvidence(context, 'launch_guided'),
      line: 'I can see the launch holding to the main rear light now. I will take its line at the jetty. Keep the eastern standby out of its bearing.',
      journal: 'Oren can receive the launch at the north jetty after the safe approach has been relayed.',
    },
  ],
  elias: [
    {
      id: 'identity', label: 'ASK WHO SPOKE ON THE RADIO', source: 'PERSONAL ACCOUNT',
      available: () => true,
      line: 'I am Elias Ward. The calls you heard came through the island loop. I wanted to speak before you opened the file. The switchboard and transmission ledger will tell you more than my apology.',
      journal: 'Elias says he made the island-loop calls. The switchboard and ledger are independent records of that route.',
    },
    {
      id: 'relay', label: 'ASK ABOUT THE RELAY STRIP', source: 'PERSONAL ACCOUNT',
      available: (context) => hasEvidence(context, 'lamp_strip', 'pump_service_order'),
      line: 'The main feed was unstable. I authorised the standby switch and failed to warn the incoming vessel. The service order records my authorisation; the punched strip records both circuits active. I cannot ask you to infer my intent from either mark.',
      journal: 'Elias acknowledges authorising standby and failing to warn the vessel. The service order and relay strip are physical records; his account of motive remains testimony.',
    },
    {
      id: 'iris', label: 'ASK ABOUT THE SERVICE GATE', source: 'PERSONAL ACCOUNT',
      available: (context) => hasEvidence(context, 'iris_rescued'),
      line: 'I locked the outer gate after Iris found the strip. I told myself I would let her out. Then the storm jammed it. None of that excuses leaving her there or keeping the distress form on the desk.',
      journal: 'Elias acknowledges locking Iris behind the gate. His claim that he meant to release her is unverified testimony.',
    },
    {
      id: 'statement', label: 'ASK FOR A SIGNED STATEMENT', source: 'PERSONAL ACCOUNT',
      available: (context) => chapterOf(context) >= 5 && hasEvidence(context, 'lamp_strip'),
      line: (context) => context?.choices?.eliasRoute === 'public_radio'
        ? 'I will not sign the account you broadcast. Put the physical records in the report; they stand without my signature.'
        : 'I will sign what I did with the switch, the log, and the gate. I will not claim I knew the vessel would hit the reef; that is for the inquiry to determine.',
      journal: 'Elias’s willingness to sign depends on the earlier confrontation. Any signed account must keep his actions separate from unproven intent.',
    },
  ],
  iris: [
    {
      id: 'condition', label: 'ASK IF SHE NEEDS HELP', source: 'FIRSTHAND',
      available: () => true,
      line: 'I can walk. Please keep the waterproof case dry. The water reached my knees, but the records stayed above it. I need a doctor when the launch reaches the jetty.',
      journal: 'Iris is conscious and mobile after rescue. She requests medical care and protection of her sealed case.',
    },
    {
      id: 'strip', label: 'ASK HOW SHE FOUND THE RELAY STRIP', source: 'FIRSTHAND',
      available: (context) => hasEvidence(context, 'lamp_strip'),
      line: 'I found the strip in the sealed maintenance tin. I photographed it before opening the paper sleeve, then checked the punched minute against the typed export. Two rear circuits were active at 21:14.',
      journal: 'Iris describes the strip’s recovery and comparison. The physical strip and photographs can independently verify her account.',
    },
    {
      id: 'custody', label: 'ASK ABOUT CUSTODY OF THE ORIGINALS', source: 'WITNESS PREFERENCE',
      available: (context) => hasEvidence(context, 'iris_handoff'),
      line: 'I chose to keep the originals with me and send authenticated copies by the mainland patch. Please put that distinction in the correction. Those records are mine to hand over, not yours to promise for me.',
      journal: 'Iris states her preferred custody arrangement after the handoff discussion; Mara must report it accurately.',
    },
    {
      id: 'mara', label: 'ASK WHAT THE CORRECTION MUST SAY', source: 'WITNESS OPINION',
      available: (context) => chapterOf(context) >= 5 && hasEvidence(context, 'archive_draft_memo'),
      line: 'Say what the strip proves. Say what you removed from your draft. Then say what you still cannot prove about intent. A corrected record cannot be another neat story that outruns the evidence.',
      journal: 'Iris asks for a correction that separates physical findings, Mara’s documented edit, and unresolved intent.',
    },
  ],
};

function availableTopics(personId, context) {
  return (TOPICS[personId] || []).filter((topic) => topic.available(context));
}

export function getConversationPanel(personId, peopleState, context = {}) {
  const person = PERSON_BY_ID[personId];
  if (!person || !isPresent(person, context)) return null;
  const seen = new Set(createPeopleState(peopleState).seenTopics[personId]);
  const first = seen.size === 0;
  const intro = {
    tamsin: first ? 'A mechanic in a salt-stained coat tends the gear at the cove.' : 'Tamsin looks up from her tools.',
    oren: first ? 'The former watchman holds the north-jetty depth board against the wind.' : 'Oren braces the board and waits.',
    elias: first ? 'The voice from the island radio belongs to the man standing before you.' : 'Elias keeps his eyes on the radio-house door.',
    iris: first ? 'Iris is wet and exhausted, but she keeps hold of a sealed case.' : 'Iris steadies the case against her work shirt.',
  }[personId];
  return {
    personId, name: person.name, role: person.role, intro,
    actions: availableTopics(personId, context).map((topic) => ({
      id: topic.id, label: topic.label, source: topic.source, heard: seen.has(topic.id),
    })),
  };
}

export function applyConversationAction(peopleState, personId, topicId, context = {}) {
  const current = createPeopleState(peopleState);
  const person = PERSON_BY_ID[personId];
  if (!person || !isPresent(person, context)) {
    return { status: 'blocked', state: current, message: 'This person is not here.' };
  }
  const topic = availableTopics(personId, context).find((entry) => entry.id === topicId);
  if (!topic) {
    return { status: 'blocked', state: current, message: 'That question needs more evidence.' };
  }
  const previouslyHeard = current.seenTopics[personId].includes(topicId);
  const next = createPeopleState(current);
  if (!previouslyHeard) next.seenTopics[personId].push(topicId);
  return {
    status: previouslyHeard ? 'unchanged' : 'changed',
    state: next,
    personId, topicId, speaker: person.name, source: topic.source,
    line: typeof topic.line === 'function' ? topic.line(context) : topic.line,
    journal: topic.journal,
  };
}

function mat(color, roughness = 0.83, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function clothWeave() {
  const size = 64;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const hash = ((x * 137 + y * 191) ^ (x * y * 31)) & 31;
    const thread = (x % 4 === 0 || y % 4 === 0) ? -9 : 0;
    const shade = 237 + hash / 5 + thread;
    const offset = (y * size + x) * 4;
    pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = shade;
    pixels[offset + 3] = 255;
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 4);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function part(parent, geometry, material, position, rotation, shadow = false) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function roundedPart(parent, material, position, radii, shadow = false) {
  const mesh = part(parent, new THREE.SphereGeometry(1, 12, 9), material, position, null, shadow);
  mesh.scale.set(...radii);
  return mesh;
}

function characterFigure(person, weave) {
  const { look } = person;
  const root = new THREE.Group();
  root.name = `person:${person.id}`;
  root.userData.personId = person.id;
  const figure = new THREE.Group();
  root.add(figure);
  const scale = look.height / 1.7;
  figure.scale.setScalar(scale);
  const coat = mat(look.coat, 0.61);
  coat.map = weave;
  const trim = mat(look.trim, 0.67);
  trim.map = weave;
  const lapel = mat(new THREE.Color(look.coat).lerp(new THREE.Color(look.trim), 0.32), 0.75);
  lapel.map = weave;
  lapel.side = THREE.DoubleSide;
  const dark = mat(look.trousers, 0.86);
  const boots = mat(0x252b2a, 0.47);
  const skin = mat(look.skin, 0.91);
  const hair = mat(look.hair, 0.91);
  const faceShade = mat(0x5b4a41, 0.96);
  const metal = mat(0x8b8170, 0.52, 0.48);

  // Continuous coat and rounded boots keep the silhouette human at a distance.
  // A lathed profile gives the wool a weighed hem without a bulky cone torso.
  const coatProfile = [
    [0.305, 0.54], [0.32, 0.57], [0.305, 0.72], [0.275, 0.99],
    [0.245, 1.23], [0.27, 1.43], [0.22, 1.51],
  ];
  part(figure, new THREE.LatheGeometry(coatProfile.map(([radius, y]) => new THREE.Vector2(radius, y)), 16),
    coat, [0, 0, 0], null, true);
  roundedPart(figure, coat, [0, 1.43, 0], [0.27, 0.105, 0.23], true);
  const arms = [];
  for (const side of [-1, 1]) {
    part(figure, new THREE.CylinderGeometry(0.095, 0.105, 0.5, 10), dark,
      [side * 0.145, 0.44, 0], [0, 0, side * 0.025], true);
    part(figure, new THREE.CylinderGeometry(0.102, 0.105, 0.25, 10), boots,
      [side * 0.145, 0.17, 0.018], null, true);
    roundedPart(figure, boots, [side * 0.145, 0.085, -0.077], [0.115, 0.065, 0.17], true);
    const arm = new THREE.Group();
    arm.position.set(side * 0.31, 1.39, 0);
    figure.add(arm);
    arms.push(arm);
    part(arm, new THREE.CapsuleGeometry(0.087, 0.36, 4, 10), coat,
      [side * 0.009, -0.15, 0], [0, 0, side * 0.13], true);
    part(arm, new THREE.CylinderGeometry(0.09, 0.085, 0.04, 10), lapel,
      [side * 0.045, -0.385, -0.01], [0, 0, side * 0.13]);
    roundedPart(arm, skin, [side * 0.051, -0.444, -0.017], [0.067, 0.089, 0.065]);
    // Rounded flap pockets are sewn onto the front rather than floating boxes.
    roundedPart(figure, trim, [side * 0.155, 0.88, -0.24], [0.09, 0.045, 0.021]);
  }
  // A narrow stitched center line and crossed lapels read as period outerwear.
  const frontLine = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.58, -0.316), new THREE.Vector3(0, 0.89, -0.278),
    new THREE.Vector3(0, 1.2, -0.249), new THREE.Vector3(0, 1.42, -0.264),
  ]);
  part(figure, new THREE.TubeGeometry(frontLine, 14, 0.007, 5, false), trim, [0, 0, 0], null);
  for (const side of [-1, 1]) {
    const cloth = new THREE.Shape();
    cloth.moveTo(side * 0.015, 1.475);
    cloth.lineTo(side * 0.19, 1.445);
    cloth.lineTo(side * 0.128, 1.275);
    cloth.lineTo(side * 0.056, 1.205);
    cloth.closePath();
    part(figure, new THREE.ShapeGeometry(cloth), lapel, [0, 0, -0.273], null);
  }
  for (let i = 0; i < 4; i++) {
    roundedPart(figure, metal, [0.032, 1.3 - i * 0.13, -(i < 2 ? 0.267 : 0.29)],
      [0.014, 0.014, 0.008]);
  }
  part(figure, new THREE.CylinderGeometry(0.077, 0.086, 0.15, 10), skin,
    [0, 1.565, 0], null);
  const scarf = person.id === 'iris' ? trim : person.id === 'tamsin' ? dark : coat;
  part(figure, new THREE.TorusGeometry(0.106, 0.035, 6, 16), scarf,
    [0, 1.55, 0], [Math.PI / 2, 0, 0]);
  const head = new THREE.Group();
  head.position.set(0, 1.705, 0);
  figure.add(head);
  roundedPart(head, skin, [0, -0.005, 0], [0.151, 0.172, 0.139], true);
  roundedPart(head, skin, [0, -0.115, -0.018], [0.124, 0.072, 0.115], true);
  roundedPart(head, skin, [0, -0.029, -0.151], [0.017, 0.03, 0.018]);
  for (const side of [-1, 1]) {
    roundedPart(head, skin, [side * 0.149, -0.023, 0], [0.026, 0.045, 0.023]);
    roundedPart(head, faceShade, [side * 0.057, 0.012, -0.137], [0.014, 0.008, 0.006]);
    roundedPart(head, hair, [side * 0.059, 0.049, -0.132], [0.029, 0.005, 0.004]);
  }
  roundedPart(head, faceShade, [0, -0.095, -0.117], [0.031, 0.005, 0.004]);
  // Distinct workwear headgear, all curved so no opaque bar crosses a face.
  if (look.hat === 'hood') {
    part(head, new THREE.SphereGeometry(0.191, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.78), coat,
      [0, 0.041, 0.09], null);
    const hoodRim = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.145, -0.11, -0.095), new THREE.Vector3(-0.17, 0.02, -0.093),
      new THREE.Vector3(-0.12, 0.14, -0.11), new THREE.Vector3(0, 0.185, -0.116),
      new THREE.Vector3(0.12, 0.14, -0.11), new THREE.Vector3(0.17, 0.02, -0.093),
      new THREE.Vector3(0.145, -0.11, -0.095),
    ]);
    part(head, new THREE.TubeGeometry(hoodRim, 20, 0.023, 6, false), trim, [0, 0, 0], null);
  } else {
    part(head, new THREE.SphereGeometry(0.162, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.49), hair,
      [0, 0.073, 0.014], null);
    if (look.hat === 'peak') {
      part(head, new THREE.CylinderGeometry(0.145, 0.174, 0.11, 16), coat,
        [0, 0.17, 0.015], null);
      roundedPart(head, coat, [0, 0.108, -0.089], [0.19, 0.019, 0.14]);
      roundedPart(head, metal, [0, 0.191, -0.16], [0.027, 0.017, 0.007]);
    } else {
      const wool = mat(0x4b4f4a, 0.98);
      wool.map = weave;
      part(head, new THREE.SphereGeometry(0.183, 16, 11, 0, Math.PI * 2, 0, Math.PI * 0.55), wool,
        [0, 0.096, 0.01], null);
      part(head, new THREE.TorusGeometry(0.171, 0.021, 6, 20), wool,
        [0, 0.073, 0.01], [Math.PI / 2, 0, 0]);
      roundedPart(head, hair, [0, -0.103, 0.113], [0.101, 0.052, 0.063]);
    }
  }
  if (person.id === 'elias' || person.id === 'oren') {
    for (const side of [-1, 1]) {
      roundedPart(head, hair, [side * 0.089, -0.102, -0.091], [0.03, 0.048, 0.011]);
      roundedPart(head, hair, [side * 0.029, -0.07, -0.128], [0.033, 0.012, 0.008]);
    }
  }
  if (look.prop === 'case') {
    part(arms[1], new THREE.BoxGeometry(0.32, 0.37, 0.19), dark,
      [0.14, -0.82, -0.13], [0, 0, -0.11], true);
    part(arms[1], new THREE.BoxGeometry(0.025, 0.18, 0.025), metal,
      [0.14, -0.53, -0.13], [0, 0, -0.12]);
  } else if (look.prop === 'tool') {
    part(arms[1], new THREE.BoxGeometry(0.16, 0.29, 0.11), dark,
      [0.11, -0.66, -0.06], null);
    part(arms[1], new THREE.CylinderGeometry(0.018, 0.018, 0.48, 7), metal,
      [0.11, -0.48, -0.12], [0, 0, -0.35]);
  } else if (look.prop === 'lantern') {
    part(arms[1], new THREE.CylinderGeometry(0.075, 0.085, 0.19, 8), metal,
      [0.14, -0.67, -0.03], null);
    const glass = new THREE.MeshStandardMaterial({ color: 0xd4b47b, emissive: 0x3f2d12, emissiveIntensity: 0.55, roughness: 0.35 });
    part(arms[1], new THREE.CylinderGeometry(0.065, 0.065, 0.12, 8), glass,
      [0.14, -0.67, -0.03], null);
  }
  // A subdued ground cue helps identify talkable figures without a floating UI.
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.025, 5, 28),
    new THREE.MeshBasicMaterial({ color: 0xb9a077, transparent: true, opacity: 0.24, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.035;
  root.add(ring);
  return { root, figure, head, arms, ring };
}

function addTamsinToolPouch(model) {
  const leather = mat(0x42362b, 0.89);
  const steel = mat(0x8b918e, 0.44, 0.68);
  const pouch = new THREE.Group();
  pouch.name = 'Tamsin mechanic tool pouch';
  pouch.position.set(-0.29, 0.83, 0.12);
  model.add(pouch);
  part(pouch, new THREE.BoxGeometry(0.15, 0.19, 0.08), leather,
    [0, 0, 0], [0, 0, -0.08], true);
  part(pouch, new THREE.BoxGeometry(0.16, 0.045, 0.09), leather,
    [0, 0.075, 0.012], [0, 0, -0.08]);
  part(pouch, new THREE.CylinderGeometry(0.012, 0.012, 0.19, 8), steel,
    [0.022, 0.095, 0.025], [0, 0, -0.22]);
  part(pouch, new THREE.BoxGeometry(0.085, 0.019, 0.018), steel,
    [0.041, 0.19, 0.03], [0, 0, -0.22]);
}

function addIrisDocumentCase(model) {
  // Original, low-cost geometry: a small waterproof case stays visible from
  // the player's conversation distance without another downloaded asset.
  const shell = mat(0x293f43, 0.59);
  const edge = mat(0x718587, 0.48, 0.35);
  const seal = mat(0xa3bfc0, 0.77);
  const caseGroup = new THREE.Group();
  caseGroup.name = 'Iris sealed document case';
  caseGroup.position.set(0.38, 0.51, 0.09);
  caseGroup.rotation.z = -0.06;
  model.add(caseGroup);
  part(caseGroup, new THREE.BoxGeometry(0.29, 0.31, 0.13), shell,
    [0, 0, 0], null, true);
  part(caseGroup, new THREE.BoxGeometry(0.31, 0.024, 0.14), edge,
    [0, 0.16, 0], null);
  part(caseGroup, new THREE.BoxGeometry(0.31, 0.014, 0.141), seal,
    [0, 0.12, 0], null);
  for (const side of [-1, 1]) {
    part(caseGroup, new THREE.BoxGeometry(0.018, 0.32, 0.14), edge,
      [side * 0.15, 0, 0], null);
  }
  part(caseGroup, new THREE.TorusGeometry(0.065, 0.013, 6, 12, Math.PI), edge,
    [0, 0.19, 0], [0, 0, Math.PI]);
}

function addOrenDepthBoard(model) {
  // The weathered jotting board is distinct from the jetty's fixed depth
  // staff. It keeps Oren's former watch role readable in a close conversation.
  const wood = mat(0x493f31, 0.89);
  const slate = mat(0x313c3e, 0.93);
  const chalk = mat(0xc6c5af, 0.96);
  const steel = mat(0x888880, 0.55, 0.3);
  const board = new THREE.Group();
  board.name = 'Oren depth jotting board';
  board.position.set(-0.37, 0.82, 0.11);
  board.rotation.z = -0.14;
  board.rotation.y = -0.22;
  model.add(board);
  part(board, new THREE.BoxGeometry(0.21, 0.3, 0.024), wood,
    [0, 0, 0], null, true);
  part(board, new THREE.BoxGeometry(0.18, 0.265, 0.003), slate,
    [0, -0.004, 0.014]);
  part(board, new THREE.BoxGeometry(0.07, 0.025, 0.022), steel,
    [0, 0.148, 0.012]);
  for (let row = 0; row < 3; row++) {
    part(board, new THREE.BoxGeometry(0.11 - row * 0.017, 0.003, 0.002), chalk,
      [-0.02, 0.09 - row * 0.073, 0.018]);
  }
}

function addEliasRadioPouch(model) {
  const leather = mat(0x242c2a, 0.79);
  const metal = mat(0x929a91, 0.49, 0.52);
  const pouch = new THREE.Group();
  pouch.name = 'Elias portable radio pouch';
  pouch.position.set(0.33, 0.82, 0.09);
  pouch.rotation.z = -0.07;
  model.add(pouch);
  part(pouch, new THREE.BoxGeometry(0.135, 0.195, 0.07), leather,
    [0, 0, 0], null, true);
  part(pouch, new THREE.BoxGeometry(0.139, 0.014, 0.075), metal,
    [0, 0.089, 0]);
  part(pouch, new THREE.CylinderGeometry(0.008, 0.008, 0.13, 6), metal,
    [0.046, 0.157, 0.002], [0, 0, 0.12]);
}

const CHARACTER_ASSETS = Object.freeze({
  tamsin: { label: 'Tamsin CC0 character', accessory: addTamsinToolPouch },
  oren: { label: 'Oren CC0 character', accessory: addOrenDepthBoard },
  elias: { label: 'Elias CC0 character', accessory: addEliasRadioPouch },
  iris: { label: 'Iris CC0 character', accessory: addIrisDocumentCase },
});

function collectFigureResources(root, geometries, materials, textures) {
  root.traverse((object) => {
    if (!object.isMesh) return;
    geometries.add(object.geometry);
    const used = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of used) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture) textures.add(value);
      }
    }
  });
}

function disposeDetachedFigure(root, retainedTexture = null) {
  const geometries = new Set(); const materials = new Set(); const textures = new Set();
  collectFigureResources(root, geometries, materials, textures);
  if (retainedTexture) textures.delete(retainedTexture);
  geometries.forEach((item) => item.dispose());
  materials.forEach((item) => item.dispose());
  textures.forEach((item) => item.dispose());
}

export function createIslandPeople(scene, terrainHeight,
  { tamsinLoader = null, orenLoader = null, eliasLoader = null, irisLoader = null } = {}) {
  const figures = new Map();
  const weave = clothWeave();
  const placements = [];
  let lastElapsed = null;
  let disposed = false;
  const loadStates = new Map();
  const motionQuat = new THREE.Quaternion();
  const defaultLoader = typeof document !== 'undefined' ? new GLTFLoader() : null;
  const loaders = {
    tamsin: tamsinLoader ?? defaultLoader,
    oren: orenLoader ?? defaultLoader,
    elias: eliasLoader ?? defaultLoader,
    iris: irisLoader ?? defaultLoader,
  };
  for (const person of ISLAND_PEOPLE) {
    const figure = characterFigure(person, weave);
    figure.root.visible = false;
    scene.add(figure.root);
    figures.set(person.id, figure);
    const arrival = person.arrival;
    const storm = person.storm || arrival;
    placements.push({
      person, figure,
      arrivalX: arrival[0], arrivalZ: arrival[1],
      arrivalY: terrainHeight(arrival[0], arrival[1]) + 0.02,
      stormX: storm[0], stormZ: storm[1],
      stormY: storm === arrival ? 0 : terrainHeight(storm[0], storm[1]) + 0.02,
    });
  }
  function loadCharacter(person, figure) {
    const loader = loaders[person.id];
    const specification = CHARACTER_ASSETS[person.id];
    if (!loader || !specification || loadStates.get(person.id)) return;
    loadStates.set(person.id, 'loading');
    const url = `${import.meta.env?.BASE_URL || '/'}assets/${person.id}.glb`;
    function onLoad({ scene: character }) {
      if (disposed) {
        disposeDetachedFigure(character);
        return;
      }
      const bounds = new THREE.Box3().setFromObject(character);
      const height = bounds.max.y - bounds.min.y;
      if (!(height > 1.3 && height < 2.1)) {
        loadStates.set(person.id, 'failed');
        disposeDetachedFigure(character);
        console.warn(`${person.name} asset has an unexpected scale; keeping procedural figure.`);
        return;
      }
      const model = new THREE.Group();
      model.name = specification.label;
      model.rotation.y = Math.PI; // MakeHuman faces +Z; island residents face -Z.
      model.scale.setScalar(person.look.height / height);
      model.position.y = -bounds.min.y * model.scale.x;
      model.userData.baseY = model.position.y;
      character.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = true;
      });
      model.add(character);
      specification.accessory(model);
      // The procedural body is a loading/error fallback. Once the GLB has
      // succeeded it can leave the scene; preserve only the shared weave used
      // by the other residents' fallback bodies.
      const fallback = figure.figure;
      fallback.visible = false;
      figure.root.remove(fallback);
      disposeDetachedFigure(fallback, weave);
      // These empty transform controls still drive the GLB bones below. Clear
      // their former meshes so they do not retain the detached fallback tree.
      for (const control of [figure.head, ...figure.arms]) {
        control.clear();
        control.removeFromParent();
      }
      figure.root.add(model);
      figure.figure = model;
      const head = character.getObjectByName('head');
      const leftArm = character.getObjectByName('upperarm_l');
      const rightArm = character.getObjectByName('upperarm_r');
      figure.rigMotion = [head, leftArm, rightArm].map((bone) =>
        bone?.isBone ? { bone, base: bone.quaternion.clone() } : null);
      loadStates.set(person.id, 'ready');
      figure.root.userData.asset = 'cc0-makehuman';
    }
    function onError(error) {
      if (disposed) return;
      loadStates.set(person.id, 'failed');
      console.warn(`${person.name} asset failed to load; keeping procedural figure.`, error);
    }
    function startLoad(loader) {
      if (disposed) return;
      try { loader.load(url, onLoad, undefined, onError); }
      catch (error) { onError(error); }
    }
    startLoad(loader);
  }
  function update(elapsed, context = {}) {
    const frameSeconds = lastElapsed === null || !Number.isFinite(elapsed)
      ? 0 : Math.max(0, elapsed - lastElapsed);
    const dt = Math.min(0.1, frameSeconds);
    // Let close-up facing converge in real time on a slow desktop, while
    // retaining the short step for subtle breathing and arm motion.
    const turnDt = Math.min(1, frameSeconds);
    lastElapsed = Number.isFinite(elapsed) ? elapsed : lastElapsed;
    const chapter = chapterOf(context);
    const stormWeather = chapter === 3 || chapter === 4;
    for (const placement of placements) {
      const { person, figure } = placement;
      const present = isPresent(person, context);
      figure.root.visible = present;
      if (!present) continue;
      const moved = person.id === 'tamsin' && chapter >= 3;
      const x = moved ? placement.stormX : placement.arrivalX;
      const z = moved ? placement.stormZ : placement.arrivalZ;
      // Rescue staging lowers Iris after this update, so reset the baseline
      // every frame even though terrain sampling and placement are cached.
      figure.root.position.set(x, moved ? placement.stormY : placement.arrivalY, z);
      const restingYaw = person.id === 'tamsin' && !moved ? Math.PI
        : person.id === 'oren' ? -2.2
          : person.id === 'iris' ? 0.9 : 0;
      const dx = context.playerX - x;
      const dz = context.playerZ - z;
      const playerDistance = Math.hypot(dx, dz);
      if (CHARACTER_ASSETS[person.id] && playerDistance < 90) loadCharacter(person, figure);
      const nearPlayer = Number.isFinite(dx) && Number.isFinite(dz)
        && playerDistance > 0.1 && playerDistance < 4.6;
      const targetYaw = nearPlayer ? Math.atan2(-dx, -dz) : restingYaw;
      if (!Number.isFinite(placement.facingYaw)) placement.facingYaw = restingYaw;
      const turn = Math.atan2(Math.sin(targetYaw - placement.facingYaw),
        Math.cos(targetYaw - placement.facingYaw));
      placement.facingYaw += THREE.MathUtils.clamp(turn, -turnDt * 1.55, turnDt * 1.55);
      figure.root.rotation.y = placement.facingYaw;
      const phase = elapsed * (stormWeather ? 1.4 : 1.08) + x * 0.1;
      const breath = Math.sin(phase);
      const gust = stormWeather ? Math.sin(elapsed * 0.83 + z * 0.05) : 0;
      const guarded = person.id === 'iris' ? 1 : person.id === 'elias' ? 0.5 : 0;
      const speaking = nearPlayer && context.speakingId === person.id;
      figure.figure.position.y = (figure.figure.userData.baseY || 0)
        + breath * (person.id === 'iris' ? 0.006 : 0.009);
      figure.figure.rotation.x = (stormWeather ? 0.029 : 0.005) + guarded * 0.012 + gust * 0.009;
      figure.figure.rotation.z = Math.sin(elapsed * 0.65 + z * 0.05) * 0.011
        + gust * 0.014;
      figure.head.rotation.x = (stormWeather ? 0.075 : 0) + guarded * 0.025
        + Math.sin(elapsed * 0.37 + z * 0.03) * 0.015
        + (speaking ? Math.sin(elapsed * 1.9 + x) * 0.023 : 0);
      figure.head.rotation.y = (person.id === 'elias' ? -0.11 : person.id === 'iris' ? -0.04 : 0)
        + Math.sin(elapsed * 0.32 + x * 0.13) * (stormWeather ? 0.085 : 0.12)
        + (nearPlayer ? THREE.MathUtils.clamp(turn * 0.38, -0.22, 0.22) : 0);
      // The prop is attached to the right sleeve, so it follows the hand
      // without a separate mesh update or extra draw call.
      figure.arms[0].rotation.x = Math.sin(elapsed * 0.72 + x * 0.04) * 0.018
        - (speaking ? 0.07 + Math.max(0, Math.sin(elapsed * 1.55 + z)) * 0.065 : 0);
      figure.arms[0].rotation.z = (stormWeather ? -0.03 : 0)
        + (person.id === 'tamsin' ? Math.sin(elapsed * 1.1 + 1.7) * 0.028 : 0);
      figure.arms[1].rotation.x = (person.id === 'iris' ? -0.08 : 0)
        + Math.sin(elapsed * 0.6 + z * 0.03) * (person.id === 'iris' ? 0.008 : 0.019);
      figure.arms[1].rotation.z = (person.id === 'iris' ? -0.045 : 0)
        + (stormWeather ? 0.025 : 0) + gust * 0.012;
      if (figure.rigMotion) {
        const targets = [figure.head, figure.arms[0], figure.arms[1]];
        for (let i = 0; i < figure.rigMotion.length; i++) {
          const motion = figure.rigMotion[i];
          if (motion) motion.bone.quaternion.copy(motion.base).multiply(
            motionQuat.setFromEuler(targets[i].rotation));
        }
      }
      figure.ring.material.opacity = 0.2 + Math.sin(elapsed * 1.8) * 0.045;
    }
  }
  function dispose() {
    disposed = true;
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    for (const figure of figures.values()) {
      scene.remove(figure.root);
      collectFigureResources(figure.root, geometries, materials, textures);
    }
    textures.add(weave);
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) texture.dispose();
  }
  return {
    update, dispose, figures, talkRadius: MAX_TALK_DISTANCE,
    collides: (x, z, radius = 0.35, context = {}) => collidesWithIslandPerson(x, z, radius, context),
    blocksMove: (fromX, fromZ, toX, toZ, context = {}, radius = 0.35) =>
      blocksIslandPersonMove(fromX, fromZ, toX, toZ, context, radius),
  };
}
