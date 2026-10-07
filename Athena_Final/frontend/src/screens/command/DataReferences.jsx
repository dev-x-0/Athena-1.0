import { ChevronRight, Database } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { usePageTitle } from "../../lib/hooks";
import { useAuth } from "../../state/AuthContext";
import { DECLARED_SOURCES } from "../../data/provenance";

export default function DataReferences() {
  usePageTitle("Data References");
  const { token } = useAuth();
  const [sources, setSources] = useState(null); // null = still checking
  const [live, setLive] = useState(false);

  useEffect(() => {
    let liveReq = true;
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 4000);
    api.get("/references", token, ctrl.signal)
      .then((d) => {
        if (!liveReq) return;
        const list = Array.isArray(d) ? d : d?.sources;
        if (Array.isArray(list) && list.length) { setSources(list); setLive(true); }
        else setSources(DECLARED_SOURCES);
      })
      .catch(() => liveReq && setSources(DECLARED_SOURCES))
      .finally(() => clearTimeout(timeout));
    return () => { liveReq = false; ctrl.abort(); };
  }, [token]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Mode 03</div>
          <h1>Data References</h1>
          <p className="sub">
            Provenance for every field Athena consumes. If a number cannot be traced to a source
            listed here, it does not belong in an analysis.
          </p>
        </div>
        <span className="badge">{sources === null ? "Checking…" : live ? "Live catalog" : "Declared contract"}</span>
      </header>

      {sources === null ? (
        <div className="panel" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          {[...Array(4)].map((_, i) => <div className="skel" key={i} style={{ height: 52 }} />)}
        </div>
      ) : (
        <div className="prov-list">
          {sources.map((s, i) => (
            <details className="prov panel" key={i} open={i === 0}>
              <summary>
                <span className="p-src">{s.source}</span>
                <span className="p-tbl mono">{s.table}</span>
                <ChevronRight className="p-chev" size={15} aria-hidden="true" />
              </summary>
              <div className="prov-body">
                {Array.isArray(s.fields) && s.fields.length > 0 && (
                  <div className="fld-chips" aria-label="Fields">
                    {s.fields.map((f) => <span key={f}>{f}</span>)}
                  </div>
                )}
                <div className="prov-cols">
                  <div className="def"><div className="dt">Purpose</div><div className="dd">{s.purpose || "—"}</div></div>
                  <div className="def"><div className="dt">Transformation</div><div className="dd">{s.transformation || "—"}</div></div>
                  <div className="def"><div className="dt">Why Athena uses it</div><div className="dd">{s.why || s.why_used || "—"}</div></div>
                  <div className="def"><div className="dt">Time range</div><div className="dd">{s.range || s.time_range || "—"}</div></div>
                  <div className="def" style={{ gridColumn: "1 / -1" }}>
                    <div className="dt">Limitations</div><div className="dd">{s.limitations || "—"}</div>
                  </div>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}

      {!live && sources && (
        <p style={{ marginTop: 18, fontSize: 12.5, color: "var(--text-low)", display: "flex", gap: 8, alignItems: "center" }}>
          <Database size={13} aria-hidden="true" />
          Showing the declared data contract. When the backend exposes <code className="mono">GET /references</code>, the live catalog replaces this automatically.
        </p>
      )}
    </div>
  );
}