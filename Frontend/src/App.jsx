import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import { useAuthStore } from "./stores/useAuthStore";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { lazyComponent } from "react-fastload";

const Login = lazyComponent(() => import("./pages/Login"), {
  priority: "HIGH",
  strategy: "lazy",
  fallback: (
    <div className="min-h-screen w-full bg-base-100 flex items-center justify-center">
      <Loader2 size={24} className="animate-spin text-subtle" />
    </div>
  ),
});

const Dashboard = lazyComponent(() => import("./pages/Dashboard"), {
  priority: "HIGH",
  strategy: "lazy",
  fallback: (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center bg-base-100">
      <Loader2 size={24} className="animate-spin text-subtle" />
    </div>
  ),
});

const Stats = lazyComponent(() => import("./pages/Stats"), {
  priority: "NORMAL",
  strategy: "lazy",
  fallback: (
    <div className="h-full flex items-center justify-center p-8">
      <Loader2 size={20} className="animate-spin text-subtle" />
    </div>
  ),
});

function App() {
  const { isAuthenticated, checkAuth, loading, isReconnecting } = useAuthStore();

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-base-100 flex items-center justify-center">
        <div className="text-center space-y-5">
          <div className="flex justify-center">
            <div className="w-11 h-11 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-content font-extrabold text-lg">m</span>
            </div>
          </div>

          <p className="text-2xl font-extrabold tracking-tight text-base-content">
            musify<span className="text-primary">.</span>
          </p>

          <div className="flex items-center justify-center gap-2.5">
            <Loader2 size={15} className="animate-spin text-subtle" />
            <span className="text-xs text-subtle">Verifying your session</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-base-100">
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 2600,
          style: {
            background: "rgb(var(--c-bg-2))",
            color: "rgb(var(--c-text))",
            border: "1px solid rgb(var(--c-border))",
            borderRadius: "8px",
            fontSize: "13px",
            padding: "10px 16px",
          },
          success: { iconTheme: { primary: "rgb(200 255 61)", secondary: "rgb(9 10 13)" } },
        }}
      />

      <Navbar />

      {isReconnecting && (
        <div className="bg-primary/10 border-b border-primary/20 text-xs py-1.5 px-4 text-center text-primary flex items-center justify-center gap-2">
          <Loader2 size={12} className="animate-spin" />
          <span>Connecting to audio server... backend is waking up</span>
        </div>
      )}

      <Routes>
        <Route
          path="/login"
          element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />}
        />

        <Route
          path="/"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/stats"
          element={isAuthenticated ? <Stats /> : <Navigate to="/login" replace />}
        />

        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
        />
      </Routes>
    </div>
  );
}

export default App;
