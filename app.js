const $ = (selector) => document.querySelector(selector);
const app = $("#app");
const canvas = $("#gameCanvas");
const ctx = canvas.getContext("2d");
const video = $("#camera");

const ui = {
  intro: $("#intro"), loading: $("#loading"), loadingTitle: $("#loadingTitle"), loadingText: $("#loadingText"),
  loadingActions: $("#loadingActions"), calibrate: $("#calibrate"), calibrateTitle: $("#calibrateTitle"),
  calibrateText: $("#calibrateText"), calibrateDetail: $("#calibrateDetail"), signal: $("#signalBar"),
  countdown: $("#countdown"), result: $("#result"), resultTitle: $("#resultTitle"), cue: $("#cue"),
  toast: $("#toast"), demoHelp: $("#demoHelp"), motionArt: $("#motionArt"), tracking: $("#trackingStatus"),
  listen: $("#listenBtn"), home: $("#homeBtn"),
  score: $("#score"), combo: $("#combo"), time: $("#time"), finalScore: $("#finalScore"),
  accuracy: $("#accuracy"), maxCombo: $("#maxCombo"), grade: $("#grade"),
  resultMetricLabel: $("#resultMetricLabel"), resultStreakLabel: $("#resultStreakLabel")
};

const bg = new Image();
bg.src = "assets/kid-playroom-bg-v1.webp";

const CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35";
const MODEL_LITE = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const MODEL_FULL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";
const LM = { nose: 0, ls: 11, rs: 12, le: 13, re: 14, lw: 15, rw: 16, lh: 23, rh: 24, lk: 25, rk: 26, la: 27, ra: 28 };
const SKELETON = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
const POSE_JOINTS = [LM.nose, LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw, LM.lh, LM.rh, LM.lk, LM.rk, LM.la, LM.ra];
const ARM_JOINTS = new Set([LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw]);
const LEG_JOINTS = new Set([LM.lh, LM.rh, LM.lk, LM.rk, LM.la, LM.ra]);
const MAJOR_JOINTS = new Set([LM.ls, LM.rs, LM.lh, LM.rh, LM.lk, LM.rk, LM.la, LM.ra]);
const POSE_INFERENCE_INTERVAL = 55;
const POSE_FRESH_MS = 280;
const POSE_CLEAR_MS = 420;
const POSE_DT_MAX_MS = 140;
const POSE_LOAD_TIMEOUT_MS = 20000;
const TOUCH_DWELL_MS = 140;
const TOUCH_REARM_MS = 90;
const SPELLING_GOAL = 10;
const PICTURE_GOAL = 10;
const FLIGHT_WORD_GOAL = 10;
const FLIGHT_GATE_SPEED = .15;
const FLIGHT_GATE_PREVIEW_MS = 900;
const FLIGHT_POSE_FRESH_MS = POSE_FRESH_MS;
const WORDS = [
  { word: "CAT", emoji: "🐱", ko: "고양이" },
  { word: "DOG", emoji: "🐶", ko: "강아지" },
  { word: "SUN", emoji: "☀️", ko: "해" },
  { word: "BUS", emoji: "🚌", ko: "버스" },
  { word: "FISH", emoji: "🐟", ko: "물고기" },
  { word: "MILK", emoji: "🥛", ko: "우유" },
  { word: "STAR", emoji: "⭐", ko: "별" },
  { word: "BIRD", emoji: "🐦", ko: "새" },
  { word: "BALL", emoji: "⚽", ko: "공" },
  { word: "BOOK", emoji: "📕", ko: "책" },
  { word: "TREE", emoji: "🌳", ko: "나무" },
  { word: "DUCK", emoji: "🦆", ko: "오리" },
  { word: "APPLE", emoji: "🍎", ko: "사과" },
  { word: "MOON", emoji: "🌙", ko: "달" },
  { word: "BEAR", emoji: "🐻", ko: "곰" },
  { word: "FROG", emoji: "🐸", ko: "개구리" },
  { word: "CAKE", emoji: "🍰", ko: "케이크" },
  { word: "SHOE", emoji: "👟", ko: "신발" },
  { word: "CAR", emoji: "🚗", ko: "자동차" },
  { word: "HAT", emoji: "🎩", ko: "모자" }
];

const ACTION_COMMANDS = [
  { id: "handsUp", en: "Raise your hands!", ko: "두 손을 높이 들어요", emoji: "🙌", hold: 320, required: [LM.nose, LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw, LM.lh, LM.rh], focus: [LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw] },
  { id: "touchHead", en: "Touch your head!", ko: "한 손으로 머리를 톡", emoji: "👋", hold: 300, required: [LM.nose, LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw, LM.lh, LM.rh], focus: [LM.nose, LM.le, LM.re, LM.lw, LM.rw] },
  { id: "touchShoulders", en: "Touch your shoulders!", ko: "두 손으로 어깨를 톡", emoji: "🤗", hold: 300, required: [LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw], focus: [LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw] },
  { id: "airplane", en: "Make an airplane!", ko: "양팔을 옆으로 쭉 펴요", emoji: "✈️", hold: 340, required: [LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw, LM.lh, LM.rh], focus: [LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw] },
  { id: "clap", en: "Clap your hands!", ko: "두 손을 가슴 앞에서 모아요", emoji: "👏", hold: 220, required: [LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw, LM.lh, LM.rh], focus: [LM.le, LM.re, LM.lw, LM.rw] },
  { id: "handsOnHips", en: "Hands on your hips!", ko: "두 손을 허리에 올려요", emoji: "🕺", hold: 320, required: [LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw, LM.lh, LM.rh], focus: [LM.le, LM.re, LM.lw, LM.rw, LM.lh, LM.rh] },
  { id: "oneLeg", en: "Lift one foot!", ko: "벽을 잡고 한 발을 들어요", emoji: "🦩", hold: 440, required: [LM.ls, LM.rs, LM.lh, LM.rh, LM.lk, LM.rk, LM.la, LM.ra], focus: [LM.lh, LM.rh, LM.lk, LM.rk, LM.la, LM.ra] },
  { id: "touchKnees", en: "Touch your knees!", ko: "두 손으로 무릎을 톡", emoji: "🦵", hold: 380, required: [LM.ls, LM.rs, LM.lw, LM.rw, LM.lh, LM.rh, LM.lk, LM.rk, LM.la, LM.ra], focus: [LM.lw, LM.rw, LM.lk, LM.rk] },
  { id: "squat", en: "Squat, then stand!", ko: "딱 한 번 앉았다 일어나요", emoji: "🪑", hold: 240, required: [LM.ls, LM.rs, LM.lh, LM.rh, LM.lk, LM.rk, LM.la, LM.ra], focus: [LM.lh, LM.rh, LM.lk, LM.rk, LM.la, LM.ra] },
  { id: "leanSide", en: "Lean to the side!", ko: "양팔을 내리고 옆으로 기울여요", emoji: "🌴", hold: 360, required: [LM.ls, LM.rs, LM.lw, LM.rw, LM.lh, LM.rh, LM.lk, LM.rk, LM.la, LM.ra], focus: [LM.ls, LM.rs, LM.lw, LM.rw, LM.lh, LM.rh] }
];

const games = {
  sequence: { name: "SPELL POP · 10 WORDS", ms: 100000, image: "assets/kid-spell-pop-v1.webp", fullBody: false, description: "한국어 그림 힌트를 보고 서로 다른 영어 단어 10개의 철자를 완성해요." },
  math: { name: "PICTURE PICK · 10 WORDS", ms: 90000, image: "assets/kid-picture-pick-v1.webp", fullBody: false, description: "한국어 문제 10개를 듣고 알맞은 영어 단어를 손으로 골라요." },
  squat: { name: "LISTEN & MOVE · 10 MISSIONS", ms: 130000, image: "assets/kid-action-missions-v2.webp", fullBody: true, description: "서로 다른 영어 동작 10개를 듣고 차례로 따라 해요." },
  jack: { name: "WORD WINGS · 10 WORDS", ms: 100000, image: "assets/kid-flap-flight-v1.webp", fullBody: false, description: "한국어 문제를 듣고 위·아래 영어 구름 중 정답으로 날아가요." }
};

let selectedGame = "math";
let stream = null;
let poseLandmarker = null;
let poseLoading = null;
let poseWorker = null;
let poseWorkerReady = false;
let poseWorkerGeneration = 0;
let poseLoadGeneration = 0;
let poseRuntime = "none";
let poseModelVariant = "lite";
let lastPose = null;
let lastWorldPose = null;
let poseVersion = 0;
let evaluatedPoseVersion = -1;
let poseTimestamp = 0;
let poseCaptureTimestamp = 0;
let lastInferenceAt = 0;
let lastVideoTime = -1;
let inferenceErrors = 0;
let demo = false;
let running = false;
let calibrating = false;
let countdownActive = false;
let renderLoopActive = false;
let renderFrameId = 0;
let sound = true;
let audioCtx = null;
let wakeLock = null;
let gameState = null;
let score = 0, combo = 0, maxCombo = 0, hits = 0, misses = 0, gameElapsed = 0;
let lastFrameAt = performance.now();
let lastPoseEvalAt = 0;
let calibrationGoodSince = null;
let cameraRect = { x: 0, y: 0, w: 1, h: 1 };
let playRect = { x: 0, y: 0, w: 1, h: 1 };
let viewW = innerWidth, viewH = innerHeight;
let particles = [], ripples = [];
let feedbacks = [];
let wristTrails = { [LM.lw]: [], [LM.rw]: [] };
let inputLockedUntil = 0;
let cameraAttemptId = 0;
let cameraFrameGeneration = 0;
let cameraStreamReady = false;
let countdownAttemptId = 0;
let forceCpuPose = false;
let preferLitePose = false;
let poseInferenceBusy = false;
let poseInferenceStartedAt = 0;
let poseRecovering = false;
let poseInferenceSamples = 0;
let poseDowngradeStarted = false;
let disablePoseWorker = false;
let selfTesting = false;
let adaptiveInferenceInterval = POSE_INFERENCE_INTERVAL;
let lastUsablePoseAt = 0;
let trackingInvalidSince = 0;
let trackingInputReset = false;
let speechRoundToken = 0;
let trackingWasPaused = false;
let wordDeck = [];
let completedWordCount = 0;
let completedRun = false;
let orientationTimer = 0;
let resumeCameraAfterPageShow = false;
let resumeCameraMode = "";
let cameraStartInProgress = false;
const motionDiagnostics = {
  runtime: "none", model: "none", delegate: "none", camera: null,
  inferenceMs: 0, inferenceAverageMs: 0, poseAgeMs: Infinity,
  droppedFrames: 0, errors: 0, lastError: ""
};
window.__MOTION_DIAGNOSTICS__ = motionDiagnostics;

const hide = (...elements) => elements.forEach((el) => el?.classList.add("hidden"));
const show = (...elements) => elements.forEach((el) => el?.classList.remove("hidden"));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, amount) => a + (b - a) * amount;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const shuffle = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
const median = (values) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

function withTimeout(promise, timeoutMs, message, onLateResolve) {
  let timer;
  let settled = false;
  const guardedPromise = Promise.resolve(promise).then((value) => {
    if (settled) {
      try { onLateResolve?.(value); } catch {}
    }
    return value;
  });
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      settled = true;
      reject(new Error(message));
    }, timeoutMs);
  });
  return Promise.race([guardedPromise, timeoutPromise]).finally(() => {
    settled = true;
    clearTimeout(timer);
  });
}

function currentPoseAge(now = performance.now()) {
  if (!poseTimestamp) return Infinity;
  const receivedAge = now - poseTimestamp;
  const captureAge = poseCaptureTimestamp ? now - poseCaptureTimestamp : receivedAge;
  return Math.max(0, receivedAge, captureAge);
}

function nextWord() {
  return wordDeck.shift() || null;
}

function withObjectParticle(word) {
  const value = word || "";
  const last = value.charCodeAt(value.length - 1) || 0;
  const hasFinalConsonant = last >= 0xAC00 && last <= 0xD7A3 && (last - 0xAC00) % 28 !== 0;
  return `${value}${hasFinalConsonant ? "을" : "를"}`;
}

function withTopicParticle(word) {
  const value = word || "";
  const last = value.charCodeAt(value.length - 1) || 0;
  const hasFinalConsonant = last >= 0xAC00 && last <= 0xD7A3 && (last - 0xAC00) % 28 !== 0;
  return `${value}${hasFinalConsonant ? "은" : "는"}`;
}

function speakText(text, lang, interrupt = false, onDone = null) {
  if (!sound || selfTesting || !text || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return false;
  try {
    if (interrupt) speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = lang === "ko-KR" ? .88 : .78;
    utterance.pitch = lang === "ko-KR" ? 1.08 : 1.16;
    utterance.volume = .9;
    if (onDone) {
      utterance.onend = onDone;
      utterance.onerror = onDone;
    }
    speechSynthesis.speak(utterance);
    return true;
  } catch { return false; }
}

const speakEnglish = (text, interrupt = false, onDone = null) => speakText(text, "en-US", interrupt, onDone);
const speakKorean = (text, interrupt = false, onDone = null) => speakText(text, "ko-KR", interrupt, onDone);

function resize() {
  const bounds = app.getBoundingClientRect();
  viewW = Math.max(1, bounds.width);
  viewH = Math.max(1, bounds.height);
  const dpr = Math.min(devicePixelRatio || 1, viewW < 700 ? 1.35 : 1.75);
  canvas.width = Math.round(viewW * dpr);
  canvas.height = Math.round(viewH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  updateCameraGeometry();
  if (!renderLoopActive) drawBackground();
}

function updateCameraGeometry() {
  const compactLandscape = viewW > viewH && viewH < 680;
  const stageTop = compactLandscape ? 62 : viewW < 700 ? 82 : viewW <= 900 ? 108 : 76;
  const stageBottom = compactLandscape ? 12 : viewW < 700 ? 18 : 24;
  const stage = { x: 8, y: stageTop, w: Math.max(1, viewW - 16), h: Math.max(1, viewH - stageTop - stageBottom) };
  const sourceW = video.videoWidth || (matchMedia("(orientation: portrait)").matches ? 720 : 1280);
  const sourceH = video.videoHeight || (matchMedia("(orientation: portrait)").matches ? 1280 : 720);
  const scale = Math.min(stage.w / sourceW, stage.h / sourceH);
  const w = sourceW * scale, h = sourceH * scale;
  cameraRect = { x: stage.x + (stage.w - w) / 2, y: stage.y + (stage.h - h) / 2, w, h };
  playRect = { x: cameraRect.x + cameraRect.w * .07, y: cameraRect.y + cameraRect.h * .08, w: cameraRect.w * .86, h: cameraRect.h * .86 };
  app.style.setProperty("--camera-left", `${cameraRect.x}px`);
  app.classList.toggle("side-calibration", viewW > viewH && cameraRect.x - stage.x >= 60);
}

addEventListener("resize", resize);
window.visualViewport?.addEventListener("resize", resize);
addEventListener("orientationchange", () => {
  calibrationGoodSince = null;
  clearTimeout(orientationTimer);
  orientationTimer = setTimeout(() => {
    resize();
    if (stream && !demo && (running || countdownActive || calibrating)) {
      cameraFrameGeneration += 1;
      lastPose = null;
      lastWorldPose = null;
      poseTimestamp = 0;
      poseCaptureTimestamp = 0;
      rearmGameInput();
      setTracking("다시 찾는 중", "warn");
      showToast("화면이 돌아갔어요 · 그대로 이어서 해요");
      void reconfigureCameraForOrientation();
    }
  }, 220);
});
video.addEventListener("resize", resize);
resize();
if (app.getBoundingClientRect().width <= 1 || app.getBoundingClientRect().height <= 1) {
  requestAnimationFrame(() => requestAnimationFrame(resize));
}

function setTracking(text, state = "") {
  ui.tracking.className = `tracking-status ${state}`.trim();
  ui.tracking.querySelector("span").textContent = text;
}

function setCue(title, detail = "", accessibleLabel = "") {
  const heading = ui.cue.querySelector("strong");
  const description = ui.cue.querySelector("span");
  if (heading.textContent !== title) heading.textContent = title;
  if (description.textContent !== detail) description.textContent = detail;
  if (accessibleLabel) {
    if (ui.cue.getAttribute("aria-label") !== accessibleLabel) ui.cue.setAttribute("aria-label", accessibleLabel);
  } else if (ui.cue.hasAttribute("aria-label")) {
    ui.cue.removeAttribute("aria-label");
  }
}

function tone(frequency = 440, duration = .08, type = "sine", volume = .05) {
  if (!sound) return;
  try {
    audioCtx ||= new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + duration);
    oscillator.connect(gain).connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch {}
}

function closePoseWorker() {
  poseWorkerGeneration += 1;
  poseWorkerReady = false;
  poseInferenceBusy = false;
  try { poseWorker?.terminate?.(); } catch {}
  poseWorker = null;
  if (poseRuntime === "worker") poseRuntime = "none";
}

function closePoseCandidate(candidate) {
  try { candidate?.close?.(); } catch {}
}

function closeMainPose() {
  closePoseCandidate(poseLandmarker);
  poseLandmarker = null;
  if (poseRuntime === "main") poseRuntime = "none";
}

function resetPoseRuntime() {
  poseLoadGeneration += 1;
  closePoseWorker();
  closeMainPose();
  poseLoading = null;
  poseInferenceSamples = 0;
  poseDowngradeStarted = false;
  motionDiagnostics.inferenceAverageMs = 0;
  motionDiagnostics.runtime = "none";
  motionDiagnostics.model = "none";
  motionDiagnostics.delegate = "none";
}

function smoothWorldPose(raw, now) {
  if (!lastWorldPose || now - poseTimestamp > 350) return raw?.map((point) => ({ ...point })) || null;
  const dt = clamp(now - poseTimestamp, 16, 140);
  const alpha = 1 - Math.exp(-dt / 90);
  return raw?.map((point, index) => {
    const previous = lastWorldPose[index];
    if (!previous) return { ...point };
    return {
      ...point,
      x: lerp(previous.x, point.x, alpha),
      y: lerp(previous.y, point.y, alpha),
      z: lerp(previous.z || 0, point.z || 0, alpha)
    };
  }) || null;
}

function acceptPoseResult(raw, world, captureTimestamp, inferenceMs, receivedAt = performance.now(), frameGeneration = cameraFrameGeneration) {
  if (frameGeneration !== cameraFrameGeneration) return;
  if (Number.isFinite(captureTimestamp) && poseCaptureTimestamp && captureTimestamp <= poseCaptureTimestamp) return;
  motionDiagnostics.inferenceMs = Math.round(inferenceMs || 0);
  motionDiagnostics.inferenceAverageMs = Math.round(motionDiagnostics.inferenceAverageMs
    ? motionDiagnostics.inferenceAverageMs * .84 + (inferenceMs || 0) * .16
    : (inferenceMs || 0));
  poseInferenceSamples += 1;
  if (raw?.length) {
    lastPose = smoothPose(raw, receivedAt);
    lastWorldPose = smoothWorldPose(world, receivedAt);
    poseCaptureTimestamp = Number.isFinite(captureTimestamp) ? captureTimestamp : receivedAt;
    poseTimestamp = receivedAt;
    poseVersion += 1;
    inferenceErrors = 0;
    motionDiagnostics.poseAgeMs = 0;
  } else if (receivedAt - poseTimestamp > POSE_CLEAR_MS) {
    lastPose = null;
    lastWorldPose = null;
  }
  adaptiveInferenceInterval = inferenceMs > 90
    ? Math.min(125, adaptiveInferenceInterval + 10)
    : inferenceMs > 55
      ? Math.min(95, adaptiveInferenceInterval + 4)
      : Math.max(POSE_INFERENCE_INTERVAL, adaptiveInferenceInterval - 2);
  const fullModelTooSlow = poseModelVariant === "full"
    && ((poseInferenceSamples >= 6 && motionDiagnostics.inferenceAverageMs > 95)
      || (poseInferenceSamples >= 4 && motionDiagnostics.inferenceAverageMs > 140));
  if (poseRuntime === "worker" && fullModelTooSlow && !poseDowngradeStarted) {
    poseDowngradeStarted = true;
    void recoverPoseRuntime({ preferLite: true });
  }
}

function startPoseWorker(modelAssetPath, variant, delegate) {
  closePoseWorker();
  const worker = new Worker(new URL("pose-worker.js", import.meta.url), { type: "module" });
  const generation = ++poseWorkerGeneration;
  poseWorker = worker;
  poseWorkerReady = false;
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      if (poseWorker === worker) {
        try { worker.terminate(); } catch {}
        poseWorker = null;
        poseWorkerReady = false;
      }
      reject(error instanceof Error ? error : new Error(String(error || "포즈 작업을 시작하지 못했습니다.")));
    };
    const handleWorkerTransportError = (event) => {
      event?.preventDefault?.();
      const error = new Error(event?.message || "포즈 작업 연결 오류");
      if (!settled) fail(error);
      else {
        poseWorkerReady = false;
        handlePoseRuntimeFailure(error, true);
      }
    };
    worker.onerror = handleWorkerTransportError;
    worker.onmessageerror = handleWorkerTransportError;
    worker.onmessage = (event) => {
      const message = event.data || {};
      if (message.generation !== generation || poseWorker !== worker) return;
      if (message.type === "ready") {
        poseWorkerReady = true;
        poseRuntime = "worker";
        poseModelVariant = variant;
        motionDiagnostics.runtime = "worker";
        motionDiagnostics.model = variant;
        motionDiagnostics.delegate = message.delegate || delegate;
        if (!settled) {
          settled = true;
          resolve(true);
        }
        return;
      }
      if (message.type === "result") {
        acceptPoseResult(message.landmarks?.[0], message.worldLandmarks?.[0], message.timestamp, message.inferenceMs, performance.now(), message.frameGeneration);
        return;
      }
      if (message.type === "error") {
        const error = new Error(`${message.phase || "worker"}: ${message.message || "포즈 인식 오류"}`);
        if (!settled) fail(error);
        else handlePoseRuntimeFailure(error);
      }
    };
    worker.postMessage({
      type: "init", wasmRoot: `${CDN}/wasm`, modelAssetPath, delegate, generation
    });
  });
}

