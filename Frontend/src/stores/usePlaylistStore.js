import { create } from "zustand";
import api from "../lib/api";

export const usePlaylistStore = create((set) => ({
  playlist: [],
  lastMood: "",
  loading: false,
  error: null,

  generatePlaylist: async (moodPrompt) => {
    try {
      set({ loading: true, error: null });

      const res = await api.post("/api/playlist/generate", { moodPrompt });

      set({
        playlist: res.data.playlist,
        lastMood: moodPrompt,
        loading: false,
      });

    } catch (error) {
      set({
        loading: false,
        error: error.response?.data?.message || "Error generating playlist",
      });
    }
  },
}));
