import { Worker } from "node:worker_threads";
import ffmpeg from "fluent-ffmpeg";
import streamifier from "streamifier";

export {
  extractPeaks,
  rmsEnergy,
  zeroCrossingRate,
  spectralCentroid,
  estimateTempo,
  computeAudioDSP,
} from "./audioWorker.js";

// Prefer the bundled static binary (ffmpeg-static) so this works out of
// the box on a fresh `npm i`. Its postinstall step downloads a ~80MB
// binary from GitHub though, which some corporate networks / antivirus /
// VPNs interrupt (ECONNRESET) — if that happens, fall back to whatever
// `ffmpeg` is already on the system PATH instead of crashing the app.
try {
  const { default: ffmpegStaticPath } = await import("ffmpeg-static");
  if (ffmpegStaticPath) ffmpeg.setFfmpegPath(ffmpegStaticPath);
} catch (err) {
  console.log(
    "[audioAnalysis] ffmpeg-static not installed — falling back to a system " +
    "ffmpeg on PATH. Audio analysis (waveform + similarity) will be skipped " +
    "for uploads if none is found, but everything else keeps working."
  );
}

// Downsampled mono PCM is plenty for waveform shape, energy, brightness
// and tempo estimation — keeping decode + FFT cost tiny.
const SAMPLE_RATE = 8000;
const NUM_PEAKS = 200;

// Bounded worker pool & queue configuration to protect 512MB RAM containers
const MAX_QUEUE = 5;
const TASK_TIMEOUT_MS = 30000;

let worker = null;
let activeTask = null;
const taskQueue = [];
let nextTaskId = 1;

/**
 * Decode any ffmpeg-supported audio buffer to mono PCM samples at a fixed,
 * low sample rate.
 */
function decodeToPCM(buffer) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    const command = ffmpeg(streamifier.createReadStream(buffer))
      .format("s16le")
      .audioChannels(1)
      .audioFrequency(SAMPLE_RATE)
      .on("error", (err) => reject(err));

    const stream = command.pipe();
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => {
      const raw = Buffer.concat(chunks);
      const sampleCount = Math.floor(raw.length / 2);
      const samples = new Float32Array(sampleCount);
      for (let i = 0; i < sampleCount; i++) {
        samples[i] = raw.readInt16LE(i * 2) / 32768;
      }
      resolve(samples);
    });
    stream.on("error", (err) => reject(err));
  });
}

function terminateWorker() {
  if (worker) {
    worker.removeAllListeners();
    worker.terminate().catch(() => {});
    worker = null;
  }
}

function handleWorkerFailure() {
  terminateWorker();
  if (activeTask) {
    clearTimeout(activeTask.timeoutTimer);
    const failed = activeTask;
    activeTask = null;
    failed.resolve({ peaks: [], features: null });
  }
  processQueue();
}

function ensureWorker() {
  if (worker) return worker;

  try {
    const workerUrl = new URL("./audioWorker.js", import.meta.url);
    worker = new Worker(workerUrl);
    // Unref worker so it doesn't prevent Node process termination during idle
    worker.unref();

    worker.on("message", (msg) => {
      if (!activeTask || activeTask.id !== msg.id) return;
      clearTimeout(activeTask.timeoutTimer);
      const current = activeTask;
      activeTask = null;

      if (msg.success) {
        current.resolve({
          peaks: msg.peaks || [],
          features: msg.features || null,
        });
      } else {
        console.warn(`[audioAnalysis] Worker DSP error: ${msg.error}`);
        current.resolve({ peaks: [], features: null });
      }

      processQueue();
    });

    worker.on("error", (err) => {
      console.warn("[audioAnalysis] Worker thread error:", err.message);
      handleWorkerFailure();
    });

    worker.on("exit", (code) => {
      if (code !== 0 && activeTask) {
        console.warn(`[audioAnalysis] Worker exited unexpectedly with code ${code}`);
        handleWorkerFailure();
      }
    });

    return worker;
  } catch (err) {
    console.warn("[audioAnalysis] Failed to initialize worker thread:", err.message);
    worker = null;
    return null;
  }
}

function processQueue() {
  if (activeTask !== null || taskQueue.length === 0) return;

  const w = ensureWorker();
  if (!w) {
    // If worker thread cannot be created, drain queue safely with fallback
    while (taskQueue.length > 0) {
      const task = taskQueue.shift();
      task.resolve({ peaks: [], features: null });
    }
    return;
  }

  activeTask = taskQueue.shift();

  activeTask.timeoutTimer = setTimeout(() => {
    console.warn(`[audioAnalysis] Task ${activeTask.id} timed out after ${TASK_TIMEOUT_MS}ms`);
    handleWorkerFailure();
  }, TASK_TIMEOUT_MS);

  try {
    const samples = activeTask.samples;
    // Transfer Float32Array buffer to avoid duplicating memory across threads
    const transferList =
      samples.buffer instanceof ArrayBuffer &&
      samples.byteOffset === 0 &&
      samples.byteLength === samples.buffer.byteLength
        ? [samples.buffer]
        : [];

    w.postMessage(
      {
        id: activeTask.id,
        samples,
        sampleRate: activeTask.sampleRate,
        numPeaks: activeTask.numPeaks,
      },
      transferList
    );
  } catch (err) {
    console.warn("[audioAnalysis] Failed to dispatch task to worker:", err.message);
    clearTimeout(activeTask.timeoutTimer);
    const failed = activeTask;
    activeTask = null;
    failed.resolve({ peaks: [], features: null });
    processQueue();
  }
}

function dispatchToWorker(samples, sampleRate = SAMPLE_RATE, numPeaks = NUM_PEAKS) {
  // Reject/skip if queue exceeds bounded limit to avoid memory leaks
  if (taskQueue.length >= MAX_QUEUE) {
    console.warn(
      `[audioAnalysis] Worker queue saturated (${taskQueue.length}/${MAX_QUEUE}). Skipping DSP analysis to protect memory.`
    );
    return Promise.resolve({ peaks: [], features: null });
  }

  return new Promise((resolve) => {
    const task = {
      id: nextTaskId++,
      samples,
      sampleRate,
      numPeaks,
      resolve,
      timeoutTimer: null,
    };
    taskQueue.push(task);
    processQueue();
  });
}

/**
 * Full analysis pipeline for an uploaded audio buffer:
 * 1. ffmpeg decodes to mono PCM (offloaded via child process stream)
 * 2. DSP analysis (spectral centroid, tempo autocorrelation, peaks) dispatched
 *    to isolated worker thread with bounded concurrency and 30s timeout watchdog.
 * Never throws — callers get { peaks: [], features: null } on failure or queue saturation.
 */
export async function analyzeAudioBuffer(buffer) {
  try {
    const samples = await decodeToPCM(buffer);
    if (!samples || !samples.length) return { peaks: [], features: null };

    return await dispatchToWorker(samples, SAMPLE_RATE, NUM_PEAKS);
  } catch (err) {
    console.log("Audio analysis failed (non-fatal):", err.message);
    return { peaks: [], features: null };
  }
}

export function terminateAudioWorker() {
  terminateWorker();
}
