import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, pollAnalysis } from "../../lib/api";
import { normalizeResult } from "../../lib/contract";
import { dateTime } from "../../lib/format";
import { usePageTitle } from "../../lib/hooks";
import { useAuth } from "../../state/AuthContext";
import ResultReport, { Recommendation } from "../../components/ResultReport";
import { EmptyState, Eyebrow, StatusPill } from "../../components/ui";
import { ProcessingPanel } from "./RunAnalysis";

export default function AnalysisDetail() {
  const { id } = useParams();
  usePageTitle(`Analysis ${id}`);
  const { token } = useAuth();
  const [state, setState] = useState("loading");
  const [result, setResult] = useState(null);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    let live = true;
    setState("loading");
    api.get(`/analyses/${encodeURIComponent(id)}`, token)
      .then((d) => {
        if (!live) return;
        const n = normalizeResult(d);
        setResult(n);
        const s = (n.status || "").toLowerCase();
        if (["processing", "running", "pending", "queued"].includes(s)) {
          setState("processing");
          return pollAnalysis(id, token, { onUpdate: () => {} })
            .then((final) => { if (live) { setResult(final); setState("ready"); } })
            .catch((e) => { if (live) { setErrMsg(e.message); setState("error"); } });
        }
        setState("ready");
      })
      .catch((e) => { if (live) { setErrMsg(e.message); setState("error"); } });
    return () => { live = false; };
  }, [id, token]);

  return (
    <div className="page">
      <Link to="/history" className="backlink">← Analysis History</Link>
      <header className="page-head">
        <div>
          <div className="eyebrow">Analysis record</div>
          <h1 style={{ fontFamily: "var(--font-mono)", fontWeight: 400, fontSize: 26 }}>{id}</h1>
          {result && (
            <p className="sub" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {dateTime(result.createdAt)} · <StatusPill status={result.status} />
            </p>
          )}
        </div>
        <Link to="/run" className="btn btn--ghost btn--sm">Run a new analysis</Link>
      </header>

      {state === "loading" && (
        <div className="panel" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          {[...Array(4)].map((_, i) => <div className="skel" key={i} style={{ height: 60 }} />)}
        </div>
      )}

      {state === "processing" && (
        <div className="panel" style={{ padding: 26 }}>
          <Eyebrow>Live analysis</Eyebrow>
          <ProcessingPanel active />
        </div>
      )}

      {state === "error" && (
        <div className="panel"><EmptyState title="Analysis unavailable" hint={errMsg} /></div>
      )}

      {state === "ready" && result && (
        result.status === "failed" ? (
          <div className="panel"><EmptyState title="This analysis failed on the backend"
            hint="The backend marked this run as failed. Re-run the scenario to generate a fresh analysis." />
          </div>
        ) : (
          <>
            {result.recommendation?.action || result.recommendation?.headline ? (
              <div style={{ marginBottom: 22 }}><Recommendation rec={result.recommendation} /></div>
            ) : null}
            <ResultReport result={result} />
          </>
        )
      )}
    </div>
  );
}