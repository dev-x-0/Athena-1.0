export const CURRENCY = (import.meta.env.VITE_CURRENCY || "₹").trim();

export function isNum(v) {
  return typeof v === "number" && Number.isFinite(v);
}

export function money(v) {
  if (!isNum(v)) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e7) return `${CURRENCY}${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e5) return `${CURRENCY}${(v / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `${CURRENCY}${(v / 1e3).toFixed(1)}K`;
  return `${CURRENCY}${Math.round(v).toLocaleString("en-IN")}`;
}

export function num(v) {
  if (!isNum(v)) return "—";
  return v.toLocaleString("en-IN");
}

export function roas(v) {
  if (!isNum(v)) return "—";
  return `${v.toFixed(2)}x`;
}

export function pct(v, digits = 0) {
  if (!isNum(v)) return "—";
  const p = Math.abs(v) <= 1 && /confidence/i.test("") === false && v !== 0 ? v * 100 : v;
  return `${p.toFixed(digits)}%`;
}

/* confidence: accept 0–1 or 0–100 */
export function confidencePct(v) {
  if (!isNum(v)) return null;
  return v > 1 ? v : v * 100;
}

export function pctPoint(v) {
  if (!isNum(v)) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}

export function dateShort(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function dateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function relTime(iso) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function humanAction(action) {
  if (!action) return "Review required";
  return String(action).replace(/[_-]+/g, " ").trim();
}