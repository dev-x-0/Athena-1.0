# Athena API contract (source of truth for the frontend)

Base URL `http://127.0.0.1:8000`. JSON everywhere. Interactive docs: `/docs`.
Dev tip: proxy `/api` and `/auth` from Vite to :8000 (same origin, cookies just work). Otherwise `fetch(..., {credentials:"include"})`.

## Auth
Session is an httpOnly cookie `athena_session` **or** `Authorization: Bearer <token>` (both returned/accepted). Unauthenticated -> `401`.

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/auth/signup` | `{username, password, company_name?, load_sample_data=true}` | `201 {user, token, expires_at}` · `409` taken · `422` validation message |
| POST | `/auth/login` | `{username, password}` | `{user, token, expires_at}` · `401` · `429` after 5 failures/15 min |
| POST | `/auth/logout` | – | `{ok:true}` |
| GET | `/auth/me` | – | `{user:{id,username,org:{id,name}}, session_expires_at}` |

Username: 3-32 of `A-Za-z0-9_.-` (case-insensitive unique). Password: 8-128, letter + digit. Every user belongs to a company (org); all data is org-isolated.

## Shared shapes
**Metric** (every number shown to the user): `{metric, label, value, unit, type, formula, sources[], inputs{}, time_range, note}`
- `unit`: `INR | x | % | units | days`; `value` may be `null` (= not computable; read `note`/`data_gaps`, never show 0).
- `type`: `OBSERVED` (read from data) · `DERIVED` (calculated) · `FORECAST` (Athena prediction) · `ASSUMED` (typed by the user). Badge these in the UI.

**Chart**: `{id, type: line|area|bar|donut|trajectory, title, unit, x[], series:[{name, kind, values[]}]}`. `values` may contain `null` (gaps). `kind`: `observed | forecast | forecast_band | derived | policy`. Donut: `x` = slice labels, one series.

**Decision**: `{action: SCALE|HOLD|REDUCE|PAUSE|REVIEW, label, spend_change_pct, rationale[], evidence[{signal,value,reading}], conflicts[], reason_codes[], confidence?}`. `spend_change_pct` is a policy step, not a prediction.

**Confidence**: `{level: HIGH|MEDIUM|LOW, score 0-1, basis, factors[]}` – a data-sufficiency heuristic, not a probability.

**Alert**: `{code, severity: CRITICAL|WARNING|INFO, category, title, description, campaign_id, sku, stats{}, evidence[], acknowledged}`.

## Command centre (first screen after login)
`GET /api/command-center` -> `{user, modes:[{key:"history"|"run_analysis"|"references", title, route, count, subtitle, latest?}], alerts:{total,critical}, data_status:{has_data, latest_day}}`

## Dashboard & data
- `GET /api/dashboard?range=7d|30d|qtd` -> `{range, roas_floor, low_stock_threshold, data_status, kpis:[Metric + {previous, delta_pct}] (ad_spend, gross_revenue, blended_roas, net_contribution), trajectory:Chart, channels:[{channel,spend,revenue,roas}], campaigns:[…+action,reason], inventory_summary, forecast:{revenue:{base,low,high}, change_vs_last_7d_pct, change_is_significant, …}|null, insights[], alerts:{total,critical,warning,items[]}}`. With no data: `data_status.has_data=false`, empty lists (no error).
- `GET /api/campaigns?range=` -> `{items:[{campaign_id,name,channel,sku,product_name,spend,revenue,roas,prior_roas,roas_trend_pct,break_even_roas,contribution,margin_pct,conversions,cpa,stock_units,days_with_data,decision:Decision}]}`
- `GET /api/products` -> `{items:[{sku,name,category,selling_price,unit_cost,margin_pct,stock_level,campaign_ids,ad_spend_30d,ad_revenue_30d,roas_30d,source}]}` (null = unknown)
- `GET /api/inventory` -> `{low_stock_threshold, items:[{sku,product_name,stock_level,reserved,available,stock_status: OK|LOW|OUT,campaign_id,campaign_action,margin_pct,…}]}`
- `POST /api/inventory` `{sku, stock_level, reserved?, product_name? (required for new SKU), category?, selling_price?, unit_cost?, margin_pct?}` -> `201` inventory row.
- `GET /api/insights?range=` -> `{items:[{id,tone: good|warn|info,title,detail,evidence[]}], reallocation:{items:[{campaign_id,name,current,recommended,change,roas,action}], projected_gain, projected_gain_type:"FORECAST", note, campaigns_excluded_for_missing_margin[]}}`
- `GET /api/alerts` -> `{total, items:[Alert]}` · `POST /api/alerts/{code}/acknowledge` toggles acknowledgement.
- `GET /api/audit?limit=` -> `{items:[{id,ts,action,detail,user}]}`
- CSV: `GET /api/export/{products|campaigns|daily|inventory}[?template=true]`, `POST /api/import/{kind}` `{csv:"…"}` -> `{imported, kind}` (import products -> campaigns -> daily/inventory; `400` lists the first row errors). `margin_pct` is a percentage (42.5).
- `DELETE /api/data/sample` removes only synthetic sample rows.

## Run Analysis
`POST /api/analysis` -> `201` full result (below). Body:
```json
{ "title": "optional", "horizon_days": 30,
  "items": [{ "sku": "SKU-001", "product_name": null,
    "current_inventory": 150, "planned_inventory": 400, "selling_price": 1999, "unit_cost": 900,
    "margin_pct": null, "expected_daily_demand": 8,
    "campaign_id": null, "channel": null,
    "planned_ad_spend": 12000, "planned_daily_spend": null }],
  "assumptions": { "roas_floor": 1.5, "notes": "…" } }
