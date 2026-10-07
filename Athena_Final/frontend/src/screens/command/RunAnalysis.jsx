import { AnimatePresence, motion } from "framer-motion";
import { Check, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api, pollAnalysis } from "../../lib/api";
import { normalizeResult } from "../../lib/contract";
import { useElapsed, usePageTitle } from "../../lib/hooks";
import { useAuth } from "../../state/AuthContext";
import { Banner, EmptyState, Eyebrow, Field, StatusPill } from "../../components/ui";
import ResultReport from "../../components/ResultReport";
import { dateTime } from "../../lib/format";

const HORIZONS = [7, 14, 30, 60, 90];

/* Presentational processing steps — UI states only, never data claims. */
const STEPS = [
  "Scenario accepted",
  "Reconciling inventory",
  "Simulating demand",
  "Optimizing spend",
  "Compiling recommendation",
];
const STEP_AT = [0.2, 1.4, 3.2, 5.6, 8.2]; // seconds

export function ProcessingPanel({ active, failed }) {
  const ms = useElapsed(active);
  const s = ms / 1000;
  const doneCount = failed ? 0 : STEPS.filter((_, i) => s >= STEP_AT[i] + 1.4).length;
  const currentIdx = failed ? -1 : STEPS.findIndex((_, i) => s >= STEP_AT[i] && s < STEP_AT[i] + 1.4);
  const progress = Math.min(92, (s / 45) * 100);
  return (
    <div>
      <div className="proc-top" aria-live="polite">
        <span className="dot wait" aria-hidden="true" />
        {failed ? "Run failed." : "Athena is processing the scenario…"}
        <span className="mono" style={{ marginLeft: "auto" }}>
          elapsed {String(Math.floor(s / 60)).padStart(2, "0")}:{String(Math.floor(s % 60)).padStart(2, "0")}
        </span>
      </div>
      <div className="steps">
        {STEPS.map((label, i) => {
          const done = i < doneCount;
          const on = i === doneCount || i === currentIdx;
          return (
            <div key={label} className={`step${done ? " done" : on ? " on" : ""}`}>
              <span className="s-ic" aria-hidden="true">
                {done ? <Check size={11} /> : on ? <span className="dot wait" style={{ margin: 0 }} /> : null}
              </span>
              {label}
            </div>
          );
        })}
      </div>
      <div className="pulsebar" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
    </div>
  );
}

