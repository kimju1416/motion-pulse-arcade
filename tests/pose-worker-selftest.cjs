"use strict";

const fs = require("node:fs");
const path = require("node:path");

const posted = [];
globalThis.self = {
  postMessage(message) {
    posted.push(message);
  }
};

const workerPath = path.resolve(__dirname, "..", "pose-worker.js");
const source = `${fs.readFileSync(workerPath, "utf8")}
;self.__POSE_WORKER_TEST__ = {
  setRuntime(value, generation = 1) {
    landmarker = value;
    activeGeneration = generation;
    ready = true;
    processingFrame = false;
    processingScheduled = false;
    discardPendingFrame();
    lastProcessedTimestamp = -Infinity;
  },
  state() {
    return { activeGeneration, ready, processingFrame, processingScheduled, lastProcessedTimestamp };
  }
};`;

try {
  eval(source);
} catch (error) {
  console.error("POSE WORKER SELFTEST FAILED: worker could not execute");
  console.error(error?.stack || error);
  process.exitCode = 1;
  return;
}

const calls = [];
self.__POSE_WORKER_TEST__.setRuntime({
  detectForVideo(_bitmap, timestamp) {
    calls.push(timestamp);
    const point = { x: .5, y: .5, z: 0, visibility: 1, presence: 1 };
    return { landmarks: [[point]], worldLandmarks: [[point]] };
  },
  close() {}
});

function bitmap(name) {
  return {
    name,
    closed: 0,
    close() { this.closed += 1; }
  };
}

const first = bitmap("first");
const olderPending = bitmap("older-pending");
const latest = bitmap("latest");
self.onmessage({ data: { type: "frame", bitmap: first, timestamp: 100, generation: 1, frameGeneration: 7 } });
self.onmessage({ data: { type: "frame", bitmap: olderPending, timestamp: 90, generation: 1, frameGeneration: 7 } });
self.onmessage({ data: { type: "frame", bitmap: latest, timestamp: 120, generation: 1, frameGeneration: 8 } });

setTimeout(() => {
  const alreadyProcessed = bitmap("already-processed");
  const wrongGeneration = bitmap("wrong-generation");
  self.onmessage({ data: { type: "frame", bitmap: alreadyProcessed, timestamp: 110, generation: 1, frameGeneration: 8 } });
  self.onmessage({ data: { type: "frame", bitmap: wrongGeneration, timestamp: 130, generation: 2, frameGeneration: 9 } });

  setTimeout(() => {
    const result = posted.find((message) => message.type === "result");
    const pass = calls.length === 1 && calls[0] === 120
      && first.closed === 1 && olderPending.closed === 1 && latest.closed === 1
      && alreadyProcessed.closed === 1 && wrongGeneration.closed === 1
      && result?.timestamp === 120 && result?.frameGeneration === 8
      && self.__POSE_WORKER_TEST__.state().lastProcessedTimestamp === 120;

    if (!pass) {
      console.error("POSE WORKER SELFTEST FAILED");
      console.error(JSON.stringify({ calls, posted, closes: {
        first: first.closed,
        olderPending: olderPending.closed,
        latest: latest.closed,
        alreadyProcessed: alreadyProcessed.closed,
        wrongGeneration: wrongGeneration.closed
      }, state: self.__POSE_WORKER_TEST__.state() }, null, 2));
      process.exitCode = 1;
      return;
    }
    console.log("POSE WORKER SELFTEST PASS: latest-frame, timestamp-order, generation, bitmap-close");
  }, 10);
}, 10);
