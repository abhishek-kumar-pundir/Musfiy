import { useState } from "react";
import { useAuthStore } from "../stores/useAuthStore";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const { login, register, loading, error } = useAuthStore();

  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const handleSubmit = async () => {
    let res;
    if (isLogin) {
      res = await login(form.email, form.password);
    } else {
      res = await register(form.name, form.email, form.password);
    }
    if (res?.success) navigate("/");
  };

  const onEnter = (e) => {
    if (e.key === "Enter" && !loading) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100 p-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-6">
          <p className="text-xl font-extrabold tracking-tight mb-1">
            musify<span className="text-primary">.</span>
          </p>
          <p className="text-xs text-subtle">
            {isLogin ? "Log in to continue" : "Create your account"}
          </p>
        </div>

        <div className="card p-6">
          <div className="space-y-3">
            {!isLogin && (
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">Full name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  onKeyDown={onEnter}
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted mb-1.5 block">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                onKeyDown={onEnter}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted mb-1.5 block">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onKeyDown={onEnter}
              />
            </div>

            {error && (
              <div className="alert alert-error py-2.5">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span className="text-xs">{error}</span>
              </div>
            )}

            <button
              className="btn btn-primary w-full mt-2"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={15} />
                  {isLogin ? "Logging in..." : "Creating account..."}
                </>
              ) : (
                isLogin ? "Log in" : "Sign up"
              )}
            </button>
          </div>

          <div className="divider my-5">or</div>

          <div className="text-center">
            <p className="text-xs text-subtle mb-1">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </p>
            <button
              className="btn-link text-sm font-semibold"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Create an account" : "Log in"}
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-subtle mt-5 px-4">
          By continuing, you agree to Musify's Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Login;
