import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { humanAction, money, num, pctPoint, roas } from "../lib/format";
import { EmptyState, Eyebrow, Meter, StatCard } from "./ui";
import { AllocationDonut, ChartFrame, ExpenseChart, InventoryChart, RevenueChart, ScenarioComparison } from "./charts";

const RISK_TONE = { low: "pos", medium: "amb", moderate: "amb", high: "neg", critical: "neg" };

const INPUT_ROWS = [
  ["SKU", "sku"], ["Product", "product"],
  ["Current inventory", "current_inventory", num], ["Planned inventory", "planned_inventory", num],
  ["Selling price", "selling_price", money], ["Unit cost", "unit_cost", money],
  ["Expected demand", "expected_demand", num], ["Campaign", "campaign"],
  ["Spend", "spend", money], ["Horizon", "horizon_days", (v) => (v != null ? `${v} days` : undefined)],
  ["Assumptions", "assumptions"],
];

function KpiBand({ kpis, inputs }) {
  const cards = [];
  if (kpis.predictedRevenue != null)
    cards.push({ label: "Projected revenue", value: money(kpis.predictedRevenue) });
  if (kpis.roas != null) cards.push({ label: "ROAS", value: roas(kpis.roas) });
  if (kpis.marginPct != null) cards.push({ label: "Margin", value: `${kpis.marginPct}%` });
  if (kpis.projectedSpend != null)
    cards.push({
      label: "Projected spend",
      value: money(kpis.projectedSpend),
      sub: kpis.spendDeltaPct != null ? `${pctPoint(kpis.spendDeltaPct)} vs current` : undefined,
      tone: kpis.spendDeltaPct != null ? (kpis.spendDeltaPct <= 0 ? "pos" : "amb") : undefined,
    });
  if (kpis.inventoryRisk != null)
    cards.push({ label: "Inventory risk", value: String(kpis.inventoryRisk).toUpperCase(), tone: RISK_TONE[String(kpis.inventoryRisk).toLowerCase()] || "" });
  if (kpis.sellThroughPct != null) cards.push({ label: "Sell-through", value: `${kpis.sellThroughPct}%` });
  if (kpis.stockoutDay != null) cards.push({ label: "Stockout day", value: num(kpis.stockoutDay) });

  if (!cards.length)
    return (
      <EmptyState title="No KPI fields returned" hint="The backend completed this run but did not include KPI fields. Nothing is shown rather than guessed." />
    );

  return (
    <div className="charts">
      {cards.map((c, i) => (
        <div key={i} style={{ gridColumn: "span 3", minWidth: 0 }}>
          <StatCard {...c} />
        </div>
      ))}
      {/* keep the 12-col grid tidy when card count isn't a multiple of 4 */}
      <style>{`@media (max-width: 1120px){ .charts > [style*="span 3"]{ grid-column: span 6 !important; } }`}</style>
      {inputs ? null : null}
    </div>
  );
}

export function Recommendation({ rec }) {
  const evidence = rec?.evidence ?? [];
  return (
    <div className="panel reco">
      <Eyebrow>Athena recommends</Eyebrow>
      <div className="action">{rec?.headline || humanAction(rec?.action) || "Review required"}</div>
      {rec?.reason ? <p className="reason">{rec.reason}</p> : (
        <p className="reason">No written rationale was returned for this run.</p>
      )}
      {evidence.length > 0 && (
        <div className="chips">
          {evidence.map((e, i) => (
            <span className="chip" key={i}>
              {e.label}
              {e.value != null && e.value !== "" ? <>: <b>{e.value}</b></> : null}
              {e.detail ? <> — {e.detail}</> : null}
            </span>
          ))}
        </div>
      )}
      <Meter value={rec?.confidence} />
      {evidence.length > 0 && (
        <details className="raw" style={{ marginTop: 18 }}>
          <summary><ChevronDown size={13} aria-hidden="true" /> Inspect supporting data</summary>
          <div className="defgrid" style={{ marginTop: 14 }}>
            {evidence.map((e, i) => (
              <div className="def" key={i}>
                <div className="dt">{e.label}</div>
                <div className="dd">{e.value ?? "—"}{e.detail ? ` · ${e.detail}` : ""}</div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export default function ResultReport({ result }) {
  if (!result) return null;
  const { kpis, series, inputs, recommendation } = result;
  const chartMotion = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <motion.section {...chartMotion}>
        <Eyebrow>Key metrics</Eyebrow>
        <div style={{ marginTop: 14 }}>
          <KpiBand kpis={kpis} />
        </div>
      </motion.section>

      <motion.section {...chartMotion} transition={{ ...chartMotion.transition, delay: 0.06 }}>
        {recommendation?.action || recommendation?.headline ? (
          <Recommendation rec={recommendation} />
        ) : (
          <div className="panel">
            <EmptyState title="No recommendation returned" hint="Athena did not return a recommendation object for this analysis." />
          </div>
        )}
      </motion.section>

      <motion.section {...chartMotion} transition={{ ...chartMotion.transition, delay: 0.12 }}>
        <Eyebrow>Trajectories</Eyebrow>
        <div className="charts" style={{ marginTop: 14 }}>
          <ChartFrame span={7} title="Inventory trajectory" question="Will stock cover projected demand through the horizon?">
            <InventoryChart series={series} />
          </ChartFrame>
          <ChartFrame span={5} title="Revenue projection" question="What revenue does the plan produce vs the current baseline?">
            <RevenueChart series={series} />
          </ChartFrame>
          <ChartFrame span={7} title="Expense impact" question="Where does spend shift, and by how much?">
            <ExpenseChart series={series} kpis={kpis} inputs={inputs} />
          </ChartFrame>
          <ChartFrame span={5} title="Budget allocation" question="How is budget distributed across channels?">
            <AllocationDonut series={series} />
          </ChartFrame>
          {series?.scenarios?.length ? (
            <ChartFrame span={12} title="Scenario comparison" question="Why Athena's plan over the current plan?">
              <ScenarioComparison series={series} />
            </ChartFrame>
          ) : null}
        </div>
      </motion.section>

      <motion.section {...chartMotion} transition={{ ...chartMotion.transition, delay: 0.18 }}>
        <Eyebrow>Scenario inputs</Eyebrow>
        <div className="defgrid" style={{ marginTop: 14 }}>
          {INPUT_ROWS.map(([label, key, fmt]) => {
            const v = inputs?.[key];
            const shown = v == null || v === "" ? "—" : fmt ? fmt(v) : String(v);
            return (
              <div className="def" key={key}>
                <div className="dt">{label}</div>
                <div className="dd">{shown}</div>
              </div>
            );
          })}
        </div>
        <details className="raw" style={{ marginTop: 16 }}>
          <summary><ChevronDown size={13} aria-hidden="true" /> Inspect raw response</summary>
          <pre>{JSON.stringify(result.raw, null, 2)}</pre>
        </details>
      </motion.section>
    </div>
  );
}