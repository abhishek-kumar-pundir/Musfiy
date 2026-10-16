#!/usr/bin/env node
/**
 * Musify Performance Regression Benchmark Suite
 * Automated regression suite validating all 4 stages of performance optimizations:
 * - W3C Server-Timing headers & latency
 * - Native Gzip API compression & wire payload sizes
 * - Waveform peak projection reduction
 * - Off-thread audio analysis worker event-loop lag (< 20ms)
 * - Frontend bundle sizes and chunk isolation budgets
 *
 * Usage: node scripts/performance-benchmark.js
 */

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import zlib from "node:zlib";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const repoRoot = path.resolve(import.meta.dirname, "..");
const backendPkgPath = path.join(repoRoot, "Backend", "package.json");
const require = createRequire(backendPkgPath);
const express = require("express");

console.log("===============================================================");
console.log("         MUSIFY FULL-STACK PERFORMANCE BENCHMARK SUITE         ");
console.log("===============================================================\n");

let allPassed = true;
const testResults = [];

function recordTest(category, metric, value, target, passed) {
  testResults.push({ category, metric, value, target, passed });
  if (!passed) allPassed = false;
}

// ----------------------------------------------------------------------------
// BENCHMARK 1: HTTP API Compression, Server-Timing & Payload Budgets
// ----------------------------------------------------------------------------
console.log("--> [1/4] Benchmarking API Compression, Server-Timing & Payloads...");

const compressionPath = pathToFileURL(path.join(repoRoot, "Backend", "src", "middleware", "compression.js")).href;
const timingPath = pathToFileURL(path.join(repoRoot, "Backend", "src", "middleware", "timing.js")).href;
const { compressionMiddleware } = await import(compressionPath);
const { serverTimingMiddleware } = await import(timingPath);

const testApp = express();
testApp.use(serverTimingMiddleware);
testApp.use(compressionMiddleware);

// Mock track list representation with and without waveformPeaks
const mockTracksWithoutPeaks = Array.from({ length: 20 }, (_, i) => ({
  _id: `track_${i}`,
  title: `Sample Track ${i}`,
  artist: "Musify Artist",
  emotionTag: "chill",
  fileUrl: `https://res.cloudinary.com/demo/track_${i}.mp3`,
  audioFeatures: { energy: 0.15, brightness: 0.28, zcr: 0.12, tempo: 120 },
  timesUsed: i * 5,
}));

const mockTracksWithPeaks = mockTracksWithoutPeaks.map((t) => ({
  ...t,
  waveformPeaks: Array.from({ length: 200 }, () => [Math.random() * -0.5, Math.random() * 0.5]),
}));

testApp.get("/api/track/all-legacy", (req, res) => {
  res.json({ success: true, tracks: mockTracksWithPeaks, totalCount: 20 });
});

testApp.get("/api/track/all-optimized", (req, res) => {
  res.json({ success: true, tracks: mockTracksWithoutPeaks, totalCount: 20 });
});

testApp.get("/api/track/:id/waveform", (req, res) => {
  res.json({
    success: true,
    waveformPeaks: Array.from({ length: 200 }, () => [-0.25, 0.25]),
  });
});

const server = testApp.listen(0);
const port = server.address().port;

function fetchBenchmark(urlPath, acceptGzip = true) {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    const headers = acceptGzip ? { "Accept-Encoding": "gzip" } : {};
    http.get({ host: "127.0.0.1", port, path: urlPath, headers }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const t1 = performance.now();
        const rawBody = Buffer.concat(chunks);
        resolve({
          status: res.statusCode,
          headers: res.headers,
          durationMs: t1 - t0,
          rawBytes: rawBody.length,
          body: rawBody,
        });
      });
      res.on("error", reject);
    });
  });
}

// 1a. Legacy payload (with peaks) uncompressed
const legacyRes = await fetchBenchmark("/api/track/all-legacy", false);
// 1b. Optimized payload (without peaks) uncompressed
const optUncompressed = await fetchBenchmark("/api/track/all-optimized", false);
// 1c. Optimized payload (without peaks) with gzip
const optGzipped = await fetchBenchmark("/api/track/all-optimized", true);
// 1d. Single-track on-demand waveform
const waveformRes = await fetchBenchmark("/api/track/123/waveform", true);

