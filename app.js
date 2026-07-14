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
  score: $("#score"), combo: $("#combo"), time: $("#time"), finalScore: $("#finalScore"),
  accuracy: $("#accuracy"), maxCombo: $("#maxCombo"), grade: $("#grade")
};

const bg = new Image();
bg.src = "assets/neon-arena.webp";

const CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35";
const MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const LM = { nose: 0, ls: 11, rs: 12, le: 13, re: 14, lw: 15, rw: 16, lh: 23, rh: 24, lk: 25, rk: 26, la: 27, ra: 28 };
const SKELETON = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
const POSE_JOINTS = [LM.nose, LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw, LM.lh, LM.rh, LM.lk, LM.rk, LM.la, LM.ra];
const ARM_JOINTS = new Set([LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw]);
const LEG_JOINTS = new Set([LM.lh, LM.rh, LM.lk, LM.rk, LM.la, LM.ra]);
const MAJOR_JOINTS = new Set([LM.ls, LM.rs, LM.lh, LM.rh, LM.lk, LM.rk, LM.la, LM.ra]);
const SLOT_POSITIONS = [[.18,.30],[.50,.25],[.82,.30],[.20,.53],[.80,.53],[.24,.76],[.50,.72],[.76,.76]];
const LANDSCAPE_SLOT_POSITIONS = [[.12,.52],[.37,.52],[.63,.52],[.88,.52],[.20,.78],[.50,.78],[.80,.78]];
const LANDSCAPE_MATH_POSITIONS = [[.15,.54],[.50,.54],[.85,.54],[.30,.78],[.70,.78]];

const games = {
  sequence: { name: "ORDER TOUCH", ms: 60000, image: "assets/game-sequence.webp", fullBody: false, description: "1번부터 차례대로 찾아 손으로 터치하세요." },
  math: { name: "MATH HIT", ms: 60000, image: "assets/game-math.webp", fullBody: false, description: "덧셈을 계산하고 정답 숫자를 손으로 터치하세요." },
  squat: { name: "SQUAT COUNT", ms: 45000, image: "assets/game-squat.webp", fullBody: true, description: "무릎 각도와 엉덩이 깊이를 확인해 정확한 스쿼트만 셉니다." },
  jack: { name: "JUMPING JACK", ms: 45000, image: "assets/game-jack.webp", fullBody: true, description: "팔과 다리를 함께 벌렸다 모아야 1회로 인정됩니다." }
};

let selectedGame = "sequence";
let stream = null;
let poseLandmarker = null;
let poseLoading = null;
let lastPose = null;
let lastWorldPose = null;
let poseVersion = 0;
let evaluatedPoseVersion = -1;
let poseTimestamp = 0;
let lastInferenceAt = 0;
let lastVideoTime = -1;
let inferenceErrors = 0;
let demo = false;
let running = false;
let calibrating = false;
let countdownActive = false;
let renderLoopActive = false;
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
let countdownAttemptId = 0;
let forceCpuPose = false;

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
  const stageTop = viewW < 700 ? 82 : 76;
  const stageBottom = viewW < 700 ? 18 : 24;
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
  setTimeout(() => {
    resize();
    if (stream && !demo && (running || countdownActive)) {
      beginCalibration();
      startRenderLoop();
      showToast("화면 방향이 바뀌어 몸 위치를 다시 확인합니다");
    }
  }, 180);
});
video.addEventListener("resize", resize);
resize();

function setTracking(text, state = "") {
  ui.tracking.className = `tracking-status ${state}`.trim();
  ui.tracking.querySelector("span").textContent = text;
}

function setCue(title, detail = "") {
  ui.cue.querySelector("strong").textContent = title;
  ui.cue.querySelector("span").textContent = detail;
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

async function loadPose() {
  if (poseLandmarker) return poseLandmarker;
  if (poseLoading) return poseLoading;
  poseLoading = (async () => {
    const { FilesetResolver, PoseLandmarker } = await import(`${CDN}/+esm`);
    const vision = await FilesetResolver.forVisionTasks(`${CDN}/wasm`);
    const common = {
      baseOptions: { modelAssetPath: MODEL, delegate: forceCpuPose ? "CPU" : "GPU" }, runningMode: "VIDEO", numPoses: 1,
      minPoseDetectionConfidence: .52, minPosePresenceConfidence: .52, minTrackingConfidence: .5
    };
    try {
      poseLandmarker = await PoseLandmarker.createFromOptions(vision, common);
    } catch {
      forceCpuPose = true;
      common.baseOptions.delegate = "CPU";
      poseLandmarker = await PoseLandmarker.createFromOptions(vision, common);
    }
    return poseLandmarker;
  })();
  try { return await poseLoading; }
  finally { poseLoading = null; }
}

async function openCamera(attemptId) {
  const portrait = matchMedia("(orientation: portrait)").matches;
  const preferred = {
    facingMode: { ideal: "user" }, width: { ideal: portrait ? 960 : 1280 }, height: { ideal: portrait ? 1280 : 960 },
    aspectRatio: { ideal: portrait ? .75 : 1.333 }, frameRate: { ideal: 24, max: 30 }, resizeMode: { ideal: "none" }
  };
  let nextStream;
  try {
    nextStream = await navigator.mediaDevices.getUserMedia({ video: preferred, audio: false });
  } catch (error) {
    if (error.name === "OverconstrainedError") nextStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    else throw error;
  }
  if (attemptId !== cameraAttemptId) {
    nextStream.getTracks().forEach((track) => track.stop());
    return false;
  }
  stream = nextStream;
  video.srcObject = stream;
  await video.play();
  const track = stream.getVideoTracks()[0];
  track.onended = () => {
    if (stream !== nextStream) return;
    stream = null;
    video.srcObject = null;
    running = calibrating = countdownActive = false;
    countdownAttemptId += 1;
    hide(ui.calibrate, ui.cue, ui.countdown);
    show(ui.loading);
    showCameraError({ name: "NotReadableError" });
  };
  try {
    const capabilities = track.getCapabilities?.();
    if (capabilities?.zoom && Number.isFinite(capabilities.zoom.min)) await track.applyConstraints({ advanced: [{ zoom: capabilities.zoom.min }] });
  } catch {}
  resize();
  return true;
}

function stopCamera() {
  stream?.getTracks().forEach((track) => {
    track.onended = null;
    track.stop();
  });
  stream = null;
  video.srcObject = null;
  lastPose = null;
  lastWorldPose = null;
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
  hide(ui.intro, ui.result, ui.loadingActions);
  show(ui.loading);
  ui.loading.querySelector(".loader").classList.remove("hidden");
  ui.loadingTitle.textContent = "카메라 연결 중";
  ui.loadingText.textContent = "전체 화면을 유지하는 광각 모드로 준비하고 있습니다.";
  const permissionHint = setTimeout(() => {
    if (attemptId !== cameraAttemptId) return;
    ui.loadingText.textContent = "브라우저의 카메라 허용 창을 확인해 주세요. 계속 막히면 체험 모드로 먼저 확인할 수 있어요.";
    show(ui.loadingActions);
  }, 7000);
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("camera unavailable"), { name: "NotFoundError" });
    const hasLiveCamera = stream?.getVideoTracks().some((track) => track.readyState === "live");
    if (!hasLiveCamera) {
      stopCamera();
      if (!(await openCamera(attemptId))) return;
    }
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
  ui.calibrateTitle.textContent = games[selectedGame].fullBody ? "발목까지 보이게 뒤로 서세요" : "상체와 양손이 보이게 서세요";
  ui.calibrateDetail.textContent = games[selectedGame].fullBody ? "머리부터 발목까지 화면 안에 들어와야 시작됩니다." : "머리·어깨·양손·허리가 화면 안에 들어와야 시작됩니다.";
  show(ui.calibrate);
  setTracking("몸 위치 확인 중", "warn");
}

