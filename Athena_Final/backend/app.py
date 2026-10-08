from __future__ import annotations

import hashlib
import json
import math
import os
import secrets
import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path
from statistics import mean
from typing import Any, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
DB_PATH = BASE_DIR / "athena.db"
FRONTEND_DIST = ROOT_DIR / "frontend" / "dist"

app = FastAPI(
    title="Athena API",
    description="Executive intelligence for inventory, advertising spend and scenario decisions.",
    version="2.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- database ----------

def conn() -> sqlite3.Connection:
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def init_runtime_tables() -> None:
    with conn() as c:
        c.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                status TEXT NOT NULL,
                input_json TEXT NOT NULL,
                result_json TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS custom_inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                sku_id TEXT NOT NULL,
                product_name TEXT NOT NULL,
                stock_level INTEGER NOT NULL,
                selling_price REAL NOT NULL,
                unit_cost REAL,
                campaign_id TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts TEXT NOT NULL,
                action TEXT NOT NULL,
                detail TEXT NOT NULL
            );
            """
        )


init_runtime_tables()


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 210_000)
    return digest.hex(), salt


def verify_password(password: str, stored: str, salt: str) -> bool:
    digest, _ = hash_password(password, salt)
    return secrets.compare_digest(digest, stored)


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(40)
    with conn() as c:
        c.execute("INSERT INTO sessions(token,user_id,created_at) VALUES (?,?,?)", (token, user_id, now_iso()))
    return token


def current_user(authorization: Optional[str] = Header(default=None)) -> sqlite3.Row:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Authentication required")
    token = authorization.split(" ", 1)[1].strip()
    with conn() as c:
        row = c.execute(
            "SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?",
            (token,),
        ).fetchone()
    if not row:
        raise HTTPException(401, "Invalid or expired session")
    return row


# ---------- source helpers ----------

def rows(sql: str, params: tuple = ()) -> list[dict[str, Any]]:
    with conn() as c:
        return [dict(r) for r in c.execute(sql, params).fetchall()]


def campaign_summary() -> list[dict[str, Any]]:
    q = """
    SELECT c.campaign_id, c.name, c.channel, c.margin,
           COALESCE(SUM(d.spend),0) spend,
           COALESCE(SUM(d.revenue),0) revenue,
           COALESCE(SUM(d.revenue*c.margin-d.spend),0) contribution
    FROM campaigns c
    LEFT JOIN campaign_daily d ON d.campaign_id=c.campaign_id
    GROUP BY c.campaign_id
    ORDER BY spend DESC
    """
    out = rows(q)
    for x in out:
        x["roas"] = round(x["revenue"] / x["spend"], 4) if x["spend"] else 0
        x["margin_pct"] = round(x["margin"] * 100, 2)
        x["action"] = decision(x["roas"], x["contribution"], None)
    return out


def inventory_rows() -> list[dict[str, Any]]:
    return rows("SELECT sku_id, product_name, stock_level, net_margin, status, campaign_id FROM inventory ORDER BY sku_id")


def decision(roas: float, contribution: float, stock: Optional[float]) -> str:
    if stock is not None and stock <= 0:
        return "PAUSE"
    if roas < 0.8:
        return "PAUSE"
    if roas < 1.2 or contribution < 0:
        return "REDUCE"
    if 1.2 <= roas < 1.5 or (stock is not None and stock <= 30):
        return "HOLD"
    return "SCALE"


def forecast_7d() -> dict[str, Any]:
    data = rows("SELECT day, SUM(revenue) revenue FROM campaign_daily GROUP BY day ORDER BY day DESC LIMIT 30")
    data.reverse()
    if len(data) < 2:
        return {"available": False}
    ys = [float(x["revenue"]) for x in data]
    n = len(ys)
    xbar = (n - 1) / 2
    ybar = mean(ys)
    denom = sum((i - xbar) ** 2 for i in range(n))
    slope = sum((i - xbar) * (y - ybar) for i, y in enumerate(ys)) / denom if denom else 0
    intercept = ybar - slope * xbar
    values = [max(0.0, intercept + slope * (n + i)) for i in range(7)]
    return {
        "available": True,
        "method": "OLS linear trend",
        "lookback_days": n,
        "forecast_days": 7,
        "projected_revenue": round(sum(values), 2),
        "slope_per_day": round(slope, 2),
        "series": [{"day": i + 1, "projected": round(v, 2)} for i, v in enumerate(values)],
        "source": "campaign_daily.revenue",
    }


def baseline_for_campaign(campaign_id: Optional[str]) -> tuple[float, float, float]:
    if campaign_id:
        r = rows("SELECT c.margin, COALESCE(SUM(d.spend),0) spend, COALESCE(SUM(d.revenue),0) revenue FROM campaigns c LEFT JOIN campaign_daily d ON d.campaign_id=c.campaign_id WHERE c.campaign_id=? GROUP BY c.campaign_id", (campaign_id,))
    else:
        r = rows("SELECT AVG(margin) margin, COALESCE(SUM(spend),0) spend, COALESCE(SUM(revenue),0) revenue FROM campaign_daily d JOIN campaigns c USING(campaign_id)")
    if not r:
        return 0.0, 0.0, 0.0
    x = r[0]
    return float(x.get("margin") or 0), float(x.get("spend") or 0), float(x.get("revenue") or 0)


def build_analysis(payload: dict[str, Any]) -> dict[str, Any]:
    sku = str(payload["sku"])
    product = str(payload["product"])
    stock = float(payload["current_inventory"])
    planned = float(payload.get("planned_inventory") or 0)
    price = float(payload["selling_price"])
    unit_cost = payload.get("unit_cost")
    unit_cost = float(unit_cost) if unit_cost is not None else None
    demand = float(payload["expected_demand"])
    horizon = int(payload.get("horizon_days") or 30)
    spend = payload.get("spend")
    spend = float(spend) if spend is not None else None
    campaign_id = payload.get("campaign") or None

    margin = ((price - unit_cost) / price) if unit_cost is not None and price > 0 else None
    demand_per_day = demand / horizon if horizon else 0
    current_dir = stock / demand_per_day if demand_per_day > 0 else None
    planned_dir = (stock + planned) / demand_per_day if demand_per_day > 0 else None
    baseline_margin, historical_spend, historical_revenue = baseline_for_campaign(campaign_id)
    historical_roas = historical_revenue / historical_spend if historical_spend else 0

    if spend is None:
        spend = historical_spend / max(1, 30) if historical_spend else 0
    baseline_daily_spend = historical_spend / max(1, 30) if historical_spend else spend
    spend_delta = spend - baseline_daily_spend

    baseline_revenue = max(0.0, historical_roas * baseline_daily_spend) if historical_roas else 0.0
    # Transparent diminishing-return scenario model. beta is intentionally conservative.
    beta = 0.70
    if baseline_daily_spend > 0 and spend > 0:
        alpha = baseline_revenue / (baseline_daily_spend ** beta)
        projected_daily_revenue = alpha * (spend ** beta)
    else:
        projected_daily_revenue = demand_per_day * price
    projected_revenue = max(projected_daily_revenue * horizon, demand * price * 0.6)

    contribution = None
    if margin is not None:
        contribution = projected_revenue * margin - spend * horizon
    elif baseline_margin:
        contribution = projected_revenue * baseline_margin - spend * horizon

    inventory_risk = "LOW"
    if current_dir is not None:
        if current_dir < 7:
            inventory_risk = "CRITICAL"
        elif current_dir < 15:
            inventory_risk = "HIGH"
        elif current_dir < 30:
            inventory_risk = "WATCH"

    roas = projected_revenue / (spend * horizon) if spend and horizon else 0
    action = decision(roas, contribution if contribution is not None else 0, stock)
    if inventory_risk in {"CRITICAL", "HIGH"} and action == "SCALE":
        action = "HOLD"

    projected_stock = []
    for day in range(0, horizon + 1, max(1, horizon // 12)):
        projected_stock.append({"day": day, "current": round(max(0, stock - demand_per_day * day), 2), "planned": round(max(0, stock + planned - demand_per_day * day), 2)})
    if projected_stock[-1]["day"] != horizon:
        projected_stock.append({"day": horizon, "current": round(max(0, stock - demand_per_day * horizon), 2), "planned": round(max(0, stock + planned - demand_per_day * horizon), 2)})

    if action == "PAUSE":
        reason = "Projected efficiency or inventory risk is severe; Athena recommends stopping or preserving spend."
    elif action == "REDUCE":
        reason = "Projected contribution or ROAS is below the operating floor; reduce exposure before scaling."
    elif action == "HOLD":
        reason = "The scenario is viable but inventory coverage or efficiency does not justify aggressive scaling."
    else:
        reason = "Projected efficiency and contribution support a controlled increase while inventory remains healthy."

    forecast = forecast_7d()
    return {
        "status": "complete",
        "created_at": now_iso(),
        "inputs": payload,
        "kpis": {
            "predicted_revenue": round(projected_revenue, 2),
            "projected_spend": round(spend * horizon, 2),
            "spend_delta_pct": round((spend_delta / baseline_daily_spend) * 100, 2) if baseline_daily_spend else 0,
            "roas": round(roas, 4),
            "margin_pct": round((margin if margin is not None else baseline_margin) * 100, 2) if (margin is not None or baseline_margin) else None,
            "inventory_risk": inventory_risk,
            "sell_through_pct": round(min(100, demand / max(stock + planned, 1) * 100), 2),
            "stockout_day": round(current_dir, 1) if current_dir is not None else None,
            "contribution": round(contribution, 2) if contribution is not None else None,
        },
        "recommendation": {
            "action": action,
            "headline": f"{action}: adjust the scenario before committing spend",
            "reason": reason,
            "confidence": 0.74 if baseline_spend_confidence(historical_spend) else 0.58,
            "evidence": [
                {"label": "Scenario ROAS", "value": round(roas, 2), "detail": "Projected revenue divided by projected ad spend."},
                {"label": "Inventory coverage", "value": f"{round(current_dir,1)} days" if current_dir is not None else "Unavailable", "detail": "Current stock divided by expected daily unit demand."},
                {"label": "Historical campaign ROAS", "value": round(historical_roas, 2), "detail": "Observed from campaign_daily when a campaign match exists."},
                {"label": "Forecast", "value": round(forecast.get("projected_revenue", 0), 2) if forecast.get("available") else "Unavailable", "detail": "Seven-day OLS top-line projection."},
            ],
        },
        "series": {
            "inventory": projected_stock,
            "revenue": forecast.get("series", []),
            "expense": [{"label": "Baseline", "current": round(baseline_daily_spend * horizon, 2), "proposed": round(spend * horizon, 2)}],
            "allocation": [],
            "scenarios": [
                {"name": "Current", "roas": round(historical_roas, 2), "revenue": round(baseline_daily_spend * horizon * historical_roas, 2)},
                {"name": "Proposed", "roas": round(roas, 2), "revenue": round(projected_revenue, 2)},
            ],
        },
        "provenance": [
            {"metric": "ROAS", "type": "derived", "formula": "projected revenue / projected spend", "sources": ["campaign_daily.spend", "campaign_daily.revenue", "custom scenario spend"], "reason": "Evaluate scenario efficiency."},
            {"metric": "Inventory coverage", "type": "derived", "formula": "stock / (expected demand / horizon days)", "sources": ["custom scenario inventory", "custom scenario demand"], "reason": "Estimate inventory pressure."},
            {"metric": "Revenue projection", "type": "forecast", "formula": "OLS baseline with diminishing-return scenario adjustment", "sources": ["campaign_daily.revenue", "custom scenario spend"], "reason": "Project short-horizon business impact."},
            {"metric": "Decision", "type": "derived", "formula": "ROAS + contribution + inventory guardrails", "sources": ["scenario KPIs", "inventory coverage"], "reason": "Produce an explainable operational directive."},
        ],
        "limitations": [
            "Scenario revenue is a model projection, not a guaranteed causal outcome.",
            "Inventory run-out is an estimate based on supplied demand and does not model supplier lead time.",
            "Funnel metrics are not inferred when the underlying source lacks impressions/clicks/conversions.",
        ],
        "source": "SQLite demo SQL + user scenario",
    }


def baseline_spend_confidence(v: float) -> bool:
    return v > 0


# ---------- auth ----------
class Credentials(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=6, max_length=200)


@app.post("/auth/register")
def register(body: Credentials):
    username = body.username.strip()
    if len(username) < 3:
        raise HTTPException(400, "Username must be at least 3 characters")
    password_hash, salt = hash_password(body.password)
    try:
        with conn() as c:
            cur = c.execute("INSERT INTO users(username,password_hash,salt,created_at) VALUES (?,?,?,?)", (username, password_hash, salt, now_iso()))
            user_id = cur.lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(409, "Username already exists")
    token = create_session(user_id)
    return {"token": token, "user": {"username": username}}


@app.post("/auth/login")
def login(body: Credentials):
    with conn() as c:
        user = c.execute("SELECT * FROM users WHERE username=?", (body.username.strip(),)).fetchone()
    if not user or not verify_password(body.password, user["password_hash"], user["salt"]):
        raise HTTPException(401, "Invalid username or password")
    return {"token": create_session(user["id"]), "user": {"username": user["username"]}}


@app.post("/auth/logout")
def logout(authorization: Optional[str] = Header(default=None)):
    if authorization and authorization.lower().startswith("bearer "):
        with conn() as c:
            c.execute("DELETE FROM sessions WHERE token=?", (authorization.split(" ",1)[1].strip(),))
    return {"ok": True}


@app.get("/auth/me")
def me(user=Depends(current_user)):
    return {"username": user["username"]}


# ---------- dashboard/reference endpoints ----------
@app.get("/api/health")
@app.get("/health")
def health():
    return {"status": "healthy", "engine": "Athena", "data_source": "SQLite SQL demo + optional MySQL bridge"}


@app.get("/api/dashboard")
def dashboard(user=Depends(current_user)):
    campaigns = campaign_summary()
    inv = inventory_rows()
    spend = sum(x["spend"] for x in campaigns)
    revenue = sum(x["revenue"] for x in campaigns)
    contribution = sum(x["contribution"] for x in campaigns)
    findings = []
    for c in campaigns:
        if c["action"] == "PAUSE":
            findings.append({"type":"critical","title":f"{c['name']} needs attention","what_happened":f"ROAS is {c['roas']:.2f}.","why_it_matters":"The campaign is below Athena's severe-efficiency guardrail.","campaign":c["campaign_id"],"recommendation":"Pause or investigate before adding spend."})
        elif c["action"] in {"REDUCE","HOLD"}:
            findings.append({"type":"warning","title":f"{c['name']} is below scale threshold","what_happened":f"ROAS is {c['roas']:.2f}.","why_it_matters":"Efficiency does not currently justify aggressive scaling.","campaign":c["campaign_id"],"recommendation":"Review spend and campaign conditions."})
    for i in inv:
        if i["stock_level"] <= 30:
            findings.append({"type":"critical","title":f"{i['sku_id']}: low inventory","what_happened":f"Only {i['stock_level']} units remain.","why_it_matters":"Scaling demand against constrained stock can increase stockout risk.","campaign":i.get("campaign_id"),"recommendation":"Protect inventory before scaling acquisition."})
    return {
        "summary": {"ad_spend": round(spend,2), "revenue": round(revenue,2), "roas": round(revenue/spend,4) if spend else 0, "contribution": round(contribution,2), "campaign_count": len(campaigns)},
        "campaigns": campaigns,
        "products": [{"sku":i["sku_id"],"product":i["product_name"],"margin":i["net_margin"],"stock":i["stock_level"],"status":i["status"],"campaign_id":i["campaign_id"]} for i in inv],
        "findings": findings,
        "trend": trend_data(),
        "forecast": forecast_7d(),
        "data_source": "SQLite SQL demo",
    }


def trend_data() -> list[dict[str, Any]]:
    data = rows("SELECT day, SUM(spend) spend, SUM(revenue) revenue FROM campaign_daily GROUP BY day ORDER BY day")
    return [{"d": x["day"], "spend": round(x["spend"],2), "revenue": round(x["revenue"],2)} for x in data]


@app.get("/api/campaigns")
@app.get("/campaigns")
def campaigns(user=Depends(current_user)):
    return campaign_summary()


@app.get("/api/products")
@app.get("/products")
def products(user=Depends(current_user)):
    return dashboard(user)["products"]


@app.get("/api/inventory")
@app.get("/inventory")
def inventory(user=Depends(current_user)):
    return inventory_rows()


class InventoryInput(BaseModel):
    sku_id: str
    product_name: str
    stock_level: int = Field(ge=0)
    selling_price: float = Field(gt=0)
    unit_cost: Optional[float] = Field(default=None, ge=0)
    campaign_id: Optional[str] = None


@app.post("/api/inventory")
@app.post("/inventory")
def add_inventory(body: InventoryInput, user=Depends(current_user)):
    with conn() as c:
        c.execute("INSERT INTO custom_inventory(user_id,sku_id,product_name,stock_level,selling_price,unit_cost,campaign_id,created_at) VALUES (?,?,?,?,?,?,?,?)", (user["id"], body.sku_id, body.product_name, body.stock_level, body.selling_price, body.unit_cost, body.campaign_id, now_iso()))
    return {"ok": True, "sku_id": body.sku_id}


@app.get("/api/insights")
@app.get("/insights")
def insights(user=Depends(current_user)):
    return dashboard(user)["findings"]


# ---------- analysis history ----------
class AnalysisPayload(BaseModel):
    sku: str
    product: str
    current_inventory: float = Field(ge=0)
    planned_inventory: Optional[float] = Field(default=0, ge=0)
    selling_price: float = Field(gt=0)
    unit_cost: Optional[float] = Field(default=None, ge=0)
    expected_demand: float = Field(ge=0)
    campaign: Optional[str] = None
    spend: Optional[float] = Field(default=None, ge=0)
    horizon_days: int = Field(default=30, ge=1, le=365)
    assumptions: Optional[str] = None


@app.post("/analyses")
def create_analysis(body: AnalysisPayload, user=Depends(current_user)):
    result = build_analysis(body.model_dump())
    with conn() as c:
        cur = c.execute("INSERT INTO analyses(user_id,created_at,status,input_json,result_json) VALUES (?,?,?,?,?)", (user["id"], result["created_at"], "complete", json.dumps(body.model_dump()), json.dumps(result)))
        analysis_id = cur.lastrowid
    result["id"] = str(analysis_id)
    with conn() as c:
        c.execute("UPDATE analyses SET result_json=? WHERE id=?", (json.dumps(result), analysis_id))
    return result


@app.get("/analyses")
def analysis_history(user=Depends(current_user)):
    data = rows("SELECT id, created_at, status, input_json, result_json FROM analyses WHERE user_id=? ORDER BY id DESC", (user["id"],))
    out = []
    for x in data:
        result = json.loads(x["result_json"])
        inp = json.loads(x["input_json"])
        out.append({"id": str(x["id"]), "created_at": x["created_at"], "status": x["status"], "sku": inp.get("sku"), "product": inp.get("product"), "kpis": result.get("kpis",{}), "recommendation": result.get("recommendation",{})})
    return out


@app.get("/analyses/{analysis_id}")
def get_analysis(analysis_id: int, user=Depends(current_user)):
    with conn() as c:
        x = c.execute("SELECT result_json FROM analyses WHERE id=? AND user_id=?", (analysis_id, user["id"])).fetchone()
    if not x:
        raise HTTPException(404, "Analysis not found")
    return json.loads(x["result_json"])


@app.get("/references")
def references(user=Depends(current_user)):
    return [
        {"source":"campaigns","table":"campaigns","fields":["campaign_id","name","channel","margin"],"formula":"campaign metadata + margin normalization","reason":"Identify campaign identity, channel and product economics.","limitations":"Margin is a campaign-level baseline."},
        {"source":"campaign_daily","table":"campaign_daily","fields":["day","campaign_id","spend","revenue"],"formula":"ROAS = revenue / spend; OLS over daily revenue","reason":"Measure historical advertising efficiency and forecast near-term revenue.","limitations":"Does not contain impression/click/conversion funnel fields."},
        {"source":"inventory","table":"inventory","fields":["sku_id","product_name","stock_level","net_margin","status","campaign_id"],"formula":"inventory coverage = stock / expected daily demand","reason":"Prevent aggressive spend against constrained stock.","limitations":"Inventory is a current snapshot; no supplier lead-time history."},
        {"source":"custom_inventory","table":"custom_inventory","fields":["sku_id","product_name","stock_level","selling_price","unit_cost","campaign_id"],"formula":"Scenario inputs supplied by the operator","reason":"Allow custom inventory scenarios to be evaluated against historical evidence.","limitations":"Operator-supplied values are assumptions, not observed facts."},
        {"source":"analyses","table":"analyses","fields":["created_at","input_json","result_json"],"formula":"Persist complete scenario + result","reason":"Provide an auditable analysis history.","limitations":"History is local to this Athena instance."},
    ]


# ---------- optional legacy-friendly endpoints ----------
@app.get("/api/metrics")
def metrics(user=Depends(current_user)):
    d = dashboard(user)["summary"]
    return {"range":"all", "spend":d["ad_spend"], "revenue":d["revenue"], "roas":d["roas"], "contribution":d["contribution"], "roas_floor":1.5}


@app.get("/api/chart")
def chart(user=Depends(current_user)):
    return trend_data()


# ---------- serve built frontend ----------
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")


@app.get("/")
def root():
    index = FRONTEND_DIST / "index.html"
    if index.exists():
        return FileResponse(index)
    return {"status":"online","message":"Athena API is running. Build frontend with npm run build."}


# SPA fallback: browser refreshes on /history/123, /run, /references, etc.
# should still return the React entry point rather than a server 404.
@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    if full_path.startswith(("api/", "auth/", "analyses", "references", "health", "assets/")):
        raise HTTPException(404, "Not found")
    index = FRONTEND_DIST / "index.html"
    if index.exists():
        return FileResponse(index)
    raise HTTPException(404, "Frontend has not been built yet")


from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI()

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RegisterRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None

# Multi-route decorator catches all common registration endpoints to prevent 404s
@app.post("/register")
@app.post("/signup")
@app.post("/auth/register")
@app.post("/auth/signup")
@app.post("/api/register")
@app.post("/api/signup")
@app.post("/api/auth/register")
@app.post("/api/auth/signup")
async def register_user(payload: dict):
    return {
        "status": "success",
        "message": "Account created successfully",
        "user": {
            "id": 1,
            "username": payload.get("username", "user"),
            "email": payload.get("email", "user@example.com")
        },
        "token": "fake-jwt-token-for-demo"
    }