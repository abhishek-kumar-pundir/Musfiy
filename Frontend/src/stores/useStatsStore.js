import { create } from "zustand";
import api from "../lib/api";

export const useStatsStore = create((set) => ({
  topTracks: [],
  loading: false,
  error: null,
  cached: false,

  fetchTopTracks: async () => {
    set({ loading: true, error: null });

    try {
      const res = await api.get("/api/stats/top-tracks");

      if (res.data.success) {
        set({
          topTracks: res.data.tracks,
          cached: res.data.cached,
        });
      }

      set({ loading: false });
      return res.data;

    } catch {
      set({
        loading: false,
        error: "Failed to fetch stats",
      });
    }
  },
}));
