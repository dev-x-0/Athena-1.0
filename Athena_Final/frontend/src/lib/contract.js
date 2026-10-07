/* ============================================================
   SINGLE INTEGRATION POINT with the Athena backend.
   Every field-name expectation lives here. Components never read
   raw payloads. If the backend uses different names, change them
   HERE ONLY. Absent fields propagate as `undefined` and the UI
   renders em-dashes / empty states — nothing is fabricated.
   ============================================================ */

const alias = (o, ...keys) => {
  if (!o || typeof o !== "object") return undefined;
  for (const k of keys) if (o[k] !== null && o[k] !== undefined) return o[k];
  return undefined;
};

export const AUTH = {
  loginPath: "/auth/login",
  registerPath: "/auth/register",
};

/* ---- auth ---- */
export function normalizeSession(d) {
  return {
    token: alias(d, "token", "access_token", "jwt"),
    username: alias(d?.user, "username", "name") ?? alias(d, "username", "user", "name"),
  };
}

/* ---- history summaries ---- */
export function normalizeSummaries(d) {
  const list = Array.isArray(d)
    ? d
    : alias(d, "analyses", "items", "results", "history") || [];
  return (Array.isArray(list) ? list : []).map(normalizeSummary);
}

export function normalizeSummary(raw) {
  const k = raw?.kpis ?? raw ?? {};
  const r = raw?.recommendation ?? {};
  const scenario =
    alias(raw, "scenario", "label", "title") ||
    [alias(raw, "sku"), alias(raw, "product")].filter(Boolean).join(" · ") ||
    "Unnamed scenario";
  return {
    id: String(alias(raw, "id", "analysis_id", "run_id") ?? "—"),
    createdAt: alias(raw, "created_at", "createdAt", "timestamp", "date"),
    status: String(alias(raw, "status", "state") ?? "complete").toLowerCase(),
    scenario,
    roas: alias(k, "roas", "roas_value"),
    predictedRevenue: alias(k, "predicted_revenue", "projected_revenue", "revenue"),
    recommendation: alias(r, "headline", "action", "recommendation"),
  };
}

/* ---- full result ---- */
export function normalizeResult(raw) {
  if (!raw || typeof raw !== "object") return null;
  const k = raw?.kpis ?? raw ?? {};
  const r = raw?.recommendation ?? raw?.athena_recommendation ?? {};
  const s = raw?.series ?? {};

  const inputs = raw?.inputs ?? {
    sku: alias(raw, "sku"),
    product: alias(raw, "product"),
    current_inventory: alias(raw, "current_inventory"),
    planned_inventory: alias(raw, "planned_inventory"),
    selling_price: alias(raw, "selling_price"),
    unit_cost: alias(raw, "unit_cost"),
    expected_demand: alias(raw, "expected_demand"),
    campaign: alias(raw, "campaign"),
    spend: alias(raw, "spend"),
    horizon_days: alias(raw, "horizon_days"),
    assumptions: alias(raw, "assumptions"),
  };

  const evidence = Array.isArray(r?.evidence)
    ? r.evidence.map((e) =>
        typeof e === "string"
          ? { label: e, value: undefined, detail: undefined }
          : { label: alias(e, "label", "name") ?? "Evidence", value: alias(e, "value"), detail: alias(e, "detail", "note") }
      )
    : [];

  return {
    id: String(alias(raw, "id", "analysis_id", "run_id") ?? "—"),
    status: String(alias(raw, "status", "state") ?? "complete").toLowerCase(),
    createdAt: alias(raw, "created_at", "createdAt", "timestamp"),
    inputs,
    kpis: {
      predictedRevenue: alias(k, "predicted_revenue", "projected_revenue", "revenue"),
      projectedSpend: alias(k, "projected_spend", "planned_spend"),
      spendDeltaPct: alias(k, "spend_delta_pct", "spend_change_pct"),
      roas: alias(k, "roas", "roas_value"),
      marginPct: alias(k, "margin_pct", "gross_margin_pct"),
      inventoryRisk: alias(k, "inventory_risk", "risk_level"),
      sellThroughPct: alias(k, "sell_through_pct"),
      stockoutDay: alias(k, "stockout_day", "days_to_stockout"),
    },
    recommendation: {
      action: alias(r, "action"),
      headline: alias(r, "headline"),
      reason: alias(r, "reason", "rationale", "explanation"),
      confidence: alias(r, "confidence", "confidence_score"),
      evidence,
    },
    series: {
      inventory: mapSeries(alias(s, "inventory", "inventory_trajectory"), ["day", "x", "date"], { current: ["current", "projected", "stock"], planned: ["planned", "baseline"] }),
      revenue: mapSeries(alias(s, "revenue", "revenue_projection"), ["day", "x", "date"], { baseline: ["baseline", "current"], projected: ["projected", "athena", "value"] }),
      expense: mapSeries(alias(s, "expense", "expense_impact"), ["label", "channel", "name"], { current: ["current", "before"], proposed: ["proposed", "after"] }),
      allocation: mapSeries(alias(s, "allocation", "budget"), ["label", "channel", "name"], { amount: ["amount", "spend", "value"] }),
      scenarios: mapSeries(alias(s, "scenarios", "comparison"), ["name", "label", "scenario"], { roas: ["roas"], revenue: ["revenue", "predicted_revenue"], sellThrough: ["sell_through", "sell_through_pct"] }),
    },
    raw,
  };
}

function mapSeries(arr, keyAliases, valAliases) {
  if (!Array.isArray(arr) || arr.length === 0) return undefined;
  return arr
    .map((row) => {
      const out = { __key: alias(row, ...keyAliases) };
      for (const [field, aliases] of Object.entries(valAliases)) out[field] = alias(row, ...aliases);
      return out;
    })
    .filter((r) => r.__key !== undefined || Object.values(r).some((v) => v !== undefined && v !== null));
}