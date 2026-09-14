import { useEffect } from "react";
import { useStatsStore } from "../stores/useStatsStore";
import { AudioLines, Loader2 } from "lucide-react";

const Stats = () => {
  const { topTracks, fetchTopTracks, loading, cached } = useStatsStore();

  useEffect(() => {
    fetchTopTracks();
  }, []);

  return (
    <div className="h-full flex flex-col">

      {/* Header — small label, not a big gradient heading with an icon box */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
            Top Tracks
          </p>
          {cached ? (
            <span className="text-[10px] text-subtle">cached</span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-subtle">
              <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
              live
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3">
            <Loader2 size={20} className="text-subtle animate-spin" />
            <p className="text-xs text-subtle">Loading...</p>
          </div>
        ) : topTracks.length === 0 ? (
          <p className="text-xs text-subtle py-8 text-center">No data yet</p>
        ) : (
          <div>
            {topTracks.map((track, index) => (
              <div
                key={track._id}
                className="group flex items-center gap-3 py-2.5 hover:bg-base-200/60 -mx-2 px-2 transition-colors duration-150"
              >
                {/* Rank — muted "01" not a colored block */}
                <span className="w-5 text-xs tabular-nums text-subtle flex-shrink-0">
                  {String(track.rank).padStart(2, "0")}
                </span>

                <div className="w-8 h-8 rounded-md bg-base-300 flex items-center justify-center flex-shrink-0">
                  <AudioLines size={13} className="text-subtle" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate text-base-content">
                    {track.title}
                  </h3>
                  <p className="text-xs text-muted truncate">{track.artist}</p>
                </div>

                {/* Big % with a tiny sublabel instead of a repeated "match" text */}
                <div className="flex-shrink-0 text-right">
                  <p className={`text-sm font-bold tabular-nums ${index === 0 ? "text-primary" : "text-base-content"}`}>
                    {track.usagePercent}%
                  </p>
                  <p className="text-[10px] text-subtle">{track.timesUsed} plays</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 0px; display: none; }
        .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default Stats;
