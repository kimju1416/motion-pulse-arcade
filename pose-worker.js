"use strict";

const TASKS_VISION_MODULE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/+esm";

let PoseLandmarkerClass = null;
let landmarker = null;
let activeGeneration = null;
let initRequestId = 0;
let ready = false;
let processingFrame = false;
let processingScheduled = false;
let pendingFrame = null;
let lastProcessedTimestamp = -Infinity;

function errorMessage(error) {
  if (error instanceof Error && error.message) return error.message;
  return String(error || "Unknown error");
}

function postWorkerError(phase, error, generation) {
  self.postMessage({
    type: "error",
    phase,
    message: errorMessage(error),
    generation
  });
}

function closeBitmap(bitmap) {
  try {
    bitmap?.close?.();
  } catch {
    // The frame may already have been detached or closed by the browser.
  }
}

function discardPendingFrame() {
  if (!pendingFrame) return;
  closeBitmap(pendingFrame.bitmap);
  pendingFrame = null;
}

function closeLandmarker(instance = landmarker) {
  if (!instance) return;
  try {
    instance.close?.();
  } catch {
    // A failed runtime can throw while disposing; a new generation may continue.
  }
  if (instance === landmarker) landmarker = null;
}

function normalizeDelegate(value) {
  const delegate = String(value || "GPU").toUpperCase();
  return delegate === "CPU" || delegate === "GPU" ? delegate : null;
}

function cloneLandmarkGroups(groups) {
  if (!Array.isArray(groups)) return [];
  return groups.map((group) => {
    if (!Array.isArray(group)) return [];
    return group.map((point) => ({
      x: point?.x ?? 0,
      y: point?.y ?? 0,
      z: point?.z ?? 0,
      visibility: point?.visibility ?? 0,
      presence: point?.presence ?? 0
    }));
  });
}

async function initialize(message) {
  const generation = message.generation;
  const requestId = ++initRequestId;
  const delegate = normalizeDelegate(message.delegate);

  activeGeneration = generation;
  ready = false;
  lastProcessedTimestamp = -Infinity;
  discardPendingFrame();
  closeLandmarker();

  if (!Number.isFinite(generation)) {
    postWorkerError("init-config", new Error("init requires a finite generation"), generation);
    return;
  }
  if (!message.wasmRoot || typeof message.wasmRoot !== "string") {
    postWorkerError("init-config", new Error("init requires wasmRoot"), generation);
    return;
  }
  if (!message.modelAssetPath || typeof message.modelAssetPath !== "string") {
    postWorkerError("init-config", new Error("init requires modelAssetPath"), generation);
    return;
  }
  if (!delegate) {
    postWorkerError("init-config", new Error(`Unsupported delegate: ${message.delegate}`), generation);
    return;
  }

  let FilesetResolver;
  try {
    const visionModule = await import(TASKS_VISION_MODULE);
    FilesetResolver = visionModule.FilesetResolver;
    PoseLandmarkerClass = visionModule.PoseLandmarker;
    if (!FilesetResolver || !PoseLandmarkerClass) {
      throw new Error("MediaPipe Tasks Vision exports are unavailable");
    }
  } catch (error) {
    if (requestId === initRequestId && generation === activeGeneration) {
      postWorkerError("module-load", error, generation);
    }
    return;
  }

  if (requestId !== initRequestId || generation !== activeGeneration) return;

  let vision;
  try {
    vision = await FilesetResolver.forVisionTasks(message.wasmRoot);
  } catch (error) {
    if (requestId === initRequestId && generation === activeGeneration) {
      postWorkerError("wasm-load", error, generation);
    }
    return;
  }

  if (requestId !== initRequestId || generation !== activeGeneration) return;

  let candidate = null;
  try {
    candidate = await PoseLandmarkerClass.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: message.modelAssetPath,
        delegate
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.52,
      minPosePresenceConfidence: 0.52,
      minTrackingConfidence: 0.5
    });
  } catch (error) {
    if (requestId === initRequestId && generation === activeGeneration) {
      postWorkerError(`init-${delegate.toLowerCase()}`, new Error(`${delegate} initialization failed: ${errorMessage(error)}`), generation);
    }
    closeLandmarker(candidate);
    return;
  }

  if (requestId !== initRequestId || generation !== activeGeneration) {
    closeLandmarker(candidate);
    return;
  }

  landmarker = candidate;
  ready = true;
  self.postMessage({ type: "ready", delegate, generation });
  scheduleFrameProcessing();
}

function scheduleFrameProcessing() {
  if (processingScheduled || processingFrame || !ready || !landmarker || !pendingFrame) return;
  processingScheduled = true;
  setTimeout(() => {
    processingScheduled = false;
    processLatestFrame();
  }, 0);
}

function processLatestFrame() {
  if (processingFrame || !ready || !landmarker || !pendingFrame) return;

  const frame = pendingFrame;
  pendingFrame = null;

  if (frame.generation !== activeGeneration) {
    closeBitmap(frame.bitmap);
    scheduleFrameProcessing();
    return;
  }

  processingFrame = true;
  lastProcessedTimestamp = frame.timestamp;
  const inferenceStartedAt = performance.now();
  try {
    const output = landmarker.detectForVideo(frame.bitmap, frame.timestamp);
    const inferenceMs = performance.now() - inferenceStartedAt;
    if (frame.generation === activeGeneration && ready) {
      self.postMessage({
        type: "result",
        landmarks: cloneLandmarkGroups(output?.landmarks),
        worldLandmarks: cloneLandmarkGroups(output?.worldLandmarks),
        timestamp: frame.timestamp,
        inferenceMs,
        frameGeneration: frame.frameGeneration,
        generation: frame.generation
      });
    }
  } catch (error) {
    if (frame.generation === activeGeneration) {
      postWorkerError("frame", error, frame.generation);
    }
  } finally {
    closeBitmap(frame.bitmap);
    processingFrame = false;
    scheduleFrameProcessing();
  }
}

function enqueueFrame(message) {
  const frame = {
    bitmap: message.bitmap,
    timestamp: message.timestamp,
    frameGeneration: message.frameGeneration,
    generation: message.generation
  };

  if (frame.generation !== activeGeneration) {
    closeBitmap(frame.bitmap);
    return;
  }
  if (!frame.bitmap || !Number.isFinite(frame.timestamp)) {
    closeBitmap(frame.bitmap);
    postWorkerError("frame-config", new Error("frame requires bitmap and a finite timestamp"), frame.generation);
    return;
  }

  if (frame.timestamp <= lastProcessedTimestamp || (pendingFrame && frame.timestamp <= pendingFrame.timestamp)) {
    closeBitmap(frame.bitmap);
    return;
  }

  if (pendingFrame) closeBitmap(pendingFrame.bitmap);
  pendingFrame = frame;
  scheduleFrameProcessing();
}

self.onmessage = (event) => {
  const message = event.data || {};
  if (message.type === "init") {
    void initialize(message);
    return;
  }
  if (message.type === "frame") enqueueFrame(message);
};
