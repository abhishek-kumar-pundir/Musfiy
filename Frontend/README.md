# Musify — Frontend

The client-side single-page application for Musify, built with React 19, Vite 7, Tailwind CSS, Zustand, and [ReactFastLoad](https://www.npmjs.com/package/react-fastload).

For the full architectural breakdown, audio analysis engine, and benchmark methodology, refer to the [Root README](../README.md).

## Key Features
- **Prioritized Route Scheduling:** The unauthenticated entry screen (`Login`) is statically imported to ensure immediate cold rendering and eliminate LCP waterfalls, while heavy authenticated routes (`Dashboard` with priority `HIGH`, `Stats` with priority `NORMAL`) and modals (`UploadTrackModal` with priority `LOW`) are scheduled dynamically through ReactFastLoad's `lazyComponent`.
- **Payload & Memory Optimization:** Reduces cold initial uncompressed JavaScript by **29.56%** (303.26 kB vs. 430.54 kB) and initial gzip transfer by **29.13%** (100.82 kB vs. 142.26 kB) while recovering cold LCP from the 832 ms lazy-loading delay down to **632 ms** (comparable to the 596 ms baseline).
- **Interactive SVG Waveform:** Continuous scrubbing powered by SVG `<clipPath>` synchronized via `requestAnimationFrame` without per-frame DOM re-rendering.
- **Real-Time Spectrum Visualizer:** HTML5 Canvas frequency bars driven by `requestAnimationFrame` and the Web Audio API's `AnalyserNode` without React Virtual DOM diffing overhead.
- **Live Performance Observability:** Core Web Vitals (FCP, LCP, CLS) and scheduler counters displayed directly in the Stats view via `useFastLoadMetrics()`.

## Scripts

```bash
# Start development server
npm run dev

# Run ESLint validation
npm run lint

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

## Environment Configuration
See [`.env.example`](./.env.example) for the expected environment variables:
- `VITE_BACKEND_URL`: URL of the backend API (defaults to `http://localhost:6001` in development).

