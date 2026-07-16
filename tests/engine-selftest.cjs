"use strict";

const fs = require("node:fs");
const path = require("node:path");

class MockClassList {
  constructor() {
    this.values = new Set();
  }

  add(...names) {
    names.forEach((name) => this.values.add(name));
  }

  remove(...names) {
    names.forEach((name) => this.values.delete(name));
  }

  toggle(name, force) {
    const enabled = force === undefined ? !this.values.has(name) : Boolean(force);
    if (enabled) this.values.add(name);
    else this.values.delete(name);
    return enabled;
  }

  contains(name) {
    return this.values.has(name);
  }
}

class MockElement {
  constructor(id = "") {
    this.id = id;
    this.classList = new MockClassList();
    this.style = { setProperty() {} };
    this.dataset = {};
    this.attributes = new Map();
    this.childrenBySelector = new Map();
    this.textContent = "";
    this.src = "";
    this.alt = "";
    this.readyState = 0;
    this.currentTime = 0;
    this.videoWidth = 0;
    this.videoHeight = 0;
    this.srcObject = null;
  }

  querySelector(selector) {
    if (!this.childrenBySelector.has(selector)) {
      this.childrenBySelector.set(selector, new MockElement(selector));
    }
    return this.childrenBySelector.get(selector);
  }

  querySelectorAll() {
    return [];
  }

  addEventListener() {}
  removeEventListener() {}
  closest() { return null; }
  play() { return Promise.resolve(); }

  getBoundingClientRect() {
    return { x: 0, y: 0, left: 0, top: 0, width: 390, height: 844 };
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  get offsetWidth() {
    return 100;
  }
}

const elements = new Map();
const elementForSelector = (selector) => {
  const key = selector.startsWith("#") ? selector.slice(1) : selector;
  if (!elements.has(key)) elements.set(key, new MockElement(key));
  return elements.get(key);
};

const canvasContext = new Proxy({
  measureText(text) {
    return { width: String(text).length * 10 };
  },
  createLinearGradient() {
    return { addColorStop() {} };
  }
}, {
  get(target, property) {
    if (property in target) return target[property];
    return () => {};
  },
  set(target, property, value) {
    target[property] = value;
    return true;
  }
});

elementForSelector("#gameCanvas").getContext = () => canvasContext;

const gameCards = ["sequence", "math", "squat", "color"].map((game) => {
  const card = new MockElement(`game-${game}`);
  card.dataset.game = game;
  return card;
});

globalThis.document = {
  hidden: false,
  documentElement: { dataset: {} },
  querySelector: elementForSelector,
  querySelectorAll(selector) {
    return selector === ".game-card" ? gameCards : [];
  },
  addEventListener() {},
  removeEventListener() {}
};
globalThis.window = globalThis;
globalThis.innerWidth = 390;
globalThis.innerHeight = 844;
globalThis.devicePixelRatio = 1;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
globalThis.matchMedia = (query) => ({
  matches: query.includes("orientation: portrait"),
  addEventListener() {},
  removeEventListener() {}
});
globalThis.visualViewport = {
  addEventListener() {},
  removeEventListener() {}
};
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {
    hardwareConcurrency: 8,
    deviceMemory: 8,
    mediaDevices: null,
    vibrate() {},
    wakeLock: null
  }
});
globalThis.location = { search: "?selftest=1" };
globalThis.speechSynthesis = { cancel() {}, speak() {} };
globalThis.SpeechSynthesisUtterance = class SpeechSynthesisUtterance {};
globalThis.Image = class MockImage {
  constructor() {
    this.complete = false;
    this.naturalWidth = 0;
    this.naturalHeight = 0;
    this.src = "";
  }
};
globalThis.Worker = class MockWorker {
  postMessage() {}
  terminate() {}
};
globalThis.createImageBitmap = undefined;

const appPath = path.resolve(__dirname, "..", "app.js");
const testModuleUrl = "http://motion-quest.test/app.js";
const source = fs.readFileSync(appPath, "utf8")
  .replace(/import\.meta\.url/g, JSON.stringify(testModuleUrl));

try {
  eval(source);
} catch (error) {
  console.error("ENGINE SELFTEST FAILED: app.js could not execute");
  console.error(error?.stack || error);
  process.exitCode = 1;
  return;
}

const result = globalThis.window.__MOTION_SELFTEST__;
const groups = result && typeof result === "object"
  ? Object.entries(result)
    .filter(([name, value]) => name !== "pass" && value && typeof value.pass === "boolean")
    .map(([name]) => name)
  : [];
const failedGroups = result && typeof result === "object"
  ? Object.entries(result)
    .filter(([name, value]) => name !== "pass" && value?.pass === false)
    .map(([name]) => name)
  : ["selftest-result-missing"];

if (!result || result.pass !== true || failedGroups.length > 0) {
  console.error("ENGINE SELFTEST FAILED");
  console.error(`Failed groups: ${failedGroups.join(", ") || "overall"}`);
  console.error(JSON.stringify(result ?? null, null, 2));
  process.exitCode = 1;
  return;
}