export default function RunAnalysis() {
  usePageTitle("Run Analysis");
  const { token } = useAuth();
  const prefill = useLocation().state?.prefill || {};

  const [stage, setStage] = useState("form"); // form | processing | result | error
  const [result, setResult] = useState(null);
  const [runError, setRunError] = useState("");
  const [formError, setFormError] = useState("");
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    sku: prefill.sku ?? "",
    product: prefill.product ?? "",
    current_inventory: prefill.current_inventory ?? "",
    planned_inventory: prefill.planned_inventory ?? "",
    selling_price: prefill.selling_price ?? "",
    unit_cost: prefill.unit_cost ?? "",
    expected_demand: prefill.expected_demand ?? "",
    campaign: prefill.campaign ?? "",
    spend: prefill.spend ?? "",
    horizon_days: prefill.horizon_days ?? 30,
    assumptions: prefill.assumptions ?? "",
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const numField = (v) => (v === "" ? undefined : Number(v));

  async function submit(e) {
    e.preventDefault();
    setFormError("");
    const er = {};
    if (!form.sku.trim()) er.sku = "SKU is required.";
    if (!form.product.trim()) er.product = "Product is required.";
    if (form.current_inventory === "" || Number(form.current_inventory) < 0) er.current_inventory = "Required, 0 or more.";
    if (form.selling_price === "" || Number(form.selling_price) <= 0) er.selling_price = "Required, greater than 0.";
    if (form.expected_demand === "" || Number(form.expected_demand) < 0) er.expected_demand = "Required, 0 or more.";
    if (form.spend !== "" && Number(form.spend) < 0) er.spend = "Cannot be negative.";
    setErrors(er);
    if (Object.keys(er).length) return;

    setStage("processing");
    setRunError("");
    const payload = {
      sku: form.sku.trim(),
      product: form.product.trim(),
      current_inventory: numField(form.current_inventory),
      planned_inventory: numField(form.planned_inventory),
      selling_price: numField(form.selling_price),
      unit_cost: numField(form.unit_cost),
      expected_demand: numField(form.expected_demand),
      campaign: form.campaign.trim() || undefined,
      spend: numField(form.spend),
      horizon_days: Number(form.horizon_days) || undefined,
      assumptions: form.assumptions.trim() || undefined,
    };

    try {
      const d = await api.post("/analyses", payload, token);
      const n = normalizeResult(d);
      const s = (n?.status || "").toLowerCase();
      if (n && ["complete", "completed"].includes(s)) {
        setResult(n);
        setStage("result");
      } else if (n?.id && n.id !== "—") {
        const final = await pollAnalysis(n.id, token, {});
        if ((final?.status || "").toLowerCase() === "failed") throw new Error("The backend reported this analysis as failed.");
        setResult(final);
        setStage("result");
      } else {
        throw new Error("The backend accepted the scenario but returned no analysis id.");
      }
    } catch (err) {
      setRunError(err.message || "Analysis failed.");
      setStage("error");
    }
  }

  return (
    <div className="page">
      {stage === "result" && result && (
        <Link to={`/history/${encodeURIComponent(result.id)}`} className="backlink" style={{ visibility: "hidden" }} aria-hidden="true">.</Link>
      )}
      <header className="page-head">
        <div>
          <div className="eyebrow">Mode 02</div>
          <h1>{stage === "result" ? "Analysis result" : "Run Analysis"}</h1>
          <p className="sub">
            {stage === "result" && result
              ? <>Run {result.id} · {dateTime(result.createdAt)} · <StatusPill status={result.status} /></>
              : "Describe the business scenario. Athena returns the projection, the risk, and a directive."}
          </p>
        </div>
        {stage === "result" && (
          <div style={{ display: "flex", gap: 10 }}>
            <Link to={`/history/${encodeURIComponent(result.id)}`} className="btn btn--ghost btn--sm">Open in history</Link>
            <button className="btn btn--sm" onClick={() => { setStage("form"); setResult(null); }}>Run another</button>
          </div>
        )}
      </header>

      <AnimatePresence mode="wait">
        {stage === "form" && (
          <motion.form
            key="form"
            onSubmit={submit}
            noValidate
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 860 }}
          >
            {formError && <Banner>{formError}</Banner>}

            <fieldset className="panel" style={{ padding: "22px 24px", border: "1px solid var(--line)" }}>
              <legend className="eyebrow" style={{ padding: 0 }}>Scenario</legend>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16, marginTop: 8 }}>
                <Field id="sku" label="SKU" value={form.sku} onChange={set("sku")} required error={errors.sku} placeholder="CMP005" />
                <Field id="product" label="Product" value={form.product} onChange={set("product")} required error={errors.product} placeholder="Wireless door sensor" />
                <Field id="demand" label="Expected demand" type="number" min="0" value={form.expected_demand} onChange={set("expected_demand")} required error={errors.expected_demand} hint="Units over the horizon." placeholder="1200" />
                <Field id="horizon" label="Time horizon" value={form.horizon_days} onChange={set("horizon_days")} hint="Days ahead to project.">
                  <select id="horizon" className="input" value={form.horizon_days} onChange={set("horizon_days")}>
                    {HORIZONS.map((h) => <option key={h} value={h}>{h} days</option>)}
                  </select>
                </Field>
              </div>
            </fieldset>

            <fieldset className="panel" style={{ padding: "22px 24px", border: "1px solid var(--line)" }}>
              <legend className="eyebrow" style={{ padding: 0 }}>Inventory</legend>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
                <Field id="curinv" label="Current inventory" type="number" min="0" value={form.current_inventory} onChange={set("current_inventory")} required error={errors.current_inventory} placeholder="340" />
                <Field id="planinv" label="Planned inventory" type="number" min="0" value={form.planned_inventory} onChange={set("planned_inventory")} optional hint="Inbound units planned for the horizon." placeholder="500" />
              </div>
            </fieldset>

            <fieldset className="panel" style={{ padding: "22px 24px", border: "1px solid var(--line)" }}>
              <legend className="eyebrow" style={{ padding: 0 }}>Economics</legend>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
                <Field id="price" label="Selling price" type="number" min="0" step="0.01" value={form.selling_price} onChange={set("selling_price")} required error={errors.selling_price} placeholder="2499" />
                <Field id="cost" label="Unit cost" type="number" min="0" step="0.01" value={form.unit_cost} onChange={set("unit_cost")} optional hint="Enables margin in the result." placeholder="1420" />
              </div>
            </fieldset>

            <fieldset className="panel" style={{ padding: "22px 24px", border: "1px solid var(--line)" }}>
              <legend className="eyebrow" style={{ padding: 0 }}>Campaign</legend>
              <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, marginTop: 8 }}>
                <Field id="campaign" label="Campaign" value={form.campaign} onChange={set("campaign")} optional placeholder="Diwali push — Meta" />
                <Field id="spend" label="Planned spend" type="number" min="0" step="0.01" value={form.spend} onChange={set("spend")} optional error={errors.spend} placeholder="60000" />
              </div>
            </fieldset>

            <Field id="assumptions" label="Assumptions" optional hint="Free-text context Athena should respect (price drops, seasonality, supply delays).">
              <textarea id="assumptions" className="input" rows={3} value={form.assumptions} onChange={set("assumptions")} placeholder="Competitor launch expected mid-horizon; supply is stable." />
            </Field>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button className="btn" type="submit">
                <Play size={14} aria-hidden="true" /> Run analysis
              </button>
              <span className="mono">POST /analyses</span>
            </div>
          </motion.form>
        )}

        {stage === "processing" && (
          <motion.div key="proc" className="panel" style={{ padding: 28, maxWidth: 640 }}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
            <Eyebrow>Processing</Eyebrow>
            <div style={{ height: 16 }} />
            <ProcessingPanel active />
          </motion.div>
        )}

        {stage === "error" && (
          <motion.div key="err" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ maxWidth: 640 }}>
            <div className="panel">
              <EmptyState title="Analysis could not complete" hint={runError}>
                <button className="btn" onClick={() => setStage("form")}>Back to scenario</button>
              </EmptyState>
            </div>
          </motion.div>
        )}

        {stage === "result" && result && (
          <motion.div key="res" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
            <ResultReport result={result} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}