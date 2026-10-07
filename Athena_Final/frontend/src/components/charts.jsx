import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { CircleDot } from "lucide-react";
import { money, num, roas } from "../lib/format";

const GOLD = "#d6b985";
const SLATE = "#7c8798";
const GRID = "rgba(233,221,196,0.07)";
const AXIS = "#6b7382";
const DONUT = ["#d6b985", "#b99b66", "#8b7448", "#5e6b80", "#3e4a5e", "#2c3648", "#8fa5a0"];

function ChartTip({ active, payload, label, fmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tip">
      <div className="t-label">{label}</div>
      {payload.map((p) => (
        <div className="t-row" key={p.name}>
          <i style={{ background: p.color || p.fill }} />
          {p.name}: {fmt ? fmt(p.value) : num(p.value)}
        </div>
      ))}
    </div>
  );
}

export function ChartFrame({ title, question, summary, span = 6, children, footer }) {
  return (
    <div className="panel chart-card" style={{ gridColumn: `span ${span}` }} role="group" aria-label={summary || title}>
      <h3>{title}</h3>
      {question && <div className="q">{question}</div>}
      <div style={{ marginTop: 14 }}>{children}</div>
      {footer}
    </div>
  );
}

export function EmptyChart({ label }) {
  return (
    <div className="empty" style={{ padding: "34px 20px" }}>
      <CircleDot size={20} strokeWidth={1.5} aria-hidden="true" />
      <p style={{ fontSize: 12.5 }}>
        No {label} series was returned for this analysis — the backend did not provide it.
      </p>
    </div>
  );
}

const axisProps = {
  stroke: AXIS,
  tickLine: false,
  tick: { fontSize: 11, fill: AXIS },
};