async function waitForPoseCandidate(candidatePromise, generation, message, timeoutMs = POSE_LOAD_TIMEOUT_MS) {
  const candidate = await withTimeout(candidatePromise, timeoutMs, message, closePoseCandidate);
  if (generation !== poseLoadGeneration) {
    closePoseCandidate(candidate);
    throw new Error("이전 동작 인식 요청이 취소됐습니다.");
  }
  return candidate;
}

async function loadMainPose(generation) {
  const { FilesetResolver, PoseLandmarker } = await withTimeout(import(`${CDN}/+esm`), POSE_LOAD_TIMEOUT_MS, "동작 인식 모듈 시간이 초과됐습니다.");
  if (generation !== poseLoadGeneration) throw new Error("이전 동작 인식 요청이 취소됐습니다.");
  const vision = await withTimeout(FilesetResolver.forVisionTasks(`${CDN}/wasm`), POSE_LOAD_TIMEOUT_MS, "동작 인식 준비 시간이 초과됐습니다.");
  if (generation !== poseLoadGeneration) throw new Error("이전 동작 인식 요청이 취소됐습니다.");
  const common = {
    baseOptions: { modelAssetPath: MODEL_LITE, delegate: forceCpuPose ? "CPU" : "GPU" },
    runningMode: "VIDEO", numPoses: 1,
    minPoseDetectionConfidence: .50, minPosePresenceConfidence: .50, minTrackingConfidence: .48
  };
  let candidate;
  try {
    candidate = await waitForPoseCandidate(PoseLandmarker.createFromOptions(vision, common), generation, "동작 인식 모델 시간이 초과됐습니다.");
  } catch (error) {
    if (generation !== poseLoadGeneration) throw error;
    if (forceCpuPose) throw error;
    forceCpuPose = true;
    common.baseOptions.delegate = "CPU";
    candidate = await waitForPoseCandidate(PoseLandmarker.createFromOptions(vision, common), generation, "안전 모드 준비 시간이 초과됐습니다.");
  }
  if (generation !== poseLoadGeneration) {
    closePoseCandidate(candidate);
    throw new Error("이전 동작 인식 요청이 취소됐습니다.");
  }
  poseLandmarker = candidate;
  poseRuntime = "main";
  poseModelVariant = "lite";
  motionDiagnostics.runtime = "main";
  motionDiagnostics.model = "lite";
  motionDiagnostics.delegate = forceCpuPose ? "CPU" : "GPU";
  return true;
}

async function loadPose() {
  if (poseWorkerReady || poseLandmarker) return true;
  if (poseLoading) return poseLoading;
  const generation = ++poseLoadGeneration;
  poseLoading = (async () => {
    const canUseWorker = !disablePoseWorker && typeof Worker !== "undefined" && typeof createImageBitmap === "function";
    if (canUseWorker) {
      const cores = navigator.hardwareConcurrency || 4;
      const memory = navigator.deviceMemory || 4;
      const highPerformance = !forceCpuPose && !preferLitePose && cores >= 6 && memory >= 4;
      const attempts = forceCpuPose
        ? [{ model: MODEL_LITE, variant: "lite", delegate: "CPU" }]
        : preferLitePose
          ? [{ model: MODEL_LITE, variant: "lite", delegate: "GPU" }, { model: MODEL_LITE, variant: "lite", delegate: "CPU" }]
        : highPerformance
          ? [{ model: MODEL_FULL, variant: "full", delegate: "GPU" }, { model: MODEL_LITE, variant: "lite", delegate: "CPU" }]
          : [{ model: MODEL_LITE, variant: "lite", delegate: "GPU" }, { model: MODEL_LITE, variant: "lite", delegate: "CPU" }];
      for (const attempt of attempts) {
        try {
          await withTimeout(startPoseWorker(attempt.model, attempt.variant, attempt.delegate), POSE_LOAD_TIMEOUT_MS, "동작 인식 작업 시간이 초과됐습니다.");
          if (generation !== poseLoadGeneration) throw new Error("이전 동작 인식 요청이 취소됐습니다.");
          return true;
        } catch (error) {
          motionDiagnostics.lastError = error.message;
          closePoseWorker();
        }
      }
    }
    return loadMainPose(generation);
  })();
  try {
    return await poseLoading;
  } finally {
    if (generation === poseLoadGeneration) poseLoading = null;
  }
}

async function recoverPoseRuntime(options = {}) {
  if (poseRecovering) return;
  const { preferLite = false, forceCpu = false, disableWorker = false } = options;
  poseRecovering = true;
  if (preferLite) preferLitePose = true;
  if (forceCpu) forceCpuPose = true;
  if (disableWorker) disablePoseWorker = true;
  setTracking(forceCpu ? "안전 모드로 바꾸는 중" : preferLite ? "속도에 맞게 조정 중" : "동작 인식 다시 연결 중", "warn");
  try {
    resetPoseRuntime();
    await loadPose();
    inferenceErrors = 0;
    rearmGameInput();
  } catch (error) {
    motionDiagnostics.lastError = error.message;
    running = calibrating = countdownActive = false;
    countdownAttemptId += 1;
    stopCamera();
    hide(ui.calibrate, ui.cue, ui.countdown);
    show(ui.loading);
    showCameraError({ name: "PoseRuntimeError" });
  } finally {
    poseRecovering = false;
  }
}

function handlePoseRuntimeFailure(error, workerTransportFailed = false) {
  const failedRuntime = poseRuntime;
  inferenceErrors = workerTransportFailed ? 3 : inferenceErrors + 1;
  motionDiagnostics.errors += 1;
  motionDiagnostics.lastError = error?.message || String(error || "pose error");
  if (inferenceErrors >= 3) {
    void recoverPoseRuntime({
      preferLite: true,
      forceCpu: failedRuntime === "main",
      disableWorker: workerTransportFailed || failedRuntime === "worker"
    });
  }
}

function cameraVideoConstraints(includeResizeMode = true) {
  const portrait = matchMedia("(orientation: portrait)").matches;
  const constraints = {
    facingMode: { ideal: "user" },
    width: { ideal: portrait ? 480 : 640, max: 640 },
    height: { ideal: portrait ? 640 : 480, max: 640 },
    aspectRatio: { ideal: portrait ? .75 : 1.333 },
    frameRate: { ideal: 30, max: 30 }
  };
  if (includeResizeMode) constraints.resizeMode = { ideal: "none" };
  return constraints;
}

function recordCameraSettings(track) {
  const settings = track?.getSettings?.() || {};
  motionDiagnostics.camera = {
    width: settings.width || video.videoWidth || 0,
    height: settings.height || video.videoHeight || 0,
    frameRate: settings.frameRate || 0,
    facingMode: settings.facingMode || "unknown"
  };
}

async function alignCameraToOrientation(track) {
  const portrait = matchMedia("(orientation: portrait)").matches;
  const width = video.videoWidth || track?.getSettings?.().width || 0;
  const height = video.videoHeight || track?.getSettings?.().height || 0;
  const mismatched = width && height && (portrait ? width > height : height > width);
  if (!mismatched) return;
  const strict = cameraVideoConstraints(false);
  strict.aspectRatio = { exact: portrait ? .75 : 1.333 };
  try {
    await track.applyConstraints(strict);
    await video.play();
  } catch {
    // Some desktop webcams only expose a landscape sensor; contain mode remains the safe fallback.
  }
}

function bindCameraTrack(track, ownerStream) {
  track.onended = () => {
    if (stream !== ownerStream) return;
    cameraStreamReady = false;
    stream = null;
    video.srcObject = null;
    running = calibrating = countdownActive = false;
    countdownAttemptId += 1;
    hide(ui.calibrate, ui.cue, ui.countdown);
    show(ui.loading);
    showCameraError({ name: "NotReadableError" });
  };
  track.onmute = () => {
    if (stream !== ownerStream || document.hidden) return;
    trackingInvalidSince = performance.now();
    rearmGameInput();
    setTracking("카메라 화면 다시 찾는 중", "warn");
  };
  track.onunmute = () => {
    if (stream !== ownerStream) return;
    setTracking("동작 다시 찾는 중", "warn");
  };
}

function releaseCameraStream(targetStream) {
  targetStream?.getTracks?.().forEach((track) => {
    track.onended = track.onmute = track.onunmute = null;
    try { track.stop(); } catch {}
  });
}

function discardCameraStream(targetStream) {
  if (!targetStream) return;
  if (stream === targetStream) {
    stream = null;
    cameraStreamReady = false;
  }
  if (video.srcObject === targetStream) video.srcObject = null;
  releaseCameraStream(targetStream);
}

function releaseSupersededCameraStream(previousStream, targetStream) {
  if (previousStream && previousStream !== targetStream && previousStream !== stream) releaseCameraStream(previousStream);
}

function cameraOpenIsCurrent(attemptId, targetStream) {
  return attemptId === cameraAttemptId && stream === targetStream && video.srcObject === targetStream;
}

async function openCamera(attemptId) {
  const preferred = cameraVideoConstraints(true);
  const relaxed = cameraVideoConstraints(false);
  delete relaxed.aspectRatio;
  let nextStream;
  try {
    nextStream = await navigator.mediaDevices.getUserMedia({ video: preferred, audio: false });
  } catch (error) {
    if (error.name === "OverconstrainedError") nextStream = await navigator.mediaDevices.getUserMedia({ video: relaxed, audio: false });
    else throw error;
  }
  if (attemptId !== cameraAttemptId) {
    releaseCameraStream(nextStream);
    return false;
  }
  const previousStream = stream;
  cameraFrameGeneration += 1;
  stream = nextStream;
  cameraStreamReady = false;
  video.srcObject = nextStream;
  const track = nextStream.getVideoTracks()[0];
  if (!track) {
    releaseSupersededCameraStream(previousStream, nextStream);
    discardCameraStream(nextStream);
    throw Object.assign(new Error("camera track unavailable"), { name: "NotFoundError" });
  }
  try {
    await video.play();
    if (!cameraOpenIsCurrent(attemptId, nextStream)) {
      releaseSupersededCameraStream(previousStream, nextStream);
      discardCameraStream(nextStream);
      return false;
    }
    releaseCameraStream(previousStream);
    bindCameraTrack(track, nextStream);
    await alignCameraToOrientation(track);
    if (!cameraOpenIsCurrent(attemptId, nextStream)) {
      releaseSupersededCameraStream(previousStream, nextStream);
      discardCameraStream(nextStream);
      return false;
    }
  } catch (error) {
    releaseSupersededCameraStream(previousStream, nextStream);
    discardCameraStream(nextStream);
    throw error;
  }
  try {
    const capabilities = track.getCapabilities?.();
    if (capabilities?.zoom && Number.isFinite(capabilities.zoom.min)) await track.applyConstraints({ advanced: [{ zoom: capabilities.zoom.min }] });
  } catch {}
  if (!cameraOpenIsCurrent(attemptId, nextStream)) {
    releaseSupersededCameraStream(previousStream, nextStream);
    discardCameraStream(nextStream);
    return false;
  }
  recordCameraSettings(track);
  cameraStreamReady = true;
  resize();
  return true;
}

async function reconfigureCameraForOrientation() {
  const track = stream?.getVideoTracks?.()[0];
  if (!track || track.readyState !== "live") return;
  const operationAttempt = cameraAttemptId;
  try {
    await track.applyConstraints(cameraVideoConstraints(false));
    if (document.hidden || operationAttempt !== cameraAttemptId || stream?.getVideoTracks?.()[0] !== track) return;
    await video.play();
    await alignCameraToOrientation(track);
    if (document.hidden || operationAttempt !== cameraAttemptId || stream?.getVideoTracks?.()[0] !== track) return;
    recordCameraSettings(track);
    resize();
  } catch {
    if (document.hidden || operationAttempt !== cameraAttemptId) return;
    const attemptId = ++cameraAttemptId;
    try {
      stopCamera();
      if (!(await openCamera(attemptId))) return;
      rearmGameInput();
      setTracking("동작 다시 찾는 중", "warn");
    } catch (error) {
      running = calibrating = countdownActive = false;
      hide(ui.calibrate, ui.cue, ui.countdown);
      show(ui.loading);
      showCameraError(error);
    }
  }
}

function stopCamera() {
  cameraFrameGeneration += 1;
  const activeStream = stream;
  stream = null;
  cameraStreamReady = false;
  video.srcObject = null;
  releaseCameraStream(activeStream);
  lastPose = null;
  lastWorldPose = null;
  poseTimestamp = 0;
  poseCaptureTimestamp = 0;
  poseInferenceBusy = false;
  lastVideoTime = -1;
}

function showCameraError(error) {
  const messages = {
    NotAllowedError: ["카메라 권한이 필요해요", "브라우저 주소창의 카메라 권한을 허용한 뒤 다시 시도하세요."],
    NotFoundError: ["카메라를 찾지 못했어요", "연결된 카메라가 있는지 확인하세요."],
    NotReadableError: ["카메라가 사용 중이에요", "화상회의 앱을 닫은 뒤 다시 시도하세요."],
    SecurityError: ["안전한 연결이 필요해요", "HTTPS 주소에서 게임을 열어 주세요."],
    PoseRuntimeError: ["동작 인식을 다시 준비할게요", "그래픽 인식이 멈춰 CPU 안전 모드로 바꿉니다. 다시 시도를 눌러 주세요."]
  };
  const [title, text] = messages[error?.name] || ["동작 인식을 시작하지 못했어요", "네트워크를 확인하고 다시 시도해 주세요."];
  ui.loadingTitle.textContent = title;
  ui.loadingText.textContent = text;
  ui.loading.querySelector(".loader").classList.add("hidden");
  show(ui.loadingActions);
  setTracking("연결 실패", "warn");
}

async function startCamera() {
  const attemptId = ++cameraAttemptId;
  cameraStartInProgress = true;
  let cameraConnected = false;
  hide(ui.intro, ui.result, ui.loadingActions);
  show(ui.loading, ui.home);
  ui.loading.querySelector(".loader").classList.remove("hidden");
  ui.loadingTitle.textContent = "카메라 연결 중";
  ui.loadingText.textContent = "전체 화면을 유지하는 광각 모드로 준비하고 있습니다.";
  const permissionHint = setTimeout(() => {
    if (attemptId !== cameraAttemptId) return;
    ui.loadingText.textContent = cameraConnected
      ? "동작 인식 모델을 준비하고 있어요. 네트워크가 느리면 조금 더 걸릴 수 있어요."
      : "브라우저의 카메라 허용 창을 확인해 주세요. 계속 막히면 체험 모드로 먼저 확인할 수 있어요.";
    show(ui.loadingActions);
  }, 7000);
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("camera unavailable"), { name: "NotFoundError" });
    const hasLiveCamera = cameraStreamReady && stream?.getVideoTracks().some((track) => track.readyState === "live");
    if (!hasLiveCamera) {
      stopCamera();
      if (!(await openCamera(attemptId))) return;
    }
    cameraConnected = true;
    if (attemptId !== cameraAttemptId) return;
    ui.loadingTitle.textContent = "AI 동작 인식 준비 중";
    ui.loadingText.textContent = "처음 한 번만 포즈 모델을 불러옵니다.";
    await loadPose();
    if (attemptId !== cameraAttemptId) return;
    demo = false;
    hide(ui.loading);
    beginCalibration();
    startRenderLoop();
  } catch (error) {
    if (attemptId !== cameraAttemptId) return;
    stopCamera();
    showCameraError(error);
  } finally {
    clearTimeout(permissionHint);
    if (attemptId === cameraAttemptId) cameraStartInProgress = false;
  }
}

function beginCalibration() {
  countdownAttemptId += 1;
  calibrating = true;
  running = false;
  countdownActive = false;
  hide(ui.countdown);
  calibrationGoodSince = null;
  ui.signal.style.width = "0%";
  const flightGame = selectedGame === "jack";
  ui.calibrateTitle.textContent = games[selectedGame].fullBody ? "발목까지 보이게 뒤로 서세요" : flightGame ? "상체와 두 손을 보여주세요" : "상체와 한 손을 보여주세요";
  ui.calibrateDetail.textContent = games[selectedGame].fullBody ? "머리부터 발목까지 화면 안에 들어오면 바로 시작해요." : flightGame ? "두 팔을 펼쳐도 잘리지 않게 화면 가운데에 서요." : "머리·어깨와 한 손만 보여도 시작할 수 있어요.";
  show(ui.calibrate, ui.home);
  setTracking("몸 위치 확인 중", "warn");
}

function requiredIndices(game = selectedGame, calibration = false) {
  if (game === "squat") {
    if (!calibration && gameState?.currentAction?.required) return gameState.currentAction.required;
    return [LM.nose, LM.ls, LM.rs, LM.lh, LM.rh, LM.lk, LM.rk, LM.la, LM.ra];
  }
  if (game === "jack") return [LM.nose, LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw, LM.lh, LM.rh];
  const core = [LM.nose, LM.ls, LM.rs];
  return core;
}

function landmarkVisible(landmark, minimum = .48) {
  return !!landmark && (landmark.visibility ?? 1) >= minimum && (landmark.presence ?? 1) >= minimum;
}

function landmarkInFrame(landmark, margin = .025) {
  return landmarkVisible(landmark, .30)
    && landmark.x >= margin && landmark.x <= 1 - margin
    && landmark.y >= margin && landmark.y <= 1 - margin;
}

function actionRequiredLandmarksUsable(action = gameState?.currentAction) {
  if (!action?.required?.length) return false;
  const lowerBodyAction = ["oneLeg", "touchKnees", "squat", "leanSide"].includes(action.id);
  const minimum = lowerBodyAction ? .34 : .34;
  const margin = .008;
  const usable = (index, threshold = minimum) => {
    const landmark = lastPose?.[index];
    return landmarkVisible(landmark, threshold)
      && landmark.x >= margin && landmark.x <= 1 - margin
      && landmark.y >= margin && landmark.y <= 1 - margin;
  };
  if (action.id === "touchHead") {
    const core = [LM.nose, LM.ls, LM.rs].every((index) => usable(index));
    const leftArm = [LM.le, LM.lw].every((index) => usable(index));
    const rightArm = [LM.re, LM.rw].every((index) => usable(index));
    return core && (leftArm || rightArm);
  }
  if (action.id === "squat") {
    const core = [LM.ls, LM.rs, LM.lh, LM.rh].every((index) => usable(index));
    const leftLeg = [LM.lk, LM.la].every((index) => usable(index, .34));
    const rightLeg = [LM.rk, LM.ra].every((index) => usable(index, .34));
    return core && (leftLeg || rightLeg);
  }
  return action.required.every((index) => usable(index));
}

