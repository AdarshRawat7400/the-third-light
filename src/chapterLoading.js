/** Track the resources actually requested by Three.js, including textures
 * discovered while a GLB is being parsed. The total may grow during loading;
 * callers should show completed/total counts rather than a guessed timer. */
export function trackAssetLoading(manager, onProgress = () => {}) {
  if (!manager?.itemStart || !manager?.itemEnd || !manager?.itemError) {
    throw new TypeError('A Three.js LoadingManager is required.');
  }
  const originalStart = manager.itemStart.bind(manager);
  const originalEnd = manager.itemEnd.bind(manager);
  const originalError = manager.itemError.bind(manager);
  let total = 0;
  let pending = 0;
  let errors = 0;
  let waiters = [];
  const snapshot = () => ({ loaded: total - pending, total, pending, errors });
  const notify = () => onProgress(snapshot());

  manager.itemStart = (url) => {
    total += 1;
    pending += 1;
    originalStart(url);
    notify();
  };
  manager.itemEnd = (url) => {
    originalEnd(url);
    pending = Math.max(0, pending - 1);
    notify();
    if (pending === 0) {
      const complete = waiters;
      waiters = [];
      for (const resolve of complete) resolve(snapshot());
    }
  };
  manager.itemError = (url) => {
    errors += 1;
    originalError(url);
    notify();
  };

  return {
    snapshot,
    whenIdle: () => pending === 0
      ? Promise.resolve(snapshot()) : new Promise((resolve) => waiters.push(resolve)),
  };
}

export function createChapterLoadingScreen(root) {
  if (!root) throw new TypeError('A loading screen element is required.');
  const heading = root.querySelector('#loading-heading');
  const detail = root.querySelector('#loading-detail');
  const progress = root.querySelector('#loading-progress');
  const count = root.querySelector('#loading-count');
  let generation = 0;
  let active = true; // The static HTML splash is visible before JavaScript runs.
  let phase = 'building';
  let lastProgress = { loaded: 0, total: 0, pending: 0, errors: 0 };

  function renderProgress() {
    if (!active) return;
    if (phase === 'assets' && lastProgress.total > 0) {
      progress.max = lastProgress.total;
      progress.value = lastProgress.loaded;
      count.textContent = `${lastProgress.loaded} OF ${lastProgress.total} RESOURCES LOADED`;
    } else {
      progress.removeAttribute('value');
      count.textContent = phase === 'scene' ? 'PREPARING THE PLAYABLE VIEW'
        : phase === 'assets' ? 'CHECKING VISUAL RESOURCES' : 'BUILDING THE ISLAND';
    }
  }
  function setBlocked(blocked) {
    for (const id of ['screen', 'hud', 'modal', 'touch-controls']) {
      const element = document.getElementById(id);
      if (element) element.inert = blocked;
    }
  }
  function show(label, description = 'Preparing the island…') {
    generation += 1;
    active = true;
    phase = 'building';
    root.hidden = false;
    root.setAttribute('aria-busy', 'true');
    heading.textContent = label;
    detail.textContent = description;
    setBlocked(true);
    document.activeElement?.blur?.();
    renderProgress();
    return generation;
  }
  function setPhase(nextPhase, description) {
    if (!active) return;
    phase = nextPhase;
    detail.textContent = description;
    renderProgress();
  }
  function updateProgress(nextProgress) {
    lastProgress = nextProgress;
    renderProgress();
  }
  function hide(token) {
    if (token !== generation || !active) return false;
    active = false;
    root.hidden = true;
    root.removeAttribute('aria-busy');
    setBlocked(false);
    return true;
  }
  function fail(token) {
    if (token !== generation || !active) return;
    setPhase('error', 'The scene could not finish loading. Reload this page to try again.');
    count.textContent = 'SCENE PREPARATION FAILED';
  }
  return {
    show, setPhase, updateProgress, hide, fail,
    isCurrent: (token) => active && token === generation,
    get active() { return active; },
  };
}