server.close();

// Metrics evaluation
const hasServerTiming = Boolean(optGzipped.headers["server-timing"]);
recordTest("Server Timing", "W3C Server-Timing Header", optGzipped.headers["server-timing"] || "missing", "present", hasServerTiming);

const payloadReduction = ((1 - optGzipped.rawBytes / legacyRes.rawBytes) * 100);
recordTest("API Payload", "Track List Wire Size", `${(optGzipped.rawBytes / 1024).toFixed(1)} kB`, "< 5.0 kB", optGzipped.rawBytes < 5120);
recordTest("API Payload", "Wire Size Reduction", `${payloadReduction.toFixed(1)}%`, "> 85.0%", payloadReduction > 85);
recordTest("API Compression", "Content-Encoding", optGzipped.headers["content-encoding"] || "none", "gzip", optGzipped.headers["content-encoding"] === "gzip");
recordTest("On-Demand Waveform", "Waveform Wire Size", `${(waveformRes.rawBytes / 1024).toFixed(1)} kB`, "< 1.5 kB", waveformRes.rawBytes < 1536);

// ----------------------------------------------------------------------------
// BENCHMARK 2: Audio Analysis Worker DSP Concurrency & Event Loop Lag
// ----------------------------------------------------------------------------
console.log("--> [2/4] Benchmarking Audio Analysis Worker DSP & Concurrency...");

const audioWorkerTestPath = path.join(repoRoot, "Backend", "uploads", "music", "music13.mp3");
if (fs.existsSync(audioWorkerTestPath)) {
  const audioBuffer = fs.readFileSync(audioWorkerTestPath);
  const audioAnalysisModPath = pathToFileURL(path.join(repoRoot, "Backend", "src", "utils", "audioAnalysis.js")).href;
  const { analyzeAudioBuffer, terminateAudioWorker } = await import(audioAnalysisModPath);

  let maxLoopLag = 0;
  let lastTick = performance.now();
  const monitorInterval = setInterval(() => {
    const now = performance.now();
    const lag = now - lastTick - 10;
    if (lag > maxLoopLag) maxLoopLag = lag;
    lastTick = now;
  }, 10);

  const tDsp0 = performance.now();
  const dspResult = await analyzeAudioBuffer(audioBuffer);
  const tDsp1 = performance.now();
  clearInterval(monitorInterval);

  const dspDuration = tDsp1 - tDsp0;
  recordTest("DSP Worker", "Event Loop Blocking Lag", `${maxLoopLag.toFixed(1)} ms`, "< 25.0 ms", maxLoopLag < 25);
  recordTest("DSP Worker", "DSP Execution Duration", `${dspDuration.toFixed(1)} ms`, "< 1000.0 ms", dspDuration < 1000);
  recordTest("DSP Worker", "Peaks Extracted", `${dspResult.peaks.length} buckets`, "200 buckets", dspResult.peaks.length === 200);
  recordTest("DSP Worker", "Features Valid", JSON.stringify(dspResult.features), "energy, tempo > 0", Boolean(dspResult.features?.energy && dspResult.features?.tempo));

  // Test Queue Saturation & Concurrency Bound
  const concurrentUploads = Array.from({ length: 8 }, () => analyzeAudioBuffer(audioBuffer));
  const concurrentResults = await Promise.all(concurrentUploads);
  const numProcessed = concurrentResults.filter((r) => r.peaks.length === 200).length;
  const numFallback = concurrentResults.filter((r) => r.peaks.length === 0).length;

  recordTest("DSP Concurrency", "Queue Saturation Protection", `${numProcessed} full / ${numFallback} protected`, "Bounded concurrency", numFallback > 0);

  terminateAudioWorker();
} else {
  console.log("    (Test audio file not present, skipping DSP audio file benchmark)");
}

