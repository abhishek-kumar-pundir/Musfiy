import { LogOut, Sun, Moon } from "lucide-react";
import { useAuthStore } from "../stores/useAuthStore";
import { useThemeStore } from "../lib/useTheme";
import { Link } from "react-router-dom";

const Navbar = () => {
  const { isAuthenticated, userName, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const firstLetter = userName ? userName.charAt(0).toUpperCase() : "?";

  return (
    <div className="navbar bg-base-100/85 backdrop-blur-xl border-b border-edge px-6 sticky top-0 z-50">

      {/* LEFT: Wordmark — lowercase, one accent-colored mark. Not a
          gradient logotype. */}
      <div className="flex-1">
        <Link
          to="/"
          className="text-xl font-extrabold tracking-tight text-base-content hover:opacity-80 transition-opacity"
        >
          musify<span className="text-primary">.</span>
        </Link>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-2">

        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="btn btn-ghost btn-circle btn-sm text-subtle hover:text-base-content"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {!isAuthenticated ? (
          <Link to="/login" className="btn btn-primary btn-sm px-5">
            Login
          </Link>
        ) : (
          <div className="dropdown dropdown-end">
            <div
              tabIndex={0}
              role="button"
              className="avatar placeholder cursor-pointer"
            >
              <div className="bg-primary text-primary-content rounded-full w-9 h-9">
                <span className="text-sm font-bold">{firstLetter}</span>
              </div>
            </div>

            <ul
              tabIndex={0}
              className="dropdown-content z-[100] menu p-2.5 bg-base-200 border border-edge w-52 mt-3"
              style={{ borderRadius: "10px" }}
            >
              <li className="menu-title px-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="avatar placeholder">
                    <div className="bg-primary text-primary-content rounded-full w-9 h-9">
                      <span className="text-sm font-bold">{firstLetter}</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-base-content normal-case text-sm">{userName}</span>
                    <span className="text-[11px] text-subtle normal-case">Member</span>
                  </div>
                </div>
              </li>

              <div className="divider my-1"></div>

              <li>
                <button
                  onClick={logout}
                  className="flex items-center gap-3 text-error hover:bg-error/10 rounded-md py-2.5 font-medium transition-colors duration-150 w-full px-3 text-sm"
                >
                  <LogOut size={16} strokeWidth={2} />
                  Logout
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;
