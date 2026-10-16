import { useEffect, useRef } from "react";

// A real-time bar visualizer driven by an AnalyserNode reading actual
// frequency data from the currently playing <audio> element via the Web
// Audio API — this is genuinely reacting to the track's spectrum each
// frame, not a decorative CSS pulse timed to guesswork.
//
// Performance optimization: When paused, RAF loop is stopped completely
// and the idle state is drawn once, eliminating continuous 60 FPS canvas
// redraws during paused state.
const BAR_COUNT = 24;

const AudioVisualizer = ({ analyser, isPlaying }) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    const bufferLength = analyser.frequencyBinCount;
    const data = new Uint8Array(bufferLength);
    const step = Math.max(1, Math.floor(bufferLength / BAR_COUNT));

    const width = canvas.width;
    const height = canvas.height;
    const barWidth = width / BAR_COUNT;
    const barDrawWidth = Math.max(barWidth - 2, 1);
    const fillStyle = "rgb(200 255 61)"; // accent color

    // If audio is paused, draw idle resting bars once and do NOT spin RAF
    if (!isPlaying) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = fillStyle;
      for (let i = 0; i < BAR_COUNT; i++) {
        const x = i * barWidth;
        ctx.fillRect(x, height - 2, barDrawWidth, 2);
      }
      return;
    }

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = fillStyle;

      for (let i = 0; i < BAR_COUNT; i++) {
        const value = data[i * step] || 0;
        const barHeight = Math.max((value / 255) * height, 2);
        const x = i * barWidth;
        ctx.fillRect(x, height - barHeight, barDrawWidth, barHeight);
      }
    };

    draw();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, isPlaying]);

  if (!analyser) return null;

  return <canvas ref={canvasRef} width={64} height={32} className="rounded-md" />;
};

export default AudioVisualizer;