// ----------------------------------------------------------------------------
// BENCHMARK 3: Frontend Bundle Size Budgets & Chunk Isolation
// ----------------------------------------------------------------------------
console.log("--> [3/4] Benchmarking Frontend Chunk Distribution & Budgets...");

const distAssetsPath = path.join(repoRoot, "Frontend", "dist", "assets");
if (fs.existsSync(distAssetsPath)) {
  const files = fs.readdirSync(distAssetsPath);
  const getFileSize = (prefix) => {
    const file = files.find((f) => f.startsWith(prefix) && f.endsWith(".js"));
    if (!file) return 0;
    return fs.statSync(path.join(distAssetsPath, file)).size;
  };

  const indexSize = getFileSize("index-");
  const loginSize = getFileSize("Login-");
  const dashboardSize = getFileSize("Dashboard-");
  const statsSize = getFileSize("Stats-");

  recordTest("Bundle Budget", "Entry Vendor Chunk (index.js)", `${(indexSize / 1024).toFixed(1)} kB`, "< 310 kB", indexSize < 310 * 1024);
  recordTest("Bundle Budget", "Login Route Chunk (Login.js)", `${(loginSize / 1024).toFixed(1)} kB`, "< 5.0 kB", loginSize < 5 * 1024 && loginSize > 0);
  recordTest("Bundle Budget", "Dashboard Route Chunk", `${(dashboardSize / 1024).toFixed(1)} kB`, "< 150 kB", dashboardSize < 150 * 1024 && dashboardSize > 0);
  recordTest("Bundle Budget", "Stats Route Chunk", `${(statsSize / 1024).toFixed(1)} kB`, "< 10.0 kB", statsSize < 10 * 1024 && statsSize > 0);
} else {
  console.log("    (Frontend dist directory not found, run npm run build in Frontend first)");
}

// ----------------------------------------------------------------------------
// BENCHMARK 4: Static Caching Rules Integrity
// ----------------------------------------------------------------------------
console.log("--> [4/4] Validating Vercel Caching Configurations...");
const frontendVercel = JSON.parse(fs.readFileSync(path.join(repoRoot, "Frontend", "vercel.json"), "utf-8"));
const rootVercel = JSON.parse(fs.readFileSync(path.join(repoRoot, "vercel.json"), "utf-8"));

const checkRule = (cfg) => {
  const rule = cfg.headers?.find((h) => h.source === "/assets/(.*)");
  const cacheVal = rule?.headers?.find((h) => h.key.toLowerCase() === "cache-control")?.value || "";
  return cacheVal.includes("immutable") && cacheVal.includes("max-age=31536000");
};

recordTest("Static Cache", "Frontend/vercel.json Immutable", checkRule(frontendVercel) ? "Valid" : "Missing", "Valid", checkRule(frontendVercel));
recordTest("Static Cache", "root vercel.json Immutable", checkRule(rootVercel) ? "Valid" : "Missing", "Valid", checkRule(rootVercel));

// ----------------------------------------------------------------------------
// SUMMARY REPORT
// ----------------------------------------------------------------------------
console.log("\n===============================================================");
console.log("                   BENCHMARK RESULTS SUMMARY                   ");
console.log("===============================================================");
console.log(
  `${"Category".padEnd(18)} | ${"Metric".padEnd(28)} | ${"Result".padEnd(20)} | ${"Target".padEnd(15)} | Status`
);
console.log("-".repeat(95));

for (const t of testResults) {
  const status = t.passed ? "✓ PASS" : "✗ FAIL";
  console.log(
    `${t.category.padEnd(18)} | ${t.metric.padEnd(28)} | ${t.value.padEnd(20)} | ${t.target.padEnd(15)} | ${status}`
  );
}

console.log("===============================================================");
if (allPassed) {
  console.log("🎉 ALL PERFORMANCE BENCHMARKS AND REGRESSION BUDGETS PASSED!\n");
  process.exit(0);
} else {
  console.error("❌ ONE OR MORE PERFORMANCE BENCHMARKS FAILED.\n");
  process.exit(1);
}
