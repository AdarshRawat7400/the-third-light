// The first conversation after Iris leaves the hatch belongs to her safety.
// This scene records an immediate account without taking custody of her case
// or pressing her to give a formal statement while cold and exhausted.

export const RESCUE_AFTERCARE_VERSION = 1;

const REQUIRED = Object.freeze(['pump_power', 'launch_guided', 'iris_rescued']);
const BEATS = Object.freeze([
  Object.freeze({ field: 'medical', type: 'aftercare.medical', answer: 'medical_first' }),
  Object.freeze({ field: 'case', type: 'aftercare.case', answer: 'keep_with_iris' }),
  Object.freeze({ field: 'account', type: 'aftercare.account', answer: 'firsthand_only' }),
  Object.freeze({ field: 'rest', type: 'aftercare.rest', answer: 'defer_statement' }),
]);

function foundSet(context = {}) {
  const ids = context?.foundIds;
  return ids instanceof Set ? ids : new Set(Array.isArray(ids) ? ids : []);
}

function ready(context = {}) {
  const found = foundSet(context);
  return REQUIRED.every((id) => found.has(id));
}

export function createRescueAftermathState() {
  return {
    version: RESCUE_AFTERCARE_VERSION,
    medical: null,
    case: null,
    account: null,
    rest: null,
  };
}

// Save data is accepted only as a canonical prefix of the four beats. This
// also makes loading an old save with no aftercare field start from beat one.
export function restoreRescueAftermathState(raw, context = {}) {
  const state = createRescueAftermathState();
  if (!ready(context) || !raw || typeof raw !== 'object'
    || raw.version !== RESCUE_AFTERCARE_VERSION) return state;
  for (const beat of BEATS) {
    if (raw[beat.field] !== beat.answer) break;
    state[beat.field] = beat.answer;
  }
  return state;
}

export function rescueAftermathMilestones(raw, context = {}) {
  const state = restoreRescueAftermathState(raw, context);
  const completedBeats = BEATS.filter((beat) => state[beat.field] === beat.answer).length;
  return { completedBeats, complete: completedBeats === BEATS.length };
}

function currentBeat(state) {
  return BEATS.find((beat) => state[beat.field] !== beat.answer) ?? null;
}

function choice(label, type, answer) {
  return { label, action: { type, answer } };
}

export function getRescueAftermathPanel(raw, context = {}) {
  if (!ready(context)) return {
    title: 'The gate is still the priority',
    text: 'Keep the pump running, give the launch the confirmed safe line, and bring Iris clear of the service hatch before asking her for an account.',
    actions: [], complete: false,
  };
  const state = restoreRescueAftermathState(raw, context);
  const beat = currentBeat(state);
  if (!beat) return {
    title: 'Iris can pause',
    text: 'The launch has a medical request. Iris keeps her sealed case, and Mara’s note separates what she directly observed from what others must establish. Iris will decide when she is ready for a formal statement.',
    actions: [], complete: true,
  };
  if (beat.field === 'medical') return {
    title: 'Warmth before questions',
    text: 'Iris steps away from the open gate with the waterproof case under one arm. Her clothes are soaked and her hands shake when she tries to close the latch. “I can walk,” she says. “Please tell the launch I need a doctor.” The boat is on the safe line, still approaching the north berth.',
    actions: [
      choice('Ask what she needs; request a medic and offer a blanket', beat.type, beat.answer),
      choice('Begin a full interview while the details are fresh', beat.type, 'interview_now'),
    ], complete: false,
  };
  if (beat.field === 'case') return {
    title: 'The case in her hands',
    text: 'Iris accepts the blanket and hears Mara pass the medical request to the launch. She checks the case latch herself. The original relay strip and chart stayed above the water. “Please do not take this from me while I’m still shaking,” she says. A later custody decision can wait until she is safe.',
    actions: [
      choice('Let Iris retain the sealed originals; note the intact case', beat.type, beat.answer),
      choice('Take the originals for safekeeping without asking', beat.type, 'take_originals'),
    ], complete: false,
  };
  if (beat.field === 'account') return {
    title: 'What she can say now',
    text: 'Iris keeps the case across her knees. “I heard Elias outside, then the outer bolt move. The handle would not turn from my side. The water reached my knees before the pump caught.” She did not see who moved the bolt. Her immediate account matters, but it cannot itself establish Elias’s intention.',
    actions: [
      choice('Record her gate and water observations; leave actor and intent to other sources', beat.type, beat.answer),
      choice('Write that Iris saw Elias plan to kill her', beat.type, 'invent_intent'),
    ], complete: false,
  };
  return {
    title: 'A statement can wait',
    text: 'The launch acknowledges the medical request. Iris says she can answer practical questions about the pump and case, but wants dry clothes and an examination before a recorded statement. Mara has enough to preserve this first account without making Iris perform certainty for her.',
    actions: [
      choice('Agree to revisit a formal statement after Iris is safe and rested', beat.type, beat.answer),
      choice('Ask her to sign a complete sworn statement at the hatch', beat.type, 'demand_statement'),
    ], complete: false,
  };
}

