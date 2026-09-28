import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createWorld } from './world.js';
import { landingBoardwalkSections } from './landingBoardwalk.js';
import { detectRenderEnvironment, selectRenderProfile } from './renderQuality.js';
import { createPerformanceTelemetry, formatPerformanceTelemetry } from './performanceTelemetry.js';
import { chapterThreeMist } from './chapterThreeAtmosphere.js';
import { effectiveWeather } from './stormActivity.js';
import { createAudio, DEFAULT_SEA_VOLUME } from './audio.js';
import { createMusic, DEFAULT_MUSIC_VOLUME } from './music.js';
import { addWetWindows } from './wetWindows.js';
import { createBoats } from './boats.js';
import { createSeaLife } from './seaLife.js';
import { createFireAtmosphere } from './fireAtmosphere.js';
import { createCutsceneDirector, restoreCutsceneFlags } from './cutscenes.js';
import { createRescueStaging } from './rescueStaging.js';
import {
  applyRescueAftermathAction, getRescueAftermathPanel, rescueAftermathMilestones,
  restoreRescueAftermathState,
} from './rescueAftermath.js';
import { ARRIVAL_ROUTE, arrivalFrameSeconds, createArrivalVoyage } from './arrivalVoyage.js';
import { createRainEffects } from './rainEffects.js';
import { createWindSpray } from './windSpray.js';
import { createEvidenceProps } from './evidenceProps.js';
import { createSetDressing } from './setDressing.js';
import { createAncillaryBuildings } from './buildingDetails.js';
import { createRoads, isRoad, ROAD_ROUTES } from './roads.js';
import { createDriving } from './driving.js';
import { createFauna } from './fauna.js';
import { createAmbientTraffic } from './ambientTraffic.js';
import { createPrisonPopulation } from './prisonPopulation.js';
import { chapterSlotPresentation, createChapterStart } from './chapterSelect.js';
import { campaignAdvanceStatus } from './campaignProgression.js';
import { caseRecap } from './caseRecap.js';
import {
  applyLodgeSequenceAction, getLodgeSequencePanel, nearestLodgeStation,
  restoreLodgeSequenceState, lodgeSequenceMilestones,
} from './lodgeSequence.js';
import { createLodgeScene } from './lodgeScene.js';
import { createPumpInterior } from './pumpInterior.js';
import {
  CLIFF_FALL, advanceCliffFall, beginCliffFall, classifyCoastalStep,
  cliffFallPresentation, createCliffFallState, rememberSafeGround,
} from './cliffFall.js';
import { createFallPresentation } from './fallPresentation.js';
import {
  applySigningMemoryAction, getSigningMemoryPanel, restoreSigningMemoryState,
  signingMemoryMilestones,
} from './signingMemory.js';
import {
  applySigningReconstructionAction, getSigningReconstructionPanel,
  nearestSigningStation, restoreSigningReconstructionState,
  signingReconstructionMilestones,
} from './signingReconstruction.js';
import { createSigningRoomScene } from './signingRoomScene.js';
import {
  applyTowerCircuitAction, getTowerCircuitPanel, nearestTowerCircuitStation,
  restoreTowerCircuitState, towerCircuitMilestones,
} from './towerCircuit.js';
import { createTowerCircuitProps } from './towerCircuitProps.js';
import {
  applyPhotoReckoningAction, getPhotoReckoningPanel, photoReckoningMilestones,
  photoReckoningReady, photoReckoningSummary, restorePhotoReckoningState,
  serializePhotoReckoningState,
} from './photoReckoning.js';
import {
  applyIrisTrailAction, getIrisTrailPanel, irisTrailMilestones,
  irisTrailSummary, IRIS_TRAIL_STATIONS, nearestIrisTrailStation,
  restoreIrisTrailState, serializeIrisTrailState,
} from './irisTrail.js';
import { createIrisTrailProps } from './irisTrailProps.js';
import { closestFieldClue, selectFieldInteraction } from './fieldInteraction.js';
import {
  applyInquiryAction, getInquiryPanel, inquiryMilestones,
  restoreInquiryState, serializeInquiryState,
} from './inquirySequence.js';
import {
  createIslandPeople, createPeopleState, getConversationPanel,
  nearestIslandPerson, applyConversationAction, serializePeopleState,
} from './islandPeople.js';
import {
  BUILDING_SHAPES, PLAYER_RADIUS, isInsideBuilding,
  buildingWallBlocks, circlesBlock, roofRectangles,
  archiveFurnitureBlocks, archiveFurnitureBlocksMoveFrom,
  radioFurnitureBlocks, radioFurnitureBlocksMoveFrom,
  southPierRailBlocks,
} from './collision.js';
import { SITES, NAV_LIGHTS, CHAPTERS, CLUES } from './story.js';
import { availableMapSites, describeWaypoint, restoreWaypointId, suggestMapLead } from './wayfinding.js';
import {
  attemptDeduction, createDeductionState, getAvailableDeductions,
  isDeductionSolved, serializeDeductionState,
} from './deductions.js';
import {
  applyMechanismAction, getMechanismPanel, mechanismMilestones,
  restoreMechanismState, tickMechanisms,
} from './mechanisms.js';
import {
  applyArchiveCaseAction, archiveCaseMilestones, getArchiveCasePanel,
  restoreArchiveCaseState,
} from './archiveCase.js';
import {
  applyMaraDraftResponseAction, getMaraDraftResponsePanel,
  MARA_DRAFT_RESPONSE_EVIDENCE, maraDraftResponseMilestones,
  maraDraftResponseReady, maraDraftResponseSummary,
  restoreMaraDraftResponseState, serializeMaraDraftResponseState,
} from './maraDraftResponse.js';
import {
  SURVEY_FOV, SURVEY_HOLD_SECONDS, beginSurvey, captureSurvey as commitSurveyCapture,
  createStandbyLampClock, createSurveyState, evaluateSurveyFrame, serializeSurveyState, stepSurveyHold,
  SURVEY_STAKES,
} from './surveyCamera.js';
import {
  applyDaybreakReportAction, daybreakReportMilestones, getDaybreakReportPanel,
  getDaybreakReportText, restoreDaybreakReportState, serializeDaybreakReportState,
} from './daybreakReport.js';
import {
  applyRadioRoutingAction, getRadioRoutingPanel, radioRoutingMilestones,
  restoreRadioRoutingState,
} from './radioRouting.js';
import {
  applyChoiceRouteAction, choiceRouteConsequences, getChoiceRoutePanel,
  restoreChoiceRouteState, serializeChoiceRouteState,
} from './choiceRoutes.js';
import {
  applyWitnessConfrontationAction, getWitnessConfrontationPanel,
  nearestWitnessConfrontationStation, restoreWitnessConfrontationState,
  serializeWitnessConfrontationState, witnessConfrontationMilestones,
} from './witnessConfrontation.js';
import { createWitnessTableProps } from './witnessTableProps.js';
import {
  applyWitnessChronologyAction, getWitnessChronologyPanel,
  nearestWitnessChronologyStation, restoreWitnessChronologyState,
  witnessChronologyMilestones, WITNESS_CHRONOLOGY_SUMMARY,
} from './witnessChronology.js';
import { createWitnessChronologyScene } from './witnessChronologyScene.js';
import {
  applyJettyReturnAction, getJettyReturnPanel, JETTY_RETURN_STATIONS, jettyReturnMilestones,
  nearestJettyReturnStation, restoreJettyReturnState, serializeJettyReturnState,
} from './jettyReturn.js';
import { createJettyReturnProps } from './jettyReturnProps.js';
import { createNorthJettySurvey } from './northJettySurvey.js';
import {
  applyHatchAction, getHatchPanel, restoreHatchState,
} from './hatchSequence.js';
import { createTouchControls } from './touchControls.js';
import { createDroneView } from './droneView.js';
import { orientFirstPersonCamera } from './firstPersonCamera.js';
import { createChapterLoadingScreen, trackAssetLoading } from './chapterLoading.js';
import './style.css';

const $ = (id) => document.getElementById(id);
const CAMPAIGN_SAVE_KEY = 'the-third-light-save-v1';
const MUSIC_VOLUME_KEY = 'the-third-light-music-volume-v1';
const SEA_VOLUME_KEY = 'the-third-light-sea-volume-v1';
const requestedChapter = new URLSearchParams(location.search).get('chapter');
const selectedChapterIndex = requestedChapter && /^[1-6]$/.test(requestedChapter)
  ? Number(requestedChapter) - 1 : null;
const SAVE_KEY = selectedChapterIndex === null ? CAMPAIGN_SAVE_KEY
  : `${CAMPAIGN_SAVE_KEY}-chapter-${selectedChapterIndex + 1}`;
const chapterLoading = createChapterLoadingScreen($('loading-screen'));
const initialLoadingToken = chapterLoading.show(selectedChapterIndex === null ? 'PREPARING THE ISLAND'
  : `PREPARING CHAPTER ${selectedChapterIndex + 1}`,
selectedChapterIndex === null ? 'Building Greywake Island and its first view…'
  : `Building ${CHAPTERS[selectedChapterIndex].title} and its first view…`);
// The static HTML loading screen must have a chance to paint before the
// synchronous world construction occupies the main thread.
await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const assetLoading = trackAssetLoading(THREE.DefaultLoadingManager,
  (progress) => chapterLoading.updateProgress(progress));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.08, 1900);
camera.rotation.order = 'YXZ';
scene.add(camera);
const renderProfile = selectRenderProfile(detectRenderEnvironment());
// Survey photos render and copy within the same input event, so the back buffer
// does not need to remain allocated between frames.
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, renderProfile.pixelRatioCap));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('game').appendChild(renderer.domElement);
const vehicleHud = document.createElement('div');
vehicleHud.id = 'vehicle-hud';
vehicleHud.className = 'hidden';
document.body.appendChild(vehicleHud);

const world = createWorld(scene, camera, { renderProfile });
const windSpray = createWindSpray(scene, camera, world.coastalRadius,
  { quality: renderProfile.tier });
const drone = createDroneView({ terrainHeight: world.terrainHeight, waterHeight: world.waterHeight });
const roads = createRoads(scene, world.terrainHeight);
const dressing = createSetDressing(scene, world.terrainHeight);
const fireAtmosphere = createFireAtmosphere(scene, world.terrainHeight, {
  quality: renderProfile.tier === 'desktop' ? 'desktop' : 'mobile',
});
const ancillary = createAncillaryBuildings(scene, world.terrainHeight, SITES);
const driving = createDriving(dressing.vehicles, world.terrainHeight, { onRoad: isRoad });
const people = createIslandPeople(scene, world.terrainHeight);
const prisonPopulation = createPrisonPopulation(scene, world.terrainHeight);
const fauna = createFauna(scene, world.terrainHeight, {
  coastalRadius: world.coastalRadius,
  isRoad,
  isBlocked: (x, z, radius) =>
    SITES.some((site) => buildingWallBlocks(site, x, z, radius))
    || circlesBlock(x, z, radius, world.natureObstacles)
    || dressing.collides(x, z, radius)
    || ancillary.blocksMove(x, z, radius),
});
let ambientTraffic = null;
const shelterRects = [
  ...roofRectangles(SITES),
  ...ancillary.shelters,
  ...dressing.shelters.map((roof) => ({
    x: roof.x, z: roof.z, halfWidth: roof.width / 2, halfDepth: roof.depth / 2,
  })),
];
world.setShelters(shelterRects);
const isRoofed = (x, z) => shelterRects.some((r) =>
  Math.abs(x - r.x) < r.halfWidth && Math.abs(z - r.z) < r.halfDepth);
// A break in the cloud illuminates the seaward cliff on the opening approach.
const approachLight = new THREE.DirectionalLight(0xc8d7d4, 1.45);
approachLight.position.set(170, 260, 480);
scene.add(approachLight);
const wetWindows = addWetWindows(scene, SITES, world.terrainHeight);
const rainEffects = createRainEffects(scene, camera, world.terrainHeight, world.waterHeight, isRoofed);
const evidenceProps = createEvidenceProps(scene, SITES, CLUES, world.terrainHeight);
const sound = createAudio();
const music = createMusic();
let musicVolume = DEFAULT_MUSIC_VOLUME;
let seaVolume = DEFAULT_SEA_VOLUME;
try {
  const savedVolume = Number(localStorage.getItem(MUSIC_VOLUME_KEY));
  if (localStorage.getItem(MUSIC_VOLUME_KEY) !== null && Number.isFinite(savedVolume)) {
    musicVolume = THREE.MathUtils.clamp(savedVolume, 0, 1);
  }
  const savedSeaVolume = Number(localStorage.getItem(SEA_VOLUME_KEY));
  if (localStorage.getItem(SEA_VOLUME_KEY) !== null && Number.isFinite(savedSeaVolume)) {
    seaVolume = THREE.MathUtils.clamp(savedSeaVolume, 0, 1);
  }
} catch { /* Storage may be unavailable in private browsing. */ }
music.setVolume(musicVolume);
sound.setSeaVolume(seaVolume);
const loader = new GLTFLoader();
const boats = createBoats(scene, loader);
const voyage = createArrivalVoyage(scene, loader, world.waterHeight);
const seaLife = createSeaLife(scene, { waterHeight: world.waterHeight });
const keys = new Set();
const touchEnabled = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
  || new URLSearchParams(location.search).get('touch') === '1';
document.body.classList.toggle('touch-enabled', touchEnabled);
const touchControls = createTouchControls($('touch-controls'), {
  onLook: touchLook,
  onAction: touchAction,
});
const props = [];
const markers = new Map();
const siteById = Object.fromEntries(SITES.map((s) => [s.id, s]));
const clueById = Object.fromEntries(CLUES.map((c) => [c.id, c]));
const devClueId = import.meta.env.DEV ? new URLSearchParams(location.search).get('test') : null;
const devStage = import.meta.env.DEV ? new URLSearchParams(location.search).get('stage') : null;
const devReturnStation = import.meta.env.DEV ? new URLSearchParams(location.search).get('station') : null;
const debugQuery = new URLSearchParams(location.search);
const trailerMode = import.meta.env.DEV && debugQuery.get('trailer') === '1';
const showPerfStats = debugQuery.get('perf') === '1'
  || (import.meta.env.DEV && debugQuery.get('debug') === '1');
const performanceTelemetry = showPerfStats ? createPerformanceTelemetry() : null;
const statsElement = showPerfStats ? document.createElement('div') : null;
if (statsElement) {
  statsElement.setAttribute('role', 'status');
  statsElement.setAttribute('aria-label', 'Performance sample');
  statsElement.style.cssText = 'position:fixed;right:12px;top:66px;z-index:20;max-width:calc(100vw - 24px);padding:8px 10px;background:#061014e8;color:#e6eee9;border:1px solid #536e69;font:11px/1.45 monospace;white-space:pre-line;pointer-events:none';
  statsElement.textContent = 'PERFORMANCE · waiting for gameplay';
  document.body.appendChild(statsElement);
}
const chapterObjectives = [
  ['Find Iris’s message in the keeper’s lodge.', 'Examine the lodge window.'],
  ['Read the typed log, captain’s account, and Mara’s draft in the survey archive.',
    'Reconstruct Mara’s signing decision at the archive stations.',
    'Compare the original and later records at the archive desk.'],
  ['Record the main-lamp alignment at the west survey stake.', 'Record the standby-lamp alignment at the east ridge.', 'Inspect the tower controls and solve the alignment.'],
  ['Trace the supposed shore-control voice at the radio house.', 'Find the relay strip and Iris at the hatch.', 'Confront Elias over the island channel.'],
  ['Restore backup power in the pump house.', 'Guide the rescue launch from the pump-house radio.', 'Open the service hatch and bring Iris out.'],
  ['Ask Iris how she wants her originals and copies handled.', 'Return to the radio house and verify the mainland circuit.', 'Send a measured evidence packet to mainland control.', 'Compare the records and transmit a corrected finding.', 'Return to North Inlet Jetty with Iris and meet the captain’s family.'],
];

function readSave(key = SAVE_KEY) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (!saved || ![1, 2, 3, 4, 5, 6, 7].includes(saved.version)) return null;
    return saved;
  } catch { return null; }
}
const storedSave = devClueId ? null : readSave();
const chapterPreset = !devClueId && !storedSave && selectedChapterIndex !== null
  ? createChapterStart(selectedChapterIndex) : null;
const saved = storedSave ?? chapterPreset;
const state = {
  started: false,
  modal: false,
  ended: Boolean(saved?.ended),
  chapter: Math.min(CHAPTERS.length - 1, Math.max(0, Number(saved?.chapter) || 0)),
  found: new Set(Array.isArray(saved?.found) ? saved.found.filter((id) => clueById[id]) : []),
  x: Number.isFinite(saved?.x) ? saved.x : 0,
  z: Number.isFinite(saved?.z) ? saved.z : 338,
  yaw: Number.isFinite(saved?.yaw) ? saved.yaw : 0,
  pitch: Number.isFinite(saved?.pitch) ? saved.pitch : -0.045,
  flashlight: Boolean(saved?.flashlight),
  muted: Boolean(saved?.muted),
  near: null,
  nearPerson: null,
  nearVehicle: null,
  nearLodge: null,
  nearSigning: null,
  nearTower: null,
  nearIrisTrail: null,
  nearWitness: null,
  nearJetty: null,
  nearChronology: null,
  nearInteraction: null,
  inside: null,
  visited: new Set(Array.isArray(saved?.visited) ? saved.visited : ['landing']),
  walkPhase: 0,
};
const CUTSCENE_IDS = new Set(['ferry_landing', 'service_rescue', 'north_jetty_daybreak']);
const cutsceneViewed = restoreCutsceneFlags(saved?.cutscenes);
let pendingCutsceneId = CUTSCENE_IDS.has(saved?.pendingCutscene)
  && !cutsceneViewed.has(saved.pendingCutscene) ? saved.pendingCutscene : null;
const cutscenes = createCutsceneDirector({
  camera,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  onSuspend: () => {
    state.modal = true;
    document.body.classList.add('cinematic-active');
    keys.clear();
    touchControls.reset();
    setInteractionPrompt();
    $('menu-button').classList.add('hidden');
    $('menu-button').disabled = true;
    $('menu-button').setAttribute('aria-hidden', 'true');
  },
  onComplete: ({ id }) => {
    cutsceneViewed.add(id);
    if (pendingCutsceneId === id) pendingCutsceneId = null;
    save();
  },
  onResume: () => {
    state.modal = false;
    document.body.classList.remove('cinematic-active');
    keys.clear();
    touchControls.reset();
    $('menu-button').classList.remove('hidden');
    $('menu-button').disabled = false;
    $('menu-button').removeAttribute('aria-hidden');
    requestGamePointerLock();
  },
});

function queueStoryCutscene(id) {
  if (devClueId || !CUTSCENE_IDS.has(id) || cutsceneViewed.has(id)) return false;
  pendingCutsceneId = id;
  save();
  return true;
}

function startStoryCutscene(id = pendingCutsceneId) {
  if (!state.started || state.modal || cutscenes.active || !CUTSCENE_IDS.has(id)
    || cutsceneViewed.has(id) || devClueId) return false;
  const point = id === 'ferry_landing' ? ARRIVAL_ROUTE.pier
    : id === 'service_rescue' ? { x: 167, z: 150 }
      : siteById.north_jetty;
  cutscenes.start(id, {
    origin: { x: point.x, y: playerGroundHeight(point.x, point.z), z: point.z },
  });
  return cutscenes.active;
}
state.deductions = createDeductionState(saved?.deductions, state.found);
state.mechanisms = restoreMechanismState(saved?.mechanisms, state.found);
state.archive = restoreArchiveCaseState(saved?.archive, state.found);
state.maraDraftResponse = restoreMaraDraftResponseState(saved?.maraDraftResponse, {
  chapter: state.chapter, foundIds: state.found,
});
state.survey = createSurveyState(saved?.survey);
state.daybreakReport = restoreDaybreakReportState(saved?.daybreakReport, state.found, state.deductions.solvedIds);
if (state.ended && !daybreakReportMilestones(state.daybreakReport).submitted) {
  // Older five-chapter saves ended before the authored correction existed.
  // Resume those players at Daybreak instead of presenting an unearned ending.
  state.ended = false;
  state.chapter = CHAPTERS.length - 1;
}
state.routing = restoreRadioRoutingState(saved?.radioRouting, state.found, {
  legacyDaybreakConnected: Boolean(saved?.daybreakConnected),
});
state.hatch = restoreHatchState(saved?.hatch, state.found);
state.choices = restoreChoiceRouteState(saved?.choiceRoutes, {
  foundIds: state.found,
  mainlandConnected: radioRoutingMilestones(state.routing).mainlandConnected,
  irisRescued: state.found.has('iris_rescued'),
  reportSubmitted: daybreakReportMilestones(state.daybreakReport).submitted,
});
state.witness = restoreWitnessConfrontationState(saved?.witnessConfrontation, {
  chapter: state.chapter, foundIds: state.found, radioRouting: state.routing,
  choiceRoutes: state.choices,
});
state.jettyReturn = restoreJettyReturnState(saved?.jettyReturn, {
  chapter: state.chapter, foundIds: state.found,
  reportSubmitted: daybreakReportMilestones(state.daybreakReport).submitted,
  choiceRoutes: state.choices,
});
if (state.ended && !jettyReturnMilestones(state.jettyReturn, {
  chapter: state.chapter, foundIds: state.found,
  reportSubmitted: daybreakReportMilestones(state.daybreakReport).submitted,
  choiceRoutes: state.choices,
}).complete) {
  // A previous build closed the inquiry before the return to the family was
  // playable. Reopen that save at Daybreak with its evidence still intact.
  state.ended = false;
  state.chapter = CHAPTERS.length - 1;
}
state.peopleState = createPeopleState(saved?.peopleState);
state.lodge = restoreLodgeSequenceState(saved?.lodge, state.found);
// New chapter slots and resumed saves with this recorded finding already in
// the journal must restore its station observations as well. Older saves in
// the report chapter keep their existing progress and can play the sequence.
const previousSigning = state.found.has('archive_signing_finding')
  ? { version: 1, intakeSorted: true, originalChecked: true,
    docketRead: true, decisionReconstructed: true } : null;
state.signing = restoreSigningReconstructionState(saved?.signing ?? previousSigning, state.found);
state.towerCircuit = restoreTowerCircuitState(saved?.towerCircuit, state.found);
state.photoReckoning = restorePhotoReckoningState(saved?.photoReckoning, {
  chapter: state.chapter, foundIds: state.found, towerCircuit: state.towerCircuit,
});
state.irisTrail = restoreIrisTrailState(saved?.irisTrail,
  { chapter: state.chapter, foundIds: state.found });
state.witnessChronology = restoreWitnessChronologyState(saved?.witnessChronology, state.found);
state.waypointId = restoreWaypointId(saved?.waypointId,
  { chapter: state.chapter, foundIds: state.found });
state.arrivalNotes = Array.isArray(saved?.arrivalNotes)
  ? saved.arrivalNotes.filter((note) => typeof note === 'string').slice(0, 8) : [];
state.interviewNotes = Array.isArray(saved?.interviewNotes)
  ? saved.interviewNotes.filter((note) => typeof note?.speaker === 'string'
    && typeof note?.source === 'string' && typeof note?.journal === 'string')
    .slice(0, 32) : [];
state.surveyPhotos = Object.fromEntries(Object.entries(saved?.surveyPhotos || {}).filter(([id, photo]) =>
  ['headland_view', 'east_ridge_view'].includes(id) && typeof photo === 'string'
  && photo.length < 500000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo)));
