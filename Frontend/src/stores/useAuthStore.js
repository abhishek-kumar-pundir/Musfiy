import { create } from "zustand";
import api from "../lib/api.js";

const SESSION_HINT_KEY = "musify_session_active";
const USER_HINT_KEY = "musify_user_hint";

const getStoredSessionHint = () => {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === "1";
  } catch {
    return false;
  }
};

const getStoredUserHint = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_HINT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const setSessionHint = (user) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_HINT_KEY, "1");
    if (user) {
      localStorage.setItem(
        USER_HINT_KEY,
        JSON.stringify({
          _id: user._id || user.userId,
          name: user.name || user.userName,
          email: user.email || "",
        })
      );
    }
  } catch {}
};

const clearSessionHint = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_HINT_KEY);
    localStorage.removeItem(USER_HINT_KEY);
  } catch {}
};

const initialHasHint = getStoredSessionHint();
const initialUser = getStoredUserHint();

export const useAuthStore = create((set, get) => ({
  userName: initialUser?.name || "",
  useName: initialUser?.name || "",
  userId: initialUser?._id || null,
  user: initialUser,
  isAuthenticated: initialHasHint,
  // Only show initial loader if there is an active session hint we need to verify;
  // first-time visitors have no hint, so they render immediately without splash delay.
  loading: initialHasHint,
  isReconnecting: false,
  error: null,
  _retryTimer: null,
  _retryCount: 0,

  clearError: () => set({ error: null }),

  register: async (name, email, password) => {
    set({ loading: true, error: null });

    try {
      const res = await api.post(
        "/api/auth/register",
        { name, email, password },
        { withCredentials: true }
      );

      if (res?.data?.success) {
        const userObj = {
          _id: res.data.userId || null,
          name,
          email,
        };
        setSessionHint(userObj);

        set({
          userId: res.data.userId || null,
          userName: name,
          useName: name,
          user: userObj,
          isAuthenticated: true,
          error: null,
          loading: false,
          isReconnecting: false,
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
      const res = await api.post(
        "/api/auth/login",
        { email, password },
        { withCredentials: true }
      );

      if (res?.data?.success) {
        const userObj = {
          _id: res.data.userId,
          name: res.data.name,
          email: res.data.email || email,
        };
        setSessionHint(userObj);

        set({
          userId: res.data.userId,
          userName: res.data.name,
          useName: res.data.name,
          user: userObj,
          isAuthenticated: true,
          error: null,
          loading: false,
          isReconnecting: false,
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
    if (get()._retryTimer) clearTimeout(get()._retryTimer);
    clearSessionHint();

    try {
      const res = await api.post("/api/auth/logout");

      set({
        userId: null,
        userName: "",
        useName: "",
        user: null,
        isAuthenticated: false,
        isReconnecting: false,
        error: null,
        loading: false,
        _retryTimer: null,
        _retryCount: 0,
      });

      return res.data;
    } catch {
      set({
        userId: null,
        userName: "",
        useName: "",
        user: null,
        isAuthenticated: false,
        isReconnecting: false,
        loading: false,
        error: "Logout failed",
      });
    }
  },

  scheduleRetry: () => {
    if (get()._retryTimer) return;
    const attempt = get()._retryCount || 0;
    if (attempt >= 5) {
      set({ isReconnecting: false, _retryTimer: null });
      return;
    }
    const delay = Math.min(3000 * Math.pow(1.5, attempt), 15000);
    const timer = setTimeout(() => {
      set({ _retryTimer: null, _retryCount: attempt + 1 });
      get().checkAuth(true);
    }, delay);
    set({ _retryTimer: timer });
  },

  checkAuth: async (isBackgroundRetry = false) => {
    if (!isBackgroundRetry) {
      const hasHint = getStoredSessionHint();
      // Only set loading: true if we have a hint we are actively verifying;
      // unauthenticated cold visitors shouldn't see a full-screen blocking splash.
      set({ loading: hasHint });
    }

    try {
      const res = await api.get("/api/auth/me", { withCredentials: true });

      if (res?.data?.success && res.data?.user) {
        setSessionHint(res.data.user);
        set({
          user: res.data.user,
          userId: res.data.user._id,
          userName: res.data.user.name,
          useName: res.data.user.name,
          isAuthenticated: true,
          isReconnecting: false,
          loading: false,
          error: null,
          _retryCount: 0,
        });
      } else {
        // Explicitly unauthenticated response from server (e.g. { success: false, message: "No token" })
        clearSessionHint();
        set({
          user: null,
          userId: null,
          userName: "",
          useName: "",
          isAuthenticated: false,
          isReconnecting: false,
          loading: false,
          _retryCount: 0,
        });
      }
    } catch (err) {
      const isTimeoutOrNetwork =
        err.code === "ECONNABORTED" ||
        err.message?.includes("timeout") ||
        err.message?.includes("Network Error") ||
        !err.response;

      const hadSession = getStoredSessionHint() || get().isAuthenticated;

      if (isTimeoutOrNetwork && hadSession) {
        // Backend is cold-starting or network dropped — DO NOT LOG OUT!
        // Retain session, clear blocking screen, enter reconnecting state and schedule retry.
        set({
          loading: false,
          isReconnecting: true,
        });
        get().scheduleRetry();
      } else {
        // Genuine 4xx error or unauthenticated visitor
        clearSessionHint();
        set({
          user: null,
          userId: null,
          userName: "",
          useName: "",
          isAuthenticated: false,
          isReconnecting: false,
          loading: false,
        });
      }
    }
  },
}));

