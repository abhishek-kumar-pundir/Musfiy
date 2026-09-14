import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, AudioLines, Loader2, ListPlus } from "lucide-react";
import toast from "react-hot-toast";
import { usePlayerStore } from "../stores/usePlayerStore";
import { useTrackStore } from "../stores/useTrackStore";

const TrackCard = ({ track, index }) => {
  const playTrack = usePlayerStore((s) => s.playTrack);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const queueTracks = usePlayerStore((s) => s.queueTracks);
  const allTracks = useTrackStore((s) => s.allTracks);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const fetchSimilarTracks = useTrackStore((s) => s.fetchSimilarTracks);
  const similarTracks = useTrackStore((s) => s.similarCache[track._id]);
  const similarLoading = useTrackStore((s) => s.similarLoading[track._id]);
  const [showSimilar, setShowSimilar] = useState(false);

  const isCurrent = currentTrack?._id === track._id;
  const isTrackPlaying = isCurrent && isPlaying;

  const handlePlay = () => {
    if (isCurrent) {
      usePlayerStore.setState((s) => ({ isPlaying: !s.isPlaying }));
    } else {
      setQueue(allTracks, "library");
      playTrack(track);
    }
  };

  const toggleSimilar = (e) => {
    e.stopPropagation();
    const next = !showSimilar;
    setShowSimilar(next);
    if (next && !similarTracks) fetchSimilarTracks(track._id);
  };

  const playSimilar = (similarTrack, e) => {
    e.stopPropagation();
    setQueue([track, ...similarTracks], "similar");
    playTrack(similarTrack);
  };

  const queueAllMatches = (e) => {
    e.stopPropagation();
    queueTracks(similarTracks);
    toast.success(`Queue ready — ${similarTracks.length} tracks added`);
  };

  const fmtDuration = (s) => {
    if (!s) return null;
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  return (
    <div>
      <div
        className={`group relative flex items-center gap-3 py-2.5 px-2 -mx-2 cursor-pointer transition-colors duration-150 ${
          isCurrent ? "bg-base-200" : "hover:bg-base-200/60"
        }`}
        style={{
          borderLeft: isCurrent ? "2px solid rgb(var(--c-accent))" : "2px solid transparent",
        }}
        onClick={handlePlay}
      >
        {/* Index */}
        <span className="w-6 text-right text-xs tabular-nums text-subtle flex-shrink-0">
          {isTrackPlaying ? (
            <AudioLines size={13} className="text-primary ml-auto" />
          ) : (
            String(index + 1).padStart(2, "0")
          )}
        </span>

        {/* Artwork */}
        <div className="w-9 h-9 rounded-md bg-base-300 flex items-center justify-center flex-shrink-0 overflow-hidden">
          <AudioLines size={15} className="text-subtle" />
        </div>

        {/* Title / Artist */}
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold truncate ${isCurrent ? "text-primary" : "text-base-content"}`}>
            {track.title}
          </h3>
          <p className="text-xs text-muted truncate">{track.artist}</p>
        </div>

        {/* "More like this" trigger — plain, no magic-button framing */}
        {track.audioFeatures?.energy != null && (
          <button
            title="Similar tracks"
            onClick={toggleSimilar}
            className={`text-[11px] font-medium flex-shrink-0 px-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${
              showSimilar ? "text-primary opacity-100" : "text-subtle hover:text-base-content"
            }`}
          >
            Similar
          </button>
        )}

        {/* Duration */}
        {fmtDuration(track.duration) && (
          <span className="text-xs text-subtle tabular-nums flex-shrink-0 w-9 text-right">
            {fmtDuration(track.duration)}
          </span>
        )}

        {/* Play/Pause — appears on hover, or always if active */}
        <button
          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-opacity ${
            isCurrent
              ? "bg-primary text-primary-content opacity-100"
              : "text-base-content opacity-0 group-hover:opacity-100 hover:bg-base-300"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            handlePlay();
          }}
        >
          {isTrackPlaying ? (
            <Pause size={13} fill="currentColor" />
          ) : (
            <Play size={13} fill="currentColor" className="ml-0.5" />
          )}
        </button>
      </div>

      {/* Similar-tracks panel — technical framing, not "magic" */}
      <AnimatePresence initial={false}>
        {showSimilar && (
          <motion.div
            key="similar-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="ml-9 mb-2 pl-4 border-l border-edge py-2">
              {similarLoading ? (
                <div className="flex items-center gap-2 text-xs text-subtle py-1.5">
                  <Loader2 size={12} className="animate-spin" />
                  Analyzing sound...
                </div>
              ) : !similarTracks || similarTracks.length === 0 ? (
                <p className="text-xs text-subtle py-1.5">No similar tracks found yet.</p>
              ) : (
                <>
                  <div className="mb-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
                      Similar to {track.title}
                    </p>
                    <p className="text-[10px] text-subtle/80 mt-0.5">
                      energy · tempo · spectral profile
                    </p>
                  </div>

                  <button
                    onClick={queueAllMatches}
                    className="flex items-center gap-1.5 text-[11px] text-primary hover:opacity-80 mb-1.5"
                  >
                    <ListPlus size={11} />
                    Queue all {similarTracks.length}
                  </button>

                  {similarTracks.map((s) => (
                    <div
                      key={s._id}
                      className="flex items-center gap-2 py-1.5 cursor-pointer hover:text-primary"
                      onClick={(e) => playSimilar(s, e)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{s.title}</p>
                        <p className="text-[11px] text-muted truncate">{s.artist}</p>
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-base-content flex-shrink-0">
                        {Math.round(s.similarity * 100)}%
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrackCard;
