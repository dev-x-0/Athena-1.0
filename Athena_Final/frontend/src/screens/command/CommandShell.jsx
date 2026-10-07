import { Crosshair, Database, History, LogOut, Play } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Brandline } from "../../components/AthenaMark";
import { usePageTitle, useScrollTopOnNavigate } from "../../lib/hooks";
import { useAuth } from "../../state/AuthContext";

const NAV = [
  { to: "/", label: "Command", icon: Crosshair, end: true },
  { to: "/history", label: "Analysis History", icon: History },
  { to: "/run", label: "Run Analysis", icon: Play },
  { to: "/references", label: "Data References", icon: Database },
];

export default function CommandShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  useScrollTopOnNavigate(location.pathname);

  const name = user?.username || "Operative";
  return (
    <div className="shell">
      <a className="skip" href="#main">Skip to content</a>
      <aside className="side">
        <NavLink to="/" aria-label="Athena home">
          <Brandline size={26} />
        </NavLink>
        <nav className="side-nav" aria-label="Primary">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
              <Icon aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <div className="userchip">
            <div className="avatar" aria-hidden="true">{name.slice(0, 1)}</div>
            <div>
              <div className="u-name">{name}</div>
              <div className="mono">operative</div>
            </div>
          </div>
          <button
            className="signout"
            onClick={() => { logout(); navigate("/auth", { replace: true }); }}
          >
            <LogOut size={14} aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="main" id="main">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}