function requiredIndices(game = selectedGame, calibration = false) {
  if (game === "squat") return [LM.nose, LM.ls, LM.rs, LM.lh, LM.rh, LM.lk, LM.rk, LM.la, LM.ra];
  if (game === "jack") return [LM.nose, LM.ls, LM.rs, LM.lw, LM.rw, LM.lh, LM.rh, LM.la, LM.ra];
  const core = [LM.nose, LM.ls, LM.rs, LM.lh, LM.rh];
  return calibration ? [...core, LM.lw, LM.rw] : core;
}

function landmarkVisible(landmark, minimum = .48) {
  return !!landmark && (landmark.visibility ?? 1) >= minimum && (landmark.presence ?? 1) >= minimum;
}

function analyzeFit() {
  if (!lastPose || performance.now() - poseTimestamp > 550) return { good: false, title: "몸을 찾고 있어요", text: "카메라 정면에 서 주세요." };
  const needed = requiredIndices(selectedGame, true);
  if (!needed.every((index) => landmarkVisible(lastPose[index]))) {
    return { good: false, title: games[selectedGame].fullBody ? "발목까지 보여주세요" : "양손을 화면 안에 보여주세요", text: "카메라에서 1~2걸음 뒤로 이동하세요." };
  }
  const points = needed.map((index) => lastPose[index]);
  const minX = Math.min(...points.map((p) => p.x)), maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y)), maxY = Math.max(...points.map((p) => p.y));
  const bodyHeight = maxY - minY;
  const centerX = (minX + maxX) / 2;
  const edge = selectedGame === "jack" ? .06 : games[selectedGame].fullBody ? .04 : .03;
  const maxHeight = selectedGame === "jack" ? .72 : selectedGame === "squat" ? .86 : .78;
  const tooClose = bodyHeight > maxHeight || minX < edge || maxX > 1 - edge || minY < edge * .65 || maxY > 1 - edge * .4;
  const tooFar = bodyHeight < (games[selectedGame].fullBody ? .42 : .27);
  if (tooClose) return { good: false, title: "카메라가 너무 가까워요", text: "전신이 잘리지 않게 1~2걸음 뒤로 이동하세요." };
  if (tooFar) return { good: false, title: "몸이 너무 작게 보여요", text: "한 걸음만 앞으로 이동하세요." };
  if (centerX < .31) return { good: false, title: "화면 오른쪽으로 이동", text: "몸을 안내선 가운데에 맞춰 주세요." };
  if (centerX > .69) return { good: false, title: "화면 왼쪽으로 이동", text: "몸을 안내선 가운데에 맞춰 주세요." };
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
  const progress = clamp((now - calibrationGoodSince) / 1200, 0, 1);
  ui.signal.style.width = `${progress * 100}%`;
  setTracking(`전신 인식 ${Math.round(progress * 100)}%`, "good");
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
  stopCamera();
  demo = true;
  calibrating = false;
  hide(ui.intro, ui.loading, ui.result, ui.calibrate, ui.loadingActions);
  show(ui.demoHelp);
  setTracking("체험 모드", "good");
  startRenderLoop();
  startCountdown();
}

function resetScore() {
  score = combo = maxCombo = hits = misses = 0;
  gameElapsed = 0;
  inputLockedUntil = 0;
  particles = [];
  ripples = [];
  feedbacks = [];
  wristTrails = { [LM.lw]: [], [LM.rw]: [] };
}

function beginGame() {
  resetScore();
  running = true;
  gameState = createGameState(selectedGame);
  ui.motionArt.src = games[selectedGame].image;
  show(ui.cue, ui.motionArt);
  updateHUD();
  updateGameCue();
  navigator.wakeLock?.request("screen").then((lock) => wakeLock = lock).catch(() => {});
}

function createGameState(game) {
  if (game === "sequence") return createSequenceRound(1);
  if (game === "math") return createMathProblem();
  if (game === "squat") return { phase: "needStand", reps: 0, stableMs: 0, baselineHipY: null, torso: 1, kneeAngle: 180, depth: 0 };
  return { phase: "needClosed", reps: 0, stableMs: 0, armsOpen: false, legsOpen: false };
}

function createSequenceRound(round) {
  const count = Math.min(7, 4 + Math.floor((round - 1) / 2));
  const availableSlots = viewH < 420 && viewW > viewH ? LANDSCAPE_SLOT_POSITIONS : SLOT_POSITIONS;
  const slots = shuffle(availableSlots).slice(0, count);
  return {
    mode: "sequence", round, current: 1, inputReady: false, clearMs: 0,
    targets: slots.map(([x, y], index) => ({ value: index + 1, x, y, dwell: 0, flashUntil: 0 }))
  };
}

