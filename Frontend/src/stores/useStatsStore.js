import { create } from "zustand";
import api from "../lib/api";

let inFlightPromise = null;

export const useStatsStore = create((set, get) => ({
  topTracks: [],
  loading: false,
  error: null,
  cached: false,
  initialized: false,

  fetchTopTracks: async (force = false) => {
    // If already loaded and not forced, return cached data immediately
    if (get().initialized && !force && get().topTracks.length > 0) {
      return { success: true, tracks: get().topTracks, cached: get().cached };
    }

    // Deduplicate concurrent simultaneous requests to /api/stats/top-tracks
    if (inFlightPromise && !force) {
      return inFlightPromise;
    }

    set({ loading: true, error: null });

    inFlightPromise = api
      .get("/api/stats/top-tracks")
      .then((res) => {
        if (res.data?.success) {
          set({
            topTracks: res.data.tracks || [],
            cached: Boolean(res.data.cached),
            initialized: true,
          });
        }
        set({ loading: false });
        return res.data;
      })
      .catch((err) => {
        set({
          loading: false,
          error: "Failed to fetch stats",
        });
        throw err;
      })
      .finally(() => {
        inFlightPromise = null;
      });

    return inFlightPromise;
  },
}));