function analyzeFit() {
  if (!lastPose || currentPoseAge() > POSE_FRESH_MS) return { good: false, title: "몸을 찾고 있어요", text: "카메라 정면에 서 주세요." };
  const needed = requiredIndices(selectedGame, true);
  const visibility = games[selectedGame].fullBody ? .40 : .36;
  const flightGame = selectedGame === "jack";
  const handVisible = [LM.lw, LM.rw].some((index) => landmarkInFrame(lastPose[index]));
  const bothFlightHandsVisible = [LM.lw, LM.rw].every((index) => landmarkInFrame(lastPose[index], .015));
  if (!needed.every((index) => landmarkVisible(lastPose[index], visibility)) || (!games[selectedGame].fullBody && !handVisible) || (flightGame && !bothFlightHandsVisible)) {
    return { good: false, title: games[selectedGame].fullBody ? "발목까지 보여주세요" : flightGame ? "두 손을 모두 보여주세요" : "한 손을 흔들어 주세요", text: flightGame ? "양팔을 펼쳐도 잘리지 않게 화면 안에 넣어 주세요." : "카메라 정면에서 손을 들어 보여주세요." };
  }
  const points = needed.map((index) => lastPose[index]);
  const minX = Math.min(...points.map((p) => p.x)), maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y)), maxY = Math.max(...points.map((p) => p.y));
  let centerX;
  let tooClose;
  let tooFar;
  if (games[selectedGame].fullBody) {
    const actionMissions = selectedGame === "squat";
    const bodyHeight = maxY - minY;
    const edge = selectedGame === "jack" ? .06 : .04;
    const maxHeight = selectedGame === "jack" ? .86 : actionMissions ? .91 : .92;
    centerX = (minX + maxX) / 2;
    tooClose = bodyHeight > maxHeight || minX < edge || maxX > 1 - edge || minY < .05 || maxY > 1 - edge * .35;
    tooFar = bodyHeight < (actionMissions ? .40 : .36);
  } else {
    const leftShoulder = lastPose[LM.ls];
    const rightShoulder = lastPose[LM.rs];
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
    centerX = (leftShoulder.x + rightShoulder.x) / 2;
    tooClose = shoulderWidth > (flightGame ? .30 : .58) || minY < .025;
    tooFar = shoulderWidth < .10;
  }
  if (tooClose) return {
    good: false,
    title: "카메라가 조금 가까워요",
    text: games[selectedGame].fullBody
      ? "머리와 발목이 보이도록 한 걸음만 뒤로 가요."
      : flightGame ? "양손이 잘리지 않도록 반 걸음 뒤로 가요." : "손이 잘리지 않도록 반 걸음 뒤로 가요."
  };
  if (tooFar) return { good: false, title: "몸이 너무 작게 보여요", text: "한 걸음만 앞으로 이동하세요." };
  if (centerX < .25) return { good: false, title: "화면 오른쪽으로 이동", text: "몸을 안내선 가운데에 맞춰 주세요." };
  if (centerX > .75) return { good: false, title: "화면 왼쪽으로 이동", text: "몸을 안내선 가운데에 맞춰 주세요." };
  return { good: true, title: "좋아요, 그대로!", text: "잠시 자세를 유지하면 시작합니다." };
}

function updateCalibration(now) {
  const fit = analyzeFit();
  ui.calibrateTitle.textContent = fit.title;
  ui.calibrateText.textContent = fit.text;
  if (!fit.good) {
    calibrationGoodSince = null;
    ui.signal.style.width = "0%";
    setTracking(fit.title, "warn");
    return;
  }
  calibrationGoodSince ??= now;
  const progress = clamp((now - calibrationGoodSince) / 650, 0, 1);
  ui.signal.style.width = `${progress * 100}%`;
  setTracking(`카메라 인식 ${Math.round(progress * 100)}%`, "good");
  if (progress >= 1 && !countdownActive) {
    calibrating = false;
    hide(ui.calibrate);
    startCountdown();
  }
}

async function startCountdown() {
  if (countdownActive) return;
  const attemptId = ++countdownAttemptId;
  countdownActive = true;
  hide(ui.calibrate, ui.loading, ui.intro, ui.result);
  show(ui.home);
  for (const value of [3, 2, 1]) {
    ui.countdown.textContent = value;
    show(ui.countdown);
    tone(280 + value * 80, .12, "square", .04);
    await new Promise((resolve) => setTimeout(resolve, 650));
    if (attemptId !== countdownAttemptId) { hide(ui.countdown); return; }
    hide(ui.countdown);
  }
  ui.countdown.textContent = "GO";
  show(ui.countdown);
  tone(700, .22, "sawtooth", .07);
  await new Promise((resolve) => setTimeout(resolve, 430));
  if (attemptId !== countdownAttemptId) { hide(ui.countdown); return; }
  hide(ui.countdown);
  countdownActive = false;
  beginGame();
}

function startDemo() {
  cameraAttemptId += 1;
  cameraStartInProgress = false;
  stopCamera();
  demo = true;
  calibrating = false;
  hide(ui.intro, ui.loading, ui.result, ui.calibrate, ui.loadingActions);
  show(ui.demoHelp, ui.home);
  setTracking("체험 모드", "good");
  startRenderLoop();
  startCountdown();
}

function resetScore() {
  score = combo = maxCombo = hits = misses = 0;
  gameElapsed = 0;
  wordDeck = shuffle(WORDS);
  completedWordCount = 0;
  completedRun = false;
  lastUsablePoseAt = 0;
  trackingInvalidSince = 0;
  trackingInputReset = false;
  trackingWasPaused = false;
  adaptiveInferenceInterval = POSE_INFERENCE_INTERVAL;
  evaluatedPoseVersion = poseVersion;
  lastPoseEvalAt = poseCaptureTimestamp || poseTimestamp;
  inputLockedUntil = 0;
  particles = [];
  ripples = [];
  feedbacks = [];
  wristTrails = { [LM.lw]: [], [LM.rw]: [] };
}

function rearmGameInput() {
  if (!gameState) return;
  inputLockedUntil = performance.now() + 120;
  wristTrails = { [LM.lw]: [], [LM.rw]: [] };
  if (selectedGame === "sequence" || selectedGame === "math") {
    gameState.targets?.forEach((target) => target.dwell = 0);
    gameState.inputReady = false;
    gameState.clearMs = 0;
  } else if (selectedGame === "squat") {
    gameState.stableMs = 0;
    gameState.neutralMs = 0;
    gameState.matching = false;
    gameState.progress = 0;
    gameState.commandArmed = false;
    gameState.phase = gameState.currentAction?.id === "oneLeg" || gameState.currentAction?.id === "squat" ? "needStand" : "active";
    gameState.baselineHipY = null;
    gameState.baselineTorso = null;
    gameState.standSamples = [];
    gameState.groundY = null;
  } else if (selectedGame === "jack") {
    gameState.phase = "needUp";
    gameState.phaseMs = 0;
    gameState.strokeMs = 0;
    gameState.invalidMs = 0;
    gameState.upWingY = null;
    gameState.upLevel = null;
    gameState.upSamples = 0;
    gameState.inputValid = false;
    gameState.wingsUp = false;
    gameState.wingsDown = false;
    gameState.velocity = 0;
    gameState.trackingReadyMs = 0;
    gameState.laneCandidate = null;
    gameState.laneHoldMs = 0;
    gameState.stableLane = null;
  }
  updateGameCue();
}

function beginGame() {
  resetScore();
  running = true;
  gameState = createGameState(selectedGame);
  evaluatedPoseVersion = poseVersion;
  lastPoseEvalAt = poseCaptureTimestamp || poseTimestamp;
  ui.motionArt.src = games[selectedGame].image;
  show(ui.cue, ui.motionArt, ui.listen);
  updateHUD();
  updateGameCue();
  scheduleRoundAnnouncement(180);
  navigator.wakeLock?.request("screen").then((lock) => wakeLock = lock).catch(() => {});
}

function announceRound() {
  if (!gameState) return false;
  if (selectedGame === "sequence") {
    if (gameState.answerRevealed) return speakEnglish(gameState.prompt.word.toLowerCase(), true);
    return speakKorean(`${gameState.prompt.ko}의 영어 철자를 완성하세요.`, true);
  }
  if (selectedGame === "math") {
    if (gameState.answerRevealed) return speakEnglish(gameState.prompt.word.toLowerCase(), true);
    return speakKorean(`${withObjectParticle(gameState.prompt.ko)} 찾으세요.`, true);
  }
  if (selectedGame === "squat") return speakEnglish(gameState.currentAction?.en || "Let's move!", true);
  if (gameState.answerRevealed) return speakEnglish(gameState.prompt.word.toLowerCase(), true);
  return speakKorean(`${withTopicParticle(gameState.prompt.ko)} 영어로 무엇일까요? 정답 영어 구름으로 날아가세요.`, true);
}

function scheduleRoundAnnouncement(delay = 0) {
  const token = ++speechRoundToken;
  const mode = selectedGame;
  const word = gameState?.prompt?.word || "";
  const actionId = gameState?.currentAction?.id || "";
  setTimeout(() => {
    if (token !== speechRoundToken || !running || selectedGame !== mode || (word && gameState?.prompt?.word !== word) || (actionId && gameState?.currentAction?.id !== actionId)) return;
    announceRound();
  }, delay);
}

function createGameState(game) {
  if (game === "sequence") return createSequenceRound(1);
  if (game === "math") return createMathProblem();
  if (game === "squat") return createActionGame();
  return createFlightGame();
}

function sequenceSlots(count) {
  if (count <= 3) return [[.18, .56], [.50, .56], [.82, .56]].slice(0, count);
  if (count === 4) return [[.22, .47], [.78, .47], [.22, .83], [.78, .83]];
  return [[.16, .47], [.50, .47], [.84, .47], [.32, .83], [.68, .83]].slice(0, count);
}

function createSequenceRound(round) {
  if (round > SPELLING_GOAL) return null;
  const prompt = nextWord();
  if (!prompt) return null;
  const letters = [...prompt.word];
  const count = letters.length;
  const slots = sequenceSlots(count);
  return {
    mode: "sequence", round, prompt, current: 1, inputReady: false, clearMs: 0, answerRevealed: false, advancing: false,
    targets: slots.map(([x, y], index) => ({ value: letters[index], order: index + 1, x, y, dwell: 0, flashUntil: 0 }))
  };
}

function createMathProblem() {
  if (wordDeck.length < 2) return null;
  const prompt = nextWord();
  const distractor = nextWord();
  if (!prompt || !distractor) return null;
  const answer = prompt.word;
  const values = shuffle([answer, distractor.word]);
  const slots = [[.25, .64], [.75, .64]];
  return {
    mode: "math", prompt, answer, inputReady: false, clearMs: 0, startedAt: gameElapsed, answerRevealed: false, advancing: false,
    targets: values.map((value, index) => ({ value, x: slots[index][0], y: slots[index][1], dwell: 0, flashUntil: 0 }))
  };
}

function targetPoint(target) {
  return { x: playRect.x + target.x * playRect.w, y: playRect.y + target.y * playRect.h };
}

function targetRadius() {
  const points = posePoints();
  const shoulder = points ? distance(points.ls, points.rs) : playRect.w * .2;
  if (viewH < 420 && viewW > viewH) return clamp(shoulder * .34, 26, 30);
  if (viewW < 700) {
    const minimum = selectedGame === "math" ? 36 : 34;
    const maximum = selectedGame === "math" ? 42 : 40;
    return clamp(shoulder * .42, minimum, maximum);
  }
  return clamp(shoulder * .46, selectedGame === "math" ? 50 : 44, selectedGame === "math" ? 62 : 56);
}

function pointInsideTarget(point, target, radius = targetRadius(), outsideScale = 1) {
  const center = targetPoint(target);
  const widthScale = selectedGame === "math" ? 1.45 : 1;
  const dx = (point.x - center.x) / (radius * widthScale * outsideScale);
  const dy = (point.y - center.y) / (radius * outsideScale);
  return dx * dx + dy * dy <= 1;
}

function posePoint(index) {
  const landmark = lastPose?.[index];
  if (!landmark) return null;
  return {
    x: cameraRect.x + (1 - landmark.x) * cameraRect.w,
    y: cameraRect.y + landmark.y * cameraRect.h,
    z: landmark.z || 0,
    v: Math.min(landmark.visibility ?? 1, landmark.presence ?? 1)
  };
}

function posePoints() {
  if (!lastPose) return null;
  const points = {};
  for (const [name, index] of Object.entries(LM)) points[name] = posePoint(index);
  return points;
}

function angle(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  return Math.acos(clamp((ab.x * cb.x + ab.y * cb.y) / (Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y) || 1), -1, 1)) * 180 / Math.PI;
}

function angle3D(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) };
  const cb = { x: c.x - b.x, y: c.y - b.y, z: (c.z || 0) - (b.z || 0) };
  const dot = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
  const mag = Math.hypot(ab.x, ab.y, ab.z) * Math.hypot(cb.x, cb.y, cb.z) || 1;
  return Math.acos(clamp(dot / mag, -1, 1)) * 180 / Math.PI;
}

function handPositions(points) {
  if (!points) return [];
  return [[LM.lw, points.lw], [LM.rw, points.rw]]
    .filter(([index, point]) => point && point.v >= .30 && landmarkInFrame(lastPose?.[index], .012))
    .map(([, point]) => point);
}

function handsOutsideAll(targets, hands, radius) {
  return targets.every((target) => hands.every((hand) => !pointInsideTarget(hand, target, radius, 1.18)));
}

function updateTouchReadiness(state, hands, radius, dt) {
  if (state.inputReady) return true;
  const selectableTargets = state.mode === "sequence"
    ? state.targets.filter((target) => target.order >= state.current)
    : state.targets;
  if (handsOutsideAll(selectableTargets, hands, radius)) state.clearMs += dt;
  else state.clearMs = 0;
  if (state.clearMs >= TOUCH_REARM_MS) state.inputReady = true;
  return state.inputReady;
}

function enqueueFeedback(type, x, y, label, gain = 0, detail = "") {
  const now = performance.now();
  const compactLandscape = viewH < 420 && viewW > viewH;
  feedbacks = [{
    type, x, y, label, gain, detail, mode: selectedGame, startedAt: now,
    duration: compactLandscape ? (type === "good" ? 320 : 280) : (type === "good" ? 420 : 340),
    radius: compactLandscape
      ? clamp(targetRadius() * .72, 22, 27)
      : clamp(targetRadius() * .82, 26, viewW < 700 ? 44 : 56)
  }];
}

function award(points, x, y, label = "PERFECT", detail = "") {
  hits++;
  combo++;
  maxCombo = Math.max(maxCombo, combo);
  const gain = points + Math.min(combo, 10) * 10;
  score += gain;
  burst(x, y, selectedGame === "math" ? "#ff3ea5" : "#38f6ff");
  enqueueFeedback("good", x, y, label, gain, detail);
  ui.toast.textContent = `${label} +${gain}`;
  ui.toast.classList.remove("show");
  if (combo > 0 && combo % 5 === 0) showToast(`${combo} COMBO!`);
  try { if (!demo) navigator.vibrate?.(18); } catch {}
  tone(520 + Math.min(combo, 12) * 28, .1, "triangle", .07);
  return gain;
}

function penalty(label = "다시!", x = null, y = null, amount = 5) {
  misses++;
  if (Number.isFinite(x) && Number.isFinite(y)) enqueueFeedback("try", x, y, label, 0);
  else showToast(label, true);
  tone(260, .08, "sine", .025);
}

function showToast(text, bad = false) {
  ui.toast.textContent = text;
  ui.toast.style.color = bad ? "#9b651b" : "#28775f";
  ui.toast.classList.remove("show");
  void ui.toast.offsetWidth;
  ui.toast.classList.add("show");
}

function finishRunSoon(title, detail, delay = 950) {
  completedRun = true;
  if (gameState) {
    gameState.sessionComplete = true;
    gameState.advancing = true;
  }
  inputLockedUntil = Infinity;
  setCue(title, detail);
  showToast(title);
  const token = ++speechRoundToken;
  if (selfTesting) return;
  setTimeout(() => {
    if (token === speechRoundToken && running) endGame();
  }, delay);
}

function transitionAfterAnswer(completedWord, createNextRound) {
  const answeredState = gameState;
  answeredState.answerRevealed = true;
  answeredState.advancing = true;
  inputLockedUntil = Infinity;
  updateGameCue();
  const token = ++speechRoundToken;
  const revealedAt = performance.now();
  answeredState.answerHoldUntil = revealedAt + 1100;
  let finished = false;
  const advance = () => {
    if (finished || token !== speechRoundToken || gameState !== answeredState) return;
    finished = true;
    const nextState = createNextRound();
    if (!nextState) {
      finishRunSoon("🎉 모든 단어를 만났어요!", `${completedWordCount}개의 영어를 배웠어요`);
      return;
    }
    gameState = nextState;
    inputLockedUntil = performance.now() + 180;
    updateGameCue();
    scheduleRoundAnnouncement(240);
  };
  if (selfTesting) { advance(); return; }
  const advanceAfterMinimum = () => {
    const wait = answeredState.answerHoldUntil - performance.now();
    if (wait > 0) setTimeout(advance, wait);
    else advance();
  };
  const spoken = speakEnglish(completedWord.word.toLowerCase(), true, advanceAfterMinimum);
  setTimeout(advanceAfterMinimum, spoken ? 1550 : 1100);
}

function completeSequenceTarget(target) {
  const point = targetPoint(target);
  const completedWord = gameState.prompt;
  award(100, point.x, point.y, `${target.value} 좋아요!`, `${completedWord.word.slice(0, target.order)} ✓`);
  speakEnglish(target.value);
  gameState.current++;
  inputLockedUntil = performance.now() + 150;
  gameState.inputReady = false;
  gameState.clearMs = 0;
  gameState.targets.forEach((item) => item.dwell = 0);
  if (gameState.current > gameState.targets.length) {
    score += 180 + gameState.targets.length * 20;
    const nextRound = gameState.round + 1;
    completedWordCount++;
    showToast(`${completedWord.emoji} ${completedWord.word}!`);
    transitionAfterAnswer(completedWord, () => createSequenceRound(nextRound));
  }
  updateGameCue();
}

function completeMathTarget(target) {
  const point = targetPoint(target);
  if (target.value !== gameState.answer) {
    target.flashUntil = performance.now() + 500;
    penalty("한 번 더 골라봐요", point.x, point.y, 0);
    inputLockedUntil = performance.now() + 110;
    gameState.inputReady = false;
    gameState.clearMs = 0;
    return;
  }
  const completedWord = gameState.prompt;
  const responseBonus = Math.max(0, 40 - Math.floor((gameElapsed - gameState.startedAt) / 250));
  award(140 + responseBonus, point.x, point.y, `${target.value} 정답!`, `${completedWord.emoji} ${completedWord.ko} = ${target.value}`);
  completedWordCount++;
  transitionAfterAnswer(completedWord, createMathProblem);
  updateGameCue();
}

function updateTouchGame(dt) {
  if (gameState?.advancing || gameState?.sessionComplete) return;
  const points = posePoints();
  const hands = handPositions(points);
  if (!hands.length || performance.now() < inputLockedUntil) return;
  const radius = targetRadius();
  if (!updateTouchReadiness(gameState, hands, radius, dt)) return;
  for (const target of gameState.targets) {
    if (selectedGame === "sequence" && target.order < gameState.current) continue;
    const point = targetPoint(target);
    const inside = hands.some((hand) => pointInsideTarget(hand, target, radius));
    target.dwell = inside ? target.dwell + dt : Math.max(0, target.dwell - dt * 1.5);
    if (target.dwell < TOUCH_DWELL_MS) continue;
    if (selectedGame === "sequence") {
      if (target.order === gameState.current) completeSequenceTarget(target);
      else {
        target.flashUntil = performance.now() + 450;
        const nextLetter = gameState.targets[gameState.current - 1]?.value || "";
        penalty(`${nextLetter}부터 찾아봐요`, point.x, point.y, 0);
        inputLockedUntil = performance.now() + 110;
        gameState.inputReady = false;
        gameState.clearMs = 0;
      }
    } else completeMathTarget(target);
    break;
  }
}

function squatFeatures(points, metric = actionMetrics(points)) {
  const hipY = (points.lh.y + points.rh.y) / 2;
  const shoulderY = (points.ls.y + points.rs.y) / 2;
  const torso = Math.max(metric.shoulderWidth * .8, hipY - shoulderY);
  const dualReliable = metric.leftLegQuality >= .34 && metric.rightLegQuality >= .34;
  const bestIsLeft = metric.leftLegQuality >= metric.rightLegQuality;
  return {
    kneeAngle: metric.kneeAngle, hipY, torso, dualReliable,
    bestQuality: bestIsLeft ? metric.leftLegQuality : metric.rightLegQuality,
    bestAngle: bestIsLeft ? metric.leftKnee : metric.rightKnee
  };
}

function exerciseFeedbackPoint(yRatio = .5) {
  const points = posePoints();
  const visible = points ? Object.values(points).filter((point) => point?.v > .38) : [];
  const inset = viewW < 700 ? 74 : 90;
  let x = cameraRect.x + inset;
  if (visible.length) {
    const minX = Math.min(...visible.map((point) => point.x));
    const maxX = Math.max(...visible.map((point) => point.x));
    const leftSpace = minX - cameraRect.x;
    const rightSpace = cameraRect.x + cameraRect.w - maxX;
    x = leftSpace >= rightSpace
      ? cameraRect.x + clamp(leftSpace * .5, inset, cameraRect.w * .28)
      : cameraRect.x + cameraRect.w - clamp(rightSpace * .5, inset, cameraRect.w * .28);
  }
  return { x, y: cameraRect.y + cameraRect.h * yRatio };
}

