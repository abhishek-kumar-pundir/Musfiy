import { useId, useMemo } from "react";

// Renders a real amplitude waveform from server-extracted peak data
// (see Backend/src/utils/audioAnalysis.js) and lets the user click
// anywhere on it to seek — like SoundCloud/Spotify, not a plain progress
// bar.
//
// Performance optimization: The 200 SVG rects are memoized with useMemo
// and referenced via SVG <defs> + <use>, preventing 24,000 VDOM rect allocations
// per second during 60 FPS playback.
const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 48;

const Waveform = ({ peaks, currentTime, duration, onSeek }) => {
  const clipId = useId();
  const barsId = useId();

  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
  const progressX = progress * VIEW_WIDTH;

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    onSeek(percent);
  };

  const bars = useMemo(() => {
    if (!peaks || peaks.length === 0) return null;

    const mid = VIEW_HEIGHT / 2;
    const barWidth = VIEW_WIDTH / peaks.length;

    return peaks.map(([min, max], i) => {
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
  }, [peaks]);

  if (!peaks || peaks.length === 0) return null;

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="none"
      className="w-full h-6 sm:h-7 cursor-pointer"
      onClick={handleSeek}
    >
      <defs>
        <g id={barsId}>{bars}</g>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={progressX} height={VIEW_HEIGHT} />
        </clipPath>
      </defs>

      {/* Base layer: full waveform, muted unplayed color */}
      <use href={`#${barsId}`} style={{ fill: "rgb(var(--c-subtle))" }} />

      {/* Played layer: identical bars, clipped to the continuous progress
          position, played color — moving flow */}
      <use href={`#${barsId}`} className="fill-primary" clipPath={`url(#${clipId})`} />
    </svg>
  );
};

export default Waveform;
