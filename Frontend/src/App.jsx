import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Stats from "./pages/Stats";
import { useAuthStore } from "./stores/useAuthStore";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

function App() {
  const { isAuthenticated, checkAuth, loading } = useAuthStore();

  useEffect(() => {
    checkAuth();
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
            <span className="text-xs text-subtle">Loading your session</span>
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
