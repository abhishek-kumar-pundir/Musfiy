import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Volume2,
  VolumeX,
  Repeat,
  AudioLines,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayerStore } from "../stores/usePlayerStore";
import api from '../lib/api.js';
import Waveform from "./Waveform";
import AudioVisualizer from "./AudioVisualizer";

const AudioPlayer = () => {
  const audioRef = useRef(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [loop, setLoop] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const trackedRef = useRef(false);

  const { currentTrack, isPlaying, next, prev, shuffle } = usePlayerStore();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    trackedRef.current = false;
    audio.load();

    const playWhenReady = () => {
      if (usePlayerStore.getState().isPlaying) audio.play().catch(() => {});
    };

    audio.addEventListener("loadeddata", playWhenReady);
    return () => audio.removeEventListener("loadeddata", playWhenReady);
  }, [currentTrack]);

  // Lazy-load waveform peaks on demand only for the actively playing track
  useEffect(() => {
    if (!currentTrack?._id) return;
    if (currentTrack.waveformPeaks && currentTrack.waveformPeaks.length > 0) return;

    let isMounted = true;
    api
      .get(`/api/track/${currentTrack._id}/waveform`)
      .then((res) => {
        if (isMounted && res.data?.waveformPeaks?.length) {
          usePlayerStore.setState((state) => {
            if (state.currentTrack?._id === currentTrack._id) {
              return {
                currentTrack: {
                  ...state.currentTrack,
                  waveformPeaks: res.data.waveformPeaks,
                },
              };
            }
            return state;
          });
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [currentTrack?._id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.play().catch(() => {});
    else audio.pause();
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => { if (!isSeeking) setCurrentTime(audio.currentTime); };
    const updateMeta = () => { setDuration(audio.duration || 1); audio.volume = volume; };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadeddata", updateMeta);
    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadeddata", updateMeta);
    };
  }, [currentTrack, isSeeking, volume]);

  useEffect(() => {
    let raf;
    const tick = () => {
      const audio = audioRef.current;
      if (audio && !audio.paused && !isSeeking) setCurrentTime(audio.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isSeeking]);

  const fmt = (t) => (isNaN(t) ? "0:00" : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`);

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) { audio.volume = volume; setIsMuted(false); }
    else { audio.volume = 0; setIsMuted(true); }
  };

  useEffect(() => {
    const handler = (e) => {
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;

      if (e.code === "Space") { e.preventDefault(); usePlayerStore.setState((s) => ({ isPlaying: !s.isPlaying })); }
      if (e.code === "ArrowRight") next();
      if (e.code === "ArrowLeft") prev();
      if (e.code === "KeyM") toggleMute();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next, prev, isMuted, volume]);

  const handleSeek = (e) => {
    const rect = e.target.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    setCurrentTime(percent * duration);
  };

  const commitSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const rect = e.target.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * duration;
    setIsSeeking(false);
  };

  const seekToPercent = (percent) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = percent * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };



  const prevTrackIdRef = useRef(null);
  const prefetchedUrlsRef = useRef(new Set());

  useEffect(() => {
    const prevId = prevTrackIdRef.current;
    const currId = currentTrack?._id;
    if (prevId && currId && prevId !== currId) {
      api.post("/api/transition", { from: prevId, to: currId }).catch(() => {});
    }
    prevTrackIdRef.current = currId;
    if (!currId) return;

    const requestIdle = window.requestIdleCallback || ((cb) => setTimeout(cb, 300));
    const cancelIdle = window.cancelIdleCallback || clearTimeout;

    const idleHandle = requestIdle(async () => {
      let nextUrl = null;
      try {
        const res = await api.get(`/api/transition/predict/${currId}`);
        const predictedId = res.data?.predictedTrackId;
        if (predictedId) {
          const { queue } = usePlayerStore.getState();
          const predictedTrack = queue.find((t) => t._id === predictedId);
          if (predictedTrack) nextUrl = predictedTrack.fileUrl;
        }
      } catch {
        // Fallback to sequential queue if prediction is unavailable
      }

      if (!nextUrl) {
        const { queue, currentIndex } = usePlayerStore.getState();
        const fallback = queue[currentIndex + 1];
        if (fallback) nextUrl = fallback.fileUrl;
      }

      if (nextUrl && !prefetchedUrlsRef.current.has(nextUrl)) {
        prefetchedUrlsRef.current.add(nextUrl);
        fetch(nextUrl, { mode: "no-cors" }).catch(() => {});
      }
    });

    return () => cancelIdle(idleHandle);
  }, [currentTrack]);

  const [analyser, setAnalyser] = useState(null);
  const [corsBlocked, setCorsBlocked] = useState(false);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || audioCtxRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextClass();
      const source = ctx.createMediaElementSource(audio);
      const node = ctx.createAnalyser();
      node.fftSize = 64;
      source.connect(node);
      node.connect(ctx.destination);
      audioCtxRef.current = ctx;
      setAnalyser(node);
    } catch (err) {
      console.log("Audio visualizer unavailable (non-fatal):", err.message);
    }
    return () => { audioCtxRef.current?.close().catch(() => {}); };
  }, []);

  useEffect(() => {
    if (isPlaying && audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
  }, [isPlaying]);

  const isFirstCorsCheck = useRef(true);
  useEffect(() => {
    if (isFirstCorsCheck.current) { isFirstCorsCheck.current = false; return; }
    const audio = audioRef.current;
    if (!audio || !corsBlocked) return;
    const wasPlaying = usePlayerStore.getState().isPlaying;
    audio.load();
    if (wasPlaying) audio.play().catch(() => {});
  }, [corsBlocked]);

  if (!currentTrack) return null;

  return (
    <div
      className="fixed bottom-0 left-0 w-full bg-base-100/95 backdrop-blur-2xl border-t border-edge z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >

      {/* Waveform / progress */}
      {currentTrack.waveformPeaks?.length > 0 ? (
        <Waveform
          peaks={currentTrack.waveformPeaks}
          currentTime={currentTime}
          duration={duration}
          onSeek={seekToPercent}
        />
      ) : (
        <div
          className="w-full h-[3px] bg-base-300 cursor-pointer relative"
          onMouseDown={() => setIsSeeking(true)}
          onMouseUp={commitSeek}
          onClick={commitSeek}
          onMouseMove={(e) => isSeeking && handleSeek(e)}
        >
          <div className="h-full bg-primary" style={{ width: `${(currentTime / duration) * 100}%` }} />
        </div>
      )}

      {/* Compact player row */}
      <div className="px-4 sm:px-5 py-2 flex items-center justify-between gap-3">

        {/* Track info — hidden on mobile */}
        <div className="hidden sm:flex items-center gap-2.5 w-1/3 min-w-0">
          <div className="w-9 h-9 rounded-md bg-base-300 flex items-center justify-center flex-shrink-0">
            <AudioLines size={15} className="text-subtle" />
          </div>
          <div className="truncate min-w-0">
            <h3 className="font-semibold text-xs truncate">{currentTrack.title}</h3>
            <p className="text-[11px] text-muted truncate">{currentTrack.artist}</p>
          </div>
          <AudioVisualizer analyser={analyser} isPlaying={isPlaying} />
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-0.5 w-full sm:w-1/3">
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={shuffle} className="btn btn-xs btn-ghost btn-circle text-subtle hover:text-base-content hidden sm:flex">
              <Shuffle size={14} />
            </button>

            <button onClick={prev} className="btn btn-xs btn-ghost btn-circle text-subtle hover:text-base-content">
              <SkipBack size={16} />
            </button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              className="w-9 h-9 rounded-full bg-primary text-primary-content flex items-center justify-center"
              onClick={() => usePlayerStore.setState((s) => ({ isPlaying: !s.isPlaying }))}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isPlaying ? "pause" : "play"}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.12 }}
                  className="flex items-center justify-center"
                >
                  {isPlaying ? (
                    <Pause size={16} fill="currentColor" />
                  ) : (
                    <Play size={16} fill="currentColor" className="ml-0.5" />
                  )}
                </motion.span>
              </AnimatePresence>
            </motion.button>

            <button onClick={next} className="btn btn-xs btn-ghost btn-circle text-subtle hover:text-base-content">
              <SkipForward size={16} />
            </button>

            <button
              className={`btn btn-xs btn-ghost btn-circle hidden sm:flex ${loop ? "text-primary" : "text-subtle hover:text-base-content"}`}
              onClick={() => setLoop(!loop)}
            >
              <Repeat size={14} />
            </button>
          </div>

          <div className="text-[10px] font-mono text-subtle tabular-nums">
            {fmt(currentTime)} / {fmt(duration)}
          </div>
        </div>

        {/* Volume — hidden on mobile */}
        <div className="hidden sm:flex items-center gap-2 w-1/3 justify-end">
          <button onClick={toggleMute} className="btn btn-xs btn-ghost btn-circle text-subtle hover:text-base-content">
            {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              audioRef.current.volume = v;
              setIsMuted(v === 0);
            }}
            className="w-20"
          />
        </div>
      </div>

      <audio
        ref={audioRef}
        loop={loop}
        preload="metadata"
        crossOrigin={corsBlocked ? undefined : "anonymous"}
        src={currentTrack.fileUrl || ""}
        onEnded={next}
        onError={() => {
          if (!corsBlocked) {
            console.log("Audio failed to load with CORS enabled — disabling the visualizer and retrying in normal playback mode.");
            setCorsBlocked(true);
          }
        }}
        onPlay={async () => {
          if (!trackedRef.current && currentTrack?._id) {
            trackedRef.current = true;
            try { await api.post(`/api/track/play/${currentTrack._id}`); }
            catch (err) { console.log("Play tracking failed:", err); }
          }
        }}
      />
    </div>
  );
};

export default AudioPlayer;