state.inquiry = restoreInquiryState(saved?.inquiry, {
  foundIds: state.found,
  reportSubmitted: daybreakReportMilestones(state.daybreakReport).submitted,
  irisRescued: state.found.has('iris_rescued'),
  choiceRoutes: state.choices,
});
if (storedSave?.arrivalVoyage) voyage.restore(storedSave.arrivalVoyage);
else if (storedSave || selectedChapterIndex > 0 || devClueId) voyage.skip();
sound.setMuted(state.muted);
music.setMuted(state.muted);
function setMusicVolume(percent) {
  musicVolume = THREE.MathUtils.clamp(Number(percent) / 100 || 0, 0, 1);
  music.setVolume(musicVolume);
  for (const [inputId, valueId] of [
    ['music-volume', 'music-volume-value'], ['pause-music-volume', 'pause-music-volume-value'],
  ]) {
    if ($(inputId)) $(inputId).value = String(Math.round(musicVolume * 100));
    if ($(valueId)) $(valueId).textContent = musicVolume === 0 ? 'OFF' : `${Math.round(musicVolume * 100)}%`;
  }
  try { localStorage.setItem(MUSIC_VOLUME_KEY, String(musicVolume)); } catch { /* Optional preference. */ }
}
function bindMusicVolumeInput(id) {
  const input = $(id);
  if (!input) return;
  input.value = String(Math.round(musicVolume * 100));
  input.addEventListener('input', () => setMusicVolume(input.value));
}
bindMusicVolumeInput('music-volume');
setMusicVolume(musicVolume * 100);
function setSeaAmbienceVolume(percent) {
  seaVolume = THREE.MathUtils.clamp(Number(percent) / 100 || 0, 0, 1);
  sound.setSeaVolume(seaVolume);
  for (const [inputId, valueId] of [
    ['sea-volume', 'sea-volume-value'], ['pause-sea-volume', 'pause-sea-volume-value'],
  ]) {
    if ($(inputId)) $(inputId).value = String(Math.round(seaVolume * 100));
    if ($(valueId)) $(valueId).textContent = `${Math.round(seaVolume * 100)}%`;
  }
  try { localStorage.setItem(SEA_VOLUME_KEY, String(seaVolume)); } catch { /* Optional preference. */ }
}
function bindSeaAmbienceInput(id) {
  const input = $(id);
  if (!input) return;
  input.value = String(Math.round(seaVolume * 100));
  input.addEventListener('input', () => setSeaAmbienceVolume(input.value));
}
bindSeaAmbienceInput('sea-volume');
setSeaAmbienceVolume(seaVolume * 100);
if (devClueId && clueById[devClueId]) {
  const target = clueById[devClueId];
  state.chapter = target.minChapter;
  for (let i = 0; i < state.chapter; i++) CHAPTERS[i].required.forEach((id) => state.found.add(id));
  if (target.id === 'alignment_solution') {
    ['headland_view', 'east_ridge_view', 'tower_panel', 'archive_chart']
      .forEach((id) => state.found.add(id));
  }
  if (target.id === 'launch_guided') state.found.add('pump_power');
  if (target.id === 'iris_rescued') ['pump_power', 'launch_guided'].forEach((id) => state.found.add(id));
  if (target.id === 'radio_route_verified' && devStage === 'records-ready') {
    ['radio_switchboard', 'radio_patch', 'island_loop_ledger'].forEach((id) => state.found.add(id));
  }
  if (target.id === 'archive_signing_finding' && devStage === 'records-ready') {
    ['official_log', 'captain_statement', 'archive_draft_memo'].forEach((id) => state.found.add(id));
  }
  const site = target.room ? siteById[target.room] : null;
  const roomShape = site ? BUILDING_SHAPES[site.id] : null;
  const localX = roomShape ? THREE.MathUtils.clamp(target.x ?? 0,
    -roomShape.halfWidth + 0.7, roomShape.halfWidth - 0.7) : target.x ?? 0;
  state.x = (site?.x ?? target.world[0]) + localX;
  // The archive comparison sits on the room's central desk. Spawn the dev
  // probe on the approach side instead of inside its tabletop geometry.
  const localZ = (target.z ?? 0) + (target.id === 'archive_reconstruction' ? 3.1 : site ? 0.45 : 1.3);
  state.z = (site?.z ?? target.world[1]) + (roomShape
    ? THREE.MathUtils.clamp(localZ, -roomShape.halfDepth + 0.7, roomShape.halfDepth - 0.7)
    : localZ);
  state.yaw = 0;
  if (target.id === 'pump_service_order') {
    // Approach the wall-mounted order from the room floor for visual QA.
    state.x = site.x;
    state.z = site.z + (devStage === 'machine-view' ? 2.4 : -1.85);
  }
  if (target.id === 'archive_draft_memo' && devStage === 'record-view') {
    // View the front-aisle record from beyond the archive's central table.
    state.x = site.x + target.x;
    state.z = site.z + 0.9;
    state.yaw = 0;
    state.pitch = -0.48;
  }
  if (devStage === 'tamsin' && target.id === 'arrival_registry') {
    state.x = 7; state.z = 280; state.yaw = -Math.PI / 2;
  }
  if (devStage === 'south-pier' && target.id === 'arrival_registry') {
    state.x = 2.6; state.z = 350; state.yaw = 0; state.pitch = -0.045;
  }
  if (devStage === 'prison' && target.id === 'arrival_registry') {
    state.x = -58; state.z = 112; state.yaw = 0;
  }
  if (devStage === 'witness-chronology' && target.id === 'prison_intake_ledger') {
    ['prison_intake_ledger', 'captain_statement', 'archive_witness_addendum',
      'archive_draft_memo'].forEach((id) => state.found.add(id));
    state.x = -68.8; state.z = 100.2; state.yaw = Math.PI / 2;
  }
  if (devStage === 'prison-interior' && target.id === 'arrival_registry') {
    state.x = -39; state.z = 39; state.yaw = 0;
  }
  if (devStage === 'prison-corridor' && target.id === 'arrival_registry') {
    state.x = -39; state.z = 26; state.yaw = 0;
  }
  if (devStage === 'prison-guard' && target.id === 'arrival_registry') {
    state.x = -53.7; state.z = 110; state.yaw = -0.38;
  }
  if (devStage === 'prison-detainee' && target.id === 'arrival_registry') {
    state.x = -68; state.z = 25.1; state.yaw = 0;
  }
  if (devStage === 'staff-car' && target.id === 'arrival_registry') {
    state.x = -34; state.z = 124; state.yaw = 0;
  }
  if (devStage === 'drive' && target.id === 'arrival_registry') {
    state.x = -31; state.z = 117; state.yaw = Math.PI / 2;
  }
  if (devStage === 'lodge-view' && target.id === 'arrival_registry') {
    state.x = -90; state.z = 207; state.yaw = 0;
  }
  if (devStage === 'radio-view' && target.id === 'arrival_registry') {
    state.x = 150; state.z = -32; state.yaw = 0;
  }
  if (devStage === 'indoor-rain' && target.id === 'official_log') {
    state.x = site.x; state.z = site.z + 2.5; state.yaw = Math.PI;
  }
  if (devStage === 'tower-view' && target.id === 'tower_panel') {
    state.x = site.x; state.z = site.z + 2.4;
    state.yaw = Math.PI / 2; state.pitch = -0.02;
  }
  if (target.id === 'radio_patch' && devStage?.startsWith('iris-')) {
    const station = IRIS_TRAIL_STATIONS.find((entry) => devStage === `iris-${entry.id}`);
    if (station) {
      state.x = station.x - (station.id === 'radio' ? 0.8 : 0);
      state.z = station.z + (station.id === 'radio' ? 1.1 : 1.2);
      state.yaw = 0;
    }
  }
}
if (devClueId === 'tree_view') {
  state.chapter = 0;
  state.x = 200;
  state.z = 137;
  state.yaw = 0.36;
  state.pitch = -0.02;
}
if (devClueId === 'ambient_fauna') {
  state.chapter = 0;
  state.x = -205;
  state.z = 100;
  state.yaw = Math.PI / 2;
  state.pitch = -0.04;
}
if (devClueId === 'ambient_traffic') {
  state.chapter = 0;
  state.x = -144;
  state.z = 103;
  state.yaw = -2.59;
  state.pitch = -0.05;
}
if (devClueId === 'cliff_fall') {
  state.chapter = 0;
  state.x = 338;
  state.z = 0;
  state.yaw = -Math.PI / 2;
  state.pitch = -0.11;
}
if (devClueId) {
  state.mechanisms = restoreMechanismState(null, state.found);
  if (devStage === 'hatch-ready' && devClueId === 'iris_rescued') {
    state.mechanisms.power.drainSeconds = 30;
  }
  state.archive = restoreArchiveCaseState(null, state.found);
  state.maraDraftResponse = restoreMaraDraftResponseState(null, {
    chapter: state.chapter, foundIds: state.found,
  });
  state.signing = restoreSigningReconstructionState(null, state.found);
  state.towerCircuit = restoreTowerCircuitState(null, state.found);
  state.photoReckoning = restorePhotoReckoningState(null, {
    chapter: state.chapter, foundIds: state.found, towerCircuit: state.towerCircuit,
  });
  state.irisTrail = restoreIrisTrailState(null, { chapter: state.chapter, foundIds: state.found });
  state.survey = createSurveyState(null);
  state.surveyPhotos = {};
  state.daybreakReport = restoreDaybreakReportState(null, state.found, state.deductions.solvedIds);
  state.routing = restoreRadioRoutingState(null, state.found);
  state.hatch = restoreHatchState(null, state.found);
  state.choices = restoreChoiceRouteState(null, { foundIds: state.found });
  state.witness = restoreWitnessConfrontationState(null, {
    chapter: state.chapter, foundIds: state.found, radioRouting: state.routing,
    choiceRoutes: state.choices,
  });
  state.jettyReturn = restoreJettyReturnState(null, {
    chapter: state.chapter, foundIds: state.found,
    reportSubmitted: daybreakReportMilestones(state.daybreakReport).submitted,
    choiceRoutes: state.choices,
  });
}
if (devClueId === 'archive_reconstruction' && devStage === 'mara-response') {
  for (const id of MARA_DRAFT_RESPONSE_EVIDENCE) state.found.add(id);
  state.archive = restoreArchiveCaseState({
    version: 1, provenance: 'later_reprint', testimony: 'after_finding',
    editorial: 'uncertainty_removed', finding: 'operation_unresolved',
  }, state.found);
  state.maraDraftResponse = restoreMaraDraftResponseState(null, {
    chapter: state.chapter, foundIds: state.found,
  });
  // Stand at the side of the central table, closer to its case folder than
  // the chart or signing page. This keeps the E prompt unambiguous for QA.
  state.x = siteById.archive.x + 1.8;
  state.z = siteById.archive.z + 1.0;
}
if (devClueId === 'alignment_solution' && devStage === 'photo-reckoning') {
  state.towerCircuit = restoreTowerCircuitState({
    version: 1, wiringTraced: true, testQualified: true,
    westTraced: true, eastTraced: true, channelCompared: false,
  }, state.found);
  state.x = siteById.tower.x + 1.8;
  state.z = siteById.tower.z - 1.68;
  state.yaw = Math.PI / 2;
}
if (devClueId === 'radio_route_verified' && devStage === 'witness-ready') {
  for (const id of ['radio_switchboard', 'island_loop_ledger', 'radio_patch',
    'radio_route_verified', 'official_log', 'pump_service_order', 'lamp_strip']) {
    state.found.add(id);
  }
  state.routing = restoreRadioRoutingState({ version: 1,
    loopFeed: 'island_loop', mainlandContinuity: 'open',
    voiceSource: 'local_microphone', localLoopIsolated: false,
  }, state.found);
  state.choices = restoreChoiceRouteState({ version: 1, eliasRoute: 'ask_account' }, {
    foundIds: state.found, mainlandConnected: false,
    irisRescued: false, reportSubmitted: false,
  });
  state.witness = restoreWitnessConfrontationState(null, {
    chapter: state.chapter, foundIds: state.found,
    radioRouting: state.routing, choiceRoutes: state.choices,
  });
  state.x = 147.0;
  state.z = -54.9;
  state.yaw = -Math.PI / 2;
}
if (devClueId === 'north_jetty_sounding' && devStage === 'oren') {
  state.x = -83;
  state.z = -296.8;
  state.yaw = 0;
}
if (devClueId === 'radio_route_verified' && devStage === 'elias') {
  state.found.add('radio_patch');
  state.choices = restoreChoiceRouteState({ version: 1, eliasRoute: 'ask_account' }, {
    foundIds: state.found, mainlandConnected: false,
    irisRescued: false, reportSubmitted: false,
  });
  state.x = 159;
  state.z = -39.8;
  state.yaw = 0;
}
if (devClueId === 'daybreak_report' && devStage === 'jetty-ready') {
  for (const id of ['launch_guided', 'iris_rescued', 'iris_handoff',
    'daybreak_report', 'lamp_strip', 'official_log', 'headland_view',
    'east_ridge_view', 'captain_statement', 'archive_draft_memo',
    'pump_service_order', 'archive_revision_stamp', 'operator_note',
    'radio_switchboard', 'island_loop_ledger', 'radio_patch']) {
    state.found.add(id);
  }
  state.routing = restoreRadioRoutingState({ version: 1,
    loopFeed: 'island_loop', mainlandContinuity: 'open',
    voiceSource: 'local_microphone', localLoopIsolated: true,
    patchSocket: 'mainland_control', mainlandVerified: true,
  }, state.found);
  state.deductions = createDeductionState(serializeDeductionState({
    solvedIds: ['false_light', 'altered_log', 'local_radio_voice',
      'rescue_bearing', 'responsibility'],
  }), state.found);
  state.daybreakReport = restoreDaybreakReportState({
    version: 1, lampStatus: 'both_circuits_active',
    maraResponsibility: 'removed_uncertainty',
    eliasConduct: 'actions_without_invented_motive', submitted: true,
  }, state.found, state.deductions.solvedIds);
  state.choices = restoreChoiceRouteState({
    version: 1, initialPacket: 'complete', eliasRoute: 'ask_account', irisAsked: true,
    irisCustody: 'independent_hold_shared_copies',
  }, {
    foundIds: state.found, mainlandConnected: true,
    irisRescued: true, reportSubmitted: true,
  });
  state.jettyReturn = restoreJettyReturnState(null, {
    chapter: state.chapter, foundIds: state.found,
    reportSubmitted: true, choiceRoutes: state.choices,
  });
  const jettyProbeSteps = [
    ['case', { type: 'jetty.berth', answer: 'safe_berth_documented' }],
    ['family', { type: 'jetty.case', answer: 'family_copy_inventory' }],
    ['receipt', { type: 'jetty.opening', answer: 'invite_questions' }],
    ['receipt', { type: 'jetty.proof', answer: 'mechanism_and_limits' }],
    ['receipt', { type: 'jetty.cost', answer: 'no_closure_owed' }],
  ];
  if (['case', 'family', 'receipt'].includes(devReturnStation)) {
    const stop = { case: 1, family: 2, receipt: 5 }[devReturnStation];
    for (const [, action] of jettyProbeSteps.slice(0, stop)) {
      state.jettyReturn = applyJettyReturnAction(state.jettyReturn, action, {
        chapter: state.chapter, foundIds: state.found,
        reportSubmitted: true, choiceRoutes: state.choices,
      }).state;
    }
    const station = JETTY_RETURN_STATIONS.find(({ id }) => id === devReturnStation);
    state.x = station.x - 1.7;
    state.z = station.z + 0.6;
  }
  state.inquiry = restoreInquiryState(null, {
    foundIds: state.found, reportSubmitted: true,
    irisRescued: true, choiceRoutes: state.choices,
  });
  if (!devReturnStation) {
    state.x = -78.7;
    state.z = -306.4;
  }
  state.yaw = -Math.PI / 2;
}
if (devClueId === 'iris_rescued' && devStage === 'after-care') {
  state.found.add('iris_rescued');
  state.x = 174.2;
  state.z = 157.2;
  state.yaw = Math.PI / 2;
}
if (devClueId === 'lodge_working_carbon' && devStage === 'memory-ready') {
  ['iris_note', 'window_reflection', 'lodge_working_carbon'].forEach((id) => state.found.add(id));
}
state.signingMemory = restoreSigningMemoryState(
  saved?.signingMemory ?? (saved && saved.version < 6 && state.chapter > 0
    ? { version: 1, inspectedIds: ['carbon', 'closure', 'sleeve'],
      decisionAcknowledged: true, limitAcknowledged: true } : null),
  state.found);
state.rescueAftermath = restoreRescueAftermathState(
  saved?.rescueAftermath ?? (saved && state.chapter >= 5 && state.found.has('iris_rescued')
    ? { version: 1, medical: 'medical_first', case: 'keep_with_iris',
      account: 'firsthand_only', rest: 'defer_statement' } : null),
  { foundIds: state.found });
const lodgeScene = createLodgeScene(scene, world.terrainHeight, siteById.lodge,
  state.lodge, state.found);
const pumpInterior = createPumpInterior(scene, world.terrainHeight, siteById.pump);
const signingRoomScene = createSigningRoomScene(scene, world.terrainHeight, siteById.archive,
  state.signing, state.found);
const towerCircuitProps = createTowerCircuitProps(scene, world.terrainHeight, siteById.tower,
  state.towerCircuit, state.found);
const irisTrailProps = createIrisTrailProps(scene, world.terrainHeight);
const rescueStaging = createRescueStaging(scene, world.terrainHeight,
  evidenceProps.entries.get('tunnel_signal'),
  { initiallyRescued: state.found.has('iris_rescued') });
rescueStaging.restore(saved?.rescueStaging);
const jettyReturnProps = createJettyReturnProps(scene, world.terrainHeight);
const witnessTableProps = createWitnessTableProps(scene, world.terrainHeight);
const witnessChronologyScene = createWitnessChronologyScene(scene, world.terrainHeight);
boats.restore(saved?.rescueLaunch);
if (saved?.driving) {
  driving.restore(saved.driving, canPlaceVehicle);
  if (driving.active) {
    state.x = driving.active.x;
    state.z = driving.active.z;
  }
}
ambientTraffic = createAmbientTraffic(scene, world.terrainHeight, {
  parkedVehicles: dressing.vehicles,
  // This checks the same static occupancy as the player car. Ambient cars
  // check one another within their own controller, avoiding a recursive query.
  canPlace: (x, z, vehicle, radius) => canPlaceVehicle(x, z, vehicle, radius, true),
});
const cliffWorld = { isWalkable: world.isWalkable, terrainHeight: world.terrainHeight,
  coastalRadius: world.coastalRadius, waterHeight: world.waterHeight, isPier: onSouthPier };
let cliffFall = createCliffFallState(devClueId === 'cliff_fall'
  ? { x: 329, z: 0 } : { x: 0, z: 270 });
cliffFall = rememberSafeGround(cliffFall, saved?.lastSafeGround, cliffWorld, canStandAt);
cliffFall = rememberSafeGround(cliffFall, { x: state.x, z: state.z }, cliffWorld, canStandAt);
const fallPresentation = createFallPresentation({ camera });
let fallExpectedSeconds = 1.8;
let respawnFadeTime = -1;
let fallVisualActive = false;

function choiceContext() {
  const consequences = choiceRouteConsequences(state.choices);
  return {
    foundIds: state.found,
    mainlandConnected: radioRoutingMilestones(state.routing).mainlandConnected,
    irisRescued: state.found.has('iris_rescued'),
    reportSubmitted: daybreakReportMilestones(state.daybreakReport).submitted,
    inquiryReceipt: consequences.mainlandHasFullPacket,
  };
}
function witnessContext() {
  return {
    chapter: state.chapter, atRadioHouse: state.inside?.id === 'radio',
    foundIds: state.found, radioRouting: state.routing, choiceRoutes: state.choices,
  };
}
function jettyContext() {
  return {
    chapter: state.chapter, foundIds: state.found,
    reportSubmitted: daybreakReportMilestones(state.daybreakReport).submitted,
    choiceRoutes: state.choices,
    maraDraftResponse: state.maraDraftResponse,
  };
}
function maraResponseContext() {
  return {
    chapter: state.chapter, foundIds: state.found,
    atArchive: state.inside?.id === 'archive',
  };
}

function save() {
  if (devClueId || cliffFall.phase !== 'grounded') return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      version: 7, chapter: state.chapter, found: [...state.found],
      cutscenes: [...cutsceneViewed], pendingCutscene: pendingCutsceneId,
      x: state.x, z: state.z, yaw: state.yaw, pitch: state.pitch,
      lastSafeGround: cliffFall.lastSafe,
      flashlight: state.flashlight, muted: state.muted,
      visited: [...state.visited], ended: state.ended,
      waypointId: state.waypointId,
      deductions: serializeDeductionState(state.deductions),
      mechanisms: state.mechanisms,
      archive: state.archive,
      maraDraftResponse: serializeMaraDraftResponseState(state.maraDraftResponse),
      signing: state.signing,
      towerCircuit: state.towerCircuit,
      photoReckoning: serializePhotoReckoningState(state.photoReckoning),
      irisTrail: serializeIrisTrailState(state.irisTrail),
      survey: serializeSurveyState(state.survey),
      surveyPhotos: state.surveyPhotos,
      daybreakReport: serializeDaybreakReportState(state.daybreakReport),
      radioRouting: state.routing,
      hatch: state.hatch,
      choiceRoutes: serializeChoiceRouteState(state.choices),
      witnessConfrontation: serializeWitnessConfrontationState(state.witness),
      witnessChronology: state.witnessChronology,
      jettyReturn: serializeJettyReturnState(state.jettyReturn),
      peopleState: serializePeopleState(state.peopleState),
      interviewNotes: state.interviewNotes,
      arrivalNotes: state.arrivalNotes,
      arrivalVoyage: voyage.snapshot(),
      rescueStaging: rescueStaging.snapshot(),
      rescueAftermath: state.rescueAftermath,
      signingMemory: state.signingMemory,
      rescueLaunch: boats.snapshot(),
      lodge: state.lodge,
      inquiry: serializeInquiryState(state.inquiry),
      driving: driving.snapshot(),
      daybreakConnected: radioRoutingMilestones(state.routing).mainlandConnected,
    }));
  } catch { /* private browsing can reject storage */ }
}
if (selectedChapterIndex !== null && !devClueId) {
  const presentation = chapterSlotPresentation(selectedChapterIndex, storedSave);
  $('chapter-selection').textContent = presentation.selectionText;
  $('chapter-selection').classList.remove('hidden');
  $('start-button').innerHTML = `${presentation.buttonLabel} <span>→</span>`;
  const campaignButton = document.createElement('button');
  campaignButton.type = 'button';
  campaignButton.className = 'menu-secondary';
  campaignButton.textContent = 'RETURN TO MAIN CAMPAIGN';
  campaignButton.addEventListener('click', () => {
    const url = new URL(location.href);
    url.searchParams.delete('chapter');
    location.assign(url.href);
  });
  $('chapters-button').after(campaignButton);
} else if (storedSave) {
  $('start-button').innerHTML = 'CONTINUE INVESTIGATION <span>→</span>';
}
if (storedSave) {
  const newButton = document.createElement('button');
  newButton.className = 'new-game-button';
  newButton.textContent = selectedChapterIndex === null
    ? 'START A NEW INVESTIGATION'
    : chapterSlotPresentation(selectedChapterIndex, storedSave).restartLabel;
  newButton.style.cssText = 'display:block;margin-top:10px;background:transparent;border-color:#687573;color:#bfc9c8';
  newButton.addEventListener('click', () => { localStorage.removeItem(SAVE_KEY); location.reload(); });
  $('start-button').after(newButton);
}
for (const [index, chapter] of CHAPTERS.entries()) {
  const option = document.createElement('button');
  option.type = 'button';
  option.className = `chapter-option${index === selectedChapterIndex ? ' selected' : ''}`;
  const progress = readSave(`${CAMPAIGN_SAVE_KEY}-chapter-${index + 1}`);
  const title = document.createElement('strong');
  title.textContent = `CHAPTER ${index + 1} · ${chapter.title}`;
  const objective = document.createElement('small');
  objective.textContent = chapter.objective;
  const status = document.createElement('em');
  status.textContent = chapterSlotPresentation(index, progress).pickerStatus;
  option.append(title, objective, status);
  option.addEventListener('click', () => {
    const url = new URL(location.href);
    url.searchParams.delete('test');
    url.searchParams.delete('stage');
    url.searchParams.set('chapter', String(index + 1));
    location.assign(url.href);
  });
  $('chapter-options').appendChild(option);
}
$('chapters-button').addEventListener('click', () => {
  const opening = $('chapter-picker').classList.contains('hidden');
  $('chapter-picker').classList.toggle('hidden', !opening);
  $('chapters-button').setAttribute('aria-expanded', String(opening));
  if (opening) $('chapter-picker').scrollIntoView({ block: 'nearest' });
});
$('chapter-picker-close').addEventListener('click', () => {
  $('chapter-picker').classList.add('hidden');
  $('chapters-button').setAttribute('aria-expanded', 'false');
  $('chapters-button').focus();
});

