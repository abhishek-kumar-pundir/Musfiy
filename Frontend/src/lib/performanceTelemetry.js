/**
 * Lightweight Frontend Core Web Vitals & Performance Observer.
 * Uses browser-native PerformanceObserver without heavy third-party analytics libraries.
 * Reports TTFB, FCP, LCP, and CLS for regression detection and production diagnostics.
 */

export function initPerformanceTelemetry() {
  if (typeof window === "undefined" || !("PerformanceObserver" in window)) {
    return;
  }

  const isDebug =
    import.meta.env.DEV ||
    window.localStorage?.getItem("musify_debug_perf") === "true";

  const metrics = {
    ttfb: null,
    fcp: null,
    lcp: null,
    cls: 0,
  };

  const logMetric = (name, value, unit = "ms") => {
    if (isDebug) {
      console.log(
        `%c[Perf] ${name.toUpperCase()}%c: ${value.toFixed(1)}${unit}`,
        "color: #c8ff3d; font-weight: bold;",
        "color: inherit;"
      );
    }
  };

  try {
    // 1. Navigation Timing (TTFB)
    const navObserver = new PerformanceObserver((list) => {
      const entry = list.getEntries()[0];
      if (entry && entry.responseStart) {
        metrics.ttfb = entry.responseStart - entry.requestStart;
        logMetric("ttfb", metrics.ttfb);
      }
    });
    navObserver.observe({ type: "navigation", buffered: true });

    // 2. First Contentful Paint (FCP)
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          metrics.fcp = entry.startTime;
          logMetric("fcp", metrics.fcp);
        }
      }
    });
    paintObserver.observe({ type: "paint", buffered: true });

    // 3. Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        metrics.lcp = lastEntry.startTime;
        logMetric("lcp", metrics.lcp);
      }
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

    // 4. Cumulative Layout Shift (CLS)
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          metrics.cls += entry.value;
          logMetric("cls", metrics.cls, "");
        }
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
  } catch {
    // Graceful fallback if any specific observer type is unsupported
  }

  // Expose on window for automated CDP benchmark harness
  if (typeof window !== "undefined") {
    window.__musify_metrics__ = metrics;
  }
}