```
All fields except `sku` are optional; omitted values are taken from the database when present, otherwise left **missing** (never invented). `planned_ad_spend` (total) and `planned_daily_spend` are mutually exclusive. Errors: `422` (field validation, unknown `campaign_id`).

Result:
```
{ id, created_at, status:"completed", title, user, company, input, engine_version, horizon_days, data_as_of, roas_floor,
  summary:{ headline, items_analyzed, actions:{SCALE:n,…}, top_priority_action, confidence:{level,score,basis}, kpis:[Metric] },
  items:[{ sku, product_name, campaign:{id,name,channel,sku}|null,
     inputs:[{field,value,unit,type,source,available}],         // OBSERVED / ASSUMED / DERIVED / missing(available:false,type:null)
     performance:{campaign, window, prior_window, weekly_roas[], metrics:[Metric]}|null,
     inventory:{current,planned,change,demand_per_day,demand_basis,days_of_cover,shortfall_units,excess_units,overstock,risk:{level,reasons[]},exposure_at_cost,exposure_at_retail},
     projection:{horizon_days, metrics:[Metric], budget_impact:{baseline,planned,delta,delta_pct}|null, revenue_basis, campaign_revenue_forecast:{…dates,base,low,high,total}|null, campaign_revenue_forecast_change_pct, campaign_revenue_forecast_change_is_significant},
     decision: Decision (+confidence),
     explanation:{ what_happened, why_it_happened[], data_support[], prediction, recommended_action, why_recommended, reason_codes[] },
     charts:[Chart], data_gaps:[string] }],
  allocation:[{sku,campaign_id,planned_spend,share_pct,action,profit_per_rupee}],
  alerts:[Alert], charts:[Chart], references:[Reference], data_gaps:[string], legend:{…} }
```
Projection metric keys: `planned_ad_spend, baseline_ad_spend, ad_attributed_revenue (+low/high/stock_limited), projected_revenue, procurement_cost, cogs, projected_expenses, projected_profit, advertising_requirement, max_stock_supported_spend, projected_ad_contribution, inventory_exposure_at_cost`. Performance keys: `ad_spend_30d, revenue_30d, roas_30d, roas_prior_30d, roas_trend_pct, break_even_roas, contribution_30d`.

## History
- `GET /api/history?limit=25&offset=0&sku=&action=` -> `{total, items:[{id,created_at,title,status,user,company,horizon_days,headline,top_action,confidence_level,item_count,skus[],data_sources[{source,origin[]}],input_summary[],inventory_state[],major_metrics[Metric],predictions[],decisions[{sku,action,spend_change_pct,confidence,why}]}]}`
- `GET /api/analysis/{id}` -> the exact frozen result (identical to what was returned at run time, even if data changed since). `404` for other orgs' ids.

## Data references (provenance)
- `GET /api/references` -> `{scope:"catalog", datasets:[{name,scope: organization|legacy,rows,date_range,origin[],origin_labels[],used_in_analysis,usage_note?,fields[]}], references:[Reference], legend}`
- `GET /api/references?analysis_id=ID` -> `{scope:"analysis", references:[Reference], data_gaps[]}` (only what that run used)
- **Reference**: `{key, kind: dataset_field|user_input|method, source, table, field, purpose, transformation, reason, time_range, limitations, origin[], origin_labels[]}`. `origin` ∈ `sample_seed | user_import | user_entry | legacy_dump | user_input`. Show `origin_labels` – synthetic sample data is labelled as such.
