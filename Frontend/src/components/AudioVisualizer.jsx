import { useEffect, useRef } from "react";

// A real-time bar visualizer driven by an AnalyserNode reading actual
// frequency data from the currently playing <audio> element via the Web
// Audio API — this is genuinely reacting to the track's spectrum each
// frame, not a decorative CSS pulse timed to guesswork.
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

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const barWidth = width / BAR_COUNT;
      ctx.fillStyle = "rgb(200 255 61)"; // the one accent — no gradient

      for (let i = 0; i < BAR_COUNT; i++) {
        const value = data[i * step] || 0;
        const barHeight = isPlaying ? Math.max((value / 255) * height, 2) : 2;
        const x = i * barWidth;
        ctx.fillRect(x, height - barHeight, Math.max(barWidth - 2, 1), barHeight);
      }
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, isPlaying]);

  if (!analyser) return null;

  return <canvas ref={canvasRef} width={64} height={32} className="rounded-md" />;
};

export default AudioVisualizer;
