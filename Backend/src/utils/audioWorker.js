import { parentPort } from "node:worker_threads";
import FFT from "fft.js";

const round3 = (n) => Math.round(n * 1000) / 1000;

/** Min/max amplitude per time-bucket, for a scrub-able waveform UI. */
export function extractPeaks(samples, numPeaks = 200) {
  if (!samples || !samples.length) return [];
  const blockSize = Math.max(1, Math.floor(samples.length / numPeaks));
  const peaks = [];

  for (let i = 0; i < numPeaks; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, samples.length);
    let min = 0;
    let max = 0;
    for (let j = start; j < end; j++) {
      const v = samples[j];
      if (v > max) max = v;
      if (v < min) min = v;
    }
    peaks.push([round3(min), round3(max)]);
  }

  return peaks;
}

export function rmsEnergy(samples) {
  if (!samples || !samples.length) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

export function zeroCrossingRate(samples) {
  if (!samples || samples.length < 2) return 0;
  let crossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i] >= 0) !== (samples[i - 1] >= 0)) crossings++;
  }
  return crossings / samples.length;
}

/**
 * Spectral centroid: the "center of mass" of the frequency spectrum — a
 * standard DSP proxy for perceived brightness. Computed per windowed frame
 * (Hann window to reduce spectral leakage) and averaged across the track.
 */
export function spectralCentroid(samples, sampleRate = 8000) {
  const frameSize = 1024; // must be a power of two for FFT
  if (!samples || samples.length < frameSize) return 0;
  const fft = new FFT(frameSize);
  const out = fft.createComplexArray();
  const data = fft.createComplexArray();

  let centroidSum = 0;
  let frameCount = 0;

  for (let start = 0; start + frameSize <= samples.length; start += frameSize) {
    for (let i = 0; i < frameSize; i++) {
      const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (frameSize - 1));
      data[2 * i] = samples[start + i] * hann;
      data[2 * i + 1] = 0;
    }

    fft.transform(out, data);

    let weightedSum = 0;
    let magSum = 0;
    const bins = frameSize / 2;
    for (let k = 0; k < bins; k++) {
      const re = out[2 * k];
      const im = out[2 * k + 1];
      const mag = Math.sqrt(re * re + im * im);
      const freq = (k * sampleRate) / frameSize;
      weightedSum += freq * mag;
      magSum += mag;
    }

    if (magSum > 0) {
      centroidSum += weightedSum / magSum;
      frameCount++;
    }
  }

  return frameCount ? centroidSum / frameCount : 0;
}

/**
 * Tempo estimate via an onset-strength envelope + autocorrelation — a
 * simplified version of the "novelty function" technique real beat
 * trackers use: find where short-term energy rises sharply (an onset),
 * then find the periodicity of those rises.
 */
export function estimateTempo(samples, sampleRate = 8000) {
  const frameDuration = 0.02; // 20ms frames
  const hop = Math.round(sampleRate * frameDuration);
  const frameCount = Math.floor(samples.length / hop);
  if (frameCount < 4) return 0;

  const energy = new Float32Array(frameCount);
  for (let i = 0; i < frameCount; i++) {
    let sum = 0;
    const start = i * hop;
    for (let j = 0; j < hop && start + j < samples.length; j++) {
      sum += samples[start + j] * samples[start + j];
    }
    energy[i] = sum / hop;
  }

  // Half-wave rectified energy diff = "onset strength"
  const onset = new Float32Array(frameCount);
  for (let i = 1; i < frameCount; i++) {
    onset[i] = Math.max(0, energy[i] - energy[i - 1]);
  }

  // Autocorrelate the onset envelope over a plausible tempo range
  // (60–180 BPM) to find the dominant beat period.
  const framesPerSec = 1 / frameDuration;
  const minLag = Math.round(framesPerSec * (60 / 180));
  const maxLag = Math.round(framesPerSec * (60 / 60));

  let bestLag = 0;
  let bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag && lag < frameCount; lag++) {
    let score = 0;
    for (let i = lag; i < frameCount; i++) {
      score += onset[i] * onset[i - lag];
    }
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }

  if (!bestLag) return 0;
  return Math.round((framesPerSec * 60) / bestLag);
}

export function computeAudioDSP(samples, sampleRate = 8000, numPeaks = 200) {
  if (!samples || !samples.length) {
    return { peaks: [], features: null };
  }

  const peaks = extractPeaks(samples, numPeaks);
  const features = {
    energy: round3(rmsEnergy(samples)),
    brightness: round3(spectralCentroid(samples, sampleRate) / (sampleRate / 2)),
    zcr: round3(zeroCrossingRate(samples)),
    tempo: estimateTempo(samples, sampleRate),
  };

  return { peaks, features };
}

// Worker message dispatcher: executes off the Node.js main event loop
if (parentPort) {
  parentPort.on("message", (msg) => {
    try {
      const { id, samples, sampleRate = 8000, numPeaks = 200 } = msg;
      const result = computeAudioDSP(samples, sampleRate, numPeaks);
      parentPort.postMessage({ id, success: true, ...result });
    } catch (err) {
      parentPort.postMessage({
        id: msg?.id,
        success: false,
        error: err.message || String(err),
      });
    }
  });
}
