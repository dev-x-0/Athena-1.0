import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Brandline } from "../components/AthenaMark";
import { Banner, Field } from "../components/ui";
import { nextQuote, QUOTES, randomQuote } from "../lib/quotes";
import { useAuth } from "../state/AuthContext";
import { usePageTitle } from "../lib/hooks";

export default function Auth() {
  usePageTitle("Sign in");
  const { token, user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [busy, setBusy] = useState(false);
  const [granted, setGranted] = useState(false);

  const [qi, setQi] = useState(() => {
    const initial = QUOTES ? QUOTES.indexOf(randomQuote()) : 0;
    return initial >= 0 ? initial : 0;
  });

  useEffect(() => {
    const t = setInterval(() => setQi((i) => nextQuote(i)), 9000);
    return () => clearInterval(t);
  }, []);

  const quote = QUOTES && QUOTES[qi] ? QUOTES[qi] : { text: "Focus on execution.", author: "Athena" };

  if (token) return <Navigate to={location.state?.from?.pathname || "/"} replace />;

  const validate = () => {
    const e = {};
    if (username.trim().length < 3) e.username = "Username must be at least 3 characters.";
    if (password.length < 6) e.password = "Password must be at least 6 characters.";
    if (mode === "signup" && confirm !== password) e.confirm = "Passwords do not match.";
    return e;
  };

  async function submit(ev) {
    ev.preventDefault();
    setApiError("");
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);

    try {
      if (mode === "signup") {
        await register(username, password, username);
      } else {
        await login(username, password);
      }
      setGranted(true);
      setTimeout(() => {
        navigate(location.state?.from?.pathname || "/");
      }, 500);
    } catch (err) {
      setApiError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    setErrors({});
    setApiError("");
  }

  return (
    <div className="auth">
      <div className="auth-brand">
        <Brandline />
        <div className="quote" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.blockquote
              key={qi}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <p>“{quote.text}”</p>
              <div className="quote-author">— {quote.author}</div>
            </motion.blockquote>
          </AnimatePresence>
        </div>
      </div>

      <div className="auth-form">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            className="auth-card"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div>
              <div className="eyebrow">{mode === "login" ? "Access" : "Enrollment"}</div>
              <h1 style={{ marginTop: 10 }}>{mode === "login" ? "Sign in" : "Create account"}</h1>
              <p className="sub" style={{ marginTop: 8 }}>
                {mode === "login"
                  ? "Authenticate to enter the Athena command center."
                  : "Provision credentials for the Athena command center."}
              </p>
            </div>

            {apiError && <Banner tone="critical">{apiError}</Banner>}
            {granted && (
              <Banner tone="ok">
                <Check size={15} aria-hidden="true" /> Access granted. Entering Athena…
              </Banner>
            )}

            <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Field
                id="username"
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                error={errors.username}
                placeholder="operative.name"
              />
              <Field
                id="password"
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                error={errors.password}
                hint="Minimum 6 characters."
                placeholder="••••••••"
              />
              {mode === "signup" && (
                <Field
                  id="confirm"
                  label="Confirm password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  error={errors.confirm}
                  placeholder="••••••••"
                />
              )}
              <button className="btn" type="submit" disabled={busy || granted} style={{ justifyContent: "center", marginTop: 4 }}>
                {busy ? "Authenticating…" : mode === "login" ? "Sign in" : "Create account"}
                {!busy && <ArrowRight size={15} aria-hidden="true" />}
              </button>
            </form>

            <div className="auth-swap">
              {mode === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button type="button" onClick={() => switchMode("signup")}>Sign up</button>
                </>
              ) : (
                <>
                  Have credentials?{" "}
                  <button type="button" onClick={() => switchMode("login")}>Sign in</button>
                </>
              )}
            </div>
            {user && <div className="mono" style={{ textAlign: "center" }}>last session: {user.username}</div>}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}