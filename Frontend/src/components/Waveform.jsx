import { useId } from "react";

// Renders a real amplitude waveform from server-extracted peak data
// (see Backend/src/utils/audioAnalysis.js) and lets the user click
// anywhere on it to seek — like SoundCloud/Spotify, not a plain progress
// bar. Falls back gracefully wherever it's used: if a track has no
// peaks yet (uploaded before this feature existed), the caller just
// doesn't render this component.
//
// The "played" portion is drawn as a second identical layer of bars,
// clipped by a <clipPath> rect whose width is a continuous float
// (progress * width) rather than snapping per-bar — combined with the
// requestAnimationFrame-driven currentTime in AudioPlayer, this is what
// makes the sweep look like it's flowing instead of stepping bar by bar.
const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 48;

const Waveform = ({ peaks, currentTime, duration, onSeek }) => {
  const clipId = useId();

  if (!peaks || peaks.length === 0) return null;

  const mid = VIEW_HEIGHT / 2;
  const barWidth = VIEW_WIDTH / peaks.length;
  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
  const progressX = progress * VIEW_WIDTH;

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    onSeek(percent);
  };

  const bars = peaks.map(([min, max], i) => {
    const height = Math.max((max - min) * mid * 0.75, 1); // 0.75: thinner, denser feel
    const y = mid - (max * mid * 0.75);
    return (
      <rect
        key={i}
        x={i * barWidth}
        y={y}
        width={Math.max(barWidth - 1.2, 0.5)}
        height={height}
        rx={0.75}
      />
    );
  });

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="none"
      className="w-full h-6 sm:h-7 cursor-pointer"
      onClick={handleSeek}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={progressX} height={VIEW_HEIGHT} />
        </clipPath>
      </defs>

      {/* Base layer: full waveform, muted unplayed color */}
      <g style={{ fill: "rgb(var(--c-subtle))" }}>{bars}</g>

      {/* Played layer: identical bars, clipped to the continuous progress
          position, played color — this is the moving "flow" */}
      <g className="fill-primary" clipPath={`url(#${clipId})`}>
        {bars}
      </g>
    </svg>
  );
};

export default Waveform;
