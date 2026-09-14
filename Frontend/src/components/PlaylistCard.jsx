import { Play, Pause, AudioLines } from "lucide-react";
import { usePlayerStore } from "../stores/usePlayerStore";
import { usePlaylistStore } from "../stores/usePlaylistStore";

const titleCase = (s) =>
  s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());

const PlaylistCard = ({ playlist }) => {
  const setQueue = usePlayerStore((s) => s.setQueue);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const lastMood = usePlaylistStore((s) => s.lastMood);

  const handlePlay = (track) => {
    if (currentTrack?._id === track._id) {
      usePlayerStore.setState((s) => ({ isPlaying: !s.isPlaying }));
    } else {
      setQueue(playlist, "playlist");
      playTrack(track);
    }
  };

  const isCurrentTrack = (track) => currentTrack?._id === track._id;

  const totalSeconds = playlist.reduce((sum, t) => sum + (t.duration || 0), 0);
  const totalMinutes = totalSeconds ? Math.round(totalSeconds / 60) : null;

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle mb-1">
        Your Mix
      </p>
      <h2 className="text-lg font-bold text-base-content mb-1">
        {lastMood ? titleCase(lastMood) : "Generated Mix"}
      </h2>
      <p className="text-xs text-muted mb-4">
        {playlist.length} {playlist.length === 1 ? "track" : "tracks"}
        {totalMinutes ? ` · ${totalMinutes} min` : ""}
      </p>

      <div>
        {playlist.map((track) => {
          const isCurrent = isCurrentTrack(track);
          const isTrackPlaying = isCurrent && isPlaying;

          return (
            <div
              key={track._id}
              className={`group relative flex items-center gap-3 py-2.5 px-2 -mx-2 cursor-pointer transition-colors duration-150 ${
                isCurrent ? "bg-base-200" : "hover:bg-base-200/60"
              }`}
              style={{
                borderLeft: isCurrent ? "2px solid rgb(var(--c-accent))" : "2px solid transparent",
              }}
              onClick={() => handlePlay(track)}
            >
              <div className="w-9 h-9 rounded-md bg-base-300 flex items-center justify-center flex-shrink-0">
                <AudioLines size={15} className="text-subtle" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-semibold truncate ${isCurrent ? "text-primary" : "text-base-content"}`}>
                  {track.title}
                </h3>
                <p className="text-xs text-muted truncate">{track.artist}</p>
              </div>

              <button
                className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-opacity ${
                  isCurrent
                    ? "bg-primary text-primary-content opacity-100"
                    : "text-base-content opacity-0 group-hover:opacity-100 hover:bg-base-300"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlay(track);
                }}
              >
                {isTrackPlaying ? (
                  <Pause size={13} fill="currentColor" />
                ) : (
                  <Play size={13} fill="currentColor" className="ml-0.5" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlaylistCard;
