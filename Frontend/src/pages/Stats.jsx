import { useEffect } from "react";
import { useStatsStore } from "../stores/useStatsStore";
import { AudioLines, Loader2, Activity } from "lucide-react";
import { useFastLoadMetrics } from "react-fastload";

const Stats = () => {
  const { topTracks, fetchTopTracks, loading, cached } = useStatsStore();
  const metrics = useFastLoadMetrics();

  useEffect(() => {
    fetchTopTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      {/* ReactFastLoad Metrics Footer */}
      <div className="mt-4 pt-3 border-t border-edge/60 text-[11px] text-subtle space-y-1">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 font-semibold text-[10px] uppercase tracking-wider text-muted">
            <Activity size={11} className="text-primary" />
            FastLoad Vitals
          </span>
          <span className="text-[10px] text-subtle">
            {metrics.deferredRequests > 0 ? `${metrics.deferredRequests} deferred` : "optimized"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1 pt-1 text-center font-mono text-[10px]">
          <div className="bg-base-200/50 rounded py-1">
            <span className="text-muted block text-[9px]">FCP</span>
            <span className="text-base-content font-semibold">{metrics.fcp ? `${Math.round(metrics.fcp)}ms` : "—"}</span>
          </div>
          <div className="bg-base-200/50 rounded py-1">
            <span className="text-muted block text-[9px]">LCP</span>
            <span className="text-base-content font-semibold">{metrics.lcp ? `${Math.round(metrics.lcp)}ms` : "—"}</span>
          </div>
          <div className="bg-base-200/50 rounded py-1">
            <span className="text-muted block text-[9px]">CLS</span>
            <span className="text-base-content font-semibold">{metrics.cls != null ? metrics.cls : "0"}</span>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 0px; display: none; }
        .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default Stats;