function result(state, status, message, event = null) {
  return { state, status, message, event };
}

export function applyRescueAftermathAction(previous, action, context = {}) {
  const state = restoreRescueAftermathState(previous, context);
  if (!ready(context)) return result(state, 'blocked',
    'The pump, launch approach, and Iris’s rescue must be secure before this conversation.');
  const beat = currentBeat(state);
  if (!beat) return result(state, 'unchanged',
    'Iris has her case and a medical request. Her formal account can wait until she is ready.');
  if (action?.type !== beat.type) return result(state, 'blocked',
    'Stay with Iris’s immediate need before moving to the next part of her account.');

  if (beat.field === 'medical') {
    if (action.answer === 'interview_now') return result(state, 'mistake',
      'Iris turns away from the questions. “Doctor first. Then I can decide what I can tell you.” The medical request and blanket are still available.');
    if (action.answer !== beat.answer) return result(state, 'blocked', 'Choose how to respond to Iris at the hatch.');
    return result({ ...state, medical: beat.answer }, 'changed',
      'Mara asks before touching her, passes the medical request to the approaching launch, and offers a dry blanket. Iris takes it without releasing the case.', 'rescue_aftercare_beat');
  }
  if (beat.field === 'case') {
    if (action.answer === 'take_originals') return result(state, 'mistake',
      'Iris tightens her hold on the case. “I protected them. Ask me when I am warm and can check a receipt.” Mara leaves the case with her.');
    if (action.answer !== beat.answer) return result(state, 'blocked', 'Choose how to protect the sealed case.');
    return result({ ...state, case: beat.answer }, 'changed',
      'Iris checks the latch herself and keeps the originals. Mara records that the case is closed and remains with its finder; this is not the later decision about inquiry custody.', 'rescue_aftercare_beat');
  }
  if (beat.field === 'account') {
    if (action.answer === 'invent_intent') return result(state, 'mistake',
      '“I did not see him turn the bolt,” Iris says. The stuck handle and rising water are firsthand observations; the person who acted and what he intended need separate evidence.');
    if (action.answer !== beat.answer) return result(state, 'blocked', 'Choose a record limited to Iris’s firsthand observations.');
    return result({ ...state, account: beat.answer }, 'changed',
      'Mara notes the bolt sound, immovable handle, and water at Iris’s knees as Iris’s account. She leaves the actor and intent open for corroboration.', 'rescue_aftercare_beat');
  }
  if (action.answer === 'demand_statement') return result(state, 'mistake',
    'Iris says she will give a formal account after the examination, not while she is cold beside the open hatch. Her first observations are already preserved.');
  if (action.answer !== beat.answer) return result(state, 'blocked', 'Choose when to revisit the formal account.');
  return result({ ...state, rest: beat.answer }, 'complete',
    'Mara agrees. Iris can answer safety questions now and make a formal statement after medical care and rest. She keeps her case and the right to decide its custody.', 'rescue_aftercare_completed');
}
