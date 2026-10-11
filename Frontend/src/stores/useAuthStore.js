import { create } from "zustand";
import api from "../lib/api";

export const useAuthStore = create((set) => ({
  useName:"",
  userId: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  register: async (name, email, password) => {
    set({ loading: true, error: null });

    try {
      const res = await api.post("/api/auth/register", {
        name,
        email,
        password,
      },{
        withCredentials:true
      });

      if (res.data.success) {
        set({
            userName: name,
          isAuthenticated: true,
        });
      }

      set({ loading: false });
      return res.data;

    } catch (error) {
      set({
        loading: false,
        error: error.response?.data?.message || "Registration failed",
      });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });

    try {
      const res = await api.post("/api/auth/login", {
        email,
        password,
      },{
        withCredentials:true
      });

      if (res.data.success) {
        set({
          userId: res.data.userId,
          userName: res.data.name,
          isAuthenticated: true,
        });
      }

      set({ loading: false });
      return res.data;

    } catch (error) {
      set({
        loading: false,
        error: error.response?.data?.message || "Login failed",
      });
    }
  },

  logout: async () => {
    set({ loading: true });

    try {
      const res = await api.post("/api/auth/logout");

      if (res.data.success) {
        set({
          userId: null,
          isAuthenticated: false,
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

    if (res.data.success) {
      set({
        user: res.data.user,
        userId: res.data.user._id,
        userName: res.data.user.name,
        isAuthenticated: true,
        loading: false,
      });
    } else {
      set({
        user: null,
        isAuthenticated: false,
        loading: false,
      });
    }
  } catch {
    set({ isAuthenticated: false, loading: false });
  }
},

}));
