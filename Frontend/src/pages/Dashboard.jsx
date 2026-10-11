import { useEffect, useRef, useState } from "react";
import MoodInput from "../components/MoodInput";
import PlaylistCard from "../components/PlaylistCard";
import TrackCard from "../components/TrackCard";
import AudioPlayer from "../components/AudioPlayer";
import { lazyComponent } from "react-fastload";

const UploadTrackModal = lazyComponent(() => import("../components/UploadTrackModal"), {
  priority: "LOW",
  strategy: "lazy",
  fallback: <div className="card p-6 h-36 bg-base-200/40 animate-pulse rounded-lg" />,
});

import { useTrackStore } from "../stores/useTrackStore";
import { useStatsStore } from "../stores/useStatsStore";
import { usePlaylistStore } from "../stores/usePlaylistStore";
import { usePlayerStore } from "../stores/usePlayerStore";
import { Menu, X, Loader2 } from "lucide-react";
import Stats from "./Stats";

// Lightweight placeholder rows shown only while the very first batch of
// tracks is loading — never blocks the rest of the page.
const TrackListSkeleton = () => (
  <div className="space-y-1">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="animate-pulse flex items-center gap-3 py-2.5">
        <div className="w-9 h-9 rounded-md bg-base-300 flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="h-3 w-1/3 rounded bg-base-300" />
          <div className="h-2.5 w-1/5 rounded bg-base-300" />
        </div>
      </div>
    ))}
  </div>
);

const SectionLabel = ({ children }) => (
  <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle mb-3">
    {children}
  </p>
);

const Dashboard = () => {
  const { playlist } = usePlaylistStore();
  const { allTracks, loading, loadingMore, hasMore, fetchAllTracks, loadMoreTracks } =
    useTrackStore();
  const { fetchTopTracks } = useStatsStore();
  const appendToQueue = usePlayerStore((s) => s.appendToQueue);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const loadMoreRef = useRef(null);

  useEffect(() => {
    fetchAllTracks();
    fetchTopTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    appendToQueue(allTracks);
  }, [allTracks, appendToQueue]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreTracks();
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMoreTracks, allTracks.length]);

  return (
    <div className="relative min-h-[calc(100vh-56px)]">

      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-[68px] right-3 z-50 btn btn-circle bg-primary text-primary-content w-10 h-10"
      >
        {sidebarOpen ? <X size={17} /> : <Menu size={17} />}
      </button>

      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <div className="max-w-[1400px] mx-auto flex gap-8 lg:gap-10 px-4 sm:px-6 lg:px-8 py-5 lg:py-7">

        {/* LEFT SIDEBAR - Stats */}
        <aside
          className={`
            fixed lg:sticky top-14 lg:top-7 left-0 h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-5.5rem)]
            w-[280px] sm:w-[320px] lg:w-[300px]
            transition-transform duration-200 ease-out z-40
            bg-base-100 lg:bg-transparent
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <div className="h-full lg:sticky lg:top-7 px-4 lg:px-0">
            <Stats />
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0 pb-28 lg:pb-32">

          <div className="mb-8">
            <MoodInput />
          </div>

          {playlist.length > 0 && (
            <div className="mb-8">
              <PlaylistCard playlist={playlist} />
            </div>
          )}

          {/* All Tracks — a section, not a card */}
          <div className="mb-10">
            <SectionLabel>All Tracks</SectionLabel>

            {loading ? (
              <TrackListSkeleton />
            ) : allTracks.length === 0 ? (
              <p className="text-sm text-subtle py-8 text-center">No tracks available</p>
            ) : (
              <>
                <div>
                  {allTracks.map((track, i) => (
                    <TrackCard key={track._id} track={track} index={i} />
                  ))}
                </div>

                {hasMore && (
                  <div ref={loadMoreRef} className="flex justify-center py-4">
                    {loadingMore ? (
                      <div className="flex items-center gap-2 text-xs text-subtle">
                        <Loader2 size={14} className="animate-spin" />
                        Loading more
                      </div>
                    ) : (
                      <button
                        onClick={loadMoreTracks}
                        className="text-xs text-subtle hover:text-base-content"
                      >
                        Load more
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Upload — a section, not a card */}
          <div>
            <SectionLabel>Upload Music</SectionLabel>
            <UploadTrackModal />
          </div>
        </main>
      </div>

      <AudioPlayer />
    </div>
  );
};

export default Dashboard;