function createMathProblem() {
  const level = hits < 4 ? 9 : hits < 10 ? 19 : 39;
  const a = 1 + Math.floor(Math.random() * level);
  const b = 1 + Math.floor(Math.random() * level);
  const answer = a + b;
  const values = new Set([answer]);
  const offsets = shuffle([-10,-5,-3,-2,-1,1,2,3,5,10]);
  for (const offset of offsets) {
    const value = answer + offset;
    if (value >= 0 && value <= 99) values.add(value);
    if (values.size === 3) break;
  }
  while (values.size < 3) values.add((answer + values.size + 1) % 100);
  const mathPositions = viewH < 420 && viewW > viewH
    ? LANDSCAPE_MATH_POSITIONS
    : [[.20,.38],[.80,.38],[.50,.70],[.22,.72],[.78,.72]];
  const slots = shuffle(mathPositions).slice(0, 3);
  return {
    mode: "math", a, b, answer, inputReady: false, clearMs: 0, startedAt: gameElapsed,
    targets: shuffle([...values]).map((value, index) => ({ value, x: slots[index][0], y: slots[index][1], dwell: 0, flashUntil: 0 }))
  };
}

function targetPoint(target) {
  return { x: playRect.x + target.x * playRect.w, y: playRect.y + target.y * playRect.h };
}

function targetRadius() {
  const points = posePoints();
  const shoulder = points ? distance(points.ls, points.rs) : playRect.w * .2;
  if (viewH < 420 && viewW > viewH) return clamp(shoulder * .34, 28, 34);
  const minimum = viewW < 700 ? clamp(playRect.w * .105, 26, 38) : 44;
  const maximum = viewW < 700 ? clamp(playRect.w * .16, 34, 58) : Math.min(76, playRect.w * .16);
  return clamp(shoulder * .38, minimum, Math.max(minimum, maximum));
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
  return [points.lw, points.rw].filter((point) => point && point.v >= .38);
}

function handsOutsideAll(targets, hands, radius) {
  return targets.every((target) => {
    const point = targetPoint(target);
    return hands.every((hand) => distance(hand, point) > radius * 1.3);
  });
}