const flashlight = new THREE.SpotLight(0xcde6de, 11, 30, Math.PI / 9, 0.65, 1.4);
flashlight.position.set(0.12, -0.13, -0.05);
flashlight.target.position.set(0, -0.03, -7);
flashlight.visible = state.flashlight;
camera.add(flashlight, flashlight.target);

function addRect(group, width, height, depth, x, y, z, color, roughness = 0.85) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, roughness }),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function fallbackBuilding(site) {
  const group = new THREE.Group();
  const w = site.scale[0] * 0.85;
  const d = site.scale[1] * 0.8;
  const h = site.id === 'tower' ? 17 : site.id === 'lodge' ? 7.5 : 5;
  const wall = site.id === 'lodge' ? 0x625b50 : 0x636d6b;
  addRect(group, w, 0.28, d, 0, 0.14, 0, 0x303535);
  addRect(group, w, h, 0.4, 0, h / 2, -d / 2, wall);
  addRect(group, 0.4, h, d, -w / 2, h / 2, 0, wall);
  addRect(group, 0.4, h, d, w / 2, h / 2, 0, wall);
  addRect(group, (w - 2.4) / 2, h, 0.4, -(w + 2.4) / 4, h / 2, d / 2, wall);
  addRect(group, (w - 2.4) / 2, h, 0.4, (w + 2.4) / 4, h / 2, d / 2, wall);
  addRect(group, w + 0.8, 0.35, d + 0.9, 0, h, 0, 0x303b3e);
  const lamp = new THREE.PointLight(0xe3b87c, 2, 12);
  lamp.position.set(0, h - 1.2, d / 2 + 1.2);
  group.add(lamp);
  group.position.set(site.x, world.terrainHeight(site.x, site.z), site.z);
  return group;
}

function decorateSite(site) {
  const ground = world.terrainHeight(site.x, site.z);
  if (site.kind !== 'building') return;
  const fallback = fallbackBuilding(site);
  scene.add(fallback);
  loader.load(`/assets/${site.model}`, (gltf) => {
    const model = gltf.scene;
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material?.map) child.material.map.colorSpace = THREE.SRGBColorSpace;
      }
    });
    model.position.set(site.x, ground + 0.08, site.z);
    scene.add(model);
    scene.remove(fallback);
  }, undefined, () => { /* fallback stays visible */ });

  const porchLamp = new THREE.PointLight(0xf2cb88, site.id === 'lodge' ? 2.7 : 1.8, 20, 2);
  porchLamp.position.set(site.x, ground + 3.4, site.z + site.scale[1] * 0.45);
  scene.add(porchLamp);
  const interiorColor = site.id === 'lodge' || site.id === 'radio' ? 0xe8c18c : 0xb7ccca;
  const interiorLamp = new THREE.PointLight(interiorColor, site.id === 'lodge' ? 1.35 : 0.95, 18, 2);
  interiorLamp.position.set(site.x, ground + 2.8, site.z);
  scene.add(interiorLamp);
}
SITES.forEach(decorateSite);

// The cove boardwalk follows the descent from the old landing to a low pier.
const dock = new THREE.Group();
const timberLoader = new THREE.TextureLoader();
function timberMap(name, color = false) {
  const map = timberLoader.load(`/assets/building-textures/timber_${name}.jpg`);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 2);
  map.anisotropy = 8;
  if (color) map.colorSpace = THREE.SRGBColorSpace;
  return map;
}
const dockDeckMaterial = new THREE.MeshStandardMaterial({
  color: 0x777d77,
  map: timberMap('diffuse', true),
  normalMap: timberMap('nor_gl'),
  roughnessMap: timberMap('rough'),
  normalScale: new THREE.Vector2(0.45, 0.45),
  roughness: 0.94,
});
const dockWalkMaterial = dockDeckMaterial.clone();
dockWalkMaterial.color.setHex(0x555b55);
const dockFrameMaterial = new THREE.MeshStandardMaterial({
  color: 0x403c35, roughness: 0.96, metalness: 0,
});
const dockIronMaterial = new THREE.MeshStandardMaterial({
  color: 0x333b3a, roughness: 0.72, metalness: 0.38,
});
const dockParts = { timber: [], iron: [] };
function dockTimber(width, height, depth, x, y, z, material = dockFrameMaterial, pitch = 0) {
  dockParts[material === dockIronMaterial ? 'iron' : 'timber'].push({
    width, height, depth, x, y, z, pitch,
  });
}
function addDockInstances(parts, material, name) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, parts.length);
  const transform = new THREE.Object3D();
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    transform.position.set(part.x, part.y, part.z);
    transform.rotation.set(part.pitch, 0, 0);
    transform.scale.set(part.width, part.height, part.depth);
    transform.updateMatrix();
    mesh.setMatrixAt(i, transform.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  dock.add(mesh);
}
for (const { startZ: z, endZ: zNext, yStart, yEnd, span, pitch }
  of landingBoardwalkSections(world.terrainHeight)) {
  const plank = addRect(dock, 6.6, 0.18, span + 0.06,
    0, (yStart + yEnd) / 2, (z + zNext) / 2, 0x584d3f);
  plank.material.dispose();
  plank.material = dockWalkMaterial;
  plank.rotation.x = pitch;
  // The exposed side stringers keep the descending boardwalk from reading as
  // a thin floating texture when viewed head-on from the arriving ferry.
  for (const x of [-3.1, 3.1]) {
    dockTimber(0.31, 0.38, span + 0.08,
      x, (yStart + yEnd) / 2 - 0.17, (z + zNext) / 2,
      dockFrameMaterial, plank.rotation.x);
  }
  // The last metres down to the pier are steep. Narrow grip battens and iron
  // pegs read as a built gangway instead of one pale plane at a grazing angle.
  if (zNext > 332) {
    const count = Math.max(2, Math.floor((zNext - z) / 0.8));
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      const battenZ = z + (zNext - z) * t;
      const battenY = yStart + (yEnd - yStart) * t + 0.105;
      dockTimber(6.15, 0.06, 0.105, 0, battenY, battenZ,
        dockFrameMaterial, plank.rotation.x);
      for (const x of [-2.8, 2.8]) {
        dockTimber(0.09, 0.012, 0.09, x, battenY + 0.037, battenZ,
          dockIronMaterial, plank.rotation.x);
      }
    }
  }
}
const pierY = 0.35;
const pierDeck = addRect(dock, 8, 0.28, 14, 0, pierY, 350, 0x514b40);
pierDeck.material.dispose();
pierDeck.material = dockDeckMaterial;
for (const x of [-3.6, 3.6]) for (const z of [344, 351, 356]) {
  dockTimber(0.5, 3.1, 0.5, x, pierY - 1.5, z);
  dockTimber(0.56, 0.12, 0.56, x, pierY + 0.22, z, dockIronMaterial);
}
// One guarded side leaves the east edge open for the ferry's boarding gap.
for (const z of [344.5, 350, 355.5]) {
  dockTimber(0.16, 0.95, 0.16, -3.72, pierY + 0.62, z);
}
dockTimber(0.13, 0.13, 11.2, -3.72, pierY + 1.05, 350);
for (const z of [345.5, 355]) {
  dockTimber(0.18, 0.47, 0.18, 3.68, pierY + 0.35, z, dockIronMaterial);
}
addDockInstances(dockParts.timber, dockFrameMaterial, 'South Landing timber framework');
addDockInstances(dockParts.iron, dockIronMaterial, 'South Landing iron fittings');
scene.add(dock);

function onSouthPier(x, z) { return Math.abs(x) < 3.8 && z >= 342 && z <= 357; }
function playerGroundHeight(x, z) {
  const analytic = world.terrainHeight(x, z);
  // At high cliffs the coarse island grid and the analytic terrain sampler
  // can differ by metres. Blend to the visible triangle height before the
  // newly walkable crest, keeping inland props and low landing coves stable.
  const cliffBlend = THREE.MathUtils.smoothstep(world.coastalRadius(x, z), 0.93, 0.955)
    * THREE.MathUtils.smoothstep(analytic, 10, 18);
  const ground = THREE.MathUtils.lerp(analytic,
    world.renderedTerrainHeight(x, z), cliffBlend);
  return onSouthPier(x, z) ? Math.max(pierY + 0.14, ground) : ground;
}

const beaconGlowCanvas = document.createElement('canvas');
beaconGlowCanvas.width = beaconGlowCanvas.height = 64;
const beaconGlowContext = beaconGlowCanvas.getContext('2d');
const glowGradient = beaconGlowContext.createRadialGradient(32, 32, 1, 32, 32, 32);
glowGradient.addColorStop(0, 'rgba(255,251,225,0.95)');
glowGradient.addColorStop(0.2, 'rgba(255,238,189,0.6)');
glowGradient.addColorStop(1, 'rgba(255,215,150,0)');
beaconGlowContext.fillStyle = glowGradient;
beaconGlowContext.fillRect(0, 0, 64, 64);
const beaconGlowTexture = new THREE.CanvasTexture(beaconGlowCanvas);

function makeBeacon(x, z, height, color, strength) {
  const group = new THREE.Group();
  const y = world.terrainHeight(x, z);
  if (height > 35) {
    const wide = true;
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(wide ? 0.95 : 0.75, wide ? 2.1 : 1.55, height, 12),
      new THREE.MeshStandardMaterial({ color: 0x697574, roughness: 0.92, metalness: 0.04 }),
    );
    shaft.position.y = height / 2;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    group.add(shaft);
    for (const level of [0.18, 0.47, 0.76]) {
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry((wide ? 2.1 : 1.55) - level * (wide ? 1.15 : 0.8) + 0.07,
          (wide ? 2.1 : 1.55) - level * (wide ? 1.15 : 0.8) + 0.07, 0.16, 12),
        new THREE.MeshStandardMaterial({ color: 0x384449, roughness: 0.64, metalness: 0.58 }),
      );
      band.position.y = height * level;
      group.add(band);
    }
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(1.65, 1.65, 0.24, 12),
      new THREE.MeshStandardMaterial({ color: 0x303a3f, roughness: 0.72, metalness: 0.44 }),
    );
    platform.position.y = height - 0.25;
    group.add(platform);
  } else {
    // The inland survey stakes look through the rear towers toward the far
    // front light. An open steel frame keeps that real sightline visible.
    const steel = new THREE.MeshStandardMaterial({ color: 0x4f5e60, roughness: 0.82, metalness: 0.42 });
    const addBeam = (start, end, radius = 0.075) => {
      const from = new THREE.Vector3(...start);
      const to = new THREE.Vector3(...end);
      const direction = to.clone().sub(from);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 6), steel);
      beam.position.copy(from).add(to).multiplyScalar(0.5);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      beam.castShadow = true;
      beam.receiveShadow = true;
      group.add(beam);
    };
    const footprint = height > 23 ? 0.86 : 0.71;
    const cap = height > 23 ? 0.46 : 0.39;
    const radiusAt = (level) => footprint + (cap - footprint) * level / height;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      addBeam([sx * footprint, 0, sz * footprint], [sx * cap, height - 0.4, sz * cap], 0.09);
    }
    for (let level = 3.6; level < height - 0.5; level += 3.6) {
      const r = radiusAt(level);
      for (const sz of [-1, 1]) addBeam([-r, level, sz * r], [r, level, sz * r], 0.055);
      for (const sx of [-1, 1]) addBeam([sx * r, level, -r], [sx * r, level, r], 0.055);
    }
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(1.02, 1.02, 0.18, 12),
      new THREE.MeshStandardMaterial({ color: 0x303a3f, roughness: 0.72, metalness: 0.44 }),
    );
    platform.position.y = height - 0.26;
    group.add(platform);
  }
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.52, 16, 10), new THREE.MeshBasicMaterial({ color }));
  glass.position.y = height + 0.5;
  group.add(glass);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: beaconGlowTexture, color, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  halo.position.y = height + 0.5;
  halo.scale.setScalar(height > 35 ? 4.6 : 2.15);
  group.add(halo);
  const hood = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 0.95, 0.18, 12),
    new THREE.MeshStandardMaterial({ color: 0x26343a, roughness: 0.54, metalness: 0.62 }),
  );
  hood.position.y = height + 1.06;
  group.add(hood);
  const light = new THREE.PointLight(color, strength, 130, 1.2);
  light.position.y = height + 0.5;
  group.add(light);
  group.position.set(x, y, z);
  scene.add(group);
  return { group, glass, halo, light };
}
const lights = {
  front: makeBeacon(NAV_LIGHTS.front.x, NAV_LIGHTS.front.z, NAV_LIGHTS.front.height, 0xf8e6b4, 6),
  main: makeBeacon(NAV_LIGHTS.main.x, NAV_LIGHTS.main.z, NAV_LIGHTS.main.height, 0xffdf9c, 6),
  standby: makeBeacon(NAV_LIGHTS.standby.x, NAV_LIGHTS.standby.z, NAV_LIGHTS.standby.height, 0xf1c794, 5),
};

const surveyPosts = new Map();
for (const point of [
  { id: 'headland_view', x: -186, z: -120 },
  { id: 'east_ridge_view', x: 232, z: -120 },
]) {
  const y = world.terrainHeight(point.x, point.z);
  const post = new THREE.Group();
  addRect(post, 0.16, 1.5, 0.16, 0, 0.75, 0, 0x777d78);
  addRect(post, 0.45, 0.08, 0.45, 0, 1.52, 0, 0xb6a782);
  post.position.set(point.x, y, point.z);
  scene.add(post);
  surveyPosts.set(point.id, post);
}

const northJetty = new THREE.Group();
const northY = world.terrainHeight(-65, -315) + 0.08;
addRect(northJetty, 6, 0.3, 22, -65, northY, -322, 0x514b40);
for (const x of [-67.6, -62.4]) for (const z of [-315, -323, -331]) {
  addRect(northJetty, 0.46, 3.4, 0.46, x, northY-1.7, z, 0x4d463a);
}
scene.add(northJetty);
const northJettySurvey = createNorthJettySurvey(scene,
  world.terrainHeight, world.waterHeight);

// These markers provide a small physical glint rather than a floating quest icon.
function markerPosition(clue) {
  if (clue.room) {
    const site = siteById[clue.room];
    return new THREE.Vector3(site.x + clue.x, world.terrainHeight(site.x, site.z) + 1.15, site.z + clue.z);
  }
  return new THREE.Vector3(clue.world[0], world.terrainHeight(...clue.world) + 1.15, clue.world[1]);
}
for (const clue of CLUES) {
  const pos = markerPosition(clue);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.027, 5, 20),
    new THREE.MeshBasicMaterial({ color: 0xc5ad7f, transparent: true, opacity: 0.78, depthWrite: false }),
  );
  ring.position.copy(pos);
  ring.rotation.x = Math.PI / 2.8;
  scene.add(ring);
  markers.set(clue.id, ring);
}

function containingBuilding(x, z) {
  for (const site of SITES) {
    if (isInsideBuilding(site, x, z)) return site;
  }
  return null;
}
function canStandAt(x, z, checkPeople = true, fromX = null, fromZ = null) {
  if (southPierRailBlocks(x, z, PLAYER_RADIUS)) return false;
  if (SITES.some((site) => buildingWallBlocks(site, x, z, PLAYER_RADIUS))) return false;
  if (circlesBlock(x, z, PLAYER_RADIUS, world.natureObstacles)) return false;
  if (dressing.collides(x, z, PLAYER_RADIUS)) return false;
  if (ambientTraffic?.collides(x, z, PLAYER_RADIUS)) return false;
  if (ancillary.blocksMove(x, z, PLAYER_RADIUS)) return false;
  if (lodgeScene.blocksMove(x, z, PLAYER_RADIUS)) return false;
  if (pumpInterior.blocksMove(x, z, PLAYER_RADIUS)) return false;
  if (radioFurnitureBlocks(siteById.radio, x, z, PLAYER_RADIUS)
    && (fromX === null || fromZ === null || radioFurnitureBlocksMoveFrom(
      siteById.radio, fromX, fromZ, x, z, PLAYER_RADIUS))) return false;
  const fromArchive = Number.isFinite(fromX) && Number.isFinite(fromZ);
  if (archiveFurnitureBlocks(siteById.archive, x, z, PLAYER_RADIUS)
    && (!fromArchive || archiveFurnitureBlocksMoveFrom(siteById.archive,
      fromX, fromZ, x, z, PLAYER_RADIUS))) return false;
  if (signingRoomScene.blocksMove(x, z, PLAYER_RADIUS)
    && (!fromArchive || signingRoomScene.blocksMoveFrom(
      fromX, fromZ, x, z, PLAYER_RADIUS))) return false;
  if (checkPeople && (people.collides(x, z, PLAYER_RADIUS, peopleContext())
    || prisonPopulation.collides(x, z, PLAYER_RADIUS))) return false;
  return true;
}
function canMoveTo(x, z) {
  const coast = classifyCoastalStep({ x: state.x, z: state.z }, { x, z }, cliffWorld);
  if (coast.kind !== 'ground' && coast.kind !== 'ledge') return false;
  if (!canStandAt(x, z, false, state.x, state.z)) return false;
  if (ambientTraffic?.blocksMove(state.x, state.z, x, z, PLAYER_RADIUS)) return false;
  if (pumpInterior.blocksMoveFrom(state.x, state.z, x, z, PLAYER_RADIUS)) return false;
  if (people.blocksMove(state.x, state.z, x, z, peopleContext(), PLAYER_RADIUS)) return false;
  if (prisonPopulation.blocksMove(state.x, state.z, x, z, PLAYER_RADIUS)) return false;
  return true;
}

function tryPlayerStep(x, z) {
  const from = { x: state.x, z: state.z };
  const to = { x, z };
  const coast = classifyCoastalStep(from, to, cliffWorld);
  if (coast.kind === 'fall' && canStandAt(x, z, false)
    && !people.blocksMove(state.x, state.z, x, z, peopleContext(), PLAYER_RADIUS)
    && !prisonPopulation.blocksMove(state.x, state.z, x, z, PLAYER_RADIUS)) {
    cliffFall = beginCliffFall(cliffFall, from, to,
      playerGroundHeight(from.x, from.z), cliffWorld);
    if (cliffFall.phase === 'falling') {
      const height = cliffFall.eyeY - cliffWorld.waterHeight(to.x, to.z) - CLIFF_FALL.eyeHeight;
      fallExpectedSeconds = Math.sqrt(2 * Math.max(1, height) / CLIFF_FALL.gravity);
      if (state.survey.activeStake) leaveSurvey();
      keys.clear();
      sound.playFallStart();
      setInteractionPrompt();
    }
    return false;
  }
  if (!canMoveTo(x, z)) return false;
  state.x = x;
  state.z = z;
  return true;
}

function canPlaceVehicle(x, z, vehicle, radius = 0.42, ignoreAmbient = false) {
  if (!world.isWalkable(x, z)) return false;
  if (SITES.some((site) => buildingWallBlocks(site, x, z, radius))) return false;
  if (circlesBlock(x, z, radius, world.natureObstacles)) return false;
  if (ancillary.blocksMove(x, z, radius)) return false;
  if (pumpInterior.blocksMove(x, z, radius)) return false;
  if (radioFurnitureBlocks(siteById.radio, x, z, radius)) return false;
  if (signingRoomScene.blocksMove(x, z, radius)) return false;
  if (dressing.collides(x, z, radius, vehicle.id)) return false;
  if (!ignoreAmbient && ambientTraffic?.collides(x, z, radius)) return false;
  if (people.collides(x, z, radius, peopleContext())) return false;
  if (prisonPopulation.collides(x, z, radius)) return false;
  return true;
}

function peopleContext() {
  return { chapter: state.chapter, foundIds: state.found, choices: state.choices };
}

function setWeather() {
  const mode = state.ended ? 'dawn' : CHAPTERS[state.chapter].weather;
  world.setWeather(mode);
  $('weather-label').textContent = mode.toUpperCase();
}
setWeather();

function objectiveText() {
  const c = state.chapter;
  const found = state.found;
  if (c === 0) {
    if (!found.has('iris_note')) return chapterObjectives[0][0];
    if (!found.has('window_reflection')) return chapterObjectives[0][1];
    if (!found.has('lodge_working_carbon')) {
      const progress = lodgeSequenceMilestones(state.lodge, found);
      return `Inspect the shutter, lamp, and folder in the keeper’s lodge (${progress.completedStations}/3), then compare the carbon at the desk.`;
    }
    if (!signingMemoryMilestones(state.signingMemory, found).complete) {
      return 'Return to the lodge desk and examine the moment Mara signed the original finding.';
    }
    return 'Follow Iris’s evidence trail toward the survey archive.';
  }
  if (c === 1) {
    if (!found.has('archive_signing_finding')) {
      const signing = getSigningReconstructionPanel(state.signing, 'desk', found);
      if (signing.missingEvidenceIds.length) {
        const names = signing.missingEvidenceIds.map((id) => clueById[id]?.name).filter(Boolean);
        return `Read ${names.join(' and ')} before reconstructing the signing decision.`;
      }
      const progress = signingReconstructionMilestones(state.signing, found);
      return progress.completedStations < 3
        ? `Inspect the case intake tray, original-record sleeve, and closure docket (${progress.completedStations}/3).`
        : chapterObjectives[1][1];
    }
    const panel = getArchiveCasePanel(state.archive, found);
    if (panel.missingEvidenceIds.length) {
      const names = panel.missingEvidenceIds.map((id) => clueById[id]?.name).filter(Boolean);
      return `Read ${names.join(' and ')} in the survey archive.`;
    }
    return found.has('archive_reconstruction') ? chapterObjectives[1][0] : chapterObjectives[1][2];
  }
  if (c === 2) {
    if (!found.has('headland_view')) return chapterObjectives[2][0];
    if (!found.has('east_ridge_view')) return chapterObjectives[2][1];
    if (!found.has('tower_panel')) return found.has('north_jetty_sounding')
      ? 'Inspect the original control panel inside the signal tower.'
      : 'Inspect the signal tower controls. The north jetty depth board is an optional landing check.';
    const tower = towerCircuitMilestones(state.towerCircuit, found);
    if (!tower.wiringTraced) return 'Trace the standby conductor at the tower wiring plaque.';
    if (!tower.presentTestQualified) return 'Test the isolated repeater and qualify what its reading proves.';
    if (!tower.westTraced || !tower.eastTraced) return 'Pin both field photographs at the tower plotting rail.';
    if (!found.has('archive_chart')) return 'Read the harbor survey chart in the archive, then return to the tower.';
    if (!tower.safeLineCompared || !found.has('alignment_solution')) {
      return 'Project both light bearings across the north inlet chart in the tower.';
    }
    return 'Open the case board (B) and prove how the third light could mislead a vessel.';
  }
  if (c === 3) {
    if (!found.has('radio_route_verified')) return chapterObjectives[3][0];
    if (!found.has('lamp_strip') || !found.has('tunnel_signal')) return chapterObjectives[3][1];
    if (!state.choices.eliasRoute) return chapterObjectives[3][2];
    if (!witnessConfrontationMilestones(state.witness, witnessContext()).sceneComplete) {
      if (!found.has('pump_service_order')) {
        return 'Read the wreck-night service order on the Pump House’s north wall, then return to Elias’s radio-house worktable.';
      }
      return 'Compare Elias’s account with the service order and relay strip at the radio-house worktable.';
    }
    return 'Use the case board (B) to compare the official log with the relay strip and trace the radio voice.';
  }
  if (c === 4) {
    if (!found.has('pump_power')) return chapterObjectives[4][0];
    if (!isDeductionSolved(state.deductions, 'rescue_bearing')) return 'Prove the safe rescue bearing on the case board (B).';
    if (!found.has('launch_guided')) return chapterObjectives[4][1];
    if (!found.has('iris_rescued')) return chapterObjectives[4][2];
    if (!rescueAftermathMilestones(state.rescueAftermath,
      { foundIds: found }).complete) return 'Speak with Iris once she is clear of the service hatch.';
    return 'Complete Mara’s finding on the case board (B).';
  }
  if (!found.has('iris_handoff')) return chapterObjectives[5][0];
  if (!radioRoutingMilestones(state.routing).mainlandConnected) return chapterObjectives[5][1];
  if (!state.choices.initialPacket) return chapterObjectives[5][2];
  const panel = getDaybreakReportPanel(state.daybreakReport, found, state.deductions.solvedIds);
  if (panel.missingEvidenceIds.length) {
    const missing = panel.missingEvidenceIds.map((id) => clueById[id]?.name).filter(Boolean);
    return `Find ${missing.join(' and ')} for the corrected report.`;
  }
  if (panel.missingDeductionIds.length) return 'Finish the open conclusions on the case board (B).';
  if (!found.has('daybreak_report')) return chapterObjectives[5][3];
  const jetty = jettyReturnMilestones(state.jettyReturn, jettyContext());
  if (!jetty.complete) {
    if (jetty.completedBeats === 0) return chapterObjectives[5][4];
    if (jetty.completedBeats === 1) return 'Check Iris’s family copy at her jetty table.';
    if (jetty.completedBeats < 5) return 'Speak to the captain’s daughter at the jetty.';
    return 'Witness Iris’s document handoff at the seaward board.';
  }
  return 'Attend the reopened inquiry.';
}
function updateHud() {
  irisTrailProps.group.visible = state.chapter >= 3;
  jettyReturnProps.update(state.jettyReturn, jettyContext());
  $('chapter-label').textContent = `CHAPTER ${state.chapter + 1} · ${CHAPTERS[state.chapter].title}`;
  $('objective').textContent = state.ended
    ? inquiryMilestones(state.inquiry).complete
      ? 'The corrected finding is on the record.'
      : 'Answer the reopened inquiry · open it from the journal (J) or pause menu (Esc).'
    : objectiveText();
  setWeather();
}
updateHud();

