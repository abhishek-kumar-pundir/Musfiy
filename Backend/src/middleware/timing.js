import { performance } from "node:perf_hooks";

/**
 * Lightweight W3C Server-Timing middleware for Express.
 * Measures server response time and optional sub-metrics (e.g. database, dsp)
 * without third-party APM overhead.
 * Appears directly in browser DevTools Network tab -> "Timing" panel.
 */
export function serverTimingMiddleware(req, res, next) {
  const start = performance.now();
  const metrics = [];

  // Helper for route handlers to measure internal sub-operations
  req.startTiming = (name) => {
    const t0 = performance.now();
    return () => {
      const dur = performance.now() - t0;
      metrics.push(`${name};dur=${dur.toFixed(1)}`);
      return dur;
    };
  };

  const originalSend = res.send.bind(res);

  res.send = function (body) {
    if (!res.headersSent) {
      const totalDur = performance.now() - start;
      metrics.push(`total;dur=${totalDur.toFixed(1)}`);
      res.setHeader("Server-Timing", metrics.join(", "));
    }
    return originalSend(body);
  };

  next();
}