function createActionGame() {
  const state = {
    mode: "squat", commands: ACTION_COMMANDS, commandIndex: 0, currentAction: null,
    completed: 0, reps: 0, stableMs: 0, neutralMs: 0, phase: "active",
    matching: false, progress: 0, advancing: false, sessionComplete: false,
    commandArmed: false, baselineHipY: null, baselineTorso: null, standSamples: [], groundY: null, kneeAngle: 180
  };
  activateActionCommand(state, 0);
  return state;
}

function createFlightGame() {
  const state = {
    mode: "flight", phase: "needUp", phaseMs: 0, strokeMs: 0, invalidMs: 0,
    upWingY: null, upLevel: null, upSamples: 0, lastFlapAt: -Infinity, sinceFlapMs: Infinity, inputValid: false,
    wingsUp: false, wingsDown: false, stars: 0, flaps: 0, reps: 0,
    flightY: .52, bestAltitude: .48, velocity: 0, wingEnergy: 0,
    round: 0, prompt: null, answer: "", choices: [], answerLane: null,
    gateX: .82, previousGateX: .82, gatePhase: "approach", previewMs: FLIGHT_GATE_PREVIEW_MS,
    retryMs: 0, laneCandidate: null, laneHoldMs: 0, stableLane: null,
    wrongLane: null, wrongFlashUntil: 0, missedLanes: [], selectedLane: null, answerRevealed: false,
    trackingReadyMs: 0,
    sessionComplete: false, advancing: false
  };
  activateFlightQuestion(state, 1);
  return state;
}

function flightFlyerRatio() {
  return viewW < 700 ? .32 : .36;
}

function flightLaneY(lane) {
  return lane === "high" ? .34 : .70;
}

function resetFlightGate(state, previewMs = FLIGHT_GATE_PREVIEW_MS) {
  state.gateX = .82;
  state.previousGateX = .82;
  state.gatePhase = "approach";
  state.previewMs = previewMs;
  state.retryMs = 0;
  state.laneCandidate = null;
  state.laneHoldMs = 0;
  state.stableLane = null;
  state.wrongLane = null;
  state.wrongFlashUntil = 0;
  state.selectedLane = null;
}

function activateFlightQuestion(state, round) {
  if (!state || round > FLIGHT_WORD_GOAL || wordDeck.length < 2) return false;
  const prompt = nextWord();
  const distractor = nextWord();
  if (!prompt || !distractor) return false;
  const values = shuffle([prompt.word, distractor.word]);
  state.round = round;
  state.prompt = prompt;
  state.answer = prompt.word;
  state.choices = [
    { lane: "high", word: values[0] },
    { lane: "low", word: values[1] }
  ];
  state.answerLane = state.choices.find((choice) => choice.word === state.answer)?.lane || "high";
  state.missedLanes = [];
  state.answerRevealed = false;
  state.advancing = false;
  resetFlightStroke(state);
  resetFlightGate(state);
  return true;
}

function activateActionCommand(state, index) {
  const action = state.commands[index];
  state.commandIndex = index;
  state.currentAction = action;
  state.stableMs = 0;
  state.neutralMs = 0;
  state.matching = false;
  state.progress = 0;
  state.advancing = false;
  state.commandArmed = action?.id === "clap" && state.commands[index - 1]?.id === "airplane";
  state.baselineHipY = null;
  state.baselineTorso = null;
  state.standSamples = [];
  state.groundY = null;
  state.kneeAngle = 180;
  state.phase = action?.id === "oneLeg" || action?.id === "squat" ? "needStand" : "active";
  state.introUntil = performance.now() + (selfTesting ? 0 : 680);
}

function actionMetrics(points) {
  const shoulderWidth = Math.max(8, cameraRect.w * .045, distance(points.ls, points.rs));
  const shoulderMid = { x: (points.ls.x + points.rs.x) / 2, y: (points.ls.y + points.rs.y) / 2 };
  const hipMid = { x: (points.lh.x + points.rh.x) / 2, y: (points.lh.y + points.rh.y) / 2 };
  const torso = Math.max(shoulderWidth * .8, distance(shoulderMid, hipMid));
  const leftArm = angle(points.lh, points.ls, points.lw);
  const rightArm = angle(points.rh, points.rs, points.rw);
  const leftElbow = angle(points.ls, points.le, points.lw);
  const rightElbow = angle(points.rs, points.re, points.rw);
  const leftKnee = angle(points.lh, points.lk, points.la);
  const rightKnee = angle(points.rh, points.rk, points.ra);
  const frameQuality = (...indices) => indices.every((index) => landmarkInFrame(lastPose?.[index], .008))
    ? Math.min(...indices.map((index) => Math.min(lastPose[index].visibility ?? 1, lastPose[index].presence ?? 1)))
    : 0;
  const leftLegQuality = frameQuality(LM.lh, LM.lk, LM.la);
  const rightLegQuality = frameQuality(LM.rh, LM.rk, LM.ra);
  const leftWeight = leftLegQuality >= .28 ? leftLegQuality ** 2 : 0;
  const rightWeight = rightLegQuality >= .28 ? rightLegQuality ** 2 : 0;
  const weightTotal = leftWeight + rightWeight;
  const kneeAngle = weightTotal > 0 ? (leftKnee * leftWeight + rightKnee * rightWeight) / weightTotal : 180;
  return {
    shoulderWidth, shoulderMid, hipMid, torso, leftArm, rightArm, leftElbow, rightElbow,
    leftKnee, rightKnee, leftLegQuality, rightLegQuality, kneeAngle,
    wristGap: distance(points.lw, points.rw), ankleGap: distance(points.la, points.ra)
  };
}

function staticActionMatches(action, points, metric, state) {
  if (!actionRequiredLandmarksUsable(action)) return false;
  if (action.id === "handsUp") {
    return metric.leftArm > 140 && metric.rightArm > 140
      && metric.leftElbow > 115 && metric.rightElbow > 115
      && points.lw.y < points.nose.y + metric.torso * .08
      && points.rw.y < points.nose.y + metric.torso * .08;
  }
  if (action.id === "touchHead") {
    const touchesHead = (wrist, elbowAngle, armAngle) => {
      const dx = (wrist.x - points.nose.x) / (metric.shoulderWidth * .72);
      const dy = (wrist.y - (points.nose.y - metric.shoulderWidth * .05)) / (metric.shoulderWidth * .64);
      return dx * dx + dy * dy < 1
        && wrist.y > points.nose.y - metric.shoulderWidth * .12
        && elbowAngle < 148 && armAngle > 42 && armAngle < 172;
    };
    const leftTracked = [LM.le, LM.lw].every((index) => landmarkInFrame(lastPose?.[index], .008));
    const rightTracked = [LM.re, LM.rw].every((index) => landmarkInFrame(lastPose?.[index], .008));
    const leftTouches = leftTracked && touchesHead(points.lw, metric.leftElbow, metric.leftArm);
    const rightTouches = rightTracked && touchesHead(points.rw, metric.rightElbow, metric.rightArm);
    return leftTouches || rightTouches;
  }
  if (action.id === "touchShoulders") {
    const wristMidY = (points.lw.y + points.rw.y) / 2;
    return distance(points.lw, points.ls) < metric.shoulderWidth * .62
      && distance(points.rw, points.rs) < metric.shoulderWidth * .62
      && metric.leftElbow < 130 && metric.rightElbow < 130
      && metric.wristGap > metric.shoulderWidth * .65
      && wristMidY < metric.shoulderMid.y + metric.torso * .40;
  }
  if (action.id === "airplane") {
    return metric.leftArm > 68 && metric.leftArm < 112 && metric.rightArm > 68 && metric.rightArm < 112
      && metric.leftElbow > 138 && metric.rightElbow > 138
      && Math.abs(points.lw.y - points.ls.y) < metric.torso * .30
      && Math.abs(points.rw.y - points.rs.y) < metric.torso * .30
      && metric.wristGap > metric.shoulderWidth * 2.15;
  }
  if (action.id === "clap") {
    if (metric.wristGap > metric.shoulderWidth * 1.20) state.commandArmed = true;
    const wristMid = { x: (points.lw.x + points.rw.x) / 2, y: (points.lw.y + points.rw.y) / 2 };
    return state.commandArmed && metric.wristGap < metric.shoulderWidth * .66
      && Math.abs(wristMid.x - metric.shoulderMid.x) < metric.shoulderWidth * .48
      && wristMid.y > metric.shoulderMid.y - metric.torso * .08
      && wristMid.y < metric.hipMid.y - metric.torso * .04
      && metric.leftElbow > 38 && metric.leftElbow < 155 && metric.rightElbow > 38 && metric.rightElbow < 155;
  }
  if (action.id === "handsOnHips") {
    const elbowGap = distance(points.le, points.re);
    const wristMidY = (points.lw.y + points.rw.y) / 2;
    return distance(points.lw, points.lh) < metric.shoulderWidth * .70
      && distance(points.rw, points.rh) < metric.shoulderWidth * .70
      && metric.leftElbow < 135 && metric.rightElbow < 135
      && elbowGap > metric.shoulderWidth * 1.45
      && Math.abs(wristMidY - metric.hipMid.y) < metric.torso * .34;
  }
  if (action.id === "touchKnees") {
    const wristMidY = (points.lw.y + points.rw.y) / 2;
    return distance(points.lw, points.lk) < metric.shoulderWidth * .85
      && distance(points.rw, points.rk) < metric.shoulderWidth * .85
      && wristMidY > metric.hipMid.y + metric.torso * .30;
  }
  if (action.id === "leanSide") {
    const lean = Math.abs(metric.shoulderMid.x - metric.hipMid.x) / metric.torso;
    return lean > .20 && lean < .82
      && metric.leftArm < 70 && metric.rightArm < 70
      && points.lw.y > metric.shoulderMid.y + metric.torso * .30
      && points.rw.y > metric.shoulderMid.y + metric.torso * .30
      && metric.leftKnee > 150 && metric.rightKnee > 150
      && Math.abs(points.la.y - points.ra.y) < metric.torso * .10;
  }
  return false;
}

function completeActionMission() {
  if (gameState.advancing || gameState.sessionComplete) return;
  const action = gameState.currentAction;
  gameState.completed++;
  gameState.reps = gameState.completed;
  gameState.matching = true;
  gameState.progress = 1;
  gameState.advancing = true;
  inputLockedUntil = Infinity;
  const lowerBodyAction = ["oneLeg", "touchKnees", "squat", "leanSide"].includes(action.id);
  const point = exerciseFeedbackPoint(lowerBodyAction ? .62 : .42);
  award(170, point.x, point.y, `${action.en.replace("!", "")} ✓`, `${gameState.completed}/${gameState.commands.length} · ${action.ko}`);
  updateGameCue();
  const completedState = gameState;
  const nextIndex = gameState.commandIndex + 1;
  const token = ++speechRoundToken;
  const celebratedAt = performance.now();
  let moved = false;
  const moveNext = () => {
    if (moved || token !== speechRoundToken || gameState !== completedState) return;
    moved = true;
    if (nextIndex >= completedState.commands.length) {
      finishRunSoon(`🎉 영어 동작 ${completedState.commands.length}개 완주!`, "서로 다른 명령을 모두 따라 했어요", 1050);
      return;
    }
    activateActionCommand(completedState, nextIndex);
    inputLockedUntil = performance.now() + 180;
    updateGameCue();
    scheduleRoundAnnouncement(220);
  };
  if (selfTesting) { moveNext(); return; }
  const moveAfterMinimum = () => {
    const wait = 780 - (performance.now() - celebratedAt);
    if (wait > 0) setTimeout(moveNext, wait);
    else moveNext();
  };
  const spoken = speakEnglish("Great job!", true, moveAfterMinimum);
  setTimeout(moveAfterMinimum, spoken ? 1150 : 780);
}

function updateActionGame(dt) {
  const state = gameState;
  if (!state || state.advancing || state.sessionComplete) return;
  const points = posePoints();
  if (!points || (!selfTesting && performance.now() < state.introUntil)) return;
  const action = state.currentAction;
  if (!actionRequiredLandmarksUsable(action)) {
    state.matching = false;
    state.progress = 0;
    return;
  }
  const metric = actionMetrics(points);
  state.kneeAngle = metric.kneeAngle;

  if (action.id === "oneLeg") {
    const neutral = metric.leftKnee > 150 && metric.rightKnee > 150 && Math.abs(points.la.y - points.ra.y) < metric.torso * .08;
    if (state.phase === "needStand") {
      state.neutralMs = neutral ? state.neutralMs + dt : 0;
      if (state.neutralMs >= 300) {
        state.groundY = (points.la.y + points.ra.y) / 2;
        state.phase = "active";
        state.neutralMs = 0;
        showToast("좋아요! 이제 한 발을 들어요");
      }
    } else {
      const ankleLift = Math.abs(points.la.y - points.ra.y) > metric.torso * .20;
      const kneeLift = Math.abs(points.lk.y - points.rk.y) > metric.torso * .08 || Math.min(metric.leftKnee, metric.rightKnee) < 145;
      const supportKnee = points.la.y < points.ra.y ? metric.rightKnee : metric.leftKnee;
      const supportAnkle = points.la.y < points.ra.y ? points.ra : points.la;
      const balanced = Math.abs(metric.shoulderMid.x - metric.hipMid.x) < metric.shoulderWidth * .48;
      state.matching = ankleLift && kneeLift && supportKnee > 148 && Math.abs(supportAnkle.y - state.groundY) < metric.torso * .14 && balanced;
    }
  } else if (action.id === "squat") {
    const feature = squatFeatures(points, metric);
    state.kneeAngle = feature.kneeAngle;
    if (state.phase === "needStand") {
      const standing = feature.dualReliable
        ? feature.kneeAngle > 156 && Math.min(metric.leftKnee, metric.rightKnee) > 150
        : feature.bestQuality >= .45 && feature.bestAngle > 162;
      if (standing) {
        state.neutralMs += dt;
        state.standSamples.push({ hipY: feature.hipY, torso: feature.torso });
        if (state.standSamples.length > 8) state.standSamples.shift();
      } else {
        state.neutralMs = 0;
        state.standSamples = [];
      }
      if (state.neutralMs >= 400 && state.standSamples.length >= 3) {
        state.baselineHipY = median(state.standSamples.map((sample) => sample.hipY));
        state.baselineTorso = median(state.standSamples.map((sample) => sample.torso));
        state.phase = "ready";
        state.neutralMs = 0;
        showToast("좋아요! 이제 천천히 앉아요");
      }
    } else {
      const drop = (feature.hipY - (state.baselineHipY ?? feature.hipY)) / Math.max(24, state.baselineTorso || feature.torso);
      const bottom = feature.dualReliable
        ? feature.kneeAngle < 156 && Math.max(metric.leftKnee, metric.rightKnee) < 166 && drop > .10
        : feature.bestQuality >= .45 && feature.bestAngle < 150 && drop > .15;
      const standing = feature.dualReliable
        ? feature.kneeAngle > 156 && Math.min(metric.leftKnee, metric.rightKnee) > 150 && drop < .11
        : feature.bestQuality >= .45 && feature.bestAngle > 162 && drop < .09;
      if (state.phase === "ready") {
        state.stableMs = bottom ? state.stableMs + dt : Math.max(0, state.stableMs - dt * 1.5);
        state.progress = clamp(state.stableMs / action.hold, 0, 1);
        state.matching = bottom;
        if (state.stableMs >= action.hold) {
          state.phase = "down";
          state.stableMs = 0;
          showToast("UP! 다시 일어나요");
        }
      } else if (state.phase === "down") {
        state.stableMs = standing ? state.stableMs + dt : Math.max(0, state.stableMs - dt * 1.5);
        state.progress = clamp(state.stableMs / action.hold, 0, 1);
        state.matching = standing;
        if (state.stableMs >= action.hold) completeActionMission();
      }
      updateGameCue();
      return;
    }
  } else {
    state.matching = staticActionMatches(action, points, metric, state);
  }

  if (state.phase === "active") {
    state.stableMs = state.matching ? state.stableMs + dt : Math.max(0, state.stableMs - dt * 1.5);
    state.progress = clamp(state.stableMs / action.hold, 0, 1);
    if (state.stableMs >= action.hold) completeActionMission();
  } else {
    state.matching = false;
    state.progress = 0;
  }
  updateGameCue();
}

function flightLandmarksUsable() {
  const inFrame = (index, minimum) => {
    const point = lastPose?.[index];
    return landmarkVisible(point, minimum)
      && point.x >= .015 && point.x <= .985
      && point.y >= .015 && point.y <= .985;
  };
  return [LM.ls, LM.rs].every((index) => inFrame(index, .38))
    && [LM.le, LM.re].every((index) => inFrame(index, .30))
    && [LM.lw, LM.rw].every((index) => inFrame(index, .32));
}

function flightFrameUsable(points = posePoints()) {
  if (!points || !flightLandmarksUsable()) return false;
  const shoulderRatio = distance(points.ls, points.rs) / Math.max(1, cameraRect.w);
  return shoulderRatio >= .085 && shoulderRatio <= .34;
}

function flightFeatures(points) {
  const shoulderWidth = distance(points.ls, points.rs);
  const shoulderRatio = shoulderWidth / Math.max(1, cameraRect.w);
  if (!flightFrameUsable(points)) {
    return { valid: false, wingsUp: false, wingsDown: false, wingY: 0, shoulderWidth: Math.max(1, shoulderWidth) };
  }
  const upLeft = (points.ls.y - points.lw.y) / shoulderWidth;
  const upRight = (points.rs.y - points.rw.y) / shoulderWidth;
  const level = (upLeft + upRight) / 2;
  const sync = Math.abs(upLeft - upRight);
  const wristGap = distance(points.lw, points.rw) / shoulderWidth;
  const leftElbow = angle(points.ls, points.le, points.lw);
  const rightElbow = angle(points.rs, points.re, points.rw);
  const wingY = (points.lw.y + points.rw.y) / 2;
  return {
    valid: true, shoulderWidth, wingY, upLeft, upRight, level, sync, wristGap, leftElbow, rightElbow,
    wingsUp: upLeft > .20 && upRight > .20 && level > .28 && sync < .50
      && wristGap > 1.35 && leftElbow > 105 && rightElbow > 105,
    softUp: upLeft > .08 && upRight > .08 && level > .16 && sync < .55
      && wristGap > 1.25 && leftElbow > 100 && rightElbow > 100,
    wingsDown: upLeft < -.22 && upRight < -.22 && level < -.32 && sync < .60
      && wristGap > .90 && leftElbow > 95 && rightElbow > 95
  };
}

function resetFlightStroke(state = gameState) {
  if (!state) return;
  state.phase = "needUp";
  state.phaseMs = 0;
  state.strokeMs = 0;
  state.upWingY = null;
  state.upLevel = null;
  state.upSamples = 0;
  state.wingsUp = false;
  state.wingsDown = false;
}

function applyFlightImpulse(at = performance.now()) {
  const state = gameState;
  if (!state || state.advancing || state.sessionComplete) return;
  state.flaps++;
  state.flightY = Math.max(.12, state.flightY - .07);
  state.bestAltitude = Math.max(state.bestAltitude || 0, 1 - state.flightY);
  state.velocity = Math.max(-.36, Math.min(state.velocity, .02) - .24);
  state.wingEnergy = 1;
  state.lastFlapAt = at;
  state.sinceFlapMs = 0;
  resetFlightStroke(state);
  tone(430, .06, "triangle", .025);
  updateGameCue();
}

function flightChoicePoint(lane) {
  return {
    x: cameraRect.x + cameraRect.w * flightFlyerRatio(),
    y: cameraRect.y + cameraRect.h * flightLaneY(lane)
  };
}

function transitionAfterFlightAnswer(completedWord) {
  const answeredState = gameState;
  answeredState.answerRevealed = true;
  answeredState.advancing = true;
  answeredState.gatePhase = "answer";
  answeredState.velocity = 0;
  inputLockedUntil = Infinity;
  updateGameCue();
  const token = ++speechRoundToken;
  answeredState.answerHoldUntil = performance.now() + 1100;
  let finished = false;
  const advance = () => {
    if (finished || token !== speechRoundToken || gameState !== answeredState || !answeredState.answerRevealed) return;
    finished = true;
    if (answeredState.stars >= FLIGHT_WORD_GOAL) {
      finishRunSoon(`🎉 영어 단어 ${FLIGHT_WORD_GOAL}개!`, "날갯짓으로 정답 구름을 모두 찾았어요", 1050);
      return;
    }
    if (!activateFlightQuestion(answeredState, answeredState.round + 1)) {
      finishRunSoon("🎉 모든 단어를 만났어요!", `${completedWordCount}개의 영어를 배웠어요`);
      return;
    }
    inputLockedUntil = performance.now() + 180;
    updateGameCue();
    scheduleRoundAnnouncement(240);
  };
  if (selfTesting) { advance(); return; }
  const advanceAfterMinimum = () => {
    const wait = answeredState.answerHoldUntil - performance.now();
    if (wait > 0) setTimeout(advance, wait);
    else advance();
  };
  const spoken = speakEnglish(completedWord.word.toLowerCase(), true, advanceAfterMinimum);
  setTimeout(advanceAfterMinimum, spoken ? 1550 : 1100);
}