let radioTimer = null;
function radio(message, duration = 10500) {
  if (!message) return;
  clearTimeout(radioTimer);
  $('radio-text').textContent = message;
  $('radio').classList.remove('hidden');
  sound.playRadio();
  radioTimer = setTimeout(() => $('radio').classList.add('hidden'), duration);
}
let toastTimer = null;
function toast(message, duration = 4200) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').classList.remove('hidden');
  toastTimer = setTimeout(() => $('toast').classList.add('hidden'), duration);
}

let pendingEpilogue = false;
let modalOpenedAt = 0;
let activeSpeakerId = null;
let pointerLockUnavailable = false;
let droneEntryAt = -Infinity;
function requestGamePointerLock() {
  if (chapterLoading.active || cutscenes.active || touchEnabled || pointerLockUnavailable
    || document.pointerLockElement === renderer.domElement) return;
  try {
    const request = renderer.domElement.requestPointerLock?.();
    request?.catch?.(() => {
      pointerLockUnavailable = true;
      toast('POINTER LOCK UNAVAILABLE · HOLD MOUSE BUTTON AND DRAG TO LOOK', 6500);
    });
  } catch {
    pointerLockUnavailable = true;
    toast('POINTER LOCK UNAVAILABLE · HOLD MOUSE BUTTON AND DRAG TO LOOK', 6500);
  }
}
function droneFlightAvailable() {
  return state.started && !chapterLoading.active && !cutscenes.active
    && !driving.active && !voyage.active && !state.survey.activeStake
    && cliffFall.phase === 'grounded' && respawnFadeTime < 0
    && !pendingCutsceneId;
}
function enterDroneView() {
  if (!droneFlightAvailable() || state.modal) return false;
  keys.clear();
  touchControls.reset();
  if (!drone.enter({
    x: state.x, z: state.z, y: playerGroundHeight(state.x, state.z) + 1.72,
    yaw: state.yaw, pitch: state.pitch,
  })) return false;
  document.body.classList.add('drone-active');
  $('drone-hud').classList.remove('hidden');
  setInteractionPrompt();
  toast(touchEnabled ? 'DRONE VIEW · TAP EXIT DRONE TO RETURN'
    : 'DRONE VIEW · G TO RETURN TO INVESTIGATION', 2800);
  // An existing pointer lock carries into flight. If the browser drops it
  // during the mode switch, do not interpret that same gesture as Pause.
  droneEntryAt = performance.now();
  return true;
}
function exitDroneView() {
  if (!drone.exit()) return false;
  keys.clear();
  touchControls.reset();
  orientFirstPersonCamera(camera, state.yaw, state.pitch);
  document.body.classList.remove('drone-active');
  $('drone-hud').classList.add('hidden');
  if (!state.modal) requestGamePointerLock();
  return true;
}
function toggleDroneView() {
  return drone.active ? exitDroneView() : enterDroneView();
}
function closeModal(options = {}) {
  if (pendingEpilogue) {
    pendingEpilogue = false;
    showEpilogue();
    return;
  }
  $('modal').classList.add('hidden');
  state.modal = false;
  activeSpeakerId = null;
  $('menu-button').classList.remove('hidden');
  $('menu-button').disabled = false;
  $('menu-button').removeAttribute('aria-hidden');
  if (pendingCutsceneId && startStoryCutscene()) return;
  if (state.started && !chapterLoading.active && !options.skipPointerLock) requestGamePointerLock();
}
function openModal(kicker, title, body, actions = []) {
  state.modal = true;
  touchControls.reset();
  activeSpeakerId = null;
  modalOpenedAt = performance.now();
  $('menu-button').classList.add('hidden');
  $('menu-button').disabled = true;
  $('menu-button').setAttribute('aria-hidden', 'true');
  if (document.pointerLockElement) document.exitPointerLock();
  $('modal-kicker').textContent = kicker;
  $('modal-title').textContent = title;
  $('modal-body').innerHTML = body;
  $('modal-actions').replaceChildren();
  for (const item of actions) {
    const button = document.createElement('button');
    button.className = `action${item.secondary ? ' secondary' : ''}`;
    button.textContent = item.label;
    button.onclick = item.onClick;
    $('modal-actions').appendChild(button);
  }
  if (!actions.length) {
    const button = document.createElement('button');
    button.className = 'action';
    button.textContent = 'CONTINUE';
    button.onclick = closeModal;
    $('modal-actions').appendChild(button);
  }
  $('modal').classList.remove('hidden');
}
$('modal-close').addEventListener('click', closeModal);

function openArrivalPanel(feedback = '') {
  const panel = voyage.getPanel();
  if (!panel) return;
  $('objective').textContent = panel.status === 'docked'
    ? 'Step onto the south pier and climb toward the keeper’s lodge.'
    : panel.status === 'stalled'
      ? 'The ferry is caught just short of the pier. Point out the clear channel to the skipper, or wait for him to free it.'
    : panel.observed.pier
      ? 'Watch the ferry enter the cove and berth at the verified south pier.'
      : 'Verify the south pier with the skipper, then land beneath the cliffs.';
  const notes = Object.values(panel.observed).filter(Boolean).length;
  openModal('THE CROSSING · SOUTH COVE', panel.title,
    `<p class="mechanism-instruction">${escapeHtml(panel.text)}</p>
    <p class="case-count">${notes} OF 4 CROSSING OBSERVATIONS RECORDED</p>
    ${feedback ? `<p class="mechanism-feedback" role="status">${escapeHtml(feedback)}</p>` : ''}`,
    [
      ...panel.actions.map(({ label, action }) => ({
        label, onClick: () => runArrivalAction(action),
      })),
      { label: 'WATCH THE APPROACH · E FOR NOTES', secondary: true, onClick: closeModal },
    ]);
}

function runArrivalAction(action) {
  const result = voyage.applyAction(action);
  if (result.complete && result.handoff) queueStoryCutscene('ferry_landing');
  if (result.journal && !state.arrivalNotes.includes(result.journal)) {
    state.arrivalNotes.push(result.journal);
  }
  if (result.status === 'changed' || result.complete) {
    sound.playInteraction();
    save();
  }
  if (result.complete && result.handoff) {
    state.x = result.handoff.x;
    state.z = result.handoff.z;
    state.yaw = result.handoff.yaw;
    state.pitch = -0.045;
    $('controls-hint').textContent = 'WASD MOVE · M MAP · J JOURNAL · B CASE BOARD · E INSPECT · F LIGHT · U AUDIO · ESC MENU';
    updateHud();
    closeModal({ skipPointerLock: true });
    if (!cutscenes.active) requestGamePointerLock();
    radio(CHAPTERS[0].radio, 11500);
    toast('ASHORE AT SOUTH LANDING · CLIMB TO THE KEEPER’S LODGE', 7000);
    save();
    return;
  }
  openArrivalPanel(result.message);
}

function recordClue(clue, body = clue.body, actions = []) {
  const newClue = !state.found.has(clue.id);
  if (newClue) {
    state.found.add(clue.id);
    sound.playClue();
  }
  openModal(clue.category, clue.name, body, actions);
  if (newClue) {
    if (clue.radio && !state.ended && !state.routing.localLoopIsolated) {
      setTimeout(() => radio(clue.radio), 300);
    }
    checkChapter();
    // Persist the clue and any earned chapter transition as one snapshot.
    save();
  }
}

let surveyEvaluation = null;
function surveyPhotoHtml(clue) {
  const photo = state.surveyPhotos[clue.id];
  return photo ? `<figure class="field-photo"><img src="${photo}" alt="Survey photograph from ${escapeHtml(clue.name)}"/><figcaption>FIELD CAMERA · ${escapeHtml(clue.name.toUpperCase())}</figcaption></figure>` : '';
}
function leaveSurvey() {
  state.survey = { ...state.survey, activeStake: null, holdSeconds: 0, lastAim: null };
  surveyEvaluation = null;
  camera.fov = 72;
  camera.updateProjectionMatrix();
  $('survey-overlay').classList.add('hidden');
  $('controls-hint').textContent = 'WASD MOVE · M MAP · J JOURNAL · B CASE BOARD · E INSPECT · F LIGHT · U AUDIO · ESC MENU';
}
function startSurvey(clue) {
  state.survey = beginSurvey(state.survey, clue.id);
  surveyEvaluation = null;
  camera.fov = 52;
  camera.updateProjectionMatrix();
  $('survey-overlay').classList.remove('hidden');
  $('interaction').classList.add('hidden');
  $('radio').classList.add('hidden');
  $('survey-title').textContent = clue.name.toUpperCase();
  $('survey-status').textContent = 'Stand at the survey bolt. Bring both lights into the frame.';
  $('controls-hint').textContent = 'MOUSE AIM · WHEEL / +/- ZOOM · SPACE / CLICK SHUTTER · WASD POSITION · ESC EXIT';
  toast('FIELD CAMERA · FRAME THE LOWER FRONT AND UPPER REAR LIGHTS', 5700);
}
function photographCurrentView(stakeId) {
  try {
    // Render directly before copying: with the default non-preserved drawing
    // buffer, reading an older frame after browser compositing is undefined.
    renderer.render(scene, camera);
    const frame = document.createElement('canvas');
    frame.width = 768;
    frame.height = 432;
    const context = frame.getContext('2d');
    context.drawImage(renderer.domElement, 0, 0, frame.width, frame.height);
    // These are Mara's survey annotations, projected from the actual lamp
    // heads onto her photograph. The image pixels beneath them are unchanged.
    const rearId = SURVEY_STAKES[stakeId]?.rear;
    const marks = [
      { id: 'front', label: 'FRONT', color: '#d6e6d9' },
      { id: rearId, label: rearId === 'standby' ? 'STANDBY' : 'MAIN', color: '#f5d299' },
    ];
    for (const mark of marks) {
      const lamp = NAV_LIGHTS[mark.id];
      if (!lamp) continue;
      const ndc = new THREE.Vector3(lamp.x,
        world.terrainHeight(lamp.x, lamp.z) + lamp.height + 0.5, lamp.z).project(camera);
      const x = (ndc.x + 1) * frame.width / 2;
      const y = (1 - ndc.y) * frame.height / 2;
      if (x < 13 || x > frame.width - 13 || y < 13 || y > frame.height - 13) continue;
      context.strokeStyle = mark.color;
      context.lineWidth = 1.8;
      context.beginPath();
      context.arc(x, y, 11, 0, Math.PI * 2);
      context.moveTo(x - 17, y); context.lineTo(x - 6, y);
      context.moveTo(x + 6, y); context.lineTo(x + 17, y);
      context.stroke();
      context.font = 'bold 10px Arial, sans-serif';
      const width = context.measureText(mark.label).width + 11;
      const labelX = Math.min(frame.width - width - 4, x + 19);
      const labelY = Math.max(15, y - 6);
      context.fillStyle = 'rgba(6, 20, 24, 0.84)';
      context.fillRect(labelX, labelY - 11, width, 15);
      context.fillStyle = mark.color;
      context.fillText(mark.label, labelX + 5, labelY);
    }
    context.fillStyle = 'rgba(6, 20, 24, 0.78)';
    context.fillRect(0, frame.height - 20, 203, 20);
    context.fillStyle = '#eee1c7';
    context.font = 'bold 9px Arial, sans-serif';
    context.fillText('SURVEY RETICLES · LAMP CENTERS', 9, frame.height - 7);
    return frame.toDataURL('image/jpeg', 0.74);
  } catch { return ''; }
}
function shutterSurvey() {
  const id = state.survey.activeStake;
  if (!id) return;
  const result = commitSurveyCapture(state.survey, surveyEvaluation);
  if (!result.accepted) {
    sound.playInteraction();
    toast('HOLD THE CORRECT LIGHT PAIR STEADY BEFORE TAKING THE PHOTOGRAPH', 3200);
    return;
  }
  const photo = photographCurrentView(id);
  state.survey = result.state;
  if (photo && photo.length < 500000) state.surveyPhotos[id] = photo;
  leaveSurvey();
  const clue = clueById[id];
  recordClue(clue, surveyPhotoHtml(clue) + clue.body);
}
function updateSurveyCamera(dt) {
  const id = state.survey.activeStake;
  if (!id) return;
  surveyEvaluation = evaluateSurveyFrame({
    stakeId: id,
    observer: { x: state.x, y: camera.position.y, z: state.z },
    yaw: state.yaw, pitch: state.pitch, fov: camera.fov, aspect: camera.aspect,
    terrainHeight: world.terrainHeight,
    visibleLights: { front: true, main: true, standby: lights.standby.group.visible },
  });
  state.survey = stepSurveyHold(state.survey, surveyEvaluation, dt);
  const status = surveyEvaluation.status;
  let message = {
    move_to_stake: `MOVE CLOSER TO THE SURVEY BOLT · ${surveyEvaluation.distanceFromStake?.toFixed(1)} M`,
    obscured: 'THE HILL HIDES A LAMP · REPOSITION AT THE BOLT',
    wait_for_light: 'STANDBY LAMP DARK · HOLD YOUR FRAME',
    bearing_mismatch: 'THE LIGHTS DO NOT ALIGN · STAND DIRECTLY AT THE BOLT',
    zoom_in: 'ZOOM IN UNTIL BOTH LIGHTS FILL THE FRAME',
    aim_at_pair: 'FIND THE LOWER FRONT AND UPPER REAR LIGHTS',
    ready: 'PAIR ALIGNED · HOLD THE CAMERA STEADY',
    invalid: 'CAMERA SIGNAL LOST · STEP BACK AND TRY AGAIN',
  }[status] || 'FIND THE TWO LIGHTS';
  if (status === 'aim_at_pair' && Number.isFinite(surveyEvaluation.targetYaw)) {
    const turn = Math.atan2(Math.sin(surveyEvaluation.targetYaw - state.yaw), Math.cos(surveyEvaluation.targetYaw - state.yaw));
    const lift = surveyEvaluation.targetPitch - state.pitch;
    if (Math.abs(turn) > 0.07) message += turn > 0 ? ' · TURN LEFT' : ' · TURN RIGHT';
    else if (Math.abs(lift) > 0.07) message += lift > 0 ? ' · LOOK UP' : ' · LOOK DOWN';
  }
  $('survey-status').textContent = message;
  $('survey-zoom').textContent = `${Math.round(camera.fov)}°`;
  const fraction = Math.min(1, state.survey.holdSeconds / SURVEY_HOLD_SECONDS);
  $('survey-hold-fill').style.width = `${Math.round(fraction * 100)}%`;
  $('survey-shutter').textContent = fraction >= 1 ? 'SPACE / CLICK · TAKE PHOTOGRAPH' : 'STEADY THE PAIR TO RELEASE SHUTTER';
  $('survey-mist').textContent = chapterThreeMist({
    chapter: state.chapter, elapsed, x: state.x, z: state.z,
  }).cue;
  $('survey-overlay').classList.toggle('ready', fraction >= 1);
}

function nextRenderedFrame() {
  return new Promise((resolve) => renderedFrameWaiters.push(resolve));
}

async function prepareChapterView(label, onReady = null, initialToken = null) {
  const token = initialToken ?? chapterLoading.show(label,
    'Loading the island and preparing the chapter view…');
  keys.clear();
  touchControls.reset();
  try {
    chapterLoading.setPhase('assets', 'Loading island models and textures…');
    // The first frame also starts character assets that are requested only
    // when that chapter makes their figures visible.
    await nextRenderedFrame();
    await assetLoading.whenIdle();
    if (!chapterLoading.isCurrent(token)) return;
    chapterLoading.setPhase('scene', 'Preparing the playable chapter view…');
    await renderer.compileAsync(scene, camera);
    await nextRenderedFrame();
    await assetLoading.whenIdle();
    if (!chapterLoading.isCurrent(token)) return;
    // A rendered frame must reach the screen before the overlay comes away.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (chapterLoading.hide(token)) onReady?.();
  } catch (error) {
    console.error('Chapter view failed to prepare:', error);
    chapterLoading.fail(token);
  }
}

function checkChapter({ deferLoad = false } = {}) {
  const progress = campaignAdvanceStatus(state);
  if (!progress.ready) {
    if (progress.reason === 'ended') return;
    updateHud();
    if (progress.hint) toast(progress.hint,
      progress.reason === 'jetty_return' ? 6500 : 6200);
    return;
  }
  if (progress.finish) return finish();
  state.chapter = progress.nextChapter;
  updateHud();
  save();
  if (deferLoad) return;
  void prepareChapterView(`CHAPTER ${state.chapter + 1} · ${CHAPTERS[state.chapter].title}`,
    () => {
      toast(`CHAPTER ${state.chapter + 1} — ${CHAPTERS[state.chapter].title}`, 6500);
      setTimeout(() => radio(CHAPTERS[state.chapter].radio), 2600);
    });
}

function openLodgeStation(stationId, feedback = '') {
  if (stationId === 'desk' && lodgeSequenceMilestones(state.lodge, state.found).qualificationCompared
    && !state.found.has('lodge_working_carbon')) {
    // Repair an interrupted save between comparing the carbon and filing it.
    recordClue(clueById.lodge_working_carbon, clueById.lodge_working_carbon.body);
    return;
  }
  if (stationId === 'desk' && state.found.has('lodge_working_carbon')
    && !signingMemoryMilestones(state.signingMemory, state.found).complete) {
    openSigningMemory();
    return;
  }
  const panel = getLodgeSequencePanel(state.lodge, stationId, state.found);
  const body = `<p class="mechanism-instruction">${escapeHtml(panel.text)}</p>
    ${feedback ? `<p class="mechanism-feedback" role="status">${escapeHtml(feedback)}</p>` : ''}`;
  openModal('KEEPER’S LODGE · CASE ROOM', panel.title, body, [
    ...panel.actions.map(({ label, action }) => ({
      label, onClick: () => runLodgeAction(stationId, action),
    })),
    { label: 'RETURN TO LODGE', secondary: true, onClick: closeModal },
  ]);
}

function openSigningMemory(feedback = '') {
  const panel = getSigningMemoryPanel(state.signingMemory, state.found);
  const progress = signingMemoryMilestones(state.signingMemory, state.found);
  openModal('MARA’S RECOLLECTION · SEVENTEEN YEARS AGO', panel.title,
    `<p class="mechanism-instruction">${escapeHtml(panel.text)}</p>
    ${feedback ? `<p class="mechanism-feedback" role="status">${escapeHtml(feedback)}</p>` : ''}
    <p class="case-count">SIGNING ROOM · ${progress.inspectedCount} OF 3 DETAILS EXAMINED</p>`, [
      ...panel.actions.map(({ label, action }) => ({
        label, onClick: () => runSigningMemoryAction(action),
      })),
      { label: 'RETURN TO LODGE', secondary: true, onClick: closeModal },
    ]);
}

function runSigningMemoryAction(action) {
  const result = applySigningMemoryAction(state.signingMemory, action, state.found);
  state.signingMemory = result.state;
  // Resolve an earned chapter transition before persisting the final memory.
  if (result.event === 'signing_memory_complete') checkChapter();
  if (result.status === 'changed' || result.status === 'complete') {
    sound.playClue();
    save();
    updateHud();
  } else sound.playInteraction();
  openSigningMemory(result.message);
}

function runLodgeAction(stationId, action) {
  const result = applyLodgeSequenceAction(state.lodge, action, state.found);
  state.lodge = result.state;
  lodgeScene.update(state.lodge, state.found);
  if (result.status === 'changed' || result.status === 'complete') {
    sound.playClue();
    if (result.event !== 'lodge_case_compared') {
      save();
      updateHud();
    }
  } else sound.playInteraction();
  if (result.event === 'lodge_case_compared') {
    recordClue(clueById.lodge_working_carbon,
      `<p class="mechanism-feedback">${escapeHtml(result.message)}</p>${clueById.lodge_working_carbon.body}`,
      [{ label: 'REMEMBER THE SIGNING ROOM', onClick: () => openSigningMemory() },
        { label: 'RETURN TO LODGE', secondary: true, onClick: closeModal }]);
    return;
  }
  openLodgeStation(stationId, result.message);
}

function openSigningStation(stationId, feedback = '') {
  const panel = getSigningReconstructionPanel(state.signing, stationId, state.found);
  if (stationId === 'desk' && panel.complete && !state.found.has('archive_signing_finding')) {
    // Recovery for a save written after the final station action but before
    // its journal finding was recorded.
    recordClue(clueById.archive_signing_finding, clueById.archive_signing_finding.body);
    return;
  }
  const progress = signingReconstructionMilestones(state.signing, state.found);
  const body = `<p class="mechanism-instruction">${escapeHtml(panel.text)}</p>
    <p class="case-count">${progress.completedStations} OF 4 SIGNING OBSERVATIONS RECORDED</p>
    ${feedback ? `<p class="mechanism-feedback" role="status">${escapeHtml(feedback)}</p>` : ''}`;
  openModal('SURVEY ARCHIVE · SIGNING ROOM', panel.title, body, [
    ...panel.actions.map(({ label, action }) => ({
      label, onClick: () => runSigningAction(stationId, action),
    })),
    ...(panel.complete && stationId === 'desk' && !state.found.has('archive_reconstruction')
      ? [{ label: 'COMPARE THE LATER ARCHIVE RECORDS', onClick: () => openArchiveCase() }] : []),
    { label: 'RETURN TO ARCHIVE', secondary: true, onClick: closeModal },
  ]);
}

