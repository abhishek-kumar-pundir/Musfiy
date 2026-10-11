import { create } from "zustand";
import api from "../lib/api";

const PAGE_SIZE = 20;

export const useTrackStore = create((set, get) => ({
  allTracks: [],
  emotionTracks: [],

  // First-batch loading (blocks the track list UI with a skeleton)
  loading: false,
  // Background loading of subsequent batches (does NOT block the UI)
  loadingMore: false,

  page: 0,
  hasMore: true,
  totalCount: null,
  initialized: false,

  error: null,

  // Cache of trackId -> similar-tracks results (acoustic-similarity
  // recommendations, see Backend's /api/track/:id/similar). Cached per
  // track so re-opening the "more like this" panel doesn't refetch.
  similarCache: {},
  similarLoading: {},

  // Fetches the first batch of tracks. Safe to call multiple times (e.g. if
  // the Dashboard mounts again) — it will only hit the network once unless
  // `force` is passed, so navigating back and forth doesn't re-fetch.
  fetchAllTracks: async (force = false) => {
    if (get().initialized && !force) return;

    set({ loading: true, error: null });

    try {
      const res = await api.get("/api/track/all", {
        params: { page: 1, limit: PAGE_SIZE },
      });

      if (res.data.success) {
        set({
          allTracks: res.data.tracks,
          page: res.data.page,
          hasMore: res.data.hasMore,
          totalCount: res.data.totalCount ?? get().totalCount,
          initialized: true,
        });
      }

      set({ loading: false });
      return res.data;
    } catch {
      set({
        loading: false,
        error: "Failed to load tracks",
      });
    }
  },

  // Fetches the next batch in the background and appends it. The caller
  // (e.g. an IntersectionObserver near the bottom of the list) decides when
  // to call this — it never runs automatically on mount.
  loadMoreTracks: async () => {
    const { hasMore, loadingMore, loading, page } = get();
    if (!hasMore || loadingMore || loading) return;

    set({ loadingMore: true });

    try {
      const nextPage = page + 1;
      const res = await api.get("/api/track/all", {
        params: { page: nextPage, limit: PAGE_SIZE },
      });

      if (res.data.success) {
        set((state) => {
          const existingIds = new Set(state.allTracks.map((t) => t._id));
          const newTracks = res.data.tracks.filter((t) => !existingIds.has(t._id));

          return {
            allTracks: [...state.allTracks, ...newTracks],
            page: res.data.page,
            hasMore: res.data.hasMore,
          };
        });
      }

      set({ loadingMore: false });
      return res.data;
    } catch {
      set({
        loadingMore: false,
        error: "Failed to load more tracks",
      });
    }
  },

  fetchEmotionTracks: async (emotion) => {
    set({ loading: true, error: null });

    try {
      const res = await api.get(`/api/track/emotion/${emotion}`);

      if (res.data.success) {
        set({ emotionTracks: res.data.tracks });
      }

      set({ loading: false });
      return res.data;
    } catch {
      set({
        loading: false,
        error: "Failed to load emotion-based tracks",
      });
    }
  },

  // Acoustic-similarity "more like this" — real DSP feature vectors +
  // cosine similarity computed server-side, not an LLM guess. Cached per
  // track so toggling the panel open/closed repeatedly is instant.
  fetchSimilarTracks: async (trackId) => {
    const cached = get().similarCache[trackId];
    if (cached) return cached;

    set((state) => ({
      similarLoading: { ...state.similarLoading, [trackId]: true },
    }));

    try {
      const res = await api.get(`/api/track/${trackId}/similar`);
      const tracks = res.data?.success ? res.data.tracks : [];

      set((state) => ({
        similarCache: { ...state.similarCache, [trackId]: tracks },
        similarLoading: { ...state.similarLoading, [trackId]: false },
      }));

      return tracks;
    } catch {
      set((state) => ({
        similarLoading: { ...state.similarLoading, [trackId]: false },
      }));
      return [];
    }
  },

  uploadTrack: async (formData) => {
    set({ loading: true, error: null });

    try {
      const res = await api.post("/api/track/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data.success) {
        set((state) => ({
          // Newly uploaded track goes to the top, matching the backend's
          // createdAt-descending sort order.
          allTracks: [res.data.track, ...state.allTracks],
          totalCount: state.totalCount != null ? state.totalCount + 1 : state.totalCount,
        }));
      }

      set({ loading: false });
      return res.data;
    } catch (error) {
      set({
        loading: false,
        error: error.response?.data?.message || "Track upload failed",
      });
    }
  },
}));
