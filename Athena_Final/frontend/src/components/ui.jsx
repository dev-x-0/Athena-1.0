import { Eye, EyeOff, Inbox } from "lucide-react";
import { useState } from "react";
import { confidencePct } from "../lib/format";

export function Eyebrow({ children }) {
  return <div className="eyebrow">{children}</div>;
}

export function Field({ id, label, type = "text", value, onChange, placeholder, required, min, step, autoComplete, error, hint, optional }) {
  const [show, setShow] = useState(false);
  const isPw = type === "password";
  const inputType = isPw && show ? "text" : type;
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {optional && <span className="opt"> · optional</span>}
      </label>
      {isPw ? (
        <div className="pw-wrap">
          <input
            id={id}
            className={`input${error ? " err" : ""}`}
            type={inputType}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            aria-required={required || undefined}
            aria-invalid={!!error || undefined}
            autoComplete={autoComplete}
          />
          <button type="button" className="pw-eye" onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}>
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      ) : (
        <input
          id={id}
          className={`input${error ? " err" : ""}`}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          min={min}
          step={step}
          aria-required={required || undefined}
          aria-invalid={!!error || undefined}
          autoComplete={autoComplete}
        />
      )}
      {error ? (
        <div className="ferr" role="alert">{error}</div>
      ) : hint ? (
        <div className="fhint">{hint}</div>
      ) : null}
    </div>
  );
}

export function Banner({ tone = "error", children }) {
  return (
    <div className={`banner${tone === "ok" ? " banner--ok" : ""}`} role={tone === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}

export function StatusPill({ status }) {
  const s = String(status || "").toLowerCase();
  const cls = ["complete", "completed", "done"].includes(s) ? "pill--ok"
    : ["processing", "running", "pending", "queued"].includes(s) ? "pill--run"
    : ["failed", "error"].includes(s) ? "pill--bad" : "";
  return (
    <span className={`pill ${cls}`}>
      <i aria-hidden="true" />
      {s || "unknown"}
    </span>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, hint, children }) {
  return (
    <div className="empty">
      <Icon size={26} strokeWidth={1.5} aria-hidden="true" />
      <h3>{title}</h3>
      {hint && <p>{hint}</p>}
      {children}
    </div>
  );
}

export function StatCard({ label, value, sub, tone }) {
  return (
    <div className="panel stat">
      <div className="klabel">{label}</div>
      <div className="kvalue">{value}</div>
      {sub && <div className={`ksub ${tone || ""}`}>{sub}</div>}
    </div>
  );
}

export function Meter({ value }) {
  const p = confidencePct(value);
  if (p === null) return null;
  return (
    <div className="meterline">
      <div className="meter" role="img" aria-label={`Confidence ${Math.round(p)} percent`}>
        <span style={{ width: `${Math.max(2, Math.min(100, p))}%` }} />
      </div>
      <div className="meterlabel">Confidence {Math.round(p)}%</div>
    </div>
  );
}