function runSigningAction(stationId, action) {
  const result = applySigningReconstructionAction(state.signing, action, state.found);
  state.signing = result.state;
  signingRoomScene.update(state.signing, state.found);
  if (result.status === 'changed' || result.status === 'complete') {
    sound.playClue();
    if (result.event !== 'signing_reconstructed') {
      save();
      updateHud();
    }
  } else sound.playInteraction();
  if (result.event === 'signing_reconstructed') {
    recordClue(clueById.archive_signing_finding,
      `<p class="mechanism-feedback">${escapeHtml(result.message)}</p>${clueById.archive_signing_finding.body}`);
    return;
  }
  openSigningStation(stationId, result.message);
}

function openTowerCircuitStation(stationId, feedback = '') {
  const progress = towerCircuitMilestones(state.towerCircuit, state.found);
  if (stationId === 'chart' && progress.safeLineCompared && !state.found.has('alignment_solution')) {
    // The plotted comparison may have been saved before the alignment clue.
    const recovered = recordTowerAlignment('The chart comparison confirms the safe line.');
    if (recovered) return;
    feedback = 'Review both field photographs and the tower panel before recording the safe line.';
  }
  const panel = getTowerCircuitPanel(state.towerCircuit, stationId, state.found);
  const body = `<p class="mechanism-instruction">${escapeHtml(panel.text)}</p>
    <p class="case-count">${progress.completedStations} OF 4 TOWER COMPARISONS RECORDED</p>
    ${feedback ? `<p class="mechanism-feedback" role="status">${escapeHtml(feedback)}</p>` : ''}`;
  openModal('SIGNAL TOWER · CIRCUIT AND BEARINGS', panel.title, body, [
    ...panel.actions.map(({ label, action }) => ({
      label, onClick: () => runTowerCircuitAction(stationId, action),
    })),
    ...(stationId === 'overlay' && photoReckoningReady(photoReckoningContext())
      ? [{ label: photoReckoningMilestones(state.photoReckoning, photoReckoningContext()).complete
        ? 'REVIEW MARA’S FIELD NOTE' : 'FACE MARA’S OLD MARGIN · OPTIONAL',
      onClick: () => openPhotoReckoning() }] : []),
    { label: 'RETURN TO TOWER', secondary: true, onClick: closeModal },
  ]);
}

function photoReckoningContext() {
  return {
    chapter: state.chapter, foundIds: state.found,
    towerCircuit: state.towerCircuit, atTower: state.inside?.id === 'tower',
  };
}

function photoReckoningPrints() {
  return `<div class="photo-reckoning-prints">${[
    ['headland_view', 'WEST STAKE · MAIN REAR + FRONT'],
    ['east_ridge_view', 'EAST STAKE · STANDBY REAR + FRONT'],
  ].map(([id, label]) => {
    const photo = state.surveyPhotos[id];
    return photo && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo)
      ? `<figure class="photo-reckoning-print"><img src="${photo}" alt="${label.toLowerCase()} survey photograph"><figcaption>${label}</figcaption></figure>`
      : `<figure class="photo-reckoning-print empty"><figcaption>${label}<br>Field observation recorded; image unavailable in this save.</figcaption></figure>`;
  }).join('')}</div>`;
}

function openPhotoReckoning(feedback = '') {
  const panel = getPhotoReckoningPanel(state.photoReckoning, photoReckoningContext());
  const progress = photoReckoningMilestones(state.photoReckoning, photoReckoningContext());
  const body = `${photoReckoningPrints()}<p class="mechanism-instruction">${escapeHtml(panel.text)}</p>
    <p class="case-count">${progress.completedBeats} OF 3 FIELD RECKONING NOTES · OPTIONAL</p>
    ${feedback ? `<p class="mechanism-feedback" role="status">${escapeHtml(feedback)}</p>` : ''}`;
  openModal('SIGNAL TOWER · FIELD RECKONING', panel.title, body, [
    ...panel.actions.map(({ label, action }) => ({
      label, onClick: () => runPhotoReckoningAction(action),
    })),
    { label: 'BACK TO PLOTTING RAIL', secondary: true,
      onClick: () => openTowerCircuitStation('overlay') },
  ]);
}

function runPhotoReckoningAction(action) {
  const result = applyPhotoReckoningAction(state.photoReckoning, action, photoReckoningContext());
  state.photoReckoning = result.state;
  if (result.status === 'changed' || result.status === 'complete') {
    sound.playClue();
    save();
    if (result.status === 'complete') toast('MARA’S FIELD RECKONING ADDED TO JOURNAL', 6000);
  } else sound.playInteraction();
  openPhotoReckoning(result.message);
}

function runTowerCircuitAction(stationId, action) {
  const result = applyTowerCircuitAction(state.towerCircuit, action, state.found);
  state.towerCircuit = result.state;
  towerCircuitProps.update(state.towerCircuit, state.found);
  if (result.status === 'changed' || result.status === 'complete') {
    sound.playClue();
    if (result.event !== 'tower_channel_compared') {
      save();
      updateHud();
    }
  } else sound.playInteraction();
  if (result.event === 'tower_channel_compared') {
    if (!recordTowerAlignment(result.message)) openTowerCircuitStation(stationId,
      'Review both field photographs and the tower panel before recording the safe line.');
    return;
  }
  openTowerCircuitStation(stationId, result.message);
}

function recordTowerAlignment(message) {
  for (const action of [
    { type: 'alignment.trace', stake: 'west', rear: 'main' },
    { type: 'alignment.trace', stake: 'east', rear: 'standby' },
    { type: 'alignment.confirm', rear: 'main' },
  ]) {
    const alignment = applyMechanismAction(state.mechanisms, action, state.found);
    if (alignment.status === 'blocked' || alignment.status === 'mistake') return false;
    state.mechanisms = alignment.state;
  }
  const clue = clueById.alignment_solution;
  recordClue(clue, `<p class="mechanism-feedback">${escapeHtml(message)}</p>${clue.body}`);
  return true;
}

function irisTrailContext() {
  return { chapter: state.chapter, foundIds: state.found };
}

function openIrisTrailStation(stationId, feedback = '') {
  const panel = getIrisTrailPanel(state.irisTrail, stationId, irisTrailContext());
  const progress = irisTrailMilestones(state.irisTrail, irisTrailContext());
  const body = `<p class="mechanism-instruction">${escapeHtml(panel.text)}</p>
    <p class="case-count">${progress.observedStations + Number(progress.reconstructed)} OF 4 FIELD TRACES RECORDED · OPTIONAL</p>
    ${feedback ? `<p class="mechanism-feedback" role="status">${escapeHtml(feedback)}</p>` : ''}`;
  openModal('IRIS’S FIELD ROUTE · OPTIONAL', panel.title, body, [
    ...panel.actions.map(({ label, action }) => ({
      label, onClick: () => runIrisTrailAction(stationId, action),
    })),
    ...(panel.summaryText ? [{ label: 'READ ROUTE IN JOURNAL', secondary: true, onClick: openJournal }] : []),
    { label: 'RETURN TO ISLAND', secondary: true, onClick: closeModal },
  ]);
}

function runIrisTrailAction(stationId, action) {
  const result = applyIrisTrailAction(state.irisTrail, action, irisTrailContext());
  state.irisTrail = result.state;
  if (result.status === 'changed' || result.status === 'complete') {
    sound.playClue();
    save();
    if (result.event === 'iris_route_reconstructed') {
      toast('IRIS’S DOCUMENTED ROUTE ADDED TO FIELD JOURNAL', 6500);
    }
  } else sound.playInteraction();
  openIrisTrailStation(stationId,
    result.status === 'changed' || result.status === 'complete' ? '' : result.message);
}

function openArchiveCase(feedback = '') {
  if (!state.found.has('archive_signing_finding')) {
    openSigningStation('desk', feedback || 'First establish what Mara knew and chose before comparing later archive sources.');
    return;
  }
  const progress = archiveCaseMilestones(state.archive);
  if (progress.reconstructed && !state.found.has('archive_reconstruction')) {
    // The last comparison step and its clue are separate saved writes.
    // Recover the finding if a browser closes between them.
    recordClue(clueById.archive_reconstruction, clueById.archive_reconstruction.body);
    return;
  }
  const panel = getArchiveCasePanel(state.archive, state.found);
  const body = `<p class="mechanism-instruction">${escapeHtml(panel.text)}</p>
    <p class="case-count">COMPARISON ${Math.min(progress.completedSteps + 1, 4)} OF 4</p>
    ${feedback ? `<p class="mechanism-feedback" role="status">${escapeHtml(feedback)}</p>` : ''}
    <details class="mechanism-notes"><summary>REVIEW DESK INSTRUCTIONS</summary>${clueById.archive_reconstruction.body}</details>`;
  openModal('SURVEY ARCHIVE · SOURCE COMPARISON', panel.title, body, [
    ...panel.actions.map(({ label, action }) => ({ label, onClick: () => runArchiveCaseAction(action) })),
    ...(maraDraftResponseReady(maraResponseContext()) ? [{
      label: maraDraftResponseMilestones(state.maraDraftResponse, maraResponseContext()).complete
        ? 'READ MARA’S HELD STATEMENT · OPTIONAL'
        : 'SIT WITH MARA’S DRAFT · OPTIONAL',
      onClick: () => openMaraDraftResponse(),
    }] : []),
    { label: 'RETURN TO RECORDS', secondary: true, onClick: closeModal },
  ]);
}

function openMaraDraftResponse(feedback = '') {
  const context = maraResponseContext();
  const panel = getMaraDraftResponsePanel(state.maraDraftResponse, context);
  const progress = maraDraftResponseMilestones(state.maraDraftResponse, context);
  const statement = panel.statementText
    ? `<div class="archive-held-statement"><p>${escapeHtml(panel.statementText).replace(/\n\n/g, '</p><p>')}</p></div>`
    : '';
  openModal('SURVEY ARCHIVE · HELD STATEMENT', panel.title,
    `<p class="mechanism-instruction">${escapeHtml(panel.text)}</p>
    <p class="case-count">MARA’S RESPONSE · ${progress.completedBeats} OF 5 BEATS · OPTIONAL</p>
    ${feedback ? `<p class="mechanism-feedback" role="status">${escapeHtml(feedback)}</p>` : ''}
    ${statement}`, [
      ...panel.actions.map(({ label, action }) => ({
        label, onClick: () => runMaraDraftResponseAction(action),
      })),
      { label: 'BACK TO SOURCE COMPARISON', secondary: true, onClick: () => openArchiveCase() },
    ]);
}

function runMaraDraftResponseAction(action) {
  const result = applyMaraDraftResponseAction(state.maraDraftResponse, action, maraResponseContext());
  state.maraDraftResponse = result.state;
  sound.playInteraction();
  if (result.status === 'changed' || result.status === 'complete') {
    save();
    updateHud();
  }
  openMaraDraftResponse(result.message);
}

function runArchiveCaseAction(action) {
  const result = applyArchiveCaseAction(state.archive, action, state.found);
  state.archive = result.state;
  if (result.status === 'changed' || result.status === 'complete') {
    sound.playInteraction();
    // recordClue saves the final archive state together with its finding.
    if (result.event !== 'archive_reconstructed') {
      save();
      updateHud();
    }
  }
  if (result.event === 'archive_reconstructed') {
    const responseReady = maraDraftResponseReady({
      chapter: state.chapter,
      foundIds: new Set([...state.found, 'archive_reconstruction']),
    });
    recordClue(clueById.archive_reconstruction,
      `<p class="mechanism-feedback">${escapeHtml(result.message)}</p>${clueById.archive_reconstruction.body}`,
      responseReady ? [{ label: 'SIT WITH MARA’S DRAFT · OPTIONAL',
        onClick: () => openMaraDraftResponse() }] : []);
    return;
  }
  openArchiveCase(result.message);
}

function openRadioRouting(feedback = '') {
  const progress = radioRoutingMilestones(state.routing);
  if (progress.voiceTraced && !state.found.has('radio_route_verified')) {
    recordClue(clueById.radio_route_verified, clueById.radio_route_verified.body);
    return;
  }
  const panel = getRadioRoutingPanel(state.routing, state.found);
  const missing = panel.missingEvidenceIds.map((id) => clueById[id]?.name || id);
  const body = `<p class="mechanism-instruction">${escapeHtml(panel.text)}</p>
    ${missing.length ? `<p class="case-feedback">Read: ${escapeHtml(missing.join(', '))}.</p>` : ''}
    ${feedback ? `<p class="mechanism-feedback" role="status">${escapeHtml(feedback)}</p>` : ''}
    <details class="mechanism-notes"><summary>REVIEW THE PATCH</summary>${clueById.radio_route_verified.body}</details>`;
  openModal('RADIO HOUSE · CIRCUIT TRACE', panel.title, body, [
    ...panel.actions.map(({ label, action }) => ({ label, onClick: () => runRadioRoutingAction(action) })),
    ...(progress.voiceTraced ? [{ label: 'SPEAK TO ELIAS', onClick: () => openChoiceRoute('elias') }] : []),
    ...(progress.mainlandConnected ? [{ label: 'MAINLAND EVIDENCE PACKET', onClick: () => openChoiceRoute('packet') }] : []),
    { label: 'LEAVE SWITCHBOARD', secondary: true, onClick: closeModal },
  ]);
}

function runRadioRoutingAction(action) {
  const result = applyRadioRoutingAction(state.routing, action, state.found);
  state.routing = result.state;
  if (result.status === 'changed' || result.status === 'complete') {
    sound.playInteraction();
    if (result.event !== 'route_verified') {
      save();
      updateHud();
    }
  }
  if (result.event === 'route_verified') {
    recordClue(clueById.radio_route_verified,
      `<p class="mechanism-feedback">${escapeHtml(result.message)}</p>${clueById.radio_route_verified.body}`);
    return;
  }
  if (result.event === 'mainland_patch_verified') {
    radio('Mainland control to Greywake. This is the shore desk. Your line is clear. What help do you need?', 11000);
    openChoiceRoute('packet', result.message);
    return;
  }
  openRadioRouting(result.message);
}

function openChoiceRoute(route, feedback = '') {
  if (route === 'iris' && state.choices.irisAsked && !state.found.has('iris_handoff')) {
    recordClue(clueById.iris_handoff, clueById.iris_handoff.body);
    return;
  }
  const panel = getChoiceRoutePanel(state.choices, route, choiceContext());
  const missing = panel.missingEvidenceIds.map((id) => clueById[id]?.name || id);
  const body = `<p class="mechanism-instruction">${escapeHtml(panel.text)}</p>
    ${missing.length ? `<p class="case-feedback">For the full account, still needed: ${escapeHtml(missing.join(', '))}.</p>` : ''}
    ${feedback ? `<p class="mechanism-feedback" role="status">${escapeHtml(feedback)}</p>` : ''}`;
  openModal(route === 'iris' ? 'IRIS · EVIDENCE CUSTODY'
    : route === 'disclosure' ? 'REOPENED INQUIRY · HEARING'
      : route === 'elias' ? 'ELIAS · RADIO HOUSE' : 'GENUINE MAINLAND LINE',
  panel.title, body, [
    ...panel.actions.map(({ label, action }) => ({ label, onClick: () => runChoiceRouteAction(route, action) })),
    { label: route === 'disclosure' ? 'REVIEW SIGNED REPORT' : 'RETURN TO ISLAND',
      secondary: true, onClick: route === 'disclosure' ? () => openDaybreakReport() : closeModal },
  ]);
}

function runChoiceRouteAction(route, action) {
  const result = applyChoiceRouteAction(state.choices, action, choiceContext());
  state.choices = result.state;
  if (result.status === 'changed') {
    sound.playClue();
    // Iris releases independently held originals only after she personally
    // receives the complete packet's verified inquiry receipt.
    if (route === 'packet' && state.choices.irisAsked && choiceContext().inquiryReceipt) {
      state.choices = applyChoiceRouteAction(state.choices,
        { type: 'choice.iris.release_after_receipt', actor: 'iris' }, choiceContext()).state;
    }
    if (result.event !== 'iris_custody_decided') {
      save();
      updateHud();
    }
    if (result.event === 'mainland_initial_packet_sent') {
      radio('Mainland control copies. A rescue launch is preparing and will hold offshore for a confirmed bearing.', 11000);
    }
    if (result.event === 'elias_confronted' || result.event === 'elias_records_followup') checkChapter();
  } else sound.playInteraction();
  if (result.event === 'iris_custody_decided') {
    recordClue(clueById.iris_handoff,
      `<p class="mechanism-feedback">${escapeHtml(result.message)}</p>${clueById.iris_handoff.body}`);
    return;
  }
  if (result.event === 'mara_hearing_disclosure') {
    showEpilogue();
    return;
  }
  openChoiceRoute(route, result.message);
}

function openWitnessChronology(feedback = '') {
  const panel = getWitnessChronologyPanel(state.witnessChronology,
    state.found, state.chapter);
  const progress = witnessChronologyMilestones(state.witnessChronology, state.found);
  const beats = panel.beats.map((beat) => `<li>${beat.done ? '✓ ' : ''}<strong>${escapeHtml(beat.label)}</strong>
    <small>${escapeHtml(beat.source)}</small></li>`).join('');
  const missing = panel.missingEvidenceIds.map((id) => clueById[id]?.name || id);
  const body = `<p class="mechanism-instruction">${escapeHtml(panel.text)}</p>
    <p class="case-count">OPTIONAL SOURCE COMPARISON · ${progress.completedBeats} OF 4 NOTES</p>
    <ol class="witness-beats">${beats}</ol>
    ${missing.length ? `<p class="case-feedback">Still needed: ${escapeHtml(missing.join(', '))}.</p>` : ''}
    ${feedback ? `<p class="mechanism-feedback" role="status">${escapeHtml(feedback)}</p>` : ''}`;
  openModal('GATEHOUSE · WITNESS CHRONOLOGY', panel.title, body, [
    ...panel.actions.map(({ label, action }) => ({
      label, onClick: () => runWitnessChronologyAction(action),
    })),
    { label: 'RETURN TO GATEHOUSE', secondary: true, onClick: closeModal },
  ]);
}

function runWitnessChronologyAction(action) {
  const result = applyWitnessChronologyAction(state.witnessChronology,
    action, state.found, state.chapter);
  state.witnessChronology = result.state;
  if (result.status === 'changed' || result.status === 'complete') {
    sound.playClue();
    save();
    if (result.event === 'witness_chronology_complete') {
      toast('DATED WITNESS COMPARISON ADDED TO JOURNAL', 5000);
    }
  } else sound.playInteraction();
  openWitnessChronology(result.message);
}

function openWitnessStation(stationId = 'witness_table', feedback = '') {
  const panel = getWitnessConfrontationPanel(state.witness, witnessContext());
  const beats = panel.beats.map((beat) => `<li>${beat.done ? '✓ ' : ''}<strong>${escapeHtml(beat.title)}</strong>
    <small>${escapeHtml(beat.source)}</small></li>`).join('');
  const missing = panel.missingEvidenceIds.map((id) =>
    clueById[id]?.name || id);
  const body = `<p class="mechanism-instruction">${escapeHtml(panel.text)}</p>
    ${beats ? `<ol class="witness-beats">${beats}</ol>` : ''}
    ${missing.length ? `<p class="case-feedback">Still needed: ${escapeHtml(missing.join(', '))}.</p>` : ''}
    ${feedback ? `<p class="mechanism-feedback" role="status">${escapeHtml(feedback)}</p>` : ''}`;
  openModal('RADIO HOUSE · WITNESS ACCOUNT', panel.title, body, [
    ...panel.actions.map(({ label, action }) => ({
      label, onClick: () => runWitnessAction(stationId, action),
    })),
    ...(!state.choices.eliasRoute && radioRoutingMilestones(state.routing).voiceTraced
      ? [{ label: 'ASK ELIAS FOR HIS ACCOUNT', onClick: () => openChoiceRoute('elias') }] : []),
    { label: 'LEAVE WORKTABLE', secondary: true, onClick: closeModal },
  ]);
}
function runWitnessAction(stationId, action) {
  const result = applyWitnessConfrontationAction(state.witness, action, witnessContext());
  state.witness = result.state;
  if (result.choiceAction) {
    state.choices = applyChoiceRouteAction(state.choices,
      result.choiceAction, choiceContext()).state;
  }
  if (result.status === 'changed' || result.status === 'complete') {
    sound.playClue();
    if (result.event === 'witness_account_compared'
      && !state.interviewNotes.some((note) => note.source === 'radio worktable')) {
      state.interviewNotes.push({ speaker: 'Elias Ward', source: 'radio worktable',
        journal: 'The local voice, 21:10 service order, and original 21:14 relay strip support a bounded account. Elias acknowledges his standby action and altered typed line. His stated motive remains testimony; intent to ground the vessel is unproved.' });
    }
    save();
    updateHud();
  } else sound.playInteraction();
  openWitnessStation(stationId, result.message);
  if (result.event === 'witness_account_compared') checkChapter();
}

function openJettyStation(stationId, feedback = '') {
  const panel = getJettyReturnPanel(state.jettyReturn, stationId, jettyContext());
  const stationNumber = { berth: 1, case: 2, family: 3, receipt: 4 }[stationId] || 1;
  const body = `<p class="mechanism-instruction">${escapeHtml(panel.text)}</p>
    <p class="case-count">NORTH INLET RETURN · STATION ${stationNumber} OF 4</p>
    ${feedback ? `<p class="mechanism-feedback" role="status">${escapeHtml(feedback)}</p>` : ''}
    ${panel.summaryText ? reportHtml(panel.summaryText) : ''}`;
  openModal('DAYBREAK · NORTH INLET JETTY', panel.title, body, [
    ...panel.actions.map(({ label, action }) => ({
      label, onClick: () => runJettyAction(stationId, action),
    })),
    { label: 'RETURN TO JETTY', secondary: true, onClick: closeModal },
  ]);
}
function runJettyAction(stationId, action) {
  const result = applyJettyReturnAction(state.jettyReturn, action, jettyContext());
  state.jettyReturn = result.state;
  if (result.status === 'changed' || result.status === 'complete') {
    sound.playClue();
    save();
    updateHud();
  } else sound.playInteraction();
  openJettyStation(stationId, result.message);
  if (result.event === 'jetty_return_completed') checkChapter();
}

function openHatch(feedback = '') {
  const panel = getHatchPanel(state.hatch, {
    foundIds: state.found, milestones: mechanismMilestones(state.mechanisms),
  });
  const body = `<p class="mechanism-instruction">${escapeHtml(panel.text)}</p>
    ${feedback ? `<p class="mechanism-feedback" role="status">${escapeHtml(feedback)}</p>` : ''}
    <details class="mechanism-notes"><summary>REVIEW IRIS'S SKETCH</summary>${clueById.pump_iris_route.body}</details>`;
  openModal('SERVICE TUNNEL · GATE RELEASE', panel.title, body, [
    ...panel.actions.map(({ label, action }) => ({ label, onClick: () => runHatchAction(action) })),
    { label: 'STEP BACK FROM GATE', secondary: true, onClick: closeModal },
  ]);
}

function runHatchAction(action) {
  const result = applyHatchAction(state.hatch, action, {
    foundIds: state.found, milestones: mechanismMilestones(state.mechanisms),
  });
  state.hatch = result.state;
  if (result.status === 'changed' || result.status === 'complete') {
    sound.playInteraction();
    if (result.event !== 'iris_rescued') save();
  } else sound.playInteraction();
  if (result.event === 'iris_rescued') {
    queueStoryCutscene('service_rescue');
    recordClue(clueById.iris_rescued,
      `<p class="mechanism-feedback">${escapeHtml(result.message)}</p>${clueById.iris_rescued.body}`);
    radio('Iris here. I am out. Keep the originals dry; I will decide the handoff after we are clear.', 11000);
    return;
  }
  openHatch(result.message);
}