console.log(`ENGINE SELFTEST PASS: ${groups.join(", ")}`);

const lifecycle = globalThis.window.__MOTION_LIFECYCLE_TEST__;

function makeCameraTrack(name) {
  return {
    name,
    readyState: "live",
    onended: null,
    onmute: null,
    onunmute: null,
    stop() { this.readyState = "ended"; },
    getSettings() { return { width: 480, height: 640, frameRate: 30, facingMode: "user" }; },
    getCapabilities() { return {}; },
    applyConstraints() { return Promise.resolve(); }
  };
}

function makeCameraStream(track) {
  return {
    getTracks() { return [track]; },
    getVideoTracks() { return [track]; }
  };
}

async function runLifecycleSelfTest() {
  if (!lifecycle) throw new Error("lifecycle test hooks are missing");

  const video = document.querySelector("#camera");
  const originalPlay = video.play;
  const originalMediaDevices = navigator.mediaDevices;
  let resolveFirstPlay;
  let playCount = 0;
  const initialTrack = makeCameraTrack("initial");
  const firstTrack = makeCameraTrack("first");
  const secondTrack = makeCameraTrack("second");
  const initialStream = makeCameraStream(initialTrack);
  const firstStream = makeCameraStream(firstTrack);
  const secondStream = makeCameraStream(secondTrack);
  let mediaRequestCount = 0;

  video.play = () => {
    playCount += 1;
    if (playCount === 2) return new Promise((resolve) => { resolveFirstPlay = resolve; });
    return Promise.resolve();
  };
  navigator.mediaDevices = {
    getUserMedia: async () => [initialStream, firstStream, secondStream][mediaRequestCount++]
  };

  let cameraRace;
  try {
    lifecycle.setCameraAttempt(0);
    const initialResult = await lifecycle.openCamera(0);
    lifecycle.setCameraAttempt(1);
    const staleOpen = lifecycle.openCamera(1);
    for (let index = 0; index < 8 && !resolveFirstPlay; index++) await Promise.resolve();
    if (!resolveFirstPlay) throw new Error("first camera play did not start");

    lifecycle.setCameraAttempt(2);
    const currentOpen = lifecycle.openCamera(2);
    const currentResult = await currentOpen;
    const currentHandler = secondTrack.onended;
    resolveFirstPlay();
    const staleResult = await staleOpen;
    const state = lifecycle.cameraState();
    cameraRace = {
      pass: initialResult === true && currentResult === true && staleResult === false
        && state.stream === secondStream && state.srcObject === secondStream && state.ready === true
        && typeof currentHandler === "function" && secondTrack.onended === currentHandler
        && initialTrack.readyState === "ended" && firstTrack.readyState === "ended" && secondTrack.readyState === "live",
      initialResult,
      currentResult,
      staleResult,
      activeStreamIsSecond: state.stream === secondStream,
      handlerPreserved: secondTrack.onended === currentHandler,
      previousStreamStopped: initialTrack.readyState === "ended",
      staleNextStreamStopped: firstTrack.readyState === "ended",
      activeStreamLive: secondTrack.readyState === "live",
      ready: state.ready
    };
  } finally {
    lifecycle.stopCamera();
    video.play = originalPlay;
    navigator.mediaDevices = originalMediaDevices;
  }

  lifecycle.setPoseLoadGeneration(101);
  let lateCandidateClosed = false;
  let timeoutRejected = false;
  const lateCandidate = new Promise((resolve) => setTimeout(() => resolve({
    close() { lateCandidateClosed = true; }
  }), 30));
  try {
    await lifecycle.waitForPoseCandidate(lateCandidate, 101, "audit timeout", 5);
  } catch (error) {
    timeoutRejected = error?.message === "audit timeout";
  }
  await new Promise((resolve) => setTimeout(resolve, 40));

  let staleCandidateClosed = false;
  let staleGenerationRejected = false;
  lifecycle.setPoseLoadGeneration(102);
  try {
    await lifecycle.waitForPoseCandidate(Promise.resolve({
      close() { staleCandidateClosed = true; }
    }), 101, "unused", 5);
  } catch (error) {
    staleGenerationRejected = /취소/.test(error?.message || "");
  }
  const modelLifecycle = {
    pass: timeoutRejected && lateCandidateClosed && staleGenerationRejected && staleCandidateClosed,
    timeoutRejected,
    lateCandidateClosed,
    staleGenerationRejected,
    staleCandidateClosed
  };

  const lifecycleResult = {
    pass: cameraRace.pass && modelLifecycle.pass,
    cameraRace,
    modelLifecycle
  };
  if (!lifecycleResult.pass) {
    console.error("LIFECYCLE SELFTEST FAILED");
    console.error(JSON.stringify(lifecycleResult, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log("LIFECYCLE SELFTEST PASS: cameraRace, modelTimeoutCleanup");
}

void runLifecycleSelfTest().catch((error) => {
  console.error("LIFECYCLE SELFTEST FAILED");
  console.error(error?.stack || error);
  process.exitCode = 1;
});