function updateTouchReadiness(state, hands, radius, dt) {
  if (state.inputReady) return true;
  if (handsOutsideAll(state.targets, hands, radius)) state.clearMs += dt;
  else state.clearMs = 0;
  if (state.clearMs >= 100) state.inputReady = true;
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

function penalty(label = "다시!", x = null, y = null) {
  misses++;
  combo = 0;
  score = Math.max(0, score - 30);
  if (Number.isFinite(x) && Number.isFinite(y)) enqueueFeedback("bad", x, y, label, -30);
  else showToast(label, true);
  tone(115, .14, "sawtooth", .025);
}

function showToast(text, bad = false) {
  ui.toast.textContent = text;
  ui.toast.style.color = bad ? "#ff6b7f" : "#c8ff3d";
  ui.toast.classList.remove("show");
  void ui.toast.offsetWidth;
  ui.toast.classList.add("show");
}

function completeSequenceTarget(target) {
  const point = targetPoint(target);
  award(100, point.x, point.y, `${target.value}번 정답`, `ORDER ${target.value} ✓`);
  gameState.current++;
  inputLockedUntil = performance.now() + (viewH < 420 && viewW > viewH ? 300 : 280);
  gameState.inputReady = false;
  gameState.clearMs = 0;
  gameState.targets.forEach((item) => item.dwell = 0);
  if (gameState.current > gameState.targets.length) {
    score += 200 + gameState.targets.length * 30;
    const nextRound = gameState.round + 1;
    showToast(`ROUND ${gameState.round} CLEAR!`);
    gameState = createSequenceRound(nextRound);
  }
  updateGameCue();
}

function completeMathTarget(target) {
  const point = targetPoint(target);
  if (target.value !== gameState.answer) {
    target.flashUntil = performance.now() + 500;
    penalty("오답! 다시 계산", point.x, point.y);
    inputLockedUntil = performance.now() + 250;
    gameState.inputReady = false;
    gameState.clearMs = 0;
    return;
  }
  const responseBonus = Math.max(0, 100 - Math.floor((gameElapsed - gameState.startedAt) / 40));
  award(140 + responseBonus, point.x, point.y, `${target.value} 정답`, `${gameState.a} + ${gameState.b} = ${gameState.answer} ✓`);
  inputLockedUntil = performance.now() + (viewH < 420 && viewW > viewH ? 300 : 340);
  gameState = createMathProblem();
  updateGameCue();
}

function updateTouchGame(dt) {
  const points = posePoints();
  const hands = handPositions(points);
  if (!hands.length || performance.now() < inputLockedUntil) return;
  const radius = targetRadius();
  if (!updateTouchReadiness(gameState, hands, radius, dt)) return;
  for (const target of gameState.targets) {
    const point = targetPoint(target);
    const inside = hands.some((hand) => distance(hand, point) <= radius);
    target.dwell = inside ? target.dwell + dt : Math.max(0, target.dwell - dt * 1.5);
    if (target.dwell < 75) continue;
    if (selectedGame === "sequence") {
      if (target.value === gameState.current) completeSequenceTarget(target);
      else {
        target.flashUntil = performance.now() + 450;
        penalty(`${gameState.current}번부터!`, point.x, point.y);
        inputLockedUntil = performance.now() + 220;
        gameState.inputReady = false;
        gameState.clearMs = 0;
      }
    } else completeMathTarget(target);
    break;
  }
}

function squatFeatures(points) {
  const left = lastWorldPose ? angle3D(lastWorldPose[LM.lh], lastWorldPose[LM.lk], lastWorldPose[LM.la]) : angle(points.lh, points.lk, points.la);
  const right = lastWorldPose ? angle3D(lastWorldPose[LM.rh], lastWorldPose[LM.rk], lastWorldPose[LM.ra]) : angle(points.rh, points.rk, points.ra);
  const kneeAngle = (left + right) / 2;
  const hipY = (points.lh.y + points.rh.y) / 2;
  const shoulderY = (points.ls.y + points.rs.y) / 2;
  const torso = Math.max(40, hipY - shoulderY);
  return { kneeAngle, hipY, torso };
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

function completeSquatRep() {
  gameState.reps++;
  const point = exerciseFeedbackPoint(.63);
  const angleLabel = `${Math.round((gameState.kneeAngle || 0) / 5) * 5}°`;
  award(140, point.x, point.y, `${gameState.reps}회 스쿼트`, `무릎 ${angleLabel} · PERFECT`);
  gameState.phase = "ready";
  gameState.stableMs = 0;
}

function updateSquat(dt) {
  const points = posePoints();
  if (!points) return;
  const feature = squatFeatures(points);
  if (gameState.baselineHipY == null && feature.kneeAngle > 155) gameState.baselineHipY = feature.hipY;
  if (feature.kneeAngle > 160 && gameState.phase !== "down") gameState.baselineHipY = lerp(gameState.baselineHipY ?? feature.hipY, feature.hipY, .04);
  const drop = (feature.hipY - (gameState.baselineHipY ?? feature.hipY)) / feature.torso;
  const standing = feature.kneeAngle > 158 && drop < .12;
  const bottom = feature.kneeAngle < 135 && drop > .12;
  gameState.kneeAngle = feature.kneeAngle;
  gameState.depth = clamp((165 - feature.kneeAngle) / 55, 0, 1);

  if (gameState.phase === "needStand") {
    gameState.stableMs = standing ? gameState.stableMs + dt : 0;
    if (gameState.stableMs >= 220) { gameState.phase = "ready"; gameState.stableMs = 0; }
  } else if (gameState.phase === "ready") {
    gameState.stableMs = bottom ? gameState.stableMs + dt : 0;
    if (gameState.stableMs >= 160) { gameState.phase = "down"; gameState.stableMs = 0; showToast("좋아요! 이제 일어서기"); }
  } else if (gameState.phase === "down") {
    gameState.stableMs = standing ? gameState.stableMs + dt : 0;
    if (gameState.stableMs >= 180) completeSquatRep();
  }
  updateGameCue();
}

function jackFeatures(points) {
  const shoulderWidth = Math.max(35, distance(points.ls, points.rs));
  const shoulderY = (points.ls.y + points.rs.y) / 2;
  const ankleGap = Math.abs(points.la.x - points.ra.x);
  const leftArmAngle = angle(points.lh, points.ls, points.lw);
  const rightArmAngle = angle(points.rh, points.rs, points.rw);
  const armsOpen = leftArmAngle > 130 && rightArmAngle > 130 && points.lw.y < shoulderY && points.rw.y < shoulderY;
  const legsOpen = ankleGap > shoulderWidth * 1.38;
  const armsClosed = leftArmAngle < 48 && rightArmAngle < 48 && points.lw.y > shoulderY && points.rw.y > shoulderY;
  const legsClosed = ankleGap < shoulderWidth * 1.12;
  return { armsOpen, legsOpen, armsClosed, legsClosed };
}

function completeJackRep() {
  gameState.reps++;
  const point = exerciseFeedbackPoint(.44);
  award(160, point.x, point.y, `${gameState.reps}회 성공`, "팔·다리 COMPLETE ✓");
  gameState.phase = "ready";
  gameState.stableMs = 0;
}

function updateJack(dt) {
  const points = posePoints();
  if (!points) return;
  const feature = jackFeatures(points);
  gameState.armsOpen = feature.armsOpen;
  gameState.legsOpen = feature.legsOpen;
  const open = feature.armsOpen && feature.legsOpen;
  const closed = feature.armsClosed && feature.legsClosed;
  if (gameState.phase === "needClosed") {
    gameState.stableMs = closed ? gameState.stableMs + dt : 0;
    if (gameState.stableMs >= 220) { gameState.phase = "ready"; gameState.stableMs = 0; }
  } else if (gameState.phase === "ready") {
    gameState.stableMs = open ? gameState.stableMs + dt : 0;
    if (gameState.stableMs >= 150) { gameState.phase = "open"; gameState.stableMs = 0; showToast("활짝! 이제 모으기"); }
  } else if (gameState.phase === "open") {
    gameState.stableMs = closed ? gameState.stableMs + dt : 0;
    if (gameState.stableMs >= 180) completeJackRep();
  }
  updateGameCue();
}

function updateGame(dt) {
  if (selectedGame === "sequence" || selectedGame === "math") updateTouchGame(dt);
  else if (selectedGame === "squat") updateSquat(dt);
  else updateJack(dt);
}

function updateGameCue() {
  if (!gameState) return;
  if (selectedGame === "sequence") setCue(`${gameState.current}번을 터치`, `ROUND ${gameState.round} · ${gameState.current}/${gameState.targets.length}`);
  else if (selectedGame === "math") setCue(`${gameState.a} + ${gameState.b} = ?`, "정답 숫자를 손으로 터치");
  else if (selectedGame === "squat") setCue(gameState.phase === "down" ? "일어서세요!" : gameState.phase === "needStand" ? "먼저 바르게 서기" : "천천히 앉으세요", `${gameState.reps}회 완료`);
  else setCue(gameState.phase === "open" ? "팔·다리 모으기!" : gameState.phase === "needClosed" ? "차렷 자세로 준비" : "팔·다리 함께 벌리기!", `${gameState.reps}회 완료`);
}

function poseUsable(now = performance.now()) {
  if (!lastPose || now - poseTimestamp > 550) return false;
  if (!requiredIndices(selectedGame).every((index) => landmarkVisible(lastPose[index], .38))) return false;
  if (selectedGame === "sequence" || selectedGame === "math") {
    return [LM.lw, LM.rw].some((index) => landmarkVisible(lastPose[index], .38));
  }
  return true;
}

function updateHUD() {
  ui.score.textContent = String(score).padStart(5, "0");
  ui.combo.textContent = `×${combo}`;
  ui.time.textContent = Math.max(0, Math.ceil((games[selectedGame].ms - gameElapsed) / 1000));
}

function smoothPose(raw, now) {
  if (!lastPose || now - poseTimestamp > 350) return raw.map((point) => ({ ...point }));
  const dt = clamp(now - poseTimestamp, 16, 100);
  return raw.map((point, index) => {
    const previous = lastPose[index];
    if (!previous || !landmarkVisible(point, .25)) return { ...point };
    const tau = index === LM.lw || index === LM.rw ? 48 : 82;
    const alpha = 1 - Math.exp(-dt / tau);
    return { ...point, x: lerp(previous.x, point.x, alpha), y: lerp(previous.y, point.y, alpha), z: lerp(previous.z || 0, point.z || 0, alpha) };
  });
}

function detectPose(now) {
  if (!poseLandmarker || video.readyState < 2 || video.currentTime === lastVideoTime || now - lastInferenceAt < 28) return;
  lastInferenceAt = now;
  lastVideoTime = video.currentTime;
  try {
    const result = poseLandmarker.detectForVideo(video, now);
    const raw = result.landmarks?.[0];
    if (raw) {
      lastPose = smoothPose(raw, now);
      lastWorldPose = result.worldLandmarks?.[0] || null;
      poseTimestamp = now;
      poseVersion++;
      inferenceErrors = 0;
    } else if (now - poseTimestamp > 500) { lastPose = null; lastWorldPose = null; }
  } catch {
    inferenceErrors++;
    if (inferenceErrors === 4) {
      forceCpuPose = true;
      try { poseLandmarker?.close?.(); } catch {}
      poseLandmarker = null;
      poseLoading = null;
      running = calibrating = countdownActive = false;
      countdownAttemptId += 1;
      stopCamera();
      hide(ui.calibrate, ui.cue, ui.countdown);
      show(ui.loading);
      showCameraError({ name: "PoseRuntimeError" });
    }
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, viewW, viewH);
  if (bg.complete && bg.naturalWidth) {
    const scale = Math.max(viewW / bg.naturalWidth, viewH / bg.naturalHeight);
    const w = bg.naturalWidth * scale, h = bg.naturalHeight * scale;
    ctx.drawImage(bg, (viewW - w) / 2, (viewH - h) / 2, w, h);
  } else {
    ctx.fillStyle = "#05030b";
    ctx.fillRect(0, 0, viewW, viewH);
  }
  if (video.readyState >= 2 && !demo) {
    ctx.save();
    ctx.globalAlpha = .78;
    ctx.translate(cameraRect.x + cameraRect.w, cameraRect.y);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, cameraRect.w, cameraRect.h);
    ctx.restore();
    ctx.fillStyle = "#05030a28";
    ctx.fillRect(cameraRect.x, cameraRect.y, cameraRect.w, cameraRect.h);
    ctx.strokeStyle = "#38f6ff66";
    ctx.lineWidth = 2;
    ctx.strokeRect(cameraRect.x, cameraRect.y, cameraRect.w, cameraRect.h);
    ctx.fillStyle = "#38f6ff";
    ctx.font = "700 10px IBM Plex Sans KR";
    ctx.textAlign = "left";
    ctx.fillText("FULL CAMERA · NO CROP", cameraRect.x + 10, cameraRect.y + 18);
  }
}

function poseIsFresh(now = performance.now()) {
  return !!lastPose && now - poseTimestamp <= 550;
}

function landmarkSignal(index) {
  const landmark = lastPose?.[index];
  return landmark ? clamp(Math.min(landmark.visibility ?? 1, landmark.presence ?? 1), 0, 1) : 0;
}

function focusJointSet() {
  if (selectedGame === "sequence" || selectedGame === "math") return new Set([LM.lw, LM.rw]);
  if (selectedGame === "squat") return new Set([LM.ls, LM.rs, LM.lh, LM.rh, LM.lk, LM.rk, LM.la, LM.ra]);
  return new Set([LM.ls, LM.rs, LM.le, LM.re, LM.lw, LM.rw, LM.lh, LM.rh, LM.lk, LM.rk, LM.la, LM.ra]);
}

function jointVisualColor(index, signal = landmarkSignal(index)) {
  if (signal < .35) return "#8c879b";
  if (signal < .58) return "#ffb15b";
  if (selectedGame === "sequence" || selectedGame === "math") {
    if (index === LM.lw) return "#38f6ff";
    if (index === LM.rw) return "#ff3ea5";
  }
  if (selectedGame === "squat" && (LEG_JOINTS.has(index) || index === LM.ls || index === LM.rs)) {
    if (gameState?.phase === "down" || (gameState?.depth ?? 0) >= .72) return "#c8ff3d";
    if ((gameState?.depth ?? 0) >= .42) return "#ffb15b";
    return "#38f6ff";
  }
  if (selectedGame === "jack") {
    const confirmedOpen = gameState?.phase === "open";
    if (ARM_JOINTS.has(index)) return confirmedOpen && gameState?.armsOpen ? "#c8ff3d" : "#ffb15b";
    if (LEG_JOINTS.has(index)) return confirmedOpen && gameState?.legsOpen ? "#c8ff3d" : "#8a5cff";
  }
  return "#dce7ef";
}

function drawCanvasPill(cx, cy, text, color = "#38f6ff", small = false) {
  ctx.save();
  ctx.font = `700 ${small ? 9 : viewW < 700 ? 11 : 12}px IBM Plex Sans KR`;
  const width = clamp(ctx.measureText(text).width + (small ? 14 : 20), 44, viewW < 700 ? 150 : 190);
  const height = small ? 20 : 26;
  const x = clamp(cx - width / 2, cameraRect.x + 7, cameraRect.x + cameraRect.w - width - 7);
  const y = clamp(cy - height / 2, cameraRect.y + 7, cameraRect.y + cameraRect.h - height - 7);
  const cut = 6;
  ctx.beginPath();
  ctx.moveTo(x + cut, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + height - cut);
  ctx.lineTo(x + width - cut, y + height); ctx.lineTo(x, y + height); ctx.lineTo(x, y + cut); ctx.closePath();
  ctx.fillStyle = "#05040bdd";
  ctx.strokeStyle = `${color}bb`;
  ctx.lineWidth = 1;
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = color;
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

  if (running && selectedGame === "squat" && Number.isFinite(gameState?.kneeAngle)) {
    const leftKnee = points.get(LM.lk), rightKnee = points.get(LM.rk);
    if (leftKnee?.v > .35 && rightKnee?.v > .35) {
      const label = `${Math.round(gameState.kneeAngle / 5) * 5}°`;
      drawCanvasPill((leftKnee.x + rightKnee.x) / 2, Math.min(leftKnee.y, rightKnee.y) - 22, label, jointVisualColor(LM.lk), true);
    }
  }
  if (running && selectedGame === "jack") {
    const wrists = [points.get(LM.lw), points.get(LM.rw)], ankles = [points.get(LM.la), points.get(LM.ra)];
    if (gameState?.phase === "open" && gameState?.armsOpen && wrists.every((point) => point?.v > .35)) {
      drawCanvasPill((wrists[0].x + wrists[1].x) / 2, Math.min(wrists[0].y, wrists[1].y) - 18, "팔 OPEN ✓", "#c8ff3d", true);
    }
    if (gameState?.phase === "open" && gameState?.legsOpen && ankles.every((point) => point?.v > .35)) {
      drawCanvasPill((ankles[0].x + ankles[1].x) / 2, Math.max(ankles[0].y, ankles[1].y) + 18, "다리 OPEN ✓", "#c8ff3d", true);
    }
  }
}

function drawHandCursors(now = performance.now()) {
  if (!running || demo || !poseIsFresh(now) || !poseUsable(now) || (selectedGame !== "sequence" && selectedGame !== "math")) return;
  const hitRadius = targetRadius();
  for (const [index, baseColor] of [[LM.lw, "#38f6ff"], [LM.rw, "#ff3ea5"]]) {
    const point = posePoint(index);
    if (!point || point.v < .38) continue;
    const trail = wristTrails[index];
    const last = trail[trail.length - 1];
    if (!last || distance(last, point) > 2 || now - last.t > 42) trail.push({ x: point.x, y: point.y, t: now });
    wristTrails[index] = trail.filter((sample) => now - sample.t < 330).slice(-10);
    const touching = !!gameState?.inputReady && gameState?.targets?.some((target) => {
      if (selectedGame === "sequence" && target.value !== gameState.current) return false;
      return distance(point, targetPoint(target)) <= hitRadius;
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
  const color = signal >= .65 ? "#c8ff3d" : signal >= .38 ? "#ffb15b" : "#ff6b7f";
  drawCanvasPill(cameraRect.x + cameraRect.w - 48, cameraRect.y + 17, `TRACK ${Math.round(signal * 100)}%`, color, true);
}

function drawTargetCircle(target, active = true) {
  const point = targetPoint(target);
  const radius = targetRadius();
  const now = performance.now();
  const wrong = now < target.flashUntil;
  const locked = gameState?.inputReady === false && !wrong;
  const progress = clamp((target.dwell || 0) / 75, 0, 1);
  const color = wrong ? "#ff4f70" : locked ? "#777283" : active ? (progress > .55 ? "#c8ff3d" : "#38f6ff") : "#5d5969";
  const shake = wrong ? Math.sin((target.flashUntil - now) / 24) * Math.min(6, (target.flashUntil - now) / 50) : 0;
  ctx.save();
  ctx.translate(point.x + shake, point.y);
  ctx.shadowBlur = active && !locked ? (viewW < 700 ? 14 : 20) : 0;
  ctx.shadowColor = color;
  ctx.fillStyle = `${color}22`;
  ctx.strokeStyle = color;
  ctx.lineWidth = active ? 4 : 2;
  if (locked) ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.setLineDash([]);
  if (active && !locked) {
    ctx.globalAlpha = .4 + .22 * Math.sin(now / 120);
    ctx.beginPath(); ctx.arc(0, 0, radius + 8, 0, Math.PI * 2); ctx.stroke();
  }
  if (active && progress > 0) {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#c8ff3d";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, radius + 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = wrong ? "#ff8c9d" : "#fff";
  ctx.font = `700 ${Math.round(radius * .72)}px IBM Plex Sans KR`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (wrong) {
    ctx.fillText("×", 0, 1);
    ctx.font = `700 ${Math.round(radius * .38)}px IBM Plex Sans KR`;
    ctx.fillText(target.value, 0, radius * .48);
  } else ctx.fillText(target.value, 0, 1);
  ctx.restore();
}

function drawTouchGame() {
  if (!gameState?.targets) return;
  for (const target of gameState.targets) {
    const active = selectedGame === "math" || target.value === gameState.current;
    const completed = selectedGame === "sequence" && target.value < gameState.current;
    if (!completed) drawTargetCircle(target, active);
    else {
      const point = targetPoint(target);
      const radius = targetRadius() * .48;
      ctx.save();
      ctx.fillStyle = "#c8ff3d22";
      ctx.strokeStyle = "#c8ff3d";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = `700 ${Math.round(radius * .9)}px IBM Plex Sans KR`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(target.value, point.x, point.y + 1);
      ctx.fillStyle = "#c8ff3d";
      ctx.font = `700 ${Math.round(radius * .68)}px IBM Plex Sans KR`;
      ctx.fillText("✓", point.x + radius * .7, point.y - radius * .65);
      ctx.restore();
    }
  }
}

function drawExerciseGame() {
  const reps = gameState?.reps || 0;
  const color = selectedGame === "squat" ? "#c8ff3d" : "#ff3ea5";
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
  ctx.fillText("REPS", x, y + 24);
  if (selectedGame === "squat") {
    const compactLandscape = viewH < 420 && viewW > viewH;
    const barH = compactLandscape
      ? Math.max(40, cameraRect.y + cameraRect.h - (y + 48) - 14)
      : Math.min(220, viewH * .28);
    ctx.strokeStyle = "#ffffff33";
    ctx.strokeRect(x - 6, y + 48, 12, barH);
    ctx.fillStyle = color;
    ctx.fillRect(x - 5, y + 49 + barH * (1 - gameState.depth), 10, barH * gameState.depth);
  } else {
    ctx.fillStyle = gameState.armsOpen ? "#c8ff3d" : "#ffb15b";
    ctx.fillText(gameState.armsOpen ? "팔 ✓" : "팔 ·", x - 28, y + 54);
    ctx.fillStyle = gameState.legsOpen ? "#c8ff3d" : "#8a5cff";
    ctx.fillText(gameState.legsOpen ? "다리 ✓" : "다리 ·", x + 30, y + 54);
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
  const color = feedback.type === "good" ? "#c8ff3d" : "#ff4f70";
  const title = compactLandscape && feedback.detail
    ? `✓ ${feedback.detail}  +${feedback.gain}`
    : feedback.type === "good" ? `✓ ${feedback.label}  +${feedback.gain}` : `× ${feedback.label}`;
  const detail = compactLandscape ? "" : feedback.detail || (feedback.type === "bad" ? "-30 POINT" : "");
  const titleSize = compactLandscape ? 12 : viewW < 700 ? 14 : 17;
  const detailSize = viewW < 700 ? 9 : 10;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `700 ${titleSize}px IBM Plex Sans KR`;
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
  ctx.fillStyle = "#05040be8";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 10;
  ctx.shadowColor = `${color}88`;
  ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.font = `700 ${titleSize}px IBM Plex Sans KR`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, x + width / 2, y + (detail ? 15 : height / 2), width - 12);
  if (detail) {
    ctx.fillStyle = "#f6f4ff";
    ctx.font = `700 ${detailSize}px IBM Plex Sans KR`;
    ctx.fillText(detail, x + width / 2, y + 31, width - 12);
  }
  ctx.restore();
}

function drawFeedbacks(now = performance.now()) {
  const compactLandscape = viewH < 420 && viewW > viewH;
  const newestGood = [...feedbacks].reverse().find((feedback) => feedback.type === "good");
  if (newestGood) {
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
    const color = feedback.type === "good" ? "#c8ff3d" : "#ff4f70";
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
      ctx.moveTo(-radius * .25, -radius * .25); ctx.lineTo(radius * .25, radius * .25);
      ctx.moveTo(radius * .25, -radius * .25); ctx.lineTo(-radius * .25, radius * .25);
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
        feedback.type === "good" ? `+${feedback.gain}` : "-30",
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
  const compactLandscape = viewH < 420 && viewW > viewH;
  ripples.push({
    x, y, r: 8,
    maxR: compactLandscape ? clamp(targetRadius() * 1.35, 34, 40) : clamp(targetRadius() * 1.7, 50, 92),
    alpha: 1, color
  });
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const count = viewW < 700 ? 10 : 16;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2, speed = 2 + Math.random() * 7;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color });
  }
  particles = particles.slice(-(viewW < 700 ? 48 : 96));
}

function drawTrackingPause() {
  ctx.save();
  ctx.fillStyle = "#030207aa";
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.fillStyle = "#ffb15b";
  ctx.textAlign = "center";
  ctx.font = `700 ${viewW < 700 ? 22 : 30}px IBM Plex Sans KR`;
  ctx.fillText("몸 전체를 다시 보여주세요", viewW / 2, viewH / 2);
  ctx.fillStyle = "#c9c5d1";
  ctx.font = "400 13px IBM Plex Sans KR";
  ctx.fillText("인식되는 동안 게임 시간은 멈춥니다", viewW / 2, viewH / 2 + 30);
  ctx.restore();
}

function render(now) {
  const frameDt = clamp(now - lastFrameAt, 0, 50);
  lastFrameAt = now;
  drawBackground();
  if (!demo) detectPose(now);
  drawPose(now);
  drawCalibrationGuide();
  if (calibrating) updateCalibration(now);

  if (running) {
    const usable = demo || poseUsable(now);
    let trackingPaused = false;
    if (usable) {
      gameElapsed += frameDt;
      if (demo || poseVersion !== evaluatedPoseVersion) {
        const poseDt = demo ? frameDt : clamp(poseTimestamp - lastPoseEvalAt, 16, 80);
        updateGame(poseDt);
        evaluatedPoseVersion = poseVersion;
        lastPoseEvalAt = poseTimestamp;
      }
      setTracking(demo ? "체험 모드" : "동작 인식 중", "good");
    } else {
      setTracking("몸 전체를 보여주세요", "warn");
      trackingPaused = true;
    }
    if (selectedGame === "sequence" || selectedGame === "math") drawTouchGame(); else drawExerciseGame();
    drawHandCursors(now);
    drawEffects(frameDt, now);
    drawTrackingSignal(now);
    if (trackingPaused) drawTrackingPause();
    updateHUD();
    if (gameElapsed >= games[selectedGame].ms) endGame();
  }

  if (running || calibrating || countdownActive) requestAnimationFrame(render);
  else renderLoopActive = false;
}

function startRenderLoop() {
  if (renderLoopActive) return;
  renderLoopActive = true;
  lastFrameAt = performance.now();
  requestAnimationFrame(render);
}

function endGame() {
  running = false;
  hide(ui.cue, ui.demoHelp, ui.motionArt);
  const total = hits + misses;
  const accuracy = total ? Math.round(hits / total * 100) : 0;
  ui.resultTitle.textContent = `${games[selectedGame].name} 완료!`;
  ui.finalScore.textContent = score.toLocaleString();
  ui.accuracy.textContent = `${accuracy}%`;
  ui.maxCombo.textContent = maxCombo;
  ui.grade.textContent = accuracy >= 92 ? "S" : accuracy >= 80 ? "A" : accuracy >= 65 ? "B" : "C";
  wakeLock?.release?.().catch(() => {});
  tone(660, .18, "triangle", .08);
  setTimeout(() => tone(880, .35, "triangle", .08), 180);
  show(ui.result);
}

function returnToMenu() {
  cameraAttemptId += 1;
  countdownAttemptId += 1;
  running = calibrating = countdownActive = false;
  demo = false;
  stopCamera();
  hide(ui.result, ui.cue, ui.demoHelp, ui.motionArt, ui.calibrate, ui.loading, ui.countdown);
  show(ui.intro);
  setTracking("카메라 대기");
}

function demoTouch(x, y) {
  if (!running || !demo || !gameState?.targets || performance.now() < inputLockedUntil) return;
  const radius = targetRadius();
  const target = gameState.targets.find((item) => {
    if (selectedGame === "sequence" && item.value < gameState.current) return false;
    return distance({ x, y }, targetPoint(item)) <= radius;
  });
  if (!target) return;
  if (selectedGame === "sequence") {
    if (target.value === gameState.current) completeSequenceTarget(target);
    else {
      inputLockedUntil = performance.now() + 220;
      const point = targetPoint(target);
      penalty(`${gameState.current}번부터!`, point.x, point.y);
    }
  } else completeMathTarget(target);
}

function demoExercise(game) {
  if (!running || !demo || selectedGame !== game || performance.now() < inputLockedUntil) return;
  inputLockedUntil = performance.now() + 220;
  if (game === "squat") {
    if (gameState.phase === "needStand") gameState.phase = "ready";
    else if (gameState.phase === "ready") { gameState.phase = "down"; showToast("좋아요! 이제 S로 일어서기"); }
    else completeSquatRep();
  } else {
    if (gameState.phase === "needClosed") gameState.phase = "ready";
    else if (gameState.phase === "ready") { gameState.phase = "open"; gameState.armsOpen = gameState.legsOpen = true; showToast("활짝! 다시 J"); }
    else { gameState.armsOpen = gameState.legsOpen = false; completeJackRep(); }
  }
  updateGameCue();
}

app.addEventListener("click", (event) => {
  if (!event.target.closest("button")) demoTouch(event.clientX, event.clientY);
});

addEventListener("keydown", (event) => {
  if (!running || !demo || event.repeat || performance.now() < inputLockedUntil) return;
  if (selectedGame === "sequence" && (event.code === "Enter" || /^Digit[1-7]$/.test(event.code))) {
    const value = event.code === "Enter" ? gameState.current : Number(event.code.replace("Digit", ""));
    const target = gameState.targets.find((item) => item.value === value);
    if (target) {
      if (value === gameState.current) completeSequenceTarget(target);
      else {
        inputLockedUntil = performance.now() + 220;
        const point = targetPoint(target);
        penalty(`${gameState.current}번부터!`, point.x, point.y);
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
$("#soundBtn").onclick = (event) => { sound = !sound; event.currentTarget.classList.toggle("off", !sound); };

document.querySelectorAll(".game-card").forEach((card) => card.addEventListener("click", () => {
  document.querySelectorAll(".game-card").forEach((item) => item.classList.remove("active"));
  card.classList.add("active");
  selectedGame = card.dataset.game;
  ui.motionArt.src = games[selectedGame].image;
  ui.motionArt.alt = `${games[selectedGame].name} 동작 안내`;
  $("#gameDescription").textContent = games[selectedGame].description;
  ui.time.textContent = Math.round(games[selectedGame].ms / 1000);
  tone(330, .05, "triangle", .025);
}));

document.addEventListener("visibilitychange", () => {
  if (document.hidden) wakeLock?.release?.().catch(() => {});
  else if (running) navigator.wakeLock?.request("screen").then((lock) => wakeLock = lock).catch(() => {});
});
addEventListener("pagehide", stopCamera);

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
    if (selectedGame === "sequence") completeSequenceTarget(gameState.targets.find((target) => target.value === gameState.current));
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
  if (preset === "squat") {
    set(LM.lh,.38,.60);set(LM.rh,.62,.60);set(LM.lk,.34,.72);set(LM.rk,.66,.72);set(LM.la,.45,.91);set(LM.ra,.55,.91);
  } else if (preset === "jackOpen") {
    set(LM.lw,.45,.07);set(LM.rw,.55,.07);set(LM.le,.33,.16);set(LM.re,.67,.16);set(LM.la,.25,.91);set(LM.ra,.75,.91);
  }
  return pose;
}

function feedSyntheticPose(preset, frames = 10) {
  for (let i = 0; i < frames; i++) {
    lastPose = syntheticPose(preset);
    lastWorldPose = syntheticPose(preset);
    poseTimestamp = performance.now();
    poseVersion++;
    updateGame(33);
  }
}

function runEngineSelfTest() {
  const results = {};
  demo = true;
  selectedGame = "sequence";resetScore();gameState=createGameState("sequence");completeSequenceTarget(gameState.targets.find((target)=>target.value===1));
  results.sequence = { pass: gameState.current === 2 && hits === 1 && feedbacks.at(-1)?.type === "good", current: gameState.current, hits, feedback: feedbacks.at(-1)?.label };
  selectedGame = "math";resetScore();gameState=createGameState("math");completeMathTarget(gameState.targets.find((target)=>target.value===gameState.answer));
  results.math = { pass: hits === 1 && score > 0 && feedbacks.at(-1)?.detail?.includes("="), hits, score, feedback: feedbacks.at(-1)?.detail };
  selectedGame = "squat";resetScore();gameState=createGameState("squat");feedSyntheticPose("stand",10);const squatReady=gameState.phase;feedSyntheticPose("squat",10);const squatDown=gameState.phase;const squatDebug=squatFeatures(posePoints());feedSyntheticPose("stand",10);
  results.squat = { pass: gameState.reps === 1 && feedbacks.at(-1)?.type === "good", reps: gameState.reps, phase: gameState.phase, ready:squatReady, down:squatDown, angle:Math.round(squatDebug.kneeAngle), feedback:feedbacks.at(-1)?.label };
  selectedGame = "jack";resetScore();gameState=createGameState("jack");feedSyntheticPose("stand",10);feedSyntheticPose("jackOpen",10);feedSyntheticPose("stand",10);
  results.jack = { pass: gameState.reps === 1 && feedbacks.at(-1)?.type === "good", reps: gameState.reps, phase: gameState.phase, feedback:feedbacks.at(-1)?.label };
  running = false;demo = false;selectedGame = "sequence";gameState = null;resetScore();
  results.pass = Object.values(results).every((item) => item?.pass !== false);
  window.__MOTION_SELFTEST__ = results;
  document.documentElement.dataset.selftest = JSON.stringify(results);
}

if (new URLSearchParams(location.search).has("selftest")) runEngineSelfTest();

setTracking("카메라 대기");
drawBackground();