function reportHtml(reportText) {
  if (!reportText) return '';
  return `<div class="final-report">${reportText.split('\n\n').map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}</div>`;
}
function openDaybreakReport(feedback = '') {
  const panel = getDaybreakReportPanel(state.daybreakReport, state.found, state.deductions.solvedIds);
  const missing = panel.missingEvidenceIds.map((id) => {
    const clue = clueById[id];
    const place = clue?.room ? siteById[clue.room]?.name : 'the island';
    return `<li>${escapeHtml(clue?.name || id)} — ${escapeHtml(place)}</li>`;
  });
  const body = `<p class="mechanism-instruction">${escapeHtml(panel.text)}</p>
    ${missing.length ? `<ul class="report-missing">${missing.join('')}</ul>` : ''}
    ${feedback ? `<p class="mechanism-feedback" role="status">${escapeHtml(feedback)}</p>` : ''}
    ${reportHtml(panel.reportText)}`;
  openModal('DAYBREAK · CORRECTED FINDING', panel.title, body, [
    ...panel.actions.map(({ label, action }) => ({ label, onClick: () => runDaybreakReportAction(action) })),
    ...(panel.missingDeductionIds.length ? [{ label: 'OPEN CASE BOARD', onClick: openCaseBoard }] : []),
    { label: 'RETURN TO ISLAND', secondary: true, onClick: closeModal },
  ]);
}
function runDaybreakReportAction(action) {
  const result = applyDaybreakReportAction(state.daybreakReport, action, state.found, state.deductions.solvedIds);
  state.daybreakReport = result.state;
  if (result.status === 'changed' || result.status === 'complete') {
    sound.playClue();
    if (result.event !== 'daybreak_report_submitted') {
      save();
      updateHud();
    }
  } else sound.playInteraction();
  if (result.event === 'daybreak_report_submitted') {
    recordClue(clueById.daybreak_report,
      `<p class="mechanism-feedback">${escapeHtml(result.message)}</p>${reportHtml(result.reportText)}`);
    return;
  }
  openDaybreakReport(result.message);
}
function openMechanism(puzzle, feedback = '') {
  const clueId = { alignment: 'alignment_solution', power: 'pump_power', radio: 'launch_guided' }[puzzle];
  const clue = clueById[clueId];
  const milestone = mechanismMilestones(state.mechanisms);
  if (!state.found.has(clueId) && (puzzle === 'alignment' && milestone.alignmentSolved
    || puzzle === 'power' && milestone.powerRestored
    || puzzle === 'radio' && milestone.launchGuided)) {
    recordClue(clue, clue.body);
    return;
  }
  const panel = getMechanismPanel(state.mechanisms, puzzle);
  const body = `<p class="mechanism-instruction">${escapeHtml(panel.text)}</p>
    ${feedback ? `<p class="mechanism-feedback" role="status">${escapeHtml(feedback)}</p>` : ''}
    <details class="mechanism-notes"><summary>REVIEW FIELD NOTES</summary>${clue.body}</details>`;
  openModal(clue.category, panel.title, body, [
    ...panel.actions.map(({ label, action }) => ({
      label, onClick: () => runMechanismAction(puzzle, action),
    })),
    { label: 'LEAVE CONTROLS', secondary: true, onClick: closeModal },
  ]);
}

function runMechanismAction(puzzle, action) {
  const result = applyMechanismAction(state.mechanisms, action, state.found);
  state.mechanisms = result.state;
  if (result.status === 'changed' || result.status === 'complete') {
    sound.playInteraction();
    if (!['alignment_solved', 'power_restored', 'launch_guided'].includes(result.event)) save();
  }
  if (result.event === 'launch_warned') radio('Launch copies. Holding outside the breakers while you restore the old bus.', 10000);
  if (result.event === 'backup_online') radio('Standby rear lamp visible again. We are still holding offshore. Confirm the safe line.', 11000);
  if (result.event === 'alignment_solved' || result.event === 'power_restored' || result.event === 'launch_guided') {
    const completed = clueById[{
      alignment_solved: 'alignment_solution',
      power_restored: 'pump_power',
      launch_guided: 'launch_guided',
    }[result.event]];
    recordClue(completed, `<p class="mechanism-feedback">${escapeHtml(result.message)}</p>${completed.body}`);
    if (result.event === 'power_restored') radio('The pump is running. The old standby lamp has relit; use the surveyed main line for the launch.', 12000);
    if (result.event === 'launch_guided') radio('Launch copies. Main rear and front in line. We have the deep channel.', 12000);
    return;
  }
  openMechanism(puzzle, result.message);
}

function specialClue(clue) {
  const found = state.found;
  if (clue.special === 'lodge') {
    if (found.has(clue.id)) {
      if (!signingMemoryMilestones(state.signingMemory, found).complete) return openSigningMemory();
      return recordClue(clue);
    }
    openLodgeStation('desk');
    return;
  }
  if (clue.special === 'signing') {
    if (found.has(clue.id)) return recordClue(clue);
    openSigningStation('desk');
    return;
  }
  if (clue.special === 'archive') {
    if (found.has(clue.id)) return openArchiveCase();
    openArchiveCase();
    return;
  }
  if (clue.special === 'routing') {
    openRadioRouting();
    return;
  }
  if (clue.special === 'iris') {
    openChoiceRoute('iris');
    return;
  }
  if (clue.special === 'daybreak') {
    if (found.has(clue.id)) {
      if (jettyReturnMilestones(state.jettyReturn, jettyContext()).complete) return showEpilogue();
      return openDaybreakReport('The correction is on record. Iris and the captain’s family are waiting at North Inlet Jetty.');
    }
    if (!found.has('iris_handoff')) {
      openModal('DAYBREAK · RADIO HOUSE', 'Iris retains the originals',
        '<p>Iris is safe, but her records remain in her waterproof case. Return to the service hatch and ask how she wants the originals and copies handed over.</p>', [
          { label: 'RETURN TO ISLAND', onClick: closeModal },
        ]);
      return;
    }
    if (!radioRoutingMilestones(state.routing).mainlandConnected) {
      openRadioRouting('The genuine shore line still needs an independently verified return.');
      return;
    }
    if (!state.choices.initialPacket) {
      openChoiceRoute('packet', 'Choose what can responsibly be sent before Mara signs the correction.');
      return;
    }
    openDaybreakReport();
    return;
  }
  if (clue.special === 'survey') {
    if (found.has(clue.id)) return recordClue(clue, surveyPhotoHtml(clue) + clue.body);
    startSurvey(clue);
    return;
  }
  if (clue.special === 'alignment') {
    if (!found.has('headland_view') || !found.has('east_ridge_view') || !found.has('tower_panel')) {
      openModal(clue.category, clue.name, '<p>Record both survey viewpoints and inspect the tower controls first.</p>');
      return;
    }
    if (found.has('alignment_solution')) return recordClue(clue);
    openTowerCircuitStation('chart');
    return;
  }
  if (clue.special === 'power') {
    if (found.has('pump_power')) return recordClue(clue);
    openMechanism('power');
    return;
  }
  if (clue.special === 'launch') {
    if (!found.has('launch_guided') && mechanismMilestones(state.mechanisms).launchGuided) {
      recordClue(clue, clue.body);
      return;
    }
    if (!found.has('pump_power')) {
      openModal(clue.category, clue.name, '<p>The launch is offshore. Restore the pump and warn it about the standby lamp before calling in an approach.</p>');
      return;
    }
    if (found.has('launch_guided')) return recordClue(clue);
    if (!isDeductionSolved(state.deductions, 'rescue_bearing')) {
      openModal(clue.category, clue.name, '<p>Before giving the pilot a route, establish the safe bearing from the survey photographs and the newly energized backup circuit.</p>', [
        { label: 'OPEN CASE BOARD', onClick: openCaseBoard },
        { label: 'RETURN TO ISLAND', secondary: true, onClick: closeModal },
      ]);
      return;
    }
    openMechanism('radio');
    return;
  }
  if (clue.special === 'rescue') {
    if (found.has(clue.id)) return recordClue(clue);
    openHatch();
    return;
  }
}
function inspect(clue) {
  if (!clue || state.modal) return;
  sound.playInteraction();
  if (clue.special) specialClue(clue);
  else recordClue(clue);
}

function finish() {
  state.ended = true;
  updateHud();
  save();
  pendingEpilogue = true;
  $('modal-actions').replaceChildren();
  const button = document.createElement('button');
  button.className = 'action';
  button.textContent = 'ATTEND THE REOPENED INQUIRY';
  button.onclick = closeModal;
  $('modal-actions').appendChild(button);
}
function inquiryContext() {
  return {
    foundIds: state.found,
    reportSubmitted: daybreakReportMilestones(state.daybreakReport).submitted,
    irisRescued: state.found.has('iris_rescued'),
    choiceRoutes: state.choices,
  };
}
function showEpilogue(feedback = '') {
  const panel = getInquiryPanel(state.inquiry, inquiryContext());
  const report = getDaybreakReportText(state.daybreakReport);
  const body = `<p class="mechanism-instruction">${escapeHtml(panel.text)}</p>
    ${feedback ? `<p class="mechanism-feedback" role="status">${escapeHtml(feedback)}</p>` : ''}
    ${panel.summaryText ? reportHtml(panel.summaryText) : ''}
    ${panel.missingEvidenceIds?.length
      ? `<p>Bring the missing sources into the case file before answering.</p>` : ''}`;
  openModal(`REOPENED INQUIRY · ${Math.min(panel.step + 1, 6)} / 6`, panel.title, body, [
    ...panel.actions.map(({ label, action }) => ({
      label, onClick: () => runInquiryAction(action),
    })),
    ...(report ? [{ label: 'READ THE SIGNED CORRECTION', secondary: true, onClick: () => openModal(
      'DAYBREAK · SIGNED REPORT', 'Correction to the Greywake finding', reportHtml(report), [
        { label: 'BACK TO INQUIRY', onClick: () => showEpilogue() },
      ]) }] : []),
    { label: 'RETURN TO ISLAND', secondary: true, onClick: closeModal },
  ]);
}
function runInquiryAction(action) {
  const result = applyInquiryAction(state.inquiry, action, inquiryContext());
  if (result.event === 'inquiry_disclosure_requested') return openChoiceRoute('disclosure');
  if (result.event === 'inquiry_iris_handoff_requested') return openChoiceRoute('iris');
  state.inquiry = result.state;
  if (result.status === 'changed' || result.status === 'complete') {
    sound.playClue();
    save();
    updateHud();
  } else sound.playInteraction();
  showEpilogue(result.message);
}

