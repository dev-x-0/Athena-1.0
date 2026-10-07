import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { normalizeSummaries } from "../../lib/contract";
import { dateShort, money, roas } from "../../lib/format";
import { usePageTitle } from "../../lib/hooks";
import { useAuth } from "../../state/AuthContext";
import { EmptyState } from "../../components/ui";
import { FileSearch, RefreshCw } from "lucide-react";

export default function History() {
  usePageTitle("Analysis History");
  const { token } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState("loading"); // loading | ready | error | empty
  const [rows, setRows] = useState([]);
  const [errMsg, setErrMsg] = useState("");

  const load = () => {
    setState("loading");
    api.get("/analyses", token)
      .then((d) => {
        const list = normalizeSummaries(d);
        setRows(list);
        setState(list.length ? "ready" : "empty");
      })
      .catch((e) => { setErrMsg(e.message); setState("error"); });
  };

  useEffect(load, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Mode 01</div>
          <h1>Analysis History</h1>
          <p className="sub">What did Athena recommend, and when. Select a record to open its full analysis.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn--ghost btn--sm" onClick={load} disabled={state === "loading"}>
            <RefreshCw size={13} aria-hidden="true" /> Refresh
          </button>
          <Link to="/run" className="btn btn--sm">Run analysis</Link>
        </div>
      </header>

      {state === "loading" && (
        <div className="panel rowtable" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          {[...Array(5)].map((_, i) => <div className="skel" key={i} style={{ height: 34 }} />)}
        </div>
      )}

      {state === "error" && (
        <div className="panel"><EmptyState icon={FileSearch} title="Could not load history" hint={errMsg}>
          <button className="btn btn--ghost btn--sm" onClick={load}>Retry</button>
        </EmptyState></div>
      )}

      {state === "empty" && (
        <div className="panel"><EmptyState icon={FileSearch} title="No analyses yet"
          hint="Once a scenario is submitted, every run is archived here with its prediction and recommendation.">
          <Link to="/run" className="btn">Run your first analysis</Link>
        </EmptyState></div>
      )}

      {state === "ready" && (
        <div className="panel rowtable">
          <div className="hhead" aria-hidden="true">
            <span>Date</span><span className="hide-m">ID</span><span>Scenario</span>
            <span className="hide-m">Key metric</span><span className="hide-m">Prediction</span>
            <span>Recommendation</span><span>Status</span><span />
          </div>
          {rows.map((r) => (
            <button
              key={r.id}
              className="hrow"
              onClick={() => navigate(`/history/${encodeURIComponent(r.id)}`)}
              aria-label={`Open analysis ${r.id}: ${r.scenario}`}
            >
              <span className="mono">{dateShort(r.createdAt)}</span>
              <span className="mono c-id hide-m">{r.id}</span>
              <span className="c-scen">{r.scenario}</span>
              <span className="mono hide-m">{roas(r.roas)}</span>
              <span className="mono hide-m">{money(r.predictedRevenue)}</span>
              <span className="c-rec">{r.recommendation || "—"}</span>
              <span><span className="pill" style={{ padding: "4px 9px" }}><i style={{ background: r.status === "failed" ? "var(--neg)" : r.status === "processing" ? "var(--gold-300)" : "var(--pos)" }} aria-hidden="true" />{r.status}</span></span>
              <ChevronRight className="chev" size={15} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}