function completeFlightAnswer(lane) {
  const state = gameState;
  if (!state || state.advancing || state.sessionComplete || state.stars >= FLIGHT_WORD_GOAL) return false;
  const completedWord = state.prompt;
  state.selectedLane = lane;
  state.answerRevealed = true;
  state.gatePhase = "answer";
  state.stars++;
  state.reps = state.stars;
  completedWordCount++;
  const point = flightChoicePoint(lane);
  award(180, point.x, point.y, `${completedWord.word} 정답!`, `${completedWord.emoji} ${completedWord.ko} = ${completedWord.word}`);
  transitionAfterFlightAnswer(completedWord);
  return true;
}

function beginFlightRetry(lane, countedMiss) {
  const state = gameState;
  if (!state || state.gatePhase !== "approach") return false;
  state.gatePhase = "retry";
  state.retryMs = 700;
  state.selectedLane = lane;
  state.wrongLane = lane;
  state.wrongFlashUntil = performance.now() + 700;
  const point = flightChoicePoint(lane || (state.flightY < .5 ? "high" : "low"));
  const newWrongLane = countedMiss && lane && !state.missedLanes.includes(lane);
  if (newWrongLane) {
    state.missedLanes.push(lane);
    penalty("다른 영어 구름으로!", point.x, point.y, 0);
  } else if (countedMiss) showToast("같은 문제예요 · 반대쪽 영어 구름으로!", true);
  else showToast("위나 아래 구름 높이에 맞춰요", true);
  updateGameCue();
  return false;
}

function resolveFlightChoice(lane) {
  const state = gameState;
  if (!state || state.gatePhase !== "approach" || state.advancing || state.sessionComplete) return false;
  if (!lane) return beginFlightRetry(null, false);
  if (lane !== state.answerLane) return beginFlightRetry(lane, true);
  return completeFlightAnswer(lane);
}

function updateFlightLane(dt) {
  const state = gameState;
  if (!state) return;
  let candidate = null;
  if (state.laneCandidate === "high" && state.flightY <= .46) candidate = "high";
  else if (state.laneCandidate === "low" && state.flightY >= .54) candidate = "low";
  else if (state.flightY <= .42) candidate = "high";
  else if (state.flightY >= .58) candidate = "low";
  if (candidate !== state.laneCandidate) {
    state.laneCandidate = candidate;
    state.laneHoldMs = candidate ? dt : 0;
  } else if (candidate) {
    state.laneHoldMs += dt;
  } else {
    state.laneHoldMs = 0;
  }
  state.stableLane = candidate && state.laneHoldMs >= 180 ? candidate : null;
}

function updateFlightGate(frameDt, controlReady) {
  const state = gameState;
  if (!state || !controlReady || state.advancing || state.sessionComplete) return;
  updateFlightLane(frameDt);
  if (state.gatePhase === "retry") {
    state.retryMs -= frameDt;
    if (state.retryMs <= 0) {
      resetFlightGate(state, 650);
      updateGameCue();
    }
    return;
  }
  if (state.gatePhase !== "approach") return;
  if (state.previewMs > 0) {
    state.previewMs -= frameDt;
    return;
  }
  state.previousGateX = state.gateX;
  state.gateX -= FLIGHT_GATE_SPEED * (frameDt / 1000);
  const flyerRatio = flightFlyerRatio();
  if (state.previousGateX > flyerRatio && state.gateX <= flyerRatio) {
    state.gateX = flyerRatio;
    resolveFlightChoice(state.stableLane);
  }
}

function updateFlightInput(dt) {
  const state = gameState;
  if (!state || state.advancing || state.sessionComplete) return;
  const points = posePoints();
  if (!points) return;
  const feature = flightFeatures(points);
  state.inputValid = feature.valid;
  state.wingsUp = feature.wingsUp;
  state.wingsDown = feature.wingsDown;
  const poseAt = poseCaptureTimestamp || poseTimestamp || performance.now();
  state.sinceFlapMs = Number.isFinite(state.lastFlapAt)
    ? clamp(poseAt - state.lastFlapAt, 0, 5000)
    : Infinity;
  if (!feature.valid) {
    state.invalidMs += dt;
    if (state.invalidMs >= POSE_FRESH_MS) resetFlightStroke(state);
    updateGameCue();
    return;
  }
  state.invalidMs = 0;
  if (state.phase === "needUp") {
    if (feature.wingsUp) {
      state.phase = "needDown";
      state.phaseMs = 0;
      state.strokeMs = 0;
      state.upWingY = feature.wingY;
      state.upLevel = feature.level;
      state.upSamples = 0;
    } else if (feature.softUp) {
      state.upSamples += 1;
      if (state.upSamples >= 2) {
        state.phase = "needDown";
        state.phaseMs = 0;
        state.strokeMs = 0;
        state.upWingY = feature.wingY;
        state.upLevel = feature.level;
        state.upSamples = 0;
      }
    } else if (feature.level < .02) {
      state.upSamples = 0;
    }
  } else {
    state.strokeMs += dt;
    state.upLevel = Math.max(state.upLevel ?? feature.level, feature.level);
    const travel = (state.upLevel ?? feature.level) - feature.level;
    const downStroke = feature.wingsDown && travel >= .60 && state.strokeMs >= 90
      && state.strokeMs <= 1200 && state.sinceFlapMs >= 260;
    if (state.strokeMs > 1200) resetFlightStroke(state);
    else if (downStroke) applyFlightImpulse(poseAt);
  }
  updateGameCue();
}

function updateFlightPhysics(frameDt, now = performance.now()) {
  const state = gameState;
  if (selectedGame !== "jack" || !state || state.sessionComplete) return;
  const dt = clamp(frameDt, 0, 100) / 1000;
  const inputValid = demo || (!!lastPose && currentPoseAge(now) <= FLIGHT_POSE_FRESH_MS && flightFrameUsable());
  if (!inputValid) {
    state.inputValid = false;
    state.trackingReadyMs = 0;
    state.laneCandidate = null;
    state.laneHoldMs = 0;
    state.stableLane = null;
    state.invalidMs += frameDt;
    if (state.invalidMs >= POSE_FRESH_MS) resetFlightStroke(state);
    state.velocity = 0;
    state.wingEnergy = Math.max(0, state.wingEnergy - dt * 1.8);
    return;
  }
  state.trackingReadyMs = Math.min(1000, state.trackingReadyMs + frameDt);
  const controlReady = demo || state.trackingReadyMs >= 300;
  if (!controlReady) {
    state.velocity = 0;
    state.wingEnergy = Math.max(0, state.wingEnergy - dt * 1.8);
    return;
  }
  if (state.inputValid) state.invalidMs = 0;
  if (state.advancing) {
    state.velocity = 0;
    state.wingEnergy = Math.max(0, state.wingEnergy - dt * 1.8);
    return;
  }
  state.sinceFlapMs = Number.isFinite(state.lastFlapAt)
    ? Math.max(state.sinceFlapMs, clamp(now - state.lastFlapAt, 0, 5000))
    : Infinity;
  if (state.sinceFlapMs > 650) state.velocity = Math.max(state.velocity, 0);
  state.velocity = clamp(state.velocity + .26 * dt, -.36, .18);
  state.flightY = clamp(state.flightY + state.velocity * dt, .12, .88);
  state.bestAltitude = Math.max(state.bestAltitude || 0, 1 - state.flightY);
  if (state.flightY >= .88 && state.velocity > 0) state.velocity = 0;
  if (state.flightY <= .12 && state.velocity < 0) state.velocity = 0;
  state.wingEnergy = Math.max(0, state.wingEnergy - dt * 1.8);
  updateFlightGate(frameDt, true);
}

function updateGame(dt) {
  if (selectedGame === "sequence" || selectedGame === "math") updateTouchGame(dt);
  else if (selectedGame === "squat") updateActionGame(dt);
  else updateFlightInput(dt);
}

function shouldAdvanceGameClock(usable) {
  return running && usable && !gameState?.advancing && !gameState?.sessionComplete;
}

function updateGameCue() {
  if (!gameState) return;
  if (selectedGame === "sequence") {
    if (gameState.answerRevealed) {
      setCue(`${gameState.prompt.emoji} ${gameState.prompt.ko} = ${gameState.prompt.word} ✓`, `같이 말해요 · ${gameState.prompt.word}`);
      return;
    }
    const next = gameState.targets[gameState.current - 1]?.value || "";
    const progress = gameState.targets.map((target) => target.order < gameState.current ? target.value : "_").join(" ");
    setCue(`${gameState.prompt.emoji} ${gameState.prompt.ko}의 철자를 완성해요!`, `${progress} · 다음 글자 ${next} · 단어 ${completedWordCount + 1}/${SPELLING_GOAL}`);
  } else if (selectedGame === "math") {
    if (gameState.answerRevealed) {
      setCue(`${gameState.prompt.emoji} ${gameState.prompt.ko} = ${gameState.prompt.word} ✓`, `같이 말해요 · ${gameState.prompt.word}`);
      return;
    }
    setCue(`${gameState.prompt.emoji} ${withObjectParticle(gameState.prompt.ko)} 찾으세요!`, `알맞은 영어 단어를 골라요 · ${completedWordCount + 1}/${PICTURE_GOAL}`);
  } else if (selectedGame === "squat") {
    const action = gameState.currentAction;
    if (!action) return;
    if (gameState.advancing) {
      setCue(`${action.emoji} GREAT JOB! ✓`, `미션 ${gameState.completed}/${gameState.commands.length} 완료`);
      return;
    }
    let hint = action.ko;
    if (gameState.phase === "needStand") hint = action.id === "oneLeg" ? "먼저 똑바로 서요 · 벽을 잡아도 좋아요" : "먼저 똑바로 서요";
    else if (action.id === "squat" && gameState.phase === "ready") hint = "천천히 앉아요";
    else if (action.id === "squat" && gameState.phase === "down") hint = "UP! 다시 일어나요";
    setCue(`${gameState.completed + 1}/${gameState.commands.length} · ${action.emoji} ${action.en}`, hint);
  } else {
    if (gameState.answerRevealed) {
      setCue(`${gameState.prompt.emoji} ${gameState.prompt.ko} = ${gameState.prompt.word} ✓`, `같이 말해요 · ${gameState.prompt.word}`);
      return;
    }
    if (gameState.sessionComplete) {
      setCue(`⭐ WORD WINGS! · ${gameState.stars}/${FLIGHT_WORD_GOAL}`, "영어 단어 비행을 완주했어요!");
      return;
    }
    const high = gameState.choices.find((choice) => choice.lane === "high")?.word || "";
    const low = gameState.choices.find((choice) => choice.lane === "low")?.word || "";
    const title = `${gameState.round}/${FLIGHT_WORD_GOAL} · ${gameState.prompt.emoji} ${withTopicParticle(gameState.prompt.ko)} 영어로?`;
    let hint = gameState.phase === "needDown" ? "DOWN! 팔을 아래로 크게 펄럭여요" : "날갯짓하면 ↑ · 쉬면 ↓";
    if (gameState.gatePhase === "retry") hint = "한 번 더! 정답 영어 구름을 찾아요";
    const accessible = `${title} 위쪽 영어 단어 ${high}. 아래쪽 영어 단어 ${low}. ${hint}`;
    setCue(title, hint, accessible);
  }
}

function poseUsable(now = performance.now()) {
  motionDiagnostics.poseAgeMs = Math.round(currentPoseAge(now));
  if (!lastPose || currentPoseAge(now) > POSE_FRESH_MS) return false;
  if (selectedGame === "squat" && gameState?.currentAction) {
    return actionRequiredLandmarksUsable(gameState.currentAction);
  }
  if (selectedGame === "jack") return flightFrameUsable();
  if (!requiredIndices(selectedGame).every((index) => landmarkVisible(lastPose[index], .32))) return false;
  if (selectedGame === "sequence" || selectedGame === "math") {
    return [LM.lw, LM.rw].some((index) => landmarkInFrame(lastPose[index], .012));
  }
  return true;
}

function trackingGuidance(now = performance.now()) {
  if (!lastPose || currentPoseAge(now) > POSE_FRESH_MS) {
    return games[selectedGame].fullBody
      ? ["몸 전체를 다시 찾아요", "머리와 발목이 보이게 가운데에 서요"]
      : selectedGame === "jack"
        ? ["두 팔을 다시 찾아요", "어깨와 양손을 화면 안에 보여 주세요"]
        : ["손을 다시 찾아요", "얼굴·어깨와 한 손을 화면 안에 보여 주세요"];
  }
  if (selectedGame === "sequence" || selectedGame === "math") {
    if (![LM.lw, LM.rw].some((index) => landmarkInFrame(lastPose[index], .012))) {
      return ["손이 화면 밖에 있어요", "한 손을 화면 안쪽으로 넣어 주세요"];
    }
  }
  if (selectedGame === "jack") {
    const points = posePoints();
    const shoulderRatio = points ? distance(points.ls, points.rs) / Math.max(1, cameraRect.w) : 0;
    if (shoulderRatio > .34) return ["조금 가까워요", "양손이 잘리지 않게 반 걸음 뒤로 가요"];
    if (shoulderRatio && shoulderRatio < .085) return ["조금 멀어요", "반 걸음 앞으로 와요"];
    return ["양손을 화면 안으로", "어깨·팔꿈치·양손을 모두 보여 주세요"];
  }
  if (selectedGame === "squat") {
    const action = gameState?.currentAction;
    const lower = ["oneLeg", "touchKnees", "squat", "leanSide"].includes(action?.id);
    return lower
      ? ["다리를 다시 찾아요", "엉덩이·무릎·발목이 보이게 서요"]
      : ["팔을 다시 찾아요", "현재 동작에 쓰는 손과 팔을 보여 주세요"];
  }
  return ["동작을 다시 찾아요", "카메라 가운데에 서 주세요"];
}

function updateHUD() {
  const remaining = Math.max(0, Math.ceil((games[selectedGame].ms - gameElapsed) / 1000));
  ui.score.textContent = `★ ${hits}`;
  const successes = selectedGame === "sequence" || selectedGame === "math"
    ? completedWordCount
    : selectedGame === "squat" ? (gameState?.completed || 0) : (gameState?.stars || 0);
  ui.combo.textContent = `🌟 ${successes}`;
  ui.time.textContent = remaining <= 10 ? "마무리" : "놀이 중";
}

function smoothPose(raw, now) {
  if (!lastPose || now - poseTimestamp > 350) return raw.map((point) => ({ ...point }));
  const dt = clamp(now - poseTimestamp, 16, POSE_DT_MAX_MS);
  return raw.map((point, index) => {
    const previous = lastPose[index];
    if (!previous || !landmarkVisible(point, .25)) return { ...point };
    const tau = index === LM.lw || index === LM.rw ? 48 : 82;
    const alpha = 1 - Math.exp(-dt / tau);
    return { ...point, x: lerp(previous.x, point.x, alpha), y: lerp(previous.y, point.y, alpha), z: lerp(previous.z || 0, point.z || 0, alpha) };
  });
}

function detectPose(now) {
  if ((!poseWorkerReady && !poseLandmarker) || video.readyState < 2 || video.currentTime === lastVideoTime || now - lastInferenceAt < adaptiveInferenceInterval) return;
  if (poseInferenceBusy) {
    motionDiagnostics.droppedFrames += 1;
    return;
  }
  poseInferenceBusy = true;
  poseInferenceStartedAt = now;
  lastInferenceAt = now;
  lastVideoTime = video.currentTime;
  if (poseWorkerReady && poseWorker) {
    const worker = poseWorker;
    const generation = poseWorkerGeneration;
    const frameGeneration = cameraFrameGeneration;
    let captureSettled = false;
    const captureTimeout = setTimeout(() => {
      if (captureSettled) return;
      captureSettled = true;
      poseInferenceBusy = false;
      handlePoseRuntimeFailure(new Error("카메라 프레임 준비 시간이 초과됐습니다."), true);
    }, 700);
    createImageBitmap(video).then((bitmap) => {
      if (captureSettled) {
        bitmap.close?.();
        return;
      }
      captureSettled = true;
      clearTimeout(captureTimeout);
      poseInferenceBusy = false;
      if (poseWorker !== worker || !poseWorkerReady || generation !== poseWorkerGeneration || frameGeneration !== cameraFrameGeneration) {
        bitmap.close?.();
        return;
      }
      try {
        worker.postMessage({ type: "frame", bitmap, timestamp: now, generation, frameGeneration }, [bitmap]);
      } catch (error) {
        bitmap.close?.();
        handlePoseRuntimeFailure(error, true);
      }
    }).catch((error) => {
      if (captureSettled) return;
      captureSettled = true;
      clearTimeout(captureTimeout);
      poseInferenceBusy = false;
      handlePoseRuntimeFailure(error, true);
    });
    return;
  }
  const inferenceStartedAt = performance.now();
  try {
    const result = poseLandmarker.detectForVideo(video, now);
    acceptPoseResult(result.landmarks?.[0], result.worldLandmarks?.[0], now, performance.now() - inferenceStartedAt);
  } catch (error) {
    handlePoseRuntimeFailure(error);
  } finally {
    poseInferenceBusy = false;
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, viewW, viewH);
  if (bg.complete && bg.naturalWidth) {
    const scale = Math.max(viewW / bg.naturalWidth, viewH / bg.naturalHeight);
    const w = bg.naturalWidth * scale, h = bg.naturalHeight * scale;
    ctx.drawImage(bg, (viewW - w) / 2, (viewH - h) / 2, w, h);
  } else {
    ctx.fillStyle = "#a8e9ff";
    ctx.fillRect(0, 0, viewW, viewH);
  }
  if (video.readyState >= 2 && !demo) {
    ctx.save();
    ctx.globalAlpha = .92;
    ctx.translate(cameraRect.x + cameraRect.w, cameraRect.y);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, cameraRect.w, cameraRect.h);
    ctx.restore();
    ctx.fillStyle = "#fffaf010";
    ctx.fillRect(cameraRect.x, cameraRect.y, cameraRect.w, cameraRect.h);
    ctx.strokeStyle = "#ffffffdd";
    ctx.lineWidth = 4;
    ctx.strokeRect(cameraRect.x, cameraRect.y, cameraRect.w, cameraRect.h);
    if (!running) {
      const cameraHint = games[selectedGame].fullBody ? "머리부터 발목까지 ⭐" : selectedGame === "jack" ? "두 팔을 보여요 🪽" : "손을 흔들어요 👋";
      drawCanvasPill(cameraRect.x + 70, cameraRect.y + 18, cameraHint, "#28775f", true);
    }
  }
}

function poseIsFresh(now = performance.now()) {
  return !!lastPose && currentPoseAge(now) <= POSE_FRESH_MS;
}

function landmarkSignal(index) {
  const landmark = lastPose?.[index];
  return landmark ? clamp(Math.min(landmark.visibility ?? 1, landmark.presence ?? 1), 0, 1) : 0;
}

function focusJointSet() {
  if (selectedGame === "sequence" || selectedGame === "math") return new Set([LM.lw, LM.rw]);
  if (selectedGame === "squat") return new Set(gameState?.currentAction?.focus || [LM.ls, LM.rs, LM.lw, LM.rw, LM.lh, LM.rh, LM.lk, LM.rk, LM.la, LM.ra]);
  return new Set([LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw]);
}

function jointVisualColor(index, signal = landmarkSignal(index)) {
  if (signal < .35) return "#8c879b";
  if (signal < .58) return "#ffb15b";
  if (selectedGame === "sequence" || selectedGame === "math") {
    if (index === LM.lw) return "#38f6ff";
    if (index === LM.rw) return "#ff3ea5";
  }
  if (selectedGame === "squat" && (LEG_JOINTS.has(index) || index === LM.ls || index === LM.rs)) {
    if (gameState?.matching && (gameState?.progress ?? 0) >= .7) return "#c8ff3d";
    if (gameState?.matching) return "#ffb15b";
    return "#38f6ff";
  }
  if (selectedGame === "squat" && (ARM_JOINTS.has(index) || index === LM.nose)) {
    if (gameState?.matching && (gameState?.progress ?? 0) >= .7) return "#c8ff3d";
    return gameState?.matching ? "#ffb15b" : "#38f6ff";
  }
  if (selectedGame === "jack") {
    if (ARM_JOINTS.has(index)) return gameState?.wingsUp || gameState?.wingsDown ? "#c8ff3d" : "#38f6ff";
  }
  return "#dce7ef";
}

