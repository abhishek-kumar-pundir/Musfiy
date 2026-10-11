import { create } from "zustand";
import api from "../lib/api";

export const useAuthStore = create((set) => ({
  userName: "",
  useName: "",
  userId: null,
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  register: async (name, email, password) => {
    set({ loading: true, error: null });

    try {
      const res = await api.post("/api/auth/register", {
        name,
        email,
        password,
      }, {
        withCredentials: true,
      });

      if (res?.data?.success) {
        set({
          userId: res.data.userId || null,
          userName: name,
          useName: name,
          isAuthenticated: true,
          error: null,
          loading: false,
        });
        return res.data;
      } else {
        const message = res?.data?.message || "Registration failed";
        set({
          loading: false,
          error: message,
        });
        return { success: false, message };
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Registration failed";
      set({
        loading: false,
        error: message,
      });
      return { success: false, message };
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });

    try {
      const res = await api.post("/api/auth/login", {
        email,
        password,
      }, {
        withCredentials: true,
      });

      if (res?.data?.success) {
        set({
          userId: res.data.userId,
          userName: res.data.name,
          useName: res.data.name,
          isAuthenticated: true,
          error: null,
          loading: false,
        });
        return res.data;
      } else {
        const message = res?.data?.message || "Invalid credentials";
        set({
          loading: false,
          error: message,
        });
        return { success: false, message };
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Login failed";
      set({
        loading: false,
        error: message,
      });
      return { success: false, message };
    }
  },

  logout: async () => {
    set({ loading: true });

    try {
      const res = await api.post("/api/auth/logout");

      if (res?.data?.success) {
        set({
          userId: null,
          userName: "",
          useName: "",
          user: null,
          isAuthenticated: false,
          error: null,
        });
      }

      set({ loading: false });
      return res.data;
    } catch {
      set({
        loading: false,
        error: "Logout failed",
      });
    }
  },

  checkAuth: async () => {
    set({ loading: true });

    try {
      const res = await api.get("/api/auth/me", { withCredentials: true });

      if (res?.data?.success && res.data?.user) {
        set({
          user: res.data.user,
          userId: res.data.user._id,
          userName: res.data.user.name,
          useName: res.data.user.name,
          isAuthenticated: true,
          loading: false,
          error: null,
        });
      } else {
        set({
          user: null,
          isAuthenticated: false,
          loading: false,
        });
      }
    } catch {
      set({ user: null, isAuthenticated: false, loading: false });
    }
  },
}));