function mapSvg() {
  // The first playable position is on the low ferry pier, about 80 m below
  // the mapped South Landing site. Show the built boardwalk that joins them;
  // otherwise the player's opening map dot appears cut off from every trail.
  const pierX = (ARRIVAL_ROUTE.pier.x + 350) * .65 + 22;
  const pierY = (ARRIVAL_ROUTE.pier.z + 350) * .65 + 15;
  const landingX = (siteById.landing.x + 350) * .65 + 22;
  const landingY = (siteById.landing.z + 350) * .65 + 15;
  const southBoardwalk = `<g><line x1="${pierX}" y1="${pierY}" x2="${landingX}" y2="${landingY}"
    stroke="#d7c8a1" stroke-width="3.5" stroke-linecap="round"/>
    <rect x="${pierX-5}" y="${pierY-3}" width="10" height="6" rx="1"
    fill="#d7c8a1" stroke="#273438" stroke-width="1.5"/>
    <text x="${pierX+10}" y="${pierY+4}" fill="#e7d7b1" font-size="10">South Pier</text></g>`;
  const lines = [['landing','lodge'],['lodge','prison'],['prison','archive'],['archive','headland'],
    ...(state.chapter >= 2 ? [['headland','headland_stake']] : []),
    ['headland','tower'],['tower','east_ridge'],['east_ridge','radio'],['tower','north_jetty'],['radio','pump'],['pump','landing']]
    .map(([a,b]) => { const A=siteById[a], B=siteById[b]; return `<line x1="${(A.x+350)*.65+22}" y1="${(A.z+350)*.65+15}" x2="${(B.x+350)*.65+22}" y2="${(B.z+350)*.65+15}" stroke="#747f7b" stroke-width="2" stroke-dasharray="5 5"/>`; }).join('');
  const roadLines = ROAD_ROUTES.map((route) => `<polyline points="${route.points.map(([x,z]) =>
    `${(x+350)*.65+22},${(z+350)*.65+15}`).join(' ')}" fill="none"
    stroke="#c7b693" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  const carDots = driving.vehicles.map((vehicle) => {
    const x = (vehicle.x+350)*.65+22, y = (vehicle.z+350)*.65+15;
    return `<rect x="${x-3.5}" y="${y-5}" width="7" height="10" rx="2" fill="#e6d6ae" stroke="#273438" stroke-width="1.2"/>`;
  }).join('');
  const dots = availableMapSites({ chapter: state.chapter, foundIds: state.found }).map((s) => {
    const x=(s.x+350)*.65+22, y=(s.z+350)*.65+15;
    const currentRadius = ['headland', 'headland_stake'].includes(s.id) ? 10 : 25;
    const seen=state.visited.has(s.id), current=Math.hypot(state.x-s.x,state.z-s.z)<currentRadius;
    const marked = state.waypointId === s.id;
    const headlandLabel = s.id === 'headland';
    const markRadius = ['headland', 'headland_stake'].includes(s.id) ? 9 : 13;
    return `<g>${marked ? `<circle cx="${x}" cy="${y}" r="${markRadius}" fill="none" stroke="#f0c981" stroke-width="2.5"/>` : ''}<circle cx="${x}" cy="${y}" r="${current?7:5}" fill="${current?'#f0d5a5':seen?'#bdab86':'#6a7978'}"/><text x="${headlandLabel?x-10:x+10}" y="${y+4}" text-anchor="${headlandLabel?'end':'start'}" fill="${marked?'#f5d69c':seen?'#e1ddd1':'#899c9b'}" font-size="11">${escapeHtml(s.name)}</text></g>`;
  }).join('');
  const irisRoute = state.chapter >= 3
    ? `<polyline points="${IRIS_TRAIL_STATIONS.map((station) =>
      `${(station.x+350)*.65+22},${(station.z+350)*.65+15}`).join(' ')}" fill="none"
      stroke="#82b9b9" stroke-width="2" stroke-dasharray="2 5"/>
      ${IRIS_TRAIL_STATIONS.map((station, index) => {
        const x = (station.x+350)*.65+22, y = (station.z+350)*.65+15;
        const recorded = Boolean(state.irisTrail[station.id]);
        return `<g><circle cx="${x}" cy="${y}" r="7" fill="${recorded?'#b5dad1':'#31565c'}" stroke="#b5dad1" stroke-width="1.5"/>
          <text x="${x}" y="${y+3.5}" text-anchor="middle" fill="${recorded?'#183337':'#d5e6e0'}" font-size="10">${index+1}</text></g>`;
      }).join('')}` : '';
  const px=(state.x+350)*.65+22, py=(state.z+350)*.65+15;
  return `<svg viewBox="0 0 500 510" style="width:100%;max-height:55vh;background:#17262a;border:1px solid #435456"><path d="M145 24 C255 3 402 66 455 145 C495 240 466 374 370 457 C282 504 136 481 65 397 C-8 282 18 153 145 24Z" fill="#354743" stroke="#9ca8a0" stroke-width="3"/>${lines}${southBoardwalk}${roadLines}${dots}${carDots}${irisRoute}<circle cx="${px}" cy="${py}" r="6" fill="#f6dfae" stroke="#1b2a2c" stroke-width="2"/></svg><p>The pale dot marks your position. The solid pale line from South Pier to South Landing marks the steep boardwalk. Tan lines mark roads; small pale rectangles mark vehicles. Broken lines mark the old foot trails.${state.chapter >= 3 ? ' Numbered blue marks trace Iris’s optional radio-to-tunnel route; pale marks have been examined.' : ''}</p>`;
}
function openMap(feedback = '') {
  const mapContext = { chapter: state.chapter, foundIds: state.found };
  const sites = availableMapSites(mapContext);
  // The crossing has its own skipper/landing tasks. A land clue should not
  // appear as the immediate next step until Mara has stepped off the ferry.
  const suggested = voyage.active ? null : suggestMapLead(campaignAdvanceStatus(state), mapContext);
  const nextLead = describeWaypoint(suggested?.site.id, state.x, state.z, mapContext);
  const marked = describeWaypoint(state.waypointId, state.x, state.z,
    mapContext);
  const entranceHint = (site) => site?.kind === 'building'
    ? ' Its open front doorway faces south.' : '';
  const options = sites.map((site) => `<option value="${site.id}"${state.waypointId === site.id ? ' selected' : ''}>${escapeHtml(site.name)}</option>`).join('');
  const body = `${mapSvg()}<div class="field-map-waypoint">
    ${nextLead ? `<p><strong>NEXT LEAD · ${escapeHtml(nextLead.site.name)}</strong> · ${nextLead.distanceMeters} m ${nextLead.direction} (${nextLead.bearingDegrees}°) in a straight line. Use the roads and trails around cliffs.${entranceHint(nextLead.site)}</p>` : ''}
    <label for="field-map-waypoint-select">PENCIL MARK · DESTINATION</label>
    <select id="field-map-waypoint-select"><option value="">Choose a landmark</option>${options}</select>
    <p>${marked ? `<strong>${escapeHtml(marked.site.name)}</strong> · ${marked.distanceMeters} m ${marked.direction} (${marked.bearingDegrees}°) in a straight line. Follow the marked roads and foot trails around cliffs.${entranceHint(marked.site)}` : 'Choose a landmark to circle it on your map. The bearing is a rough guide; roads and foot trails show the safer approaches.'}</p>
    ${feedback ? `<p role="status">${escapeHtml(feedback)}</p>` : ''}
  </div>`;
  openModal('FIELD MAP', 'Greywake Island', body, [
    ...(nextLead ? [{ label: 'CIRCLE NEXT LEAD', onClick: () => {
      state.waypointId = nextLead.site.id;
      save();
      openMap();
    } }] : []),
    { label: 'MARK DESTINATION', onClick: () => {
      const chosen = restoreWaypointId($('field-map-waypoint-select')?.value,
        { chapter: state.chapter, foundIds: state.found });
      if (!chosen) return openMap('Choose a landmark first.');
      state.waypointId = chosen;
      save();
      openMap();
    } },
    ...(state.waypointId ? [{ label: 'CLEAR MARK', secondary: true, onClick: () => {
      state.waypointId = null;
      save();
      openMap();
    } }] : []),
    { label: 'CLOSE MAP', secondary: true, onClick: closeModal },
  ]);
}
function openCaseRecap() {
  const beats = caseRecap(state.found, {
    signingMemoryComplete: signingMemoryMilestones(state.signingMemory, state.found).complete,
    arrivalNotes: state.arrivalNotes,
  });
  const currentLead = $('objective').textContent;
  const body = `<p>Only observations and sources in Mara’s journal appear here. A source’s claim remains distinct from what it proves.</p>
    ${beats.map(({ title, source, text }) => `<section class="field-route-notes">
      <h3>${escapeHtml(title)}</h3><small>${escapeHtml(source)}</small>
      <p>${escapeHtml(text)}</p></section>`).join('')}
    <p><strong>${state.ended ? 'CASE STATUS' : 'CURRENT LEAD'}</strong> · ${escapeHtml(currentLead)}</p>`;
  openModal('CASE RECAP', 'What Mara knows so far', body, [
    { label: 'FIELD JOURNAL', onClick: openJournal },
    { label: 'RETURN TO ISLAND', secondary: true, onClick: closeModal },
  ]);
}
function openJournal() {
  const notes = [...state.found].map((id) => clueById[id]).filter(Boolean);
  const caseNotes = notes.length || state.interviewNotes.length || state.arrivalNotes.length
    ? `<p>${notes.length} observations and ${state.interviewNotes.length} witness statements recorded. Physical records and testimony remain separate.</p><ul>${state.arrivalNotes.map((note) => `<li><strong>Crossing:</strong> ${escapeHtml(note)}</li>`).join('')}${notes.map((c) => `<li><strong>${escapeHtml(c.name)}:</strong> ${escapeHtml(c.journal)}</li>`).join('')}${state.interviewNotes.map((n) => `<li><strong>${escapeHtml(n.speaker)} · ${escapeHtml(n.source)}:</strong> ${escapeHtml(n.journal)}</li>`).join('')}</ul>`
    : voyage.active
      ? '<p>No observations recorded yet. Check the crossing notes with the skipper before landing.</p>'
      : '<p>No evidence recorded yet. Look inside the lodge.</p>';
  const irisProgress = irisTrailMilestones(state.irisTrail, irisTrailContext());
  const irisSummary = irisTrailSummary(state.irisTrail, irisTrailContext());
  const irisNotes = state.chapter >= 3 ? `<section class="field-route-notes">
    <h3>IRIS’S LAST DOCUMENTED ROUTE · OPTIONAL</h3>
    <p>${irisProgress.observedStations + Number(irisProgress.reconstructed)} of 4 field traces examined. See the numbered blue route on the map (M). This reconstruction is not needed to reach Iris.</p>
    ${irisSummary
      ? `<p>${escapeHtml(irisSummary).replace(/\n\n/g, '</p><p>')}</p>`
      : `<ul>${IRIS_TRAIL_STATIONS.filter((station) => state.irisTrail[station.id])
        .map((station) => `<li><strong>${escapeHtml(station.name)}:</strong> ${escapeHtml(station.success)}</li>`).join('')}</ul>`}
    </section>` : '';
  const chronologyProgress = witnessChronologyMilestones(state.witnessChronology, state.found);
  const chronologyNotes = state.chapter >= 1 ? `<section class="field-route-notes">
    <h3>GATEHOUSE WITNESS CHRONOLOGY · OPTIONAL</h3>
    <p>${chronologyProgress.completedBeats} of 4 comparisons recorded at the detention annex gatehouse.</p>
    ${chronologyProgress.complete ? `<p>${escapeHtml(WITNESS_CHRONOLOGY_SUMMARY)}</p>` : ''}
    </section>` : '';
  const photoProgress = photoReckoningMilestones(state.photoReckoning, photoReckoningContext());
  const photoSummary = photoReckoningSummary(state.photoReckoning, photoReckoningContext());
  const photoNotes = state.chapter >= 2 ? `<section class="field-route-notes">
    <h3>TOWER PHOTO RECKONING · OPTIONAL</h3>
    <p>${photoProgress.completedBeats} of 3 field notes recorded at the tower plotting rail.</p>
    ${photoSummary ? `<p>${escapeHtml(photoSummary).replace(/\n\n/g, '</p><p>')}</p>` : ''}
    </section>` : '';
  const maraProgress = maraDraftResponseMilestones(state.maraDraftResponse, maraResponseContext());
  const maraSummary = maraDraftResponseSummary(state.maraDraftResponse, maraResponseContext());
  const maraNotes = state.chapter >= 1 ? `<section class="field-route-notes">
    <h3>MARA’S HELD STATEMENT · OPTIONAL</h3>
    <p>${maraProgress.completedBeats} of 5 responses written at the archive desk. This present-day statement is provisional and has not been sent as a corrected finding.</p>
    ${maraSummary ? `<p>${escapeHtml(maraSummary).replace(/\n\n/g, '</p><p>')}</p>` : ''}
    </section>` : '';
  const body = caseNotes + irisNotes + chronologyNotes + photoNotes + maraNotes;
  openModal('FIELD JOURNAL', 'What can be proved', body, [
    ...(state.ended ? [{ label: 'REOPENED INQUIRY', onClick: () => showEpilogue() }] : []),
    { label: 'CASE RECAP', onClick: openCaseRecap },
    { label: 'OPEN CASE BOARD', onClick: openCaseBoard },
    { label: 'CLOSE JOURNAL', secondary: true, onClick: closeModal },
  ]);
}

function openConversation(personId, feedback = null) {
  if (personId === 'iris' && state.chapter === 4
    && !rescueAftermathMilestones(state.rescueAftermath,
      { foundIds: state.found }).complete) {
    if (!rescueStaging.ready) {
      toast('IRIS IS CLEAR OF THE HATCH · WAIT FOR HER TO REACH THE PATH', 3400);
      return;
    }
    openRescueAftermath();
    return;
  }
  const panel = getConversationPanel(personId, state.peopleState, peopleContext());
  if (!panel) return;
  const body = `<p class="mechanism-instruction">${escapeHtml(panel.intro)}</p>
    ${feedback ? `<p class="mechanism-feedback" role="status"><strong>${escapeHtml(feedback.source)}</strong> · ${escapeHtml(feedback.line)}</p>` : ''}`;
  openModal('ISLAND RESIDENT · ' + panel.role.toUpperCase(), panel.name, body, [
    ...panel.actions.map((topic) => ({
      label: `${topic.label}${topic.heard ? ' · AGAIN' : ''}`,
      onClick: () => {
        const result = applyConversationAction(state.peopleState, personId, topic.id, peopleContext());
        state.peopleState = result.state;
        if (result.status === 'changed') {
          state.interviewNotes.push({ speaker: result.speaker, source: result.source, journal: result.journal });
          save();
          sound.playClue();
        } else sound.playInteraction();
        openConversation(personId, result.status === 'blocked'
          ? { source: 'UNAVAILABLE', line: result.message } : result);
      },
    })),
    { label: 'LEAVE CONVERSATION', secondary: true, onClick: closeModal },
  ]);
  activeSpeakerId = personId;
}

function openPrisonConversation(person) {
  if (!person) return;
  const setting = person.kind === 'guard'
    ? 'A guard keeps watch over the holding wing.'
    : 'A detainee speaks through the cell bars.';
  openModal(`DETENTION ANNEX · ${person.role.toUpperCase()}`, person.name,
    `<p class="mechanism-instruction">${escapeHtml(setting)}</p>
    <p class="mechanism-feedback" role="status"><strong>AMBIENT ACCOUNT</strong> · ${escapeHtml(person.line)}</p>`, [
      { label: 'CONTINUE INVESTIGATION', secondary: true, onClick: closeModal },
    ]);
  sound.playInteraction();
}

function openRescueAftermath(feedback = '') {
  const panel = getRescueAftermathPanel(state.rescueAftermath,
    { foundIds: state.found });
  openModal('SERVICE HATCH · IRIS', panel.title,
    `<p class="mechanism-instruction">${escapeHtml(panel.text)}</p>
    ${feedback ? `<p class="mechanism-feedback" role="status">${escapeHtml(feedback)}</p>` : ''}
    <p class="case-count">AFTER THE RESCUE · ${rescueAftermathMilestones(state.rescueAftermath,
      { foundIds: state.found }).completedBeats} OF 4 MOMENTS RECORDED</p>`, [
      ...panel.actions.map(({ label, action }) => ({
        label, onClick: () => runRescueAftermathAction(action),
      })),
      { label: 'LET IRIS REST', secondary: true, onClick: closeModal },
    ]);
}
function runRescueAftermathAction(action) {
  const result = applyRescueAftermathAction(state.rescueAftermath, action,
    { foundIds: state.found });
  state.rescueAftermath = result.state;
  if (result.status === 'changed' || result.status === 'complete') {
    sound.playInteraction();
    if (action?.type === 'aftercare.medical') {
      radio('Rescue launch copies. A medic will meet Iris at the north berth. Keep her warm and the records dry.', 10500);
    }
    if (result.event === 'rescue_aftercare_completed'
      && !state.interviewNotes.some((note) => note.source === 'service hatch')) {
      state.interviewNotes.push({ speaker: 'Iris Hale', source: 'service hatch',
        journal: 'Iris requested medical attention and retained her sealed originals. Her firsthand account covers the outer gate and rising water; she made no claim about Elias’s intent. A formal statement will wait until she is safe.' });
    }
    save();
    updateHud();
  } else sound.playInteraction();
  openRescueAftermath(result.message);
  if (result.event === 'rescue_aftercare_completed') checkChapter();
}

let caseBoardQuestion = null;
const selectedEvidence = new Set();
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

function openCaseBoard() {
  caseBoardQuestion = null;
  selectedEvidence.clear();
  const questions = getAvailableDeductions(state.deductions, state.found, state.chapter);
  const body = `<p>Link records you found on the island to test a conclusion. A plausible story is not proof until its observations agree.</p>
    ${questions.length ? '' : '<p class="case-feedback">The first questions will appear after you inspect the lodge and the archive.</p>'}
    <div class="case-questions">${questions.map((item) => `<button type="button" class="case-question" data-deduction="${item.id}">
      <span class="case-question-title">${escapeHtml(item.title)}</span>
      <span class="case-question-status">${item.solved ? 'CONCLUDED' : item.ready ? 'EVIDENCE READY' : 'INVESTIGATING'}</span>
      <span class="case-question-prompt">${escapeHtml(item.prompt)}</span>
    </button>`).join('')}</div>`;
  openModal('CASE BOARD', 'What the evidence establishes', body, [
    { label: 'FIELD JOURNAL', secondary: true, onClick: openJournal },
    { label: 'RETURN TO ISLAND', secondary: true, onClick: closeModal },
  ]);
  $('modal-body').querySelectorAll('[data-deduction]').forEach((button) => {
    button.addEventListener('click', () => openCaseQuestion(button.dataset.deduction));
  });
}

function openCaseQuestion(id, feedback = '') {
  const deduction = getAvailableDeductions(state.deductions, state.found, state.chapter)
    .find((item) => item.id === id);
  if (!deduction) return openCaseBoard();
  if (caseBoardQuestion !== id) selectedEvidence.clear();
  caseBoardQuestion = id;
  const solved = deduction.solved;
  const notes = [...state.found].map((clueId) => clueById[clueId]).filter(Boolean);
  const needed = deduction.requiresIds.filter((requiredId) => !isDeductionSolved(state.deductions, requiredId));
  const body = `<p class="case-prompt">${escapeHtml(deduction.prompt)}</p>
    ${needed.length ? '<p class="case-feedback">An earlier conclusion on this board must be settled first.</p>' : ''}
    ${feedback ? `<p class="case-feedback" role="status">${escapeHtml(feedback)}</p>` : ''}
    ${solved ? `<div class="case-conclusion"><strong>FINDING</strong><p>${escapeHtml(deduction.conclusion)}</p><p>${escapeHtml(deduction.explanation)}</p></div>`
      : `<p class="case-instruction">Select the observations that directly support this finding.</p>
      <div class="case-evidence" role="group" aria-label="Recorded evidence">${notes.map((clue) => `<button type="button" class="case-evidence-card${selectedEvidence.has(clue.id) ? ' selected' : ''}" data-evidence="${clue.id}" aria-pressed="${selectedEvidence.has(clue.id)}">
        <strong>${escapeHtml(clue.name)}</strong><span>${escapeHtml(clue.journal)}</span>
      </button>`).join('')}</div>
      <p id="case-selected-count" class="case-count">${selectedEvidence.size} observations selected</p>`}`;
  const actions = solved
    ? [state.ended && id === 'responsibility'
      ? { label: 'OPEN THE CORRECTED RECORD', onClick: closeModal }
      : { label: 'BACK TO CASE BOARD', onClick: openCaseBoard }]
    : [
      { label: 'LINK SELECTED EVIDENCE', onClick: () => {
        const result = attemptDeduction(state.deductions, id, [...selectedEvidence], state.found);
        state.deductions = result.state;
        if (result.accepted) {
          sound.playClue();
          save();
          checkChapter();
          selectedEvidence.clear();
        } else sound.playInteraction();
        openCaseQuestion(id, result.message);
      } },
      { label: 'BACK TO CASE BOARD', secondary: true, onClick: openCaseBoard },
    ];
  openModal('CASE BOARD · EVIDENCE LINKS', deduction.title, body, actions);
  $('modal-body').querySelectorAll('[data-evidence]').forEach((button) => {
    button.addEventListener('click', () => {
      const clueId = button.dataset.evidence;
      if (selectedEvidence.has(clueId)) selectedEvidence.delete(clueId);
      else selectedEvidence.add(clueId);
      button.classList.toggle('selected', selectedEvidence.has(clueId));
      button.setAttribute('aria-pressed', String(selectedEvidence.has(clueId)));
      $('case-selected-count').textContent = `${selectedEvidence.size} observations selected`;
    });
  });
}

function closestClue() {
  return closestFieldClue({
    clues: CLUES, chapter: state.chapter, insideId: state.inside?.id,
    x: state.x, z: state.z, foundIds: state.found,
    mainlandConnected: radioRoutingMilestones(state.routing).mainlandConnected,
    positionFor: markerPosition,
  });
}
let lastInteractionPrompt = null;
function setInteractionPrompt(html = '') {
  if (html === lastInteractionPrompt) return;
  lastInteractionPrompt = html;
  const prompt = $('interaction');
  if (html) prompt.innerHTML = html;
  prompt.classList.toggle('hidden', !html);
}
function syncTouchHud() {
  if (!touchEnabled) return;
  const visible = state.started && !state.modal && !chapterLoading.active
    && cliffFall.phase === 'grounded' && respawnFadeTime < 0;
  touchControls.setVisible(visible);
  if (!visible) return;
  const mode = drone.active ? 'drone' : state.survey.activeStake ? 'survey' : voyage.active ? 'voyage'
    : driving.active ? 'driving' : 'walking';
  touchControls.setMode(mode);
  const droneToggle = $('touch-drone-toggle');
  droneToggle.textContent = drone.active ? 'EXIT DRONE' : 'DRONE';
  droneToggle.disabled = !drone.active && !droneFlightAvailable();
  if (mode === 'drone') touchControls.setAction('EXIT DRONE', true);
  else if (mode === 'driving') touchControls.setAction('EXIT CAR', true);
  else if (mode === 'voyage') touchControls.setAction('CROSSING NOTES', true);
  else {
    const prompt = $('interaction');
    const enabled = mode === 'walking' && !prompt.classList.contains('hidden');
    touchControls.setAction(enabled ? prompt.textContent.replace(/^E\s*/, '').toUpperCase() : 'INSPECT', enabled);
  }
}
function updateMarkers(elapsed) {
  for (const clue of CLUES) {
    const marker = markers.get(clue.id);
    marker.visible = state.chapter >= clue.minChapter && !state.found.has(clue.id)
      && clue.id !== state.survey.activeStake
      && (!clue.room || state.inside?.id === clue.room);
    if (marker.visible) {
      marker.material.opacity = 0.48 + 0.27 * Math.sin(elapsed * 2.8 + (clue.x ?? 0));
      marker.rotation.z = elapsed * 0.35;
    }
  }
  if (cliffFall.phase !== 'grounded' || respawnFadeTime >= 0) {
    state.nearInteraction = null;
    setInteractionPrompt();
    return;
  }
  if (voyage.active) {
    state.nearInteraction = null;
    setInteractionPrompt(state.modal ? '' : voyage.status === 'stalled'
      ? '<b>E</b> HELP THE SKIPPER CLEAR THE FERRY'
      : '<b>E</b> OPEN CROSSING NOTES');
    return;
  }
  const clue = closestClue();
  state.near = clue;
  const nearbyPerson = nearestIslandPerson(state.x, state.z, peopleContext());
  const person = nearbyPerson?.id === 'iris' && state.chapter === 4
    && !rescueStaging.ready ? null : nearbyPerson;
  state.nearPerson = person;
  const prisonPerson = prisonPopulation.nearestPerson(state.x, state.z);
  const vehicle = driving.nearbyVehicle(state.x, state.z, 4.4);
  state.nearVehicle = vehicle;
  let lodgeStation = nearestLodgeStation(state.x, state.z, state.inside?.id,
    state.lodge, state.found);
  if (lodgeStation?.id === 'desk' && state.found.has('lodge_working_carbon')
    && !signingMemoryMilestones(state.signingMemory, state.found).complete) {
    lodgeStation = { ...lodgeStation, prompt: 'Remember the signing room' };
  }
  state.nearLodge = lodgeStation;
  let signingStation = nearestSigningStation(state.x, state.z, state.inside?.id,
    state.signing, state.found);
  // Once signing is documented, the central desk belongs to the later case
  // comparison. The other stations remain available for review.
  if (signingStation?.id === 'desk' && signingStation.complete
    && !state.found.has('archive_reconstruction')) signingStation = null;
  state.nearSigning = signingStation;
  state.nearTower = state.chapter >= 2
    ? nearestTowerCircuitStation(state.x, state.z, state.inside?.id,
      state.towerCircuit, state.found) : null;
  state.nearIrisTrail = nearestIrisTrailStation(state.x, state.z, state.inside?.id,
    state.irisTrail, irisTrailContext());
  state.nearWitness = nearestWitnessConfrontationStation(state.x, state.z,
    state.inside?.id, state.witness, witnessContext());
  state.nearJetty = nearestJettyReturnStation(state.x, state.z,
    state.inside?.id, state.jettyReturn, jettyContext());
  state.nearChronology = nearestWitnessChronologyStation(state.x, state.z, state.chapter);
  const clueDistance = clue ? Math.hypot(state.x - markerPosition(clue).x,
    state.z - markerPosition(clue).z) : Infinity;
  state.nearInteraction = selectFieldInteraction({
    clue, clueDistance,
    requiredClue: Boolean(clue && !state.found.has(clue.id)
      && CHAPTERS[state.chapter].required.includes(clue.id)),
    person, prisonPerson, vehicle, lodgeStation, signingStation,
    towerStation: state.nearTower,
    irisStation: state.nearIrisTrail,
    witnessStation: state.nearWitness,
    jettyStation: state.nearJetty,
    chronologyStation: state.nearChronology,
  });
  const interaction = state.nearInteraction;
  if (driving.active && !state.modal) {
    setInteractionPrompt(`<b>E</b> Exit ${driving.active.type === 'van' ? 'transport' : 'car'}`);
  } else if (interaction?.kind === 'vehicle' && !state.modal && !state.survey.activeStake) {
    setInteractionPrompt(`<b>E</b> Drive ${interaction.target.vehicle.type === 'van' ? 'transport' : 'car'}`);
  } else if (interaction?.kind === 'person' && !state.modal && !state.survey.activeStake) {
    setInteractionPrompt(`<b>E</b> Speak to ${escapeHtml(interaction.target.name)}`);
  } else if (interaction?.kind === 'prisonPerson' && !state.modal && !state.survey.activeStake) {
    setInteractionPrompt(`<b>E</b> Speak to ${escapeHtml(interaction.target.name)}`);
  } else if (['lodge', 'signing', 'tower', 'irisTrail', 'witness', 'jetty', 'chronology'].includes(interaction?.kind)
    && !state.modal && !state.survey.activeStake) {
    setInteractionPrompt(`<b>E</b> ${escapeHtml(interaction.target.prompt)}`);
  } else if (interaction?.kind === 'clue' && !state.modal && !state.survey.activeStake) {
    setInteractionPrompt(`<b>E</b> ${escapeHtml(interaction.target.name)}${state.found.has(interaction.target.id) ? ' · review' : ''}`);
  } else setInteractionPrompt();
}

function nearbySite(x = state.x, z = state.z) {
  let best = null;
  let distance = Infinity;
  for (const site of SITES) {
    const d = Math.hypot(x-site.x,z-site.z);
    if (d < distance) { best=site; distance=d; }
  }
  return { site: best, distance };
}

let last = performance.now();
let elapsed = 0;
const standbyLampClock = createStandbyLampClock();
let ambientElapsed = 0;
let autosaveAt = 0;
let footstepDistance = 0;
const renderedFrameWaiters = [];
let trailerCameraPose = null;
function frame(now) {
  requestAnimationFrame(frame);
  const perfFrameStart = performanceTelemetry ? performance.now() : 0;
  const wallDt = arrivalFrameSeconds(now, last);
  const dt = Math.min(wallDt, 0.05);
  // Cinematic beats use the ferry's bounded wall clock. At a slow frame rate,
  // the camera and Iris's exit must still take their authored real-time length.
  const sceneDt = wallDt;
  const inputDt = state.started && !state.modal && !cutscenes.active
    && !chapterLoading.active ? dt : 0;
  const gameplayDt = drone.active ? 0 : inputDt;
  last = now;
  elapsed += dt;
  ambientElapsed += inputDt;
  const weather = effectiveWeather(state.ended ? 'dawn' : CHAPTERS[state.chapter].weather,
    elapsed, state.chapter);
  if (state.started && !state.modal && state.mechanisms.power.pumpOn
    && !mechanismMilestones(state.mechanisms).tunnelDrained) {
    const drain = tickMechanisms(state.mechanisms, gameplayDt);
    state.mechanisms = drain.state;
    if (drain.event === 'tunnel_drained') {
      sound.playClue();
      toast('TUNNEL WATER BELOW THE HATCH · RETURN TO IRIS', 7500);
      radio('Iris here. The pressure is down. I can reach the gate now.', 9000);
      save();
    }
  }
  const previousX = state.x;
  const previousZ = state.z;
  const previousVoyageStatus = voyage.status;
  if (state.started && voyage.active && !state.modal && !chapterLoading.active) {
    voyage.update(wallDt, elapsed);
    if (previousVoyageStatus !== 'stalled' && voyage.status === 'stalled') {
      sound.playCreak();
      $('objective').textContent = 'The ferry is caught just short of the pier. Point out the clear channel to the skipper, or wait for him to free it.';
      radio('Skipper: A loose line has caught the keel. I need the clear side of the channel.', 9000);
      toast('FERRY HELD OFF SOUTH LANDING · PRESS E TO HELP', 7000);
      save();
    } else if (previousVoyageStatus === 'stalled' && voyage.status === 'berthing') {
      $('objective').textContent = 'The ferry is free. Watch the skipper ease alongside the south pier.';
      toast('FERRY FREE · APPROACHING THE PIER', 4500);
      save();
    }
    if (previousVoyageStatus !== 'docked' && voyage.status === 'docked') {
      save();
      openArrivalPanel('The ferry is secured. Step onto the pier when ready.');
    }
  }
  if (state.started && cliffFall.phase !== 'grounded') {
    const fallTick = advanceCliffFall(cliffFall, gameplayDt, cliffWorld, canStandAt);
    cliffFall = fallTick.state;
    if (fallTick.event === 'impact') sound.playFallImpact();
    if (fallTick.event === 'respawn') {
      state.x = fallTick.respawn.x;
      state.z = fallTick.respawn.z;
      state.pitch = -0.045;
      respawnFadeTime = 0;
      footstepDistance = 0;
      keys.clear();
      touchControls.reset();
      save();
    }
  }
  if (respawnFadeTime >= 0 && gameplayDt > 0) {
    respawnFadeTime += gameplayDt;
    if (respawnFadeTime >= 0.9) respawnFadeTime = -1;
  }
  ambientTraffic.update(inputDt, {
    playerX: state.x, playerZ: state.z, playerVehicle: driving.active,
    chapter: state.chapter,
    weather,
    started: state.started && !voyage.active,
    ended: state.ended,
  });
  if (inputDt > 0 && !voyage.active && !drone.active
    && cliffFall.phase === 'grounded' && respawnFadeTime < 0) {
    const pad = touchControls.input.snapshot();
    if (driving.active) {
      driving.update(inputDt, {
        throttle: THREE.MathUtils.clamp(Number(keys.has('KeyW')) - Number(keys.has('KeyS')) + pad.throttle, -1, 1),
        steer: THREE.MathUtils.clamp(Number(keys.has('KeyD')) - Number(keys.has('KeyA')) + pad.steer, -1, 1),
        brake: keys.has('Space') || pad.brake,
      }, canPlaceVehicle);
      state.x = driving.active.x;
      state.z = driving.active.z;
    } else {
      const fw = THREE.MathUtils.clamp(Number(keys.has('KeyW')) - Number(keys.has('KeyS')) + pad.forward, -1, 1);
      const side = THREE.MathUtils.clamp(Number(keys.has('KeyD')) - Number(keys.has('KeyA')) + pad.sideways, -1, 1);
      const magnitude = Math.hypot(fw,side);
      if (magnitude > 0) {
        const speed = state.survey.activeStake ? 2.1 : keys.has('ShiftLeft') || keys.has('ShiftRight') ? 7.3 : 4.6;
        const forwardX = -Math.sin(state.yaw), forwardZ = -Math.cos(state.yaw);
        const rightX = Math.cos(state.yaw), rightZ = -Math.sin(state.yaw);
        const vx=(forwardX*fw+rightX*side)/magnitude, vz=(forwardZ*fw+rightZ*side)/magnitude;
        const nx=state.x+vx*speed*inputDt, nz=state.z+vz*speed*inputDt;
        tryPlayerStep(nx, state.z);
        if (cliffFall.phase === 'grounded') tryPlayerStep(state.x, nz);
        state.walkPhase += inputDt * (keys.has('ShiftLeft') ? 11 : 8);
      }
      if (state.survey.activeStake) {
        state.yaw += (Number(keys.has('ArrowLeft')) - Number(keys.has('ArrowRight'))) * inputDt * 0.78;
        state.pitch = THREE.MathUtils.clamp(state.pitch
          + (Number(keys.has('ArrowUp')) - Number(keys.has('ArrowDown'))) * inputDt * 0.65, -1.45, 1.45);
      }
    }
  }
  if (drone.active && inputDt > 0) {
    const pad = touchControls.input.snapshot();
    drone.update(inputDt, {
      forward: THREE.MathUtils.clamp(Number(keys.has('KeyW')) - Number(keys.has('KeyS')) + pad.forward, -1, 1),
      sideways: THREE.MathUtils.clamp(Number(keys.has('KeyD')) - Number(keys.has('KeyA')) + pad.sideways, -1, 1),
      ascend: Number(keys.has('Space')) + pad.ascend,
      descend: Number(keys.has('ControlLeft') || keys.has('ControlRight')) + pad.descend,
      boost: keys.has('ShiftLeft') || keys.has('ShiftRight') || pad.boost,
    });
  }
  if (state.started && !driving.active && !voyage.active
    && cliffFall.phase === 'grounded' && respawnFadeTime < 0
    && (!cliffFall.lastSafe || Math.hypot(state.x - cliffFall.lastSafe.x,
      state.z - cliffFall.lastSafe.z) > 2)) {
    cliffFall = rememberSafeGround(cliffFall, { x: state.x, z: state.z },
      cliffWorld, canStandAt);
  }
  if (inputDt > 0 && !devClueId && !driving.active && !voyage.active && !drone.active
    && !state.ended && state.found.has('daybreak_report')
    && Math.hypot(state.x - siteById.north_jetty.x,
      state.z - siteById.north_jetty.z) < 22
    && !cutsceneViewed.has('north_jetty_daybreak')) {
    queueStoryCutscene('north_jetty_daybreak');
    startStoryCutscene();
  }
  state.inside = containingBuilding(state.x,state.z);
  const sheltered = !drone.active && isRoofed(state.x, state.z);
  footstepDistance += driving.active ? 0 : Math.hypot(state.x - previousX, state.z - previousZ);
  if (footstepDistance > 2.25) {
    footstepDistance -= 2.25;
    sound.playFootstep(state.inside || onSouthPier(state.x, state.z) ? 'floor' : 'wet ground');
  }
  const eye = playerGroundHeight(state.x,state.z)+1.72;
  const walking = !driving.active && !voyage.active && !drone.active
    && (keys.has('KeyW')||keys.has('KeyA')||keys.has('KeyS')||keys.has('KeyD')
      || Math.hypot(touchControls.input.snapshot().forward, touchControls.input.snapshot().sideways) > 0)
    && inputDt > 0 && cliffFall.phase === 'grounded'
    && respawnFadeTime < 0;
  const bob = walking ? Math.sin(state.walkPhase)*0.035 : 0;
  if (state.started) {
    approachLight.visible = false;
    if (cliffFall.phase !== 'grounded') {
      const pose = cliffFallPresentation(cliffFall);
      camera.position.set(pose.x, pose.y, pose.z);
      camera.rotation.y = state.yaw;
      camera.rotation.x = THREE.MathUtils.clamp(state.pitch + pose.pitchOffset, -1.45, 1.45);
    } else if (voyage.active) {
      const pose = voyage.cameraPose();
      camera.position.set(pose.position.x, pose.position.y, pose.position.z);
      camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
    } else if (driving.active) {
      const pose = driving.cameraPose();
      camera.position.set(pose.position.x, pose.position.y, pose.position.z);
      camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
    } else if (drone.active) {
      drone.applyToCamera(camera);
      $('drone-altitude').textContent = `${Math.round(camera.position.y - world.waterHeight(camera.position.x, camera.position.z))} M ABOVE SEA`;
    } else {
      camera.position.set(state.x,eye+bob,state.z);
      orientFirstPersonCamera(camera, state.yaw, state.pitch);
    }
  } else {
    approachLight.visible = true;
    // Let the opening screen establish the island's height above the sea.
    camera.position.set(180 + Math.sin(elapsed * 0.08) * 3, 58, 470);
    camera.lookAt(50, 30, 240);
  }
  cutscenes.update(sceneDt);
  if (trailerMode && trailerCameraPose) {
    camera.position.set(trailerCameraPose.x, trailerCameraPose.y, trailerCameraPose.z);
    camera.lookAt(trailerCameraPose.lookX, trailerCameraPose.lookY, trailerCameraPose.lookZ);
  }
  if (cliffFall.phase !== 'grounded') {
    fallPresentation.update(gameplayDt, {
      phase: cliffFall.phase === 'impact' ? 'impact' : 'falling',
      progress: cliffFall.phase === 'impact'
        ? cliffFall.phaseTime / CLIFF_FALL.impactSeconds
        : cliffFall.phaseTime / fallExpectedSeconds,
    });
    fallVisualActive = true;
  } else if (respawnFadeTime >= 0) {
    fallPresentation.update(gameplayDt, { phase: 'respawn', progress: respawnFadeTime / 0.9 });
    fallVisualActive = true;
  } else if (fallVisualActive) {
    fallPresentation.reset();
    fallVisualActive = false;
  }
  vehicleHud.classList.toggle('hidden', !state.started || !driving.active);
  if (driving.active) {
    const label = { sedan: 'SERVICE SEDAN', wagon: 'ESTATE WAGON', van: 'TRANSPORT VAN' }[driving.active.type];
    vehicleHud.textContent = `${label} · ${Math.round(Math.abs(driving.active.speed) * 3.6)} KM/H`;
  }
  world.setIndoor?.(sheltered);
  const offshoreMist = chapterThreeMist({
    chapter: state.chapter, elapsed, x: camera.position.x, z: camera.position.z, indoors: sheltered,
  });
  const lightningTriggered = world.update(dt,elapsed,weather,offshoreMist);
  windSpray.update(dt, elapsed, weather, { indoors: sheltered });
  northJettySurvey.update(elapsed, camera.position);
  witnessChronologyScene.update(camera.position, state.chapter);
  seaLife.update(elapsed, weather);
  fireAtmosphere.update(elapsed, { weather, cameraPosition: camera.position });
  prisonPopulation.update(ambientElapsed, { weather, camera,
    shadowLight: world.shadowLight });
  const faunaCue = fauna.update(inputDt, ambientElapsed, weather, {
    playerX: camera.position.x, playerZ: camera.position.z, indoors: sheltered,
  });
  rainEffects.update(dt,elapsed,weather,{ indoors: sheltered });
  wetWindows.update(dt,weather);
  boats.update(gameplayDt, elapsed, {
    rescueExpected: state.chapter >= 4,
    pumpRestored: state.mechanisms.power.pumpOn,
    launchWarned: state.mechanisms.power.launchWarned,
    launchGuided: state.found.has('launch_guided'),
    irisRescued: state.found.has('iris_rescued'),
    ended: state.ended,
  }, world.waterHeight);
  boats.arrival.visible = !voyage.active;
  const near=nearbySite(camera.position.x, camera.position.z);
  const passingCar = ambientTraffic.nearbyVehicle(camera.position.x, camera.position.z, 72);
  const passingLevel = passingCar
    ? Math.max(0, 1 - passingCar.distance / 72) * (sheltered ? 0.2 : 0.55) : 0;
  sound.setVehicleEngine(Boolean(driving.active || passingCar),
    driving.active ? Math.min(1, Math.abs(driving.active.speed) / 14)
      : passingCar ? Math.min(1, Math.abs(passingCar.speed) / 10) : 0,
    driving.active ? 1 : passingLevel);
  sound.update(dt,weather,{id:near.site?.id||'shore',indoors:sheltered});
  if (faunaCue.birdCalls) sound.playBirdCall(faunaCue.nearestBirdDistance);
  music.update(dt, { chapter: state.chapter, weather, indoors: sheltered,
    dialogue: state.modal, ended: state.ended });
  people.update(elapsed, {
    ...peopleContext(), playerX: camera.position.x, playerZ: camera.position.z,
    speakingId: state.modal ? activeSpeakerId : null,
  });
  if (lightningTriggered) sound.playThunder(world.thunderPan);
  if (state.started && !cutscenes.active && !drone.active) {
    if (near.distance<22 && !state.visited.has(near.site.id)) {
      state.visited.add(near.site.id);
      toast(near.site.name.toUpperCase());
      save();
    }
    updateMarkers(elapsed);
  }
  evidenceProps.update({
    chapter: state.chapter, inside: state.inside?.id, found: state.found,
    cameraPosition: camera.position, activeSurveyStake: state.survey.activeStake,
  });
  pumpInterior.update(gameplayDt, mechanismMilestones(state.mechanisms),
    state.mechanisms.power.drainSeconds / 30);
  rescueStaging.update(cutscenes.active ? sceneDt : gameplayDt, elapsed, {
    chapter: state.chapter,
    pumpRestored: state.mechanisms.power.pumpOn,
    drainFraction: state.mechanisms.power.drainSeconds / 30,
    tunnelDrained: mechanismMilestones(state.mechanisms).tunnelDrained,
    launchGuided: state.found.has('launch_guided'),
    irisRescued: state.found.has('iris_rescued'),
    hatch: state.hatch,
    paused: state.modal && !cutscenes.active,
    cameraPosition: camera.position,
  }, people.figures.get('iris'));
  witnessTableProps.update({
    chapter: state.chapter, inside: state.inside?.id,
    witness: state.witness, elapsed,
  });
  for (const [id, post] of surveyPosts) post.visible = id !== state.survey.activeStake;
  const standbyLit = standbyLampClock.update(wallDt,
    mechanismMilestones(state.mechanisms).standbyEnergized);
  lights.standby.group.visible = state.chapter >= 2 && standbyLit;
  const surveyRear = SURVEY_STAKES[state.survey.activeStake]?.rear;
  lights.front.halo.scale.setScalar(state.survey.activeStake ? 8.0 : 4.6);
  lights.main.halo.scale.setScalar(surveyRear === 'main' ? 3.8 : 2.15);
  lights.standby.halo.scale.setScalar(surveyRear === 'standby' ? 3.8 : 2.15);
  lights.front.light.intensity = 4.5 + Math.sin(elapsed*1.4)*0.8;
  lights.main.light.intensity = 4.8 + Math.sin(elapsed*1.32)*0.8;
  // Camera steadiness is measured in real time; the capped walking timestep
  // would make a short light window impossible to hold on a slow frame loop.
  if (state.started && !state.modal && !voyage.active && !drone.active && !chapterLoading.active) updateSurveyCamera(wallDt);
  if (now-autosaveAt>12000 && state.started && !cutscenes.active && !trailerMode) {
    save(); autosaveAt=now;
  }
  syncTouchHud();
  renderer.render(scene,camera);
  for (const resolve of renderedFrameWaiters.splice(0)) resolve();
  if (performanceTelemetry) {
    const report = performanceTelemetry.record({
      at: now, cpuMs: performance.now() - perfFrameStart,
      calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
      active: state.started && !state.modal && !cutscenes.active,
      visible: document.visibilityState === 'visible',
    });
    if (report) {
      statsElement.textContent = formatPerformanceTelemetry(report, {
        tier: renderProfile.tier, pixelRatio: renderer.getPixelRatio(),
        width: renderer.domElement.width, height: renderer.domElement.height,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
      });
    }
  }
}
requestAnimationFrame(frame);
void prepareChapterView(selectedChapterIndex === null ? 'PREPARING THE ISLAND'
  : `PREPARING CHAPTER ${selectedChapterIndex + 1}`, null, initialLoadingToken);

function touchLook(dx, dy) {
  if (!state.started || state.modal || chapterLoading.active
    || cliffFall.phase !== 'grounded' || respawnFadeTime >= 0) return;
  if (drone.active) { drone.look(dx, dy); return; }
  if (voyage.active || driving.active) return;
  state.yaw -= dx * 0.0031;
  state.pitch = THREE.MathUtils.clamp(state.pitch - dy * 0.0031, -1.45, 1.45);
}
function adjustSurveyZoom(inward) {
  if (!state.survey.activeStake) return;
  camera.fov = THREE.MathUtils.clamp(camera.fov + (inward ? -3 : 3), SURVEY_FOV.min, SURVEY_FOV.max);
  camera.updateProjectionMatrix();
}
function performInteract() {
  if (cutscenes.active || drone.active || chapterLoading.active) return;
  if (voyage.active) { openArrivalPanel(); return; }
  if (driving.active) {
    const landing = driving.exit((x, z) =>
      (world.isWalkable(x, z) || onSouthPier(x, z)) && canStandAt(x, z));
    if (landing) {
      state.x = landing.x; state.z = landing.z; state.yaw = landing.yaw;
      state.pitch = -0.045;
      footstepDistance = 0;
      touchControls.reset();
      $('controls-hint').textContent = 'WASD MOVE · M MAP · J JOURNAL · B CASE BOARD · E INSPECT · F LIGHT · U AUDIO · ESC MENU';
      sound.playInteraction();
      toast('LEFT VEHICLE', 1900);
      save();
    } else toast('STOP THE VEHICLE AND FIND CLEAR GROUND TO EXIT', 2800);
    return;
  }
  const interaction = state.nearInteraction;
  if (interaction?.kind === 'vehicle') {
    if (driving.enter(interaction.target.vehicle.id)) {
      state.x = driving.active.x; state.z = driving.active.z;
      footstepDistance = 0;
      touchControls.reset();
      $('controls-hint').textContent = 'W ACCELERATE · S REVERSE · A/D STEER · SPACE BRAKE · E EXIT · M MAP · U AUDIO · ESC MENU';
      sound.playInteraction();
      toast('ENGINE STARTED · FOLLOW THE SERVICE ROAD', 3500);
      save();
    }
  } else if (interaction?.kind === 'person') openConversation(interaction.target.id);
  else if (interaction?.kind === 'prisonPerson') openPrisonConversation(interaction.target);
  else if (interaction?.kind === 'lodge') openLodgeStation(interaction.target.id);
  else if (interaction?.kind === 'signing') openSigningStation(interaction.target.id);
  else if (interaction?.kind === 'tower') openTowerCircuitStation(interaction.target.id);
  else if (interaction?.kind === 'irisTrail') openIrisTrailStation(interaction.target.id);
  else if (interaction?.kind === 'witness') openWitnessStation(interaction.target.id);
  else if (interaction?.kind === 'jetty') openJettyStation(interaction.target.id);
  else if (interaction?.kind === 'chronology') openWitnessChronology();
  else if (interaction?.kind === 'clue') inspect(interaction.target);
}
function toggleFlashlight() {
  state.flashlight = !state.flashlight;
  flashlight.visible = state.flashlight;
  toast(state.flashlight ? 'FLASHLIGHT ON' : 'FLASHLIGHT OFF', 1800);
  save();
}
function toggleAudio() {
  state.muted = !state.muted;
  sound.setMuted(state.muted);
  music.setMuted(state.muted);
  toast(state.muted ? 'AUDIO MUTED' : 'AUDIO ON', 1800);
  save();
}
function touchAction(action) {
  if (!state.started || state.modal || chapterLoading.active) return;
  if (drone.active) {
    if (action === 'menu') openPauseMenu();
    else if (action === 'drone' || action === 'interact') exitDroneView();
    return;
  }
  if (action === 'survey-exit' && state.survey.activeStake) { leaveSurvey(); return; }
  if (action === 'zoom-in' || action === 'zoom-out') { adjustSurveyZoom(action === 'zoom-in'); return; }
  if (action === 'shutter' && state.survey.activeStake) { shutterSurvey(); return; }
  if (cliffFall.phase !== 'grounded' || respawnFadeTime >= 0) return;
  if (state.survey.activeStake) leaveSurvey();
  if (action === 'drone') enterDroneView();
  else if (action === 'interact') performInteract();
  else if (action === 'menu') openPauseMenu();
  else if (action === 'journal') openJournal();
  else if (action === 'map') openMap();
  else if (action === 'board') openCaseBoard();
  else if (action === 'light') toggleFlashlight();
  else if (action === 'audio') toggleAudio();
}
document.addEventListener('mousemove', (event) => {
  if (state.modal || chapterLoading.active || !state.started
    || cliffFall.phase !== 'grounded' || respawnFadeTime >= 0) return;
  if (document.pointerLockElement !== renderer.domElement && !(pointerLockUnavailable && (event.buttons & 1))) return;
  if (drone.active) { drone.look(event.movementX, event.movementY); return; }
  if (driving.active || voyage.active) return;
  state.yaw -= event.movementX * 0.0021;
  state.pitch = THREE.MathUtils.clamp(state.pitch-event.movementY*0.0021,-1.45,1.45);
});
document.addEventListener('keydown', (event) => {
  if (['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','Space','ControlLeft','ControlRight',
    'ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Equal','Minus','NumpadAdd','NumpadSubtract'].includes(event.code)) event.preventDefault();
  if (chapterLoading.active || cutscenes.active) { keys.delete(event.code); return; }
  keys.add(event.code);
  if (!state.started) return;
  if (event.code==='Escape' && state.modal && performance.now()-modalOpenedAt>300) { closeModal(); return; }
  if (state.modal) return;
  if (drone.active) {
    if (event.repeat) return;
    if (event.code === 'KeyG') exitDroneView();
    else if (event.code === 'Escape') openPauseMenu();
    else if (event.code === 'KeyU') toggleAudio();
    return;
  }
  if (cliffFall.phase !== 'grounded' || respawnFadeTime >= 0) {
    keys.delete(event.code);
    if (event.code === 'Escape' && !event.repeat) openPauseMenu();
    return;
  }
  if (event.repeat) return;
  if (state.survey.activeStake) {
    if (event.code === 'Escape' || event.code === 'KeyE') leaveSurvey();
    else if (event.code === 'Space' || event.code === 'Enter') shutterSurvey();
    else if (['Equal','NumpadAdd','Minus','NumpadSubtract'].includes(event.code)) {
      adjustSurveyZoom(event.code === 'Equal' || event.code === 'NumpadAdd');
    }
    return;
  }
  if (event.code === 'KeyG') { enterDroneView(); return; }
  if (event.code === 'Escape') { openPauseMenu(); return; }
  if (event.code==='KeyE') performInteract();
  if (event.code==='KeyM') openMap();
  if (event.code==='KeyJ') openJournal();
  if (event.code==='KeyB') openCaseBoard();
  if (event.code==='KeyF') toggleFlashlight();
  if (event.code==='KeyU') toggleAudio();
});
document.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => { keys.clear(); touchControls.reset(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { keys.clear(); touchControls.reset(); }
});
renderer.domElement.addEventListener('wheel', (event) => {
  if (!state.survey.activeStake || state.modal) return;
  event.preventDefault();
  camera.fov = THREE.MathUtils.clamp(camera.fov + Math.sign(event.deltaY) * 2.2, SURVEY_FOV.min, SURVEY_FOV.max);
  camera.updateProjectionMatrix();
}, { passive: false });
function openPauseMenu() {
  if (!state.started || state.modal || chapterLoading.active) return;
  keys.clear();
  openModal('PAUSED', 'The island waits', `<p>Take a moment. The evidence will still be here.</p>
    <div class="music-settings"><label for="pause-music-volume">SOFT PIANO <output id="pause-music-volume-value"></output></label>
    <input id="pause-music-volume" type="range" min="0" max="100" step="5" aria-label="Piano music volume" />
    <small>Set to 0 to keep the island sounds without music.</small>
    <div class="audio-channel"><label for="pause-sea-volume">SEA AMBIENCE <output id="pause-sea-volume-value"></output></label>
    <input id="pause-sea-volume" type="range" min="0" max="100" step="5" aria-label="Sea ambience volume" />
    <small>Lower the surf independently; rain and wind remain audible.</small></div></div>`, [
    { label: drone.active ? 'RESUME DRONE FLIGHT' : 'RESUME INVESTIGATION', onClick: closeModal },
    ...(drone.active
      ? [{ label: 'EXIT DRONE VIEW', onClick: () => { exitDroneView(); closeModal(); } }]
      : droneFlightAvailable()
        ? [{ label: 'DRONE VIEW', onClick: () => { closeModal({ skipPointerLock: true }); enterDroneView(); } }]
        : []),
    ...(state.ended ? [{ label: 'REOPENED INQUIRY', onClick: () => showEpilogue() }] : []),
    { label: 'CASE RECAP', secondary: true, onClick: openCaseRecap },
    { label: 'FIELD JOURNAL', secondary: true, onClick: openJournal },
    { label: 'CASE BOARD', secondary: true, onClick: openCaseBoard },
    { label: 'MAIN MENU', secondary: true, onClick: () => { save(); location.reload(); } },
  ]);
  bindMusicVolumeInput('pause-music-volume');
  bindSeaAmbienceInput('pause-sea-volume');
  setMusicVolume(musicVolume * 100);
  setSeaAmbienceVolume(seaVolume * 100);
}
document.addEventListener('pointerlockchange', () => {
  if (drone.active && performance.now() - droneEntryAt < 1000) return;
  if (state.started && !state.modal && !chapterLoading.active && !cutscenes.active
    && document.pointerLockElement !== renderer.domElement) openPauseMenu();
});
$('menu-button').addEventListener('click', openPauseMenu);
renderer.domElement.addEventListener('click', () => {
  if (!state.started || state.modal || chapterLoading.active) return;
  if (state.survey.activeStake && (pointerLockUnavailable || document.pointerLockElement === renderer.domElement)) shutterSurvey();
  else requestGamePointerLock();
});
$('start-button').addEventListener('click', () => {
  // A browser may leave AudioContext.resume() pending; visual play must not wait on it.
  void sound.start();
  void music.start();
  state.started=true;
  if (driving.active) $('controls-hint').textContent = 'W ACCELERATE · S REVERSE · A/D STEER · SPACE BRAKE · E EXIT · M MAP · U AUDIO · ESC MENU';
  $('screen').classList.add('hidden');
  $('hud').classList.remove('hidden');
  if (!pendingCutsceneId) requestGamePointerLock();
  const prepareEntry = (onReady) => void prepareChapterView(
    `CHAPTER ${state.chapter + 1} · ${CHAPTERS[state.chapter].title}`, onReady);
  if (pendingCutsceneId && !voyage.active) {
    prepareEntry(() => { if (!startStoryCutscene()) requestGamePointerLock(); });
    return;
  }
  if (devClueId === 'cliff_fall' && devStage === 'auto') {
    // Browser QA can exercise the complete fall without synthetic input events.
    state.x = 344;
    state.z = 0;
    tryPlayerStep(344.4, 0);
  }
  if (!devClueId && !storedSave
    && (selectedChapterIndex === null || selectedChapterIndex === 0)) {
    voyage.start();
    $('controls-hint').textContent = 'E CROSSING NOTES · WATCH THE SOUTH COVE APPROACH';
    $('objective').textContent = 'Verify the south pier with the skipper, then land beneath the cliffs.';
    save();
    prepareEntry(openArrivalPanel);
    return;
  }
  if (voyage.active) {
    $('controls-hint').textContent = 'E CROSSING NOTES · WATCH THE SOUTH COVE APPROACH';
    $('objective').textContent = 'Verify the south pier with the skipper, then land beneath the cliffs.';
    prepareEntry(openArrivalPanel);
    return;
  }
  if (storedSave && campaignAdvanceStatus(state).ready) {
    // A browser close can interrupt the save made by a chapter's final action
    // before checkChapter advances the chapter. Resume that earned transition.
    checkChapter({ deferLoad: true });
    prepareEntry(() => {
      if (state.ended) showEpilogue();
      else {
        toast(`CHAPTER ${state.chapter + 1} — ${CHAPTERS[state.chapter].title}`, 6500);
        setTimeout(() => radio(CHAPTERS[state.chapter].radio), 2600);
      }
    });
    return;
  }
  if (devClueId && clueById[devClueId]) {
    prepareEntry(() => {
      radio(CHAPTERS[state.chapter].radio, 11500);
      toast(objectiveText().toUpperCase(), 6500);
    });
  } else if (chapterPreset) {
    save();
    prepareEntry(() => {
      radio(CHAPTERS[state.chapter].radio, 11500);
      toast(`CHAPTER ${state.chapter + 1} · ${CHAPTERS[state.chapter].title}`, 6500);
    });
  } else if (!saved) {
    prepareEntry(() => {
      radio(CHAPTERS[0].radio, 11500);
      toast('FOLLOW THE PATH TO THE KEEPER’S LODGE',6500);
    });
  } else if (state.ended) {
    prepareEntry(showEpilogue);
  } else prepareEntry(() => toast('INVESTIGATION RESUMED',3000));
});
window.addEventListener('resize', () => {
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio, renderProfile.pixelRatioCap));
  renderer.setSize(innerWidth,innerHeight);
});

// Local trailer capture can frame genuine in-engine play without changing the
// released game. Vite removes this block from production builds.
if (trailerMode) {
  const finite = (...values) => values.every(Number.isFinite);
  const captureUi = ['hud', 'modal', 'survey-overlay', 'toast', 'touch-controls',
    'drone-hud', 'vehicle-hud', 'perf-stats'];
  window.__trailer = {
    ready: () => state.started && !chapterLoading.active,
    getView: () => ({
      x: state.x, z: state.z, yaw: state.yaw, pitch: state.pitch,
      y: playerGroundHeight(state.x, state.z) + 1.72,
      chapter: state.chapter + 1, inside: state.inside?.id ?? null,
      camera: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
    }),
    heightAt: (x, z) => finite(x, z) ? world.terrainHeight(x, z) : null,
    setView: ({ x, z, yaw = state.yaw, pitch = state.pitch } = {}) => {
      if (!finite(x, z, yaw, pitch)) return false;
      if (voyage.active) voyage.skip();
      trailerCameraPose = null;
      keys.clear();
      state.x = x;
      state.z = z;
      state.yaw = yaw;
      state.pitch = THREE.MathUtils.clamp(pitch, -1.45, 1.45);
      state.walkPhase = 0;
      footstepDistance = 0;
      return true;
    },
    setCamera: ({ x, y, z, lookX, lookY, lookZ } = {}) => {
      if (!finite(x, y, z, lookX, lookY, lookZ)) return false;
      trailerCameraPose = { x, y, z, lookX, lookY, lookZ };
      return true;
    },
    clearCamera: () => { trailerCameraPose = null; },
    hideHud: (hide = true) => {
      for (const id of captureUi) {
        const element = $(id);
        if (element) element.style.visibility = hide ? 'hidden' : '';
      }
      return true;
    },
  };
}