function drawCanvasPill(cx, cy, text, color = "#28aeea", small = false) {
  ctx.save();
  ctx.font = `800 ${small ? 9 : viewW < 700 ? 11 : 12}px Nunito`;
  const width = clamp(ctx.measureText(text).width + (small ? 14 : 20), 44, viewW < 700 ? 150 : 190);
  const height = small ? 20 : 26;
  const x = clamp(cx - width / 2, cameraRect.x + 7, cameraRect.x + cameraRect.w - width - 7);
  const y = clamp(cy - height / 2, cameraRect.y + 7, cameraRect.y + cameraRect.h - height - 7);
  const cut = 6;
  ctx.beginPath();
  ctx.moveTo(x + cut, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + height - cut);
  ctx.lineTo(x + width - cut, y + height); ctx.lineTo(x, y + height); ctx.lineTo(x, y + cut); ctx.closePath();
  ctx.fillStyle = "#fffaf0ed";
  ctx.strokeStyle = `${color}bb`;
  ctx.lineWidth = 1;
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#27334d";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + width / 2, y + height / 2 + .5, width - 10);
  ctx.restore();
}

function drawPose(now = performance.now()) {
  if (!poseIsFresh(now) || demo) return;
  const focus = focusJointSet();
  const points = new Map(POSE_JOINTS.map((index) => [index, posePoint(index)]));
  const baseWidth = viewW < 700 ? 2 : 3;
  ctx.save();

  ctx.beginPath();
  for (const [a, b] of SKELETON) {
    const p = points.get(a), q = points.get(b);
    if (p?.v < .35 || q?.v < .35) continue;
    ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
  }
  ctx.strokeStyle = "#dce7ef73";
  ctx.lineWidth = baseWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  for (const [a, b] of SKELETON) {
    if (!focus.has(a) || !focus.has(b)) continue;
    const p = points.get(a), q = points.get(b);
    if (p?.v < .35 || q?.v < .35) continue;
    const signal = Math.min(landmarkSignal(a), landmarkSignal(b));
    const color = jointVisualColor(b, signal);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
    ctx.strokeStyle = color;
    ctx.globalAlpha = clamp((signal - .25) / .5, .35, 1);
    ctx.lineWidth = baseWidth + 1.5;
    ctx.stroke();
  }

  for (const index of POSE_JOINTS) {
    const point = points.get(index);
    const signal = landmarkSignal(index);
    if (!point || signal < .28) continue;
    const isHand = index === LM.lw || index === LM.rw;
    const isFocus = focus.has(index);
    const radius = isHand ? (viewW < 700 ? 6.5 : 8.5) : MAJOR_JOINTS.has(index) ? (viewW < 700 ? 4 : 5) : (viewW < 700 ? 3 : 4);
    const color = jointVisualColor(index, signal);
    ctx.globalAlpha = isHand ? 1 : isFocus ? .88 : clamp((signal - .25) / .65, .4, .68);
    ctx.shadowBlur = isFocus ? (isHand ? 8 : 5) : 0;
    ctx.shadowColor = color;
    ctx.fillStyle = "#05040b";
    ctx.strokeStyle = color;
    ctx.lineWidth = isFocus ? 2.2 : 1.4;
    ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (isFocus) {
      ctx.globalAlpha *= .45;
      ctx.beginPath(); ctx.arc(point.x, point.y, radius + 3.5, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.restore();

  if (running && selectedGame === "squat" && gameState?.currentAction) {
    const shoulders = [points.get(LM.ls), points.get(LM.rs)];
    if (shoulders.every((point) => point?.v > .35)) {
      const label = gameState.phase === "needStand"
        ? "READY"
        : gameState.matching ? `${Math.round((gameState.progress || 0) * 100)}% ✓` : gameState.currentAction.en.replace("!", "");
      drawCanvasPill((shoulders[0].x + shoulders[1].x) / 2, Math.min(shoulders[0].y, shoulders[1].y) - 26, label, gameState.matching ? "#c8ff3d" : "#38f6ff", true);
    }
  }
  if (running && selectedGame === "jack") {
    const wrists = [points.get(LM.lw), points.get(LM.rw)];
    if (wrists.every((point) => point?.v > .35)) {
      const wingLabel = gameState?.wingsUp ? "WINGS UP ✓" : gameState?.wingsDown ? "WINGS DOWN ✓" : gameState?.phase === "needDown" ? "DOWN!" : "UP!";
      const wingColor = gameState?.wingsUp || gameState?.wingsDown ? "#c8ff3d" : "#38f6ff";
      drawCanvasPill((wrists[0].x + wrists[1].x) / 2, Math.min(wrists[0].y, wrists[1].y) - 18, wingLabel, wingColor, true);
    }
  }
}

function drawHandCursors(now = performance.now()) {
  if (!running || demo || !poseIsFresh(now) || !poseUsable(now) || (selectedGame !== "sequence" && selectedGame !== "math")) return;
  const hitRadius = targetRadius();
  for (const [index, baseColor] of [[LM.lw, "#38f6ff"], [LM.rw, "#ff3ea5"]]) {
    const point = posePoint(index);
    if (!point || point.v < .30) continue;
    const trail = wristTrails[index];
    const last = trail[trail.length - 1];
    if (!last || distance(last, point) > 2 || now - last.t > 42) trail.push({ x: point.x, y: point.y, t: now });
    wristTrails[index] = trail.filter((sample) => now - sample.t < 330).slice(-10);
    const touching = !!gameState?.inputReady && gameState?.targets?.some((target) => {
      if (selectedGame === "sequence" && target.order !== gameState.current) return false;
      return pointInsideTarget(point, target, hitRadius);
    });
    const color = touching ? "#ffb15b" : baseColor;
    ctx.save();
    const samples = wristTrails[index];
    for (let i = 1; i < samples.length; i++) {
      const alpha = i / samples.length * .3;
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1 + i / samples.length * 2;
      ctx.beginPath(); ctx.moveTo(samples[i - 1].x, samples[i - 1].y); ctx.lineTo(samples[i].x, samples[i].y); ctx.stroke();
    }
    const radius = viewW < 700 ? 10 : 12;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(point.x, point.y, radius + 4 + Math.sin(now / 90) * 1.5, -.35, Math.PI * 1.25); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(point.x, point.y, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function trackingSignal() {
  if (!lastPose) return 0;
  if (selectedGame === "sequence" || selectedGame === "math") {
    const core = requiredIndices(selectedGame).map(landmarkSignal);
    return Math.min(...core, Math.max(landmarkSignal(LM.lw), landmarkSignal(LM.rw)));
  }
  return Math.min(...requiredIndices(selectedGame).map(landmarkSignal));
}

function drawTrackingSignal(now = performance.now()) {
  if (demo || !poseIsFresh(now)) return;
  const signal = trackingSignal();
  const color = signal >= .65 ? "#c8ff3d" : signal >= .30 ? "#ffb15b" : "#ff6b7f";
  drawCanvasPill(cameraRect.x + cameraRect.w - 48, cameraRect.y + 17, `TRACK ${Math.round(signal * 100)}%`, color, true);
}

function roundedRectPath(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawTargetCircle(target, active = true) {
  const point = targetPoint(target);
  const radius = targetRadius();
  const isWordChoice = selectedGame === "math";
  const shapeW = isWordChoice ? radius * 2.9 : radius * 2;
  const shapeH = isWordChoice ? radius * 1.65 : radius * 2;
  const now = performance.now();
  const wrong = now < target.flashUntil;
  const locked = gameState?.inputReady === false && !wrong;
  const progress = clamp((target.dwell || 0) / TOUCH_DWELL_MS, 0, 1);
  const color = wrong ? "#f2ad21" : locked ? "#9ba7b6" : active ? (progress > .55 ? "#39c594" : "#28aeea") : "#a9b4c5";
  const shake = wrong ? Math.sin((target.flashUntil - now) / 24) * Math.min(6, (target.flashUntil - now) / 50) : 0;
  ctx.save();
  ctx.translate(point.x + shake, point.y);
  ctx.shadowBlur = active && !locked ? (viewW < 700 ? 14 : 20) : 0;
  ctx.shadowColor = color;
  ctx.fillStyle = wrong ? "#fff2c9ee" : locked ? "#eef2f5dd" : "#fffaf0ee";
  ctx.strokeStyle = color;
  ctx.lineWidth = active ? 4 : 2;
  if (locked) ctx.setLineDash([6, 6]);
  if (isWordChoice) roundedRectPath(-shapeW / 2, -shapeH / 2, shapeW, shapeH, shapeH * .42);
  else { ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); }
  ctx.fill(); ctx.stroke();
  ctx.setLineDash([]);
  if (active && !locked) {
    ctx.globalAlpha = .4 + .22 * Math.sin(now / 120);
    if (isWordChoice) roundedRectPath(-shapeW / 2 - 7, -shapeH / 2 - 7, shapeW + 14, shapeH + 14, shapeH * .48);
    else { ctx.beginPath(); ctx.arc(0, 0, radius + 8, 0, Math.PI * 2); }
    ctx.stroke();
  }
  if (active && progress > 0) {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#39c594";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (isWordChoice) {
      ctx.moveTo(-shapeW * .38, shapeH / 2 + 10);
      ctx.lineTo(-shapeW * .38 + shapeW * .76 * progress, shapeH / 2 + 10);
    } else {
      ctx.arc(0, 0, radius + 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = wrong ? "#9b651b" : "#27334d";
  ctx.font = `400 ${Math.round(radius * (isWordChoice ? .52 : .78))}px Jua`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (wrong) {
    ctx.fillText("↻", 0, isWordChoice ? -radius * .20 : 1);
    ctx.font = `400 ${Math.round(radius * (isWordChoice ? .32 : .38))}px Jua`;
    ctx.fillText(target.value, 0, isWordChoice ? radius * .32 : radius * .48);
  } else ctx.fillText(target.value, 0, 1);
  ctx.restore();
}

function drawLearningPrompt() {
  if (!gameState?.prompt || (selectedGame !== "sequence" && selectedGame !== "math")) return;
  const compactLandscape = viewH < 420 && viewW > viewH;
  const prompt = gameState.prompt;
  const x = cameraRect.x + cameraRect.w / 2;
  let y = cameraRect.y + (compactLandscape ? 52 : 42);
  const progress = selectedGame === "sequence"
    ? [...prompt.word].map((letter, index) => index < gameState.current - 1 ? letter : "_").join(" ")
    : prompt.ko;
  const text = `${prompt.emoji}  ${progress}`;
  ctx.save();
  ctx.font = `400 ${compactLandscape ? 18 : viewW < 700 ? 24 : 30}px Jua`;
  const width = clamp(ctx.measureText(text).width + 30, 112, Math.max(112, cameraRect.w - 24));
  const height = compactLandscape ? 34 : viewW < 700 ? 48 : 58;
  if (!ui.cue.classList.contains("hidden")) {
    const appBounds = app.getBoundingClientRect();
    const cueBounds = ui.cue.getBoundingClientRect();
    const cueLeft = cueBounds.left - appBounds.left;
    const cueRight = cueBounds.right - appBounds.left;
    const cueBottom = cueBounds.bottom - appBounds.top;
    const overlapsHorizontally = cueRight > x - width / 2 - 8 && cueLeft < x + width / 2 + 8;
    if (compactLandscape && overlapsHorizontally) {
      ctx.restore();
      return;
    }
    if (overlapsHorizontally && cueBottom > cameraRect.y - 8) y = Math.max(y, cueBottom + height / 2 + 8);
  }
  y = clamp(y, cameraRect.y + height / 2 + 7, cameraRect.y + cameraRect.h - height / 2 - 7);
  roundedRectPath(x - width / 2, y - height / 2, width, height, height / 2);
  ctx.fillStyle = "#fffaf0f2";
  ctx.strokeStyle = "#ffd65a";
  ctx.lineWidth = 2;
  ctx.shadowBlur = 12;
  ctx.shadowColor = "#ffd65a66";
  ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#27334d";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y + 1, width - 18);
  ctx.restore();
}

function drawTouchGame() {
  if (!gameState?.targets) return;
  drawLearningPrompt();
  for (const target of gameState.targets) {
    const active = selectedGame === "math" || target.order === gameState.current;
    const completed = selectedGame === "sequence" && target.order < gameState.current;
    if (!completed) drawTargetCircle(target, active);
    else {
      const point = targetPoint(target);
      const radius = targetRadius() * .48;
      ctx.save();
      ctx.fillStyle = "#e7fff5ee";
      ctx.strokeStyle = "#39c594";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#27334d";
      ctx.font = `400 ${Math.round(radius * .9)}px Jua`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(target.value, point.x, point.y + 1);
      ctx.fillStyle = "#39c594";
      ctx.font = `700 ${Math.round(radius * .68)}px Nunito`;
      ctx.fillText("✓", point.x + radius * .7, point.y - radius * .65);
      ctx.restore();
    }
  }
}

function drawFlightCloud(x, y, size, alpha = .35) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#fffaf0";
  ctx.beginPath();
  ctx.arc(x - size * .28, y + size * .04, size * .24, 0, Math.PI * 2);
  ctx.arc(x, y - size * .10, size * .34, 0, Math.PI * 2);
  ctx.arc(x + size * .30, y + size * .03, size * .26, 0, Math.PI * 2);
  ctx.rect(x - size * .52, y, size * 1.04, size * .28);
  ctx.fill();
  ctx.restore();
}

function drawFlightWordGate(choice, centerX, centerY, width, height, state, now) {
  const correct = state.answerRevealed && choice.lane === state.answerLane;
  const wrong = choice.lane === state.wrongLane && now < state.wrongFlashUntil;
  const selected = choice.lane === state.stableLane && state.gatePhase === "approach";
  ctx.save();
  ctx.shadowBlur = correct ? 22 : selected ? 14 : 9;
  ctx.shadowColor = correct ? "#77df83" : wrong ? "#f2ad21" : choice.lane === "high" ? "#8d78ef" : "#31b88c";
  roundedRectPath(centerX - width / 2, centerY - height / 2, width, height, Math.min(18, height * .32));
  ctx.fillStyle = correct ? "#eaffd8f5" : wrong ? "#fff0cef5" : "#fffdf2f2";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = correct ? "#39b96a" : wrong ? "#e59918" : choice.lane === "high" ? "#7562d8" : "#238c70";
  ctx.lineWidth = selected || correct || wrong ? 5 : 3;
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = choice.lane === "high" ? "#5d4abf" : "#18725b";
  ctx.font = `900 ${clamp(height * .20, 9, 12)}px Nunito`;
  ctx.fillText(choice.lane === "high" ? "▲ HIGH" : "▼ LOW", centerX, centerY - height * .24);
  ctx.fillStyle = "#263653";
  ctx.font = `900 ${clamp(width * .22, 21, 31)}px Nunito`;
  ctx.fillText(choice.word, centerX, centerY + height * .10);
  if (correct) {
    ctx.fillStyle = "#23955a";
    ctx.font = `900 ${clamp(height * .34, 16, 23)}px Nunito`;
    ctx.fillText("✓", centerX + width * .39, centerY - height * .27);
  }
  ctx.restore();
}

function drawFlightGame() {
  const state = gameState;
  if (!state) return;
  const { x, y, w, h } = cameraRect;
  const now = performance.now();
  const visualY = y + h * clamp(state.flightY, .18, .84);
  const flyerX = x + w * flightFlyerRatio();
  const flyerSize = clamp(w * .15, 38, 68);
  const scroll = (gameElapsed * .025) % Math.max(1, w);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, demo ? "#48cfffcc" : "#48cfff3f");
  sky.addColorStop(.72, demo ? "#a8ecffb8" : "#a8ecff26");
  sky.addColorStop(1, demo ? "#fff0b4aa" : "#fff0b426");
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);

  for (let i = 0; i < 5; i++) {
    const cloudX = x + ((i * w * .31 - scroll * (i % 2 ? .46 : .28) + w * 2) % (w * 1.25)) - w * .12;
    const cloudY = y + h * (.20 + (i % 3) * .23);
    drawFlightCloud(cloudX, cloudY, clamp(w * (.07 + (i % 2) * .025), 24, 52), demo ? .66 : .30);
  }

  ctx.save();
  ctx.setLineDash([8, 9]);
  ctx.lineWidth = 2;
  for (const choice of state.choices) {
    const laneY = y + h * flightLaneY(choice.lane);
    ctx.strokeStyle = choice.lane === "high" ? "#806ce866" : "#36b88c66";
    ctx.beginPath();
    ctx.moveTo(x + w * .08, laneY);
    ctx.lineTo(x + w * .96, laneY);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = "#ffd86b88";
  ctx.lineWidth = Math.max(4, flyerSize * .10);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 10, visualY + flyerSize * .20);
  ctx.bezierCurveTo(x + w * .16, visualY + flyerSize * .42, flyerX - flyerSize * .62, visualY + flyerSize * .12, flyerX - flyerSize * .34, visualY + flyerSize * .06);
  ctx.stroke();
  ctx.strokeStyle = "#ff93cf70";
  ctx.lineWidth = Math.max(2, flyerSize * .05);
  ctx.stroke();

  const gateX = x + w * state.gateX;
  const gateWidth = clamp(w * .34, 96, 168);
  const gateHeight = clamp(h * .115, 50, 66);
  for (const choice of state.choices) {
    drawFlightWordGate(choice, gateX, y + h * flightLaneY(choice.lane), gateWidth, gateHeight, state, now);
  }

  ctx.save();
  ctx.translate(flyerX, visualY);
  const bounce = 1 + state.wingEnergy * .12;
  ctx.scale(bounce, bounce);
  ctx.fillStyle = "#fffaf0dd";
  ctx.strokeStyle = "#38aeda";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, flyerSize * .58, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.font = `${flyerSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🐧", 0, 2);
  ctx.strokeStyle = state.wingsUp || state.wingsDown ? "#c8ff3d" : "#ffffffaa";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(-flyerSize * .46, 0, flyerSize * .36, -2.55, -1.10);
  ctx.arc(flyerSize * .46, 0, flyerSize * .36, -2.04, -.58);
  ctx.stroke();
  ctx.restore();

  const counterX = x + clamp(w * .14, 44, 92);
  const counterY = y + h * .52;
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#ffcc42";
  ctx.font = `700 ${viewW < 700 ? 34 : 50}px IBM Plex Sans KR`;
  ctx.fillText(state.stars, counterX, counterY);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff";
  ctx.font = "800 10px Nunito";
  ctx.fillText(`WORDS / ${FLIGHT_WORD_GOAL}`, counterX, counterY + 20);

  const gap = clamp(w * .042, 10, 16);
  const dotsWidth = gap * (FLIGHT_WORD_GOAL - 1);
  const startX = x + w * .5 - dotsWidth / 2;
  const dotsY = y + h * .90;
  ctx.font = `${viewW < 700 ? 12 : 15}px sans-serif`;
  for (let i = 0; i < FLIGHT_WORD_GOAL; i++) {
    ctx.globalAlpha = i < state.stars ? 1 : .38;
    ctx.fillText(i < state.stars ? "★" : "☆", startX + i * gap, dotsY);
  }
  ctx.restore();
}

function drawExerciseGame() {
  if (selectedGame === "jack") {
    drawFlightGame();
    return;
  }
  const reps = gameState?.completed || 0;
  const color = "#c8ff3d";
  const x = viewW < 700 ? 70 : 110;
  const y = viewH * .56;
  const now = performance.now();
  let repScale = 1;
  for (let index = feedbacks.length - 1; index >= 0; index--) {
    const feedback = feedbacks[index];
    if (feedback.type !== "good" || feedback.mode !== selectedGame) continue;
    const progress = (now - feedback.startedAt) / feedback.duration;
    if (progress >= 0 && progress < 1) repScale += Math.sin(progress * Math.PI) * .18;
    break;
  }
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.shadowBlur = 20;
  ctx.shadowColor = color;
  ctx.font = `700 ${(viewW < 700 ? 54 : 80) * repScale}px IBM Plex Sans KR`;
  ctx.fillText(reps, x, y);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff";
  ctx.font = "700 11px IBM Plex Sans KR";
  ctx.fillText(`MISSIONS / ${ACTION_COMMANDS.length}`, x, y + 24);
  const gap = viewW < 700 ? 12 : 16;
  const start = x - (ACTION_COMMANDS.length - 1) * gap / 2;
  for (let i = 0; i < ACTION_COMMANDS.length; i++) {
    ctx.beginPath();
    ctx.arc(start + i * gap, y + 48, i === gameState.commandIndex ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = i < gameState.completed ? "#c8ff3d" : i === gameState.commandIndex ? "#ffb15b" : "#ffffff55";
    ctx.fill();
  }
  ctx.restore();
}

function drawCalibrationGuide() {
  if (!calibrating || demo) return;
  ctx.save();
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = analyzeFit().good ? "#c8ff3d99" : "#ff9f4388";
  ctx.lineWidth = 2;
  ctx.strokeRect(cameraRect.x + cameraRect.w * .06, cameraRect.y + cameraRect.h * .04, cameraRect.w * .88, cameraRect.h * .92);
  ctx.restore();
}

function drawFeedbackCard(feedback, ringRadius, alpha) {
  const compactLandscape = viewH < 420 && viewW > viewH;
  const color = feedback.type === "good" ? "#39c594" : "#f2ad21";
  const title = compactLandscape && feedback.detail
    ? `⭐ ${feedback.detail}  +${feedback.gain}`
    : feedback.type === "good" ? `⭐ ${feedback.label}  +${feedback.gain}` : `↻ ${feedback.label}`;
  const detail = compactLandscape ? "" : feedback.detail || (feedback.type !== "good" ? "괜찮아요 · 한 번 더!" : "");
  const titleSize = compactLandscape ? 12 : viewW < 700 ? 14 : 17;
  const detailSize = viewW < 700 ? 9 : 10;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `400 ${titleSize}px Jua`;
  const titleWidth = ctx.measureText(title).width;
  ctx.font = `700 ${detailSize}px IBM Plex Sans KR`;
  const detailWidth = detail ? ctx.measureText(detail).width : 0;
  const maxWidth = Math.max(92, cameraRect.w - 20);
  const width = clamp(Math.max(titleWidth, detailWidth) + (compactLandscape ? 18 : 24), 96, Math.min(compactLandscape ? 168 : viewW < 700 ? 220 : 280, maxWidth));
  const height = compactLandscape ? 27 : detail ? 43 : 31;
  const above = feedback.y > cameraRect.y + cameraRect.h * .38;
  const desiredY = above ? feedback.y - ringRadius - height - 12 : feedback.y + ringRadius + 12;
  const x = clamp(feedback.x - width / 2, cameraRect.x + 10, cameraRect.x + cameraRect.w - width - 10);
  const y = clamp(desiredY, cameraRect.y + 34, cameraRect.y + cameraRect.h - height - 10);
  const cut = 8;
  ctx.beginPath();
  ctx.moveTo(x + cut, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + height - cut);
  ctx.lineTo(x + width - cut, y + height); ctx.lineTo(x, y + height); ctx.lineTo(x, y + cut); ctx.closePath();
  ctx.fillStyle = "#fffaf0f2";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 10;
  ctx.shadowColor = `${color}88`;
  ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.font = `400 ${titleSize}px Jua`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, x + width / 2, y + (detail ? 15 : height / 2), width - 12);
  if (detail) {
    ctx.fillStyle = "#5f6c84";
    ctx.font = `800 ${detailSize}px Nunito`;
    ctx.fillText(detail, x + width / 2, y + 31, width - 12);
  }
  ctx.restore();
}

function drawFeedbacks(now = performance.now()) {
  const compactLandscape = viewH < 420 && viewW > viewH;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const newestGood = [...feedbacks].reverse().find((feedback) => feedback.type === "good");
  if (newestGood && !reduceMotion) {
    const flashAge = now - newestGood.startedAt;
    if (flashAge >= 0 && flashAge < 190) {
      const alpha = (1 - flashAge / 190) * .09;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#c8ff3d";
      ctx.fillRect(cameraRect.x, cameraRect.y, cameraRect.w, cameraRect.h);
      ctx.globalAlpha = alpha * 5;
      ctx.strokeStyle = "#c8ff3d";
      ctx.lineWidth = viewW < 700 ? 4 : 6;
      ctx.shadowBlur = 18;
      ctx.shadowColor = "#c8ff3d";
      ctx.strokeRect(cameraRect.x + 3, cameraRect.y + 3, cameraRect.w - 6, cameraRect.h - 6);
      ctx.restore();
    }
  }

  for (const feedback of feedbacks) {
    const progress = clamp((now - feedback.startedAt) / feedback.duration, 0, 1);
    if (progress >= 1) continue;
    const color = feedback.type === "good" ? "#39c594" : "#f2ad21";
    const fade = progress < .72 ? 1 : 1 - (progress - .72) / .28;
    const expansion = 1 - Math.pow(1 - progress, 3);
    const radius = feedback.radius * (1 + expansion * .5);
    ctx.save();
    ctx.translate(feedback.x, feedback.y);
    ctx.globalAlpha = fade;
    ctx.strokeStyle = color;
    ctx.fillStyle = `${color}24`;
    ctx.lineWidth = feedback.type === "good" ? 4 : 3;
    ctx.shadowBlur = viewW < 700 ? 10 : 16;
    ctx.shadowColor = color;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = fade * .5;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, radius + 9, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = fade;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = viewW < 700 ? 6 : 8;
    ctx.beginPath();
    if (feedback.type === "good") {
      ctx.moveTo(-radius * .34, 0); ctx.lineTo(-radius * .08, radius * .25); ctx.lineTo(radius * .38, -radius * .27);
    } else {
      ctx.arc(0, 0, radius * .28, -.25, Math.PI * 1.55);
    }
    ctx.stroke();
    ctx.restore();
    if (compactLandscape) {
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.fillStyle = color;
      ctx.font = "700 10px IBM Plex Sans KR";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        feedback.type === "good" ? `+${feedback.gain}` : "한 번 더!",
        feedback.x,
        feedback.y + radius * .55
      );
      ctx.restore();
    } else {
      drawFeedbackCard(feedback, radius, fade);
    }
  }
  feedbacks = feedbacks.filter((feedback) => now - feedback.startedAt < feedback.duration);
}

function drawEffects(frameDt = 16, now = performance.now()) {
  ctx.save();
  drawFeedbacks(now);
  const frameScale = clamp(frameDt / 16.67, 0, 3);
  particles.forEach((particle) => {
    particle.x += particle.vx * frameScale; particle.y += particle.vy * frameScale;
    particle.vx *= Math.pow(.96, frameScale); particle.vy *= Math.pow(.96, frameScale);
    particle.life -= frameDt / 450;
    ctx.globalAlpha = Math.max(0, particle.life); ctx.fillStyle = particle.color; ctx.fillRect(particle.x, particle.y, 3, 3);
  });
  particles = particles.filter((particle) => particle.life > 0);
  ripples.forEach((ripple) => {
    ripple.r = Math.min(ripple.maxR || 100, ripple.r + 9 * frameScale);
    ripple.alpha -= frameDt / 320;
    ctx.globalAlpha = Math.max(0, ripple.alpha); ctx.strokeStyle = ripple.color; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(ripple.x, ripple.y, ripple.r, 0, Math.PI * 2); ctx.stroke();
  });
  ripples = ripples.filter((ripple) => ripple.alpha > 0);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function burst(x, y, color) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const compactLandscape = viewH < 420 && viewW > viewH;
  ripples.push({
    x, y, r: 8,
    maxR: compactLandscape ? clamp(targetRadius() * 1.35, 34, 40) : clamp(targetRadius() * 1.7, 50, 92),
    alpha: 1, color
  });
  const count = viewW < 700 ? 10 : 16;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2, speed = 2 + Math.random() * 7;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color });
  }
  particles = particles.slice(-(viewW < 700 ? 48 : 96));
}

function drawTrackingPause() {
  const [title, detail] = trackingGuidance();
  ctx.save();
  ctx.fillStyle = "#030207aa";
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.fillStyle = "#ffb15b";
  ctx.textAlign = "center";
  ctx.font = `700 ${viewW < 700 ? 22 : 30}px IBM Plex Sans KR`;
  ctx.fillText(title, viewW / 2, viewH / 2);
  ctx.fillStyle = "#c9c5d1";
  ctx.font = "400 13px IBM Plex Sans KR";
  ctx.fillText(`${detail} · 게임 시간은 멈춰 있어요`, viewW / 2, viewH / 2 + 30);
  ctx.restore();
}

function render(now) {
  const rawFrameDt = Math.max(0, now - lastFrameAt);
  const frameDt = clamp(rawFrameDt, 0, 100);
  const elapsedDt = clamp(rawFrameDt, 0, 250);
  lastFrameAt = now;
  drawBackground();
  if (!demo) detectPose(now);
  drawPose(now);
  drawCalibrationGuide();
  if (calibrating) updateCalibration(now);

  if (running) {
    if (selectedGame === "jack") updateFlightPhysics(frameDt, now);
    const usable = demo || poseUsable(now);
    let trackingPaused = false;
    if (usable) {
      lastUsablePoseAt = demo ? now : poseTimestamp;
      trackingInvalidSince = 0;
      trackingInputReset = false;
      if (shouldAdvanceGameClock(usable)) gameElapsed += elapsedDt;
      if (demo || poseVersion !== evaluatedPoseVersion) {
        const captureAt = poseCaptureTimestamp || poseTimestamp;
        const poseGap = lastPoseEvalAt ? captureAt - lastPoseEvalAt : adaptiveInferenceInterval;
        if (!demo && poseGap > POSE_FRESH_MS) rearmGameInput();
        else updateGame(demo ? frameDt : clamp(poseGap, 16, POSE_DT_MAX_MS));
        evaluatedPoseVersion = poseVersion;
        lastPoseEvalAt = captureAt;
      }
      setTracking(demo ? "체험 모드" : "동작 인식 중", "good");
    } else {
      trackingInvalidSince ||= now;
      const invalidFor = now - trackingInvalidSince;
      if (invalidFor >= 140 && !trackingInputReset) {
        rearmGameInput();
        trackingInputReset = true;
      }
      const [trackingTitle] = trackingGuidance(now);
      setTracking(trackingTitle, "warn");
      trackingPaused = invalidFor >= 220;
    }
    trackingWasPaused = trackingPaused;
    if (selectedGame === "sequence" || selectedGame === "math") drawTouchGame(); else drawExerciseGame();
    drawHandCursors(now);
    drawEffects(frameDt, now);
    drawTrackingSignal(now);
    if (trackingPaused) drawTrackingPause();
    updateHUD();
    if (gameElapsed >= games[selectedGame].ms && !gameState?.advancing && !gameState?.sessionComplete) endGame();
  }

  if (running || calibrating || countdownActive) renderFrameId = requestAnimationFrame(render);
  else {
    renderLoopActive = false;
    renderFrameId = 0;
  }
}

function startRenderLoop() {
  if (renderLoopActive) return;
  renderLoopActive = true;
  lastFrameAt = performance.now();
  renderFrameId = requestAnimationFrame(render);
}

function endGame() {
  running = false;
  speechRoundToken++;
  try { speechSynthesis.cancel(); } catch {}
  hide(ui.cue, ui.demoHelp, ui.motionArt, ui.listen, ui.home);
  const total = hits + misses;
  ui.resultTitle.textContent = completedRun ? "모든 미션을 완주했어요!" : "오늘도 정말 잘했어요!";
  ui.finalScore.textContent = `${hits}개`;
  if (selectedGame === "sequence" || selectedGame === "math") {
    ui.resultMetricLabel.textContent = "배운 영어";
    ui.resultStreakLabel.textContent = "최고 연속";
    ui.accuracy.textContent = `${completedWordCount}개`;
    ui.maxCombo.textContent = maxCombo;
  } else if (selectedGame === "squat") {
    ui.resultMetricLabel.textContent = "완료한 동작";
    ui.resultStreakLabel.textContent = "미션 목표";
    ui.accuracy.textContent = `${gameState?.completed || 0}/${ACTION_COMMANDS.length}`;
    ui.maxCombo.textContent = `${ACTION_COMMANDS.length}개`;
  } else if (selectedGame === "jack") {
    ui.resultMetricLabel.textContent = "배운 영어";
    ui.resultStreakLabel.textContent = "최고 높이";
    ui.accuracy.textContent = `${gameState?.stars || 0}/${FLIGHT_WORD_GOAL}`;
    ui.maxCombo.textContent = `${Math.round((gameState?.bestAltitude || 0) * 100)}%`;
  } else {
    ui.resultMetricLabel.textContent = "도전 횟수";
    ui.resultStreakLabel.textContent = "최고 연속";
    ui.accuracy.textContent = `${total}번`;
    ui.maxCombo.textContent = maxCombo;
  }
  ui.grade.textContent = hits >= 8 ? "🏆" : hits >= 4 ? "🌟" : "🌈";
  wakeLock?.release?.().catch(() => {});
  tone(660, .18, "triangle", .08);
  setTimeout(() => tone(880, .35, "triangle", .08), 180);
  show(ui.result);
  ui.result.focus({ preventScroll: true });
}

function returnToMenu() {
  cameraAttemptId += 1;
  cameraStartInProgress = false;
  countdownAttemptId += 1;
  running = calibrating = countdownActive = false;
  speechRoundToken++;
  demo = false;
  stopCamera();
  try { speechSynthesis.cancel(); } catch {}
  hide(ui.result, ui.cue, ui.demoHelp, ui.motionArt, ui.listen, ui.home, ui.calibrate, ui.loading, ui.countdown);
  show(ui.intro);
  setTracking("카메라 대기");
}

function demoTouch(x, y) {
  if (!running || !demo || !gameState?.targets || performance.now() < inputLockedUntil) return;
  const radius = targetRadius();
  const target = gameState.targets.find((item) => {
    if (selectedGame === "sequence" && item.order < gameState.current) return false;
    return pointInsideTarget({ x, y }, item, radius);
  });
  if (!target) return;
  if (selectedGame === "sequence") {
    if (target.order === gameState.current) completeSequenceTarget(target);
    else {
      inputLockedUntil = performance.now() + 110;
      const point = targetPoint(target);
      penalty(`${gameState.targets[gameState.current - 1]?.value || ""}부터 찾아봐요`, point.x, point.y, 0);
    }
  } else completeMathTarget(target);
}

function demoExercise(game) {
  if (!running || !demo || selectedGame !== game || performance.now() < inputLockedUntil) return;
  inputLockedUntil = performance.now() + 220;
  if (game === "squat") {
    completeActionMission();
  } else {
    applyFlightImpulse();
  }
  updateGameCue();
}

app.addEventListener("click", (event) => {
  if (event.target.closest("button")) return;
  if (demo && running && (selectedGame === "squat" || selectedGame === "jack")) demoExercise(selectedGame);
  else demoTouch(event.clientX, event.clientY);
});

addEventListener("keydown", (event) => {
  if (!running || !demo || event.repeat || performance.now() < inputLockedUntil) return;
  if (selectedGame === "sequence" && (event.code === "Enter" || /^Key[A-Z]$/.test(event.code))) {
    const value = event.code === "Enter" ? gameState.targets[gameState.current - 1]?.value : event.key.toUpperCase();
    const target = event.code === "Enter"
      ? gameState.targets[gameState.current - 1]
      : gameState.targets.find((item) => item.order >= gameState.current && item.value === value);
    if (target) {
      if (target.order === gameState.current) completeSequenceTarget(target);
      else {
        inputLockedUntil = performance.now() + 110;
        const point = targetPoint(target);
        penalty(`${gameState.targets[gameState.current - 1]?.value || ""}부터 찾아봐요`, point.x, point.y, 0);
      }
    }
  } else if (selectedGame === "math" && event.code === "Enter") {
    completeMathTarget(gameState.targets.find((item) => item.value === gameState.answer));
  } else if (event.key.toLowerCase() === "s") demoExercise("squat");
  else if (event.key.toLowerCase() === "j") demoExercise("jack");
});

$("#startBtn").onclick = startCamera;
$("#demoBtn").onclick = startDemo;
$("#loadingRetry").onclick = startCamera;
$("#loadingDemo").onclick = startDemo;
$("#retryBtn").onclick = () => {
  hide(ui.result);
  if (demo) {
    startRenderLoop();
    startCountdown();
  } else {
    beginCalibration();
    startRenderLoop();
  }
};
$("#menuBtn").onclick = returnToMenu;
$("#homeBtn").onclick = returnToMenu;
$("#soundBtn").onclick = (event) => {
  sound = !sound;
  event.currentTarget.classList.toggle("off", !sound);
  event.currentTarget.setAttribute("aria-pressed", String(sound));
  if (!sound) try { speechSynthesis.cancel(); } catch {}
  else if (running) announceRound();
};
$("#listenBtn").onclick = () => {
  if (!sound) {
    sound = true;
    $("#soundBtn").classList.remove("off");
  }
  if ((selectedGame === "sequence" || selectedGame === "math" || selectedGame === "jack") && gameState?.answerRevealed) {
    gameState.answerHoldUntil = performance.now() + 1100;
  }
  if (!announceRound()) {
    showToast("🔤 화면 안내를 함께 읽어봐요!");
    tone(540, .12, "triangle", .05);
  }
};

document.querySelectorAll(".game-card").forEach((card) => card.addEventListener("click", () => {
  document.querySelectorAll(".game-card").forEach((item) => {
    item.classList.remove("active");
    item.setAttribute("aria-pressed", "false");
  });
  card.classList.add("active");
  card.setAttribute("aria-pressed", "true");
  selectedGame = card.dataset.game;
  ui.motionArt.src = games[selectedGame].image;
  ui.motionArt.alt = `${games[selectedGame].name} 동작 안내`;
  $("#gameDescription").textContent = games[selectedGame].description;
  ui.time.textContent = "놀이 중";
  tone(330, .05, "triangle", .025);
}));

document.addEventListener("visibilitychange", () => {
  if (document.hidden) wakeLock?.release?.().catch(() => {});
  else if (running) navigator.wakeLock?.request("screen").then((lock) => wakeLock = lock).catch(() => {});
});

addEventListener("pagehide", () => {
  const demoActive = demo && (running || countdownActive);
  resumeCameraAfterPageShow = cameraStartInProgress || demoActive
    || (!demo && !!stream && (running || calibrating || countdownActive));
  resumeCameraMode = cameraStartInProgress ? "starting" : demoActive ? "demo" : running ? "running" : "calibrating";
  clearTimeout(orientationTimer);
  orientationTimer = 0;
  cameraAttemptId += 1;
  if (countdownActive) {
    countdownAttemptId += 1;
    countdownActive = false;
    hide(ui.countdown);
  }
  if (renderFrameId) cancelAnimationFrame(renderFrameId);
  renderFrameId = 0;
  renderLoopActive = false;
  stopCamera();
});

addEventListener("pageshow", () => {
  if (!resumeCameraAfterPageShow) return;
  resumeCameraAfterPageShow = false;
  const resumeMode = resumeCameraMode;
  if (resumeMode === "starting") {
    cameraStartInProgress = false;
    void startCamera();
    return;
  }
  if (resumeMode === "demo") {
    if (!running) void startCountdown();
    startRenderLoop();
    return;
  }
  if (cameraStreamReady && stream?.getVideoTracks?.().some((track) => track.readyState === "live")) {
    if (resumeMode === "running") rearmGameInput();
    startRenderLoop();
    return;
  }
  const attemptId = ++cameraAttemptId;
  setTracking("카메라 다시 연결 중", "warn");
  void (async () => {
    try {
      if (!(await openCamera(attemptId))) return;
      await loadPose();
      if (attemptId !== cameraAttemptId) return;
      if (resumeMode === "running" && gameState) {
        running = true;
        calibrating = false;
        rearmGameInput();
        show(ui.cue, ui.motionArt, ui.listen, ui.home);
      } else beginCalibration();
      startRenderLoop();
    } catch (error) {
      running = calibrating = countdownActive = false;
      show(ui.loading);
      showCameraError(error);
    }
  })();
});

window.__MOTION_TEST__ = {
  start(game = "sequence") {
    selectedGame = games[game] ? game : "sequence";
    demo = true;
    hide(ui.intro, ui.result, ui.loading, ui.calibrate);
    beginGame();
    startRenderLoop();
    return this.snapshot();
  },
  hit() {
    if (selectedGame === "sequence") completeSequenceTarget(gameState.targets.find((target) => target.order === gameState.current));
    else if (selectedGame === "math") completeMathTarget(gameState.targets.find((target) => target.value === gameState.answer));
    else demoExercise(selectedGame);
    return this.snapshot();
  },
  snapshot() {
    return {
      game: selectedGame, score, combo, hits, misses, elapsed: gameElapsed,
      feedback: feedbacks.map(({ type, label, gain, detail }) => ({ type, label, gain, detail })),
      state: JSON.parse(JSON.stringify(gameState))
    };
  },
  finish() { endGame(); return this.snapshot(); }
};

function syntheticPose(preset) {
  const pose = Array.from({ length: 33 }, () => ({ x: .5, y: .5, z: 0, visibility: 1, presence: 1 }));
  const set = (index, x, y) => Object.assign(pose[index], { x, y });
  set(LM.nose,.5,.10);set(LM.ls,.42,.27);set(LM.rs,.58,.27);set(LM.le,.40,.40);set(LM.re,.60,.40);
  set(LM.lh,.45,.51);set(LM.rh,.55,.51);set(LM.lk,.45,.70);set(LM.rk,.55,.70);set(LM.la,.45,.91);set(LM.ra,.55,.91);
  set(LM.lw,.42,.56);set(LM.rw,.58,.56);
  if (preset === "handsUp") {
    set(LM.le,.38,.17);set(LM.re,.62,.17);set(LM.lw,.40,.06);set(LM.rw,.60,.06);
  } else if (preset === "touchHead") {
    set(LM.le,.34,.20);set(LM.lw,.48,.11);
  } else if (preset === "touchShoulders") {
    set(LM.le,.30,.36);set(LM.re,.70,.36);set(LM.lw,.40,.29);set(LM.rw,.60,.29);
  } else if (preset === "airplane") {
    set(LM.le,.31,.27);set(LM.re,.69,.27);set(LM.lw,.20,.28);set(LM.rw,.80,.28);
  } else if (preset === "clap") {
    set(LM.le,.35,.37);set(LM.re,.65,.37);set(LM.lw,.47,.38);set(LM.rw,.53,.38);
  } else if (preset === "handsOnHips") {
    set(LM.le,.28,.42);set(LM.re,.72,.42);set(LM.lw,.44,.52);set(LM.rw,.56,.52);
  } else if (preset === "oneLeg") {
    set(LM.rk,.60,.60);set(LM.ra,.60,.68);
  } else if (preset === "touchKnees") {
    set(LM.le,.38,.54);set(LM.re,.62,.54);set(LM.lw,.45,.70);set(LM.rw,.55,.70);
  } else if (preset === "squat") {
    set(LM.lh,.38,.60);set(LM.rh,.62,.60);set(LM.lk,.34,.72);set(LM.rk,.66,.72);set(LM.la,.45,.91);set(LM.ra,.55,.91);
  } else if (preset === "leanSide") {
    [LM.nose,LM.ls,LM.rs,LM.le,LM.re,LM.lw,LM.rw].forEach((index) => pose[index].x -= .10);
  } else if (preset === "jackOpen") {
    set(LM.lw,.45,.07);set(LM.rw,.55,.07);set(LM.le,.33,.16);set(LM.re,.67,.16);set(LM.la,.25,.91);set(LM.ra,.75,.91);
  } else if (preset === "flightUp") {
    set(LM.le,.34,.22);set(LM.re,.66,.22);set(LM.lw,.25,.14);set(LM.rw,.75,.14);
  } else if (preset === "flightMid") {
    set(LM.le,.31,.27);set(LM.re,.69,.27);set(LM.lw,.20,.28);set(LM.rw,.80,.28);
  } else if (preset === "flightSingle") {
    set(LM.le,.34,.22);set(LM.lw,.25,.14);
  } else if (preset === "flightTogether") {
    set(LM.le,.42,.18);set(LM.re,.58,.18);set(LM.lw,.47,.14);set(LM.rw,.53,.14);
  } else if (preset === "flightOffFrame") {
    set(LM.le,.34,.22);set(LM.re,.66,.22);set(LM.lw,.25,-.02);set(LM.rw,.75,.14);
  }
  return pose;
}

function feedSyntheticPose(preset, frames = 10, dt = 33) {
  let syntheticAt = Math.max(poseCaptureTimestamp || 0, performance.now());
  for (let i = 0; i < frames; i++) {
    lastPose = syntheticPose(preset);
    lastWorldPose = syntheticPose(preset);
    syntheticAt += dt;
    poseCaptureTimestamp = syntheticAt;
    poseTimestamp = syntheticAt;
    poseVersion++;
    updateGame(dt);
  }
}

function runEngineSelfTest() {
  const results = {};
  selfTesting = true;
  demo = true;
  selectedGame = "sequence";
  resetScore();
  const sequenceWords = [];
  for (let round = 1; round <= SPELLING_GOAL; round++) {
    const state = createSequenceRound(round);
    if (state) sequenceWords.push(state.prompt.word);
  }
  const sequenceStopsAtGoal = createSequenceRound(SPELLING_GOAL + 1) === null;
  const spellingDeckRemaining = wordDeck.length;
  selectedGame = "math";
  resetScore();
  const pictureWords = [], pictureAnswers = [];
  while (wordDeck.length >= 2) {
    const state = createMathProblem();
    pictureAnswers.push(state.answer);
    pictureWords.push(...state.targets.map((target) => target.value));
  }
  results.noRepeat = {
    pass: WORDS.length === PICTURE_GOAL * 2 && new Set(WORDS.map((item) => item.word)).size === WORDS.length
      && WORDS.every((item) => item.word.length >= 3 && item.word.length <= 5)
      && sequenceWords.length === SPELLING_GOAL && new Set(sequenceWords).size === SPELLING_GOAL
      && sequenceStopsAtGoal && spellingDeckRemaining === WORDS.length - SPELLING_GOAL
      && pictureWords.length === PICTURE_GOAL * 2 && new Set(pictureWords).size === PICTURE_GOAL * 2
      && pictureAnswers.length === PICTURE_GOAL && new Set(pictureAnswers).size === PICTURE_GOAL
      && wordDeck.length === 0,
    spelling: sequenceWords, spellingDeckRemaining, pictureAnswers, shownPictureWords: pictureWords
  };
  selectedGame = "sequence";resetScore();gameState=createGameState("sequence");const spellWord=gameState.prompt.word;completeSequenceTarget(gameState.targets.find((target)=>target.order===1));
  results.sequence = { pass: gameState.current === 2 && hits === 1 && feedbacks.at(-1)?.type === "good" && WORDS.some((item)=>item.word===spellWord), word:spellWord, current: gameState.current, hits, feedback: feedbacks.at(-1)?.detail };
  selectedGame = "math";resetScore();gameState=createGameState("math");completeMathTarget(gameState.targets.find((target)=>target.value===gameState.answer));
  results.math = { pass: hits === 1 && score > 0 && WORDS.some((item)=>feedbacks.at(-1)?.detail?.includes(item.word)), answer:feedbacks.at(-1)?.detail, hits, score, feedback: feedbacks.at(-1)?.detail };
  selectedGame = "math";resetScore();gameState=createGameState("math");
  const outOfFrameTouch = syntheticPose("stand");
  outOfFrameTouch[LM.lw].x = -.04;
  outOfFrameTouch[LM.rw].visibility = outOfFrameTouch[LM.rw].presence = .1;
  lastPose = outOfFrameTouch;lastWorldPose = outOfFrameTouch;
  const trackingNow = performance.now();poseTimestamp = trackingNow;
  const outOfFrameTouchUsable = poseUsable(trackingNow);
  const outOfFrameHandCount = handPositions(posePoints()).length;
  lastPose = syntheticPose("stand");lastWorldPose = lastPose;
  poseTimestamp = trackingNow - POSE_FRESH_MS + 1;
  const freshBoundaryAccepted = poseUsable(trackingNow);
  poseTimestamp = trackingNow - POSE_FRESH_MS - 1;
  const staleBoundaryRejected = !poseUsable(trackingNow);
  running = true;gameState.advancing = true;
  const feedbackClockPaused = !shouldAdvanceGameClock(true);
  gameState.advancing = false;
  const activeClockRuns = shouldAdvanceGameClock(true);
  running = false;
  results.tracking = {
    pass: !outOfFrameTouchUsable && outOfFrameHandCount === 0 && freshBoundaryAccepted
      && staleBoundaryRejected && feedbackClockPaused && activeClockRuns,
    outOfFrameTouchUsable, outOfFrameHandCount, freshBoundaryAccepted,
    staleBoundaryRejected, feedbackClockPaused, activeClockRuns
  };
  selectedGame = "squat";resetScore();gameState=createGameState("squat");
  const noHeadroom = syntheticPose("stand");
  POSE_JOINTS.forEach((index) => noHeadroom[index].y -= .07);
  lastPose = noHeadroom;lastWorldPose = noHeadroom;poseTimestamp = performance.now();
  const headroomRejected = !analyzeFit().good;
  const offFrameHands = syntheticPose("handsUp");
  offFrameHands[LM.lw].y = offFrameHands[LM.rw].y = -.01;
  lastPose = offFrameHands;lastWorldPose = offFrameHands;poseTimestamp = performance.now();
  const offFramePoints = posePoints();
  const offFrameMetric = actionMetrics(offFramePoints);
  const offFramePoseUsable = poseUsable(poseTimestamp);
  const offFrameHandsMatch = staticActionMatches(gameState.currentAction, offFramePoints, offFrameMetric, gameState);
  activateActionCommand(gameState, ACTION_COMMANDS.findIndex((action) => action.id === "touchHead"));
  const overheadV = syntheticPose("jackOpen");
  lastPose = overheadV;lastWorldPose = overheadV;poseTimestamp = performance.now();
  const overheadVPoints = posePoints();
  const overheadVTouchHeadMatch = staticActionMatches(gameState.currentAction, overheadVPoints, actionMetrics(overheadVPoints), gameState);
  const actionMatch = (actionId, preset) => {
    activateActionCommand(gameState, ACTION_COMMANDS.findIndex((action) => action.id === actionId));
    lastPose = syntheticPose(preset);lastWorldPose = syntheticPose(preset);poseTimestamp = performance.now();
    const points = posePoints();
    return staticActionMatches(gameState.currentAction, points, actionMetrics(points), gameState);
  };
  const actionCrossMatches = {
    standAsShoulders: actionMatch("touchShoulders", "stand"),
    clapAsShoulders: actionMatch("touchShoulders", "clap"),
    standAsHips: actionMatch("handsOnHips", "stand"),
    squatAsKnees: actionMatch("touchKnees", "squat"),
    oneLegAsLean: actionMatch("leanSide", "oneLeg")
  };
  results.actionNegatives = {
    pass: headroomRejected && !offFramePoseUsable && !offFrameHandsMatch && !overheadVTouchHeadMatch
      && Object.values(actionCrossMatches).every((value) => !value),
    headroomRejected, offFramePoseUsable, offFrameHandsMatch, overheadVTouchHeadMatch, actionCrossMatches
  };
  selectedGame = "squat";resetScore();gameState=createGameState("squat");const actionOrder=[];
  while (!gameState.sessionComplete && actionOrder.length <= ACTION_COMMANDS.length) {
    const actionId = gameState.currentAction.id;
    actionOrder.push(actionId);
    if (actionId === "oneLeg") { feedSyntheticPose("stand", 12); feedSyntheticPose("oneLeg", 16); }
    else if (actionId === "squat") { feedSyntheticPose("stand", 16); feedSyntheticPose("squat", 12); feedSyntheticPose("stand", 12); }
    else feedSyntheticPose(actionId, 16);
  }
  results.squat = { pass: gameState.completed === ACTION_COMMANDS.length && gameState.sessionComplete && completedRun && new Set(actionOrder).size === ACTION_COMMANDS.length, completed:gameState.completed, order:actionOrder, feedback:feedbacks.at(-1)?.label };

  selectedGame = "jack";
  const flightFrameNegatives = {};
  demo = false;
  for (const [name, leftShoulderX, rightShoulderX] of [["tooNear", .30, .70], ["tooFar", .46, .54]]) {
    resetScore();gameState=createGameState("jack");
    const pose = syntheticPose("flightUp");
    pose[LM.ls].x = leftShoulderX;
    pose[LM.rs].x = rightShoulderX;
    lastPose = pose;lastWorldPose = pose;poseTimestamp = performance.now();
    const points = posePoints();
    const beforeY = gameState.flightY;
    const beforeGateX = gameState.gateX;
    const landmarkUsable = flightLandmarksUsable();
    const frameUsable = flightFrameUsable(points);
    const featureValid = flightFeatures(points).valid;
    const usable = poseUsable(poseTimestamp);
    gameState.inputValid = true;
    updateFlightPhysics(50, poseTimestamp);
    flightFrameNegatives[name] = {
      landmarkUsable, frameUsable, featureValid, poseUsable: usable,
      inputValid: gameState.inputValid,
      frozen: gameState.flightY === beforeY && gameState.gateX === beforeGateX
    };
  }
  resetScore();gameState=createGameState("jack");
  lastPose = syntheticPose("flightUp");lastWorldPose = lastPose;
  const stalledNow = performance.now();
  poseTimestamp = stalledNow - FLIGHT_POSE_FRESH_MS - 20;
  gameState.inputValid = true;
  gameState.trackingReadyMs = 1000;
  gameState.previewMs = 0;
  gameState.gateX = flightFlyerRatio() + .005;
  gameState.previousGateX = gameState.gateX;
  const stalledBefore = { y: gameState.flightY, gateX: gameState.gateX, stars: gameState.stars };
  updateFlightPhysics(50, stalledNow);
  const stalledPoseFrozen = gameState.flightY === stalledBefore.y && gameState.gateX === stalledBefore.gateX
    && gameState.stars === stalledBefore.stars && !gameState.inputValid;
  demo = true;
  const rejectedFlightPoses = {};
  for (const preset of ["flightMid", "flightSingle", "flightTogether", "flightOffFrame"]) {
    resetScore();gameState=createGameState("jack");feedSyntheticPose(preset,20);
    rejectedFlightPoses[preset] = gameState.flaps;
  }
  resetScore();gameState=createGameState("jack");
  feedSyntheticPose("flightUp", 1, 125);
  feedSyntheticPose("stand", 1, 125);
  const lowHzFirstFlap = gameState.flaps;
  feedSyntheticPose("stand", 8, 125);
  const lowHzHeldDown = gameState.flaps;
  feedSyntheticPose("flightUp", 1, 125);
  feedSyntheticPose("stand", 1, 125);
  const lowHzSecondFlap = gameState.flaps;
  resetScore();gameState=createGameState("jack");
  feedSyntheticPose("flightUp", 1, 125);
  feedSyntheticPose("stand", 1, 250);
  const oneDroppedFrameFlap = gameState.flaps;
  const oneDropGapAccepted = 250 <= POSE_FRESH_MS;
  const twoDropGapRejected = 375 > POSE_FRESH_MS;
  resetScore();gameState=createGameState("jack");
  feedSyntheticPose("stand",12);
  feedSyntheticPose("flightUp",12);
  const flapsWhileHeldUp = gameState.flaps;
  feedSyntheticPose("stand",10);
  const flapsAfterFirstStroke = gameState.flaps;
  const starsAfterFirstStroke = gameState.stars;
  const beforeRiseY = gameState.flightY;
  for (let i = 0; i < 4; i++) updateFlightPhysics(50);
  const afterRiseY = gameState.flightY;
  feedSyntheticPose("stand",20);
  const flapsWhileHeldDown = gameState.flaps;
  feedSyntheticPose("flightMid",20);
  for (let i = 0; i < 20; i++) updateFlightPhysics(50);
  const afterIdleFallY = gameState.flightY;

  resetScore();gameState=createGameState("jack");
  const centerPrompt = gameState.prompt.word;
  const centerDeckSize = wordDeck.length;
  gameState.flightY = .50;
  gameState.previewMs = 0;
  gameState.gateX = flightFlyerRatio() + .005;
  gameState.previousGateX = gameState.gateX;
  const missesBeforeCenter = misses;
  updateFlightGate(100, true);
  const centerRetry = gameState.gatePhase === "retry" && gameState.stars === 0
    && misses === missesBeforeCenter && gameState.prompt.word === centerPrompt && wordDeck.length === centerDeckSize;

  resetScore();gameState=createGameState("jack");
  const wrongPrompt = gameState.prompt.word;
  const wrongDeckSize = wordDeck.length;
  const wrongLane = gameState.answerLane === "high" ? "low" : "high";
  const missesBeforeWrong = misses;
  resolveFlightChoice(wrongLane);
  resolveFlightChoice(wrongLane);
  const wrongLocked = gameState.gatePhase === "retry" && gameState.stars === 0
    && misses === missesBeforeWrong + 1 && gameState.prompt.word === wrongPrompt && wordDeck.length === wrongDeckSize;
  updateFlightGate(700, true);
  const retryRearmed = gameState.gatePhase === "approach" && gameState.prompt.word === wrongPrompt
    && wordDeck.length === wrongDeckSize;
  resolveFlightChoice(wrongLane);
  const repeatedWrongNotCounted = misses === missesBeforeWrong + 1 && gameState.gatePhase === "retry";
  updateFlightGate(700, true);

  resetScore();gameState=createGameState("jack");
  gameState.flightY = flightLaneY(gameState.answerLane);
  gameState.laneCandidate = gameState.answerLane;
  gameState.laneHoldMs = 180;
  gameState.stableLane = gameState.answerLane;
  gameState.previewMs = 0;
  gameState.gateX = flightFlyerRatio() + .005;
  gameState.previousGateX = gameState.gateX;
  updateFlightGate(100, true);
  const gateCrossedOnce = gameState.stars === 1 && hits === 1 && gameState.round === 2;

  resetScore();gameState=createGameState("jack");
  const flightPrompts = [];
  const flightChoices = [];
  const flightAnswerLanes = [];
  while (!gameState.sessionComplete && flightPrompts.length < FLIGHT_WORD_GOAL) {
    flightPrompts.push(gameState.prompt.word);
    flightChoices.push(...gameState.choices.map((choice) => choice.word));
    flightAnswerLanes.push(gameState.answerLane);
    gameState.flightY = flightLaneY(gameState.answerLane);
    gameState.laneCandidate = gameState.answerLane;
    gameState.laneHoldMs = 180;
    gameState.stableLane = gameState.answerLane;
    gameState.previewMs = 0;
    gameState.gateX = flightFlyerRatio() + .005;
    gameState.previousGateX = gameState.gateX;
    updateFlightGate(100, true);
  }
  results.flight = {
    pass: Object.values(flightFrameNegatives).every((item) => item.landmarkUsable
        && !item.frameUsable && !item.featureValid && !item.poseUsable && !item.inputValid && item.frozen)
      && Object.values(rejectedFlightPoses).every((count) => count === 0)
      && lowHzFirstFlap === 1 && lowHzHeldDown === 1 && lowHzSecondFlap === 2
      && oneDroppedFrameFlap === 1 && oneDropGapAccepted && twoDropGapRejected
      && flapsWhileHeldUp === 0 && flapsAfterFirstStroke === 1 && flapsWhileHeldDown === 1
      && starsAfterFirstStroke === 0
      && afterRiseY < beforeRiseY && afterIdleFallY > afterRiseY
      && stalledPoseFrozen && centerRetry && wrongLocked && retryRearmed && repeatedWrongNotCounted && gateCrossedOnce
      && flightPrompts.length === FLIGHT_WORD_GOAL && new Set(flightPrompts).size === FLIGHT_WORD_GOAL
      && flightChoices.length === FLIGHT_WORD_GOAL * 2 && new Set(flightChoices).size === FLIGHT_WORD_GOAL * 2
      && wordDeck.length === 0 && gameState.stars === FLIGHT_WORD_GOAL && hits === FLIGHT_WORD_GOAL
      && gameState.sessionComplete && completedRun,
    flightFrameNegatives, rejectedFlightPoses, lowHzFirstFlap, lowHzHeldDown, lowHzSecondFlap,
    oneDroppedFrameFlap, oneDropGapAccepted, twoDropGapRejected, flapsWhileHeldUp, flapsAfterFirstStroke,
    flapsWhileHeldDown, starsAfterFirstStroke, beforeRiseY, afterRiseY, afterIdleFallY,
    stalledPoseFrozen, centerRetry, wrongLocked, retryRearmed, repeatedWrongNotCounted, gateCrossedOnce, flightPrompts, flightChoices,
    flightAnswerLanes, stars:gameState.stars, phase:gameState.phase, feedback:feedbacks.at(-1)?.label
  };
  running = false;demo = false;selectedGame = "math";gameState = null;resetScore();selfTesting = false;
  results.pass = Object.values(results).every((item) => item?.pass !== false);
  window.__MOTION_SELFTEST__ = results;
  document.documentElement.dataset.selftest = JSON.stringify(results);
}

if (new URLSearchParams(location.search).has("selftest")) {
  window.__MOTION_LIFECYCLE_TEST__ = {
    openCamera,
    stopCamera,
    waitForPoseCandidate,
    setCameraAttempt(value) { cameraAttemptId = value; },
    setPoseLoadGeneration(value) { poseLoadGeneration = value; },
    cameraState() {
      return { attemptId: cameraAttemptId, stream, ready: cameraStreamReady, srcObject: video.srcObject };
    }
  };
  runEngineSelfTest();
}

setTracking("카메라 대기");
drawBackground();