/* Answers: will stock cover demand through the horizon? */
export function InventoryChart({ series }) {
  const data = series?.inventory;
  if (!data?.length) return <EmptyChart label="inventory trajectory" />;
  return (
    <ResponsiveContainer width="100%" height={250}>
      <ComposedChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -14 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="__key" {...axisProps} axisLine={{ stroke: GRID }} />
        <YAxis {...axisProps} axisLine={false} width={48} />
        <Tooltip content={<ChartTip fmt={(v) => `${num(v)} units`} />} cursor={{ fill: "rgba(233,221,196,0.04)" }} />
        <Area type="monotone" dataKey="current" name="Projected stock" stroke={GOLD} fill="rgba(214,185,133,0.10)" strokeWidth={1.8} />
        <Line type="monotone" dataKey="planned" name="Planned stock" stroke={SLATE} strokeDasharray="4 4" strokeWidth={1.3} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* Answers: what revenue does the plan produce vs the current baseline? */
export function RevenueChart({ series }) {
  const data = series?.revenue;
  if (!data?.length) return <EmptyChart label="revenue projection" />;
  return (
    <ResponsiveContainer width="100%" height={250}>
      <ComposedChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -6 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="__key" {...axisProps} axisLine={{ stroke: GRID }} />
        <YAxis {...axisProps} axisLine={false} width={56} tickFormatter={(v) => money(v)} />
        <Tooltip content={<ChartTip fmt={money} />} cursor={{ fill: "rgba(233,221,196,0.04)" }} />
        <Area type="monotone" dataKey="projected" name="Athena plan" stroke={GOLD} fill="rgba(214,185,133,0.10)" strokeWidth={1.8} />
        <Line type="monotone" dataKey="baseline" name="Current baseline" stroke={SLATE} strokeDasharray="4 4" strokeWidth={1.3} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* Answers: where does spend shift, and by how much? */
export function ExpenseChart({ series, kpis, inputs }) {
  let data = null;
  let mode = "none";
  if (series?.expense?.length) {
    data = series.expense;
    mode = "channels";
  } else if (kpis?.projectedSpend != null || inputs?.spend != null) {
    data = [
      { __key: "Current", current: inputs?.spend ?? null, proposed: inputs?.spend ?? null },
      { __key: "Projected", current: null, proposed: kpis?.projectedSpend ?? null },
    ];
    mode = "totals";
  }
  if (!data) return <EmptyChart label="expense impact" />;
  return mode === "channels" ? (
    <>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -6 }} barGap={3}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="__key" {...axisProps} axisLine={{ stroke: GRID }} />
          <YAxis {...axisProps} axisLine={false} width={56} tickFormatter={(v) => money(v)} />
          <Tooltip content={<ChartTip fmt={money} />} cursor={{ fill: "rgba(233,221,196,0.04)" }} />
          <Bar dataKey="current" name="Current" fill={SLATE} radius={[3, 3, 0, 0]} maxBarSize={26} />
          <Bar dataKey="proposed" name="Athena plan" fill={GOLD} radius={[3, 3, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
      <div className="legend" aria-hidden="true">
        <span><i style={{ background: SLATE }} />Current</span>
        <span><i style={{ background: GOLD }} />Athena plan</span>
      </div>
    </>
  ) : (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" {...axisProps} axisLine={{ stroke: GRID }} tickFormatter={(v) => money(v)} />
        <YAxis type="category" dataKey="__key" {...axisProps} axisLine={false} width={78} />
        <Tooltip content={<ChartTip fmt={money} />} cursor={{ fill: "rgba(233,221,196,0.04)" }} />
        <Bar dataKey="proposed" name="Spend" fill={GOLD} radius={[0, 3, 3, 0]} maxBarSize={22}>
          {data.map((d, i) => <Cell key={i} fill={i === 0 ? SLATE : GOLD} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* Answers: how is budget distributed across channels? */
export function AllocationDonut({ series }) {
  const data = series?.allocation;
  if (!data?.length) return <EmptyChart label="budget allocation" />;
  const total = data.reduce((a, d) => a + (d.amount || 0), 0);
  return (
    <div className="donut-wrap">
      <ResponsiveContainer width="100%" height={230}>
        <PieChart>
          <Tooltip content={<ChartTip fmt={money} />} />
          <Pie data={data} dataKey="amount" nameKey="__key" innerRadius="62%" outerRadius="86%" paddingAngle={2} stroke="none">
            {data.map((_, i) => <Cell key={i} fill={DONUT[i % DONUT.length]} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-center">
        <div>
          <div className="dc-v">{money(total)}</div>
          <div className="dc-k">Total budget</div>
        </div>
      </div>
      <div className="legend">
        {data.map((d, i) => (
          <span key={i}><i style={{ background: DONUT[i % DONUT.length] }} />{d.__key}</span>
        ))}
      </div>
    </div>
  );
}

/* Answers: why Athena's plan over the current plan? */
export function ScenarioComparison({ series }) {
  const rows = series?.scenarios;
  if (!rows?.length) return <EmptyChart label="scenario comparison" />;
  const max = {
    roas: Math.max(...rows.map((r) => r.roas || 0), 0.0001),
    revenue: Math.max(...rows.map((r) => r.revenue || 0), 0.0001),
    sellThrough: Math.max(...rows.map((r) => r.sellThrough || 0), 0.0001),
  };
  const Bar3 = ({ v, m, fmt }) =>
    v == null ? <div className="sv">—</div> : (
      <div className="sbar-cell">
        <div className="sbar"><span style={{ width: `${Math.max(3, (v / m) * 100)}%` }} /></div>
        <div className="sv">{fmt(v)}</div>
      </div>
    );
  return (
    <div className="scen">
      <div className="scen-head"><span>Scenario</span><span>ROAS</span><span>Revenue</span><span>Sell-through</span></div>
      {rows.map((r, i) => (
        <div className="scen-row" key={i}>
          <div className="scen-name">{r.__key}</div>
          <Bar3 v={r.roas} m={max.roas} fmt={roas} />
          <Bar3 v={r.revenue} m={max.revenue} fmt={money} />
          <Bar3 v={r.sellThrough} m={max.sellThrough} fmt={(v) => `${v}%`} />
        </div>
      ))}
    </div>
  );
}