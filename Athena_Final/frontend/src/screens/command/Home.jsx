import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { API_BASE, api } from "../../lib/api";
import { normalizeSummaries } from "../../lib/contract";
import { relTime } from "../../lib/format";
import { usePageTitle } from "../../lib/hooks";
import { useAuth } from "../../state/AuthContext";
import { DECLARED_SOURCES } from "../../data/provenance";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function Home() {
  usePageTitle("Command");
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [apiState, setApiState] = useState("checking");
  const [count, setCount] = useState(null);
  const [lastRun, setLastRun] = useState(null);
  const [syncedAt, setSyncedAt] = useState(null);

  useEffect(() => {
    let live = true;
    api.get("/analyses", token)
      .then((d) => {
        if (!live) return;
        const list = normalizeSummaries(d);
        setCount(list.length);
        setLastRun(list[0] ?? null);
        setSyncedAt(new Date());
        setApiState("ok");
      })
      .catch(() => live && setApiState("down"));
    return () => { live = false; };
  }, [token]);

  const modes = [
    {
      to: "/history", idx: "01", title: "Analysis History",
      desc: "Every analysis Athena has run — predictions, recommendations and their outcomes.",
      meta1: count != null ? `${count} record${count === 1 ? "" : "s"}` : "Records unavailable",
      meta2: lastRun ? `Last run ${lastRun.id} · ${relTime(lastRun.createdAt)}` : "No runs yet",
    },
    {
      to: "/run", idx: "02", title: "Run Analysis",
      desc: "Submit a custom inventory and campaign scenario. Athena models it and returns a directive.",
      meta1: "Custom scenario",
      meta2: "Typical run under a minute",
    },
    {
      to: "/references", idx: "03", title: "Data References",
      desc: "Provenance for every field Athena consumes — sources, transformations, limitations.",
      meta1: `${DECLARED_SOURCES.length} declared sources`,
      meta2: "Audit trail",
    },
  ];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Command center</div>
          <h1>{greeting()}, {user?.username || "Operative"}.</h1>
          <p className="sub">Select an operation. Athena holds the ledger of every decision made here.</p>
        </div>
      </header>

      <div className="home-grid">
        <motion.nav className="modes" aria-label="Primary modes"
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
          {modes.map((m, i) => (
            <motion.button
              key={m.to}
              type="button"
              className="mode"
              onClick={() => navigate(m.to)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="mode-idx">{m.idx}</span>
              <span>
                <h2>{m.title}</h2>
                <div className="desc">{m.desc}</div>
              </span>
              <span className="mode-meta">
                <div className="m1">{m.meta1}</div>
                <div className="m2">{m.meta2}</div>
              </span>
              <ArrowUpRight className="mode-arrow" size={19} aria-hidden="true" />
            </motion.button>
          ))}
        </motion.nav>

        <div className="panel" style={{ padding: "6px 0" }}>
          <div style={{ padding: "14px 16px 6px" }}><div className="eyebrow">System</div></div>
          <div className="syslist">
            <div className="sysrow">
              <span className="k">Backend API</span>
              <span>
                <span className={`dot ${apiState === "ok" ? "ok" : apiState === "down" ? "bad" : "wait"}`} aria-hidden="true" />
                {apiState === "ok" ? "Operational" : apiState === "down" ? "Unreachable" : "Checking…"}
              </span>
            </div>
            <div className="sysrow">
              <span className="k">Endpoint</span>
              <span className="mono">{new URL(API_BASE).host}</span>
            </div>
            <div className="sysrow">
              <span className="k">Last sync</span>
              <span className="mono">{syncedAt ? syncedAt.toLocaleTimeString("en-GB") : "—"}</span>
            </div>
            <div className="sysrow">
              <span className="k">Session</span>
              <span className="mono">{user?.username || "operative"}</span>
            </div>
          </div>
          {apiState === "down" && (
            <p style={{ padding: "10px 16px 14px", fontSize: 12, color: "var(--text-low)" }}>
              Mode data will populate once the backend is reachable. Nothing is mocked in the meantime.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}