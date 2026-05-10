"""WattGraphNet mock backend — Koh Tao Smart Energy Management System.

Aligned to PEA Hackathon 2026 Track 4 spec:
- 4 sources: Main Grid (33kV submarine cable from Koh Phangan, ~24 MW),
  Diesel (10 MW), BESS (50 MWh), Solar PV.
- Forecast: 24 h, per-source MAPE target ≤ 10%.
- Optimize: dispatch with "ทำตาม vs ไม่ทำตาม" (AI vs baseline) cost comparison.
- Alert: Early Warning with structured Source / Amount / Time recommendation,
  including submarine-cable incident scenario.
- Synthetic only — no GPU. Replace endpoints with ONNX inference when ready.
"""
from __future__ import annotations

import math
import os
import random
import time
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="WattGraphNet SEMS API (mock)", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ALLOW_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL = "WattGraphNet-AAM"
VERSION = "v2-50epoch"

# ----- Cost / carbon tariffs (from painpoint.md) -----
DIESEL_THB_PER_KWH = 13.0
GRID_THB_PER_KWH = 4.5     # cable import tariff (rough)
PV_THB_PER_KWH = 0.0
SELL_THB_PER_KWH = 4.0
DIESEL_KGCO2_PER_KWH = 0.74
GRID_KGCO2_PER_KWH = 0.40
PV_KGCO2_PER_KWH = 0.0

# ----- Topology — actual PEA daisy-chain (Khanom → Samui → Phangan → Koh Tao) -----
# Khanom→Samui: 115 kV + 33 kV (4 circuits) · Samui→Phangan: 33 kV (2 circuits)
# Phangan→Koh Tao: 33 kV (45 km, single radial circuit, ~24 MW thermal limit).
# Future 230 kV megaproject (EGAT, 11.23 B THB, ETA 2029-06): Khanom→Samui 200 MW.
STATIONS = [
    # Mainland source — Khanom thermal power station
    {"id": "KHANOM",     "name": "Khanom Power Station (Mainland)", "lat": 9.2000,  "lon": 99.8500,  "type": "main_grid",  "capacity_kw": 200000},
    # Samui — primary demand sink, sets the bottleneck
    {"id": "SAMUI-SUB",  "name": "Samui Substation (115 kV)",       "lat": 9.5120,  "lon": 100.0136, "type": "substation", "capacity_kw": 120000},
    {"id": "SAMUI-LD",   "name": "Koh Samui Load",                  "lat": 9.5120,  "lon": 100.0500, "type": "load",       "capacity_kw": 80000},
    {"id": "SAMUI-BESS", "name": "Samui BESS (25 MW)",              "lat": 9.5400,  "lon": 100.0500, "type": "bess",       "capacity_kw": 25000},
    # Phangan — middle node
    {"id": "PHANGAN-SUB","name": "Koh Phangan Substation (33 kV)",  "lat": 9.7330,  "lon": 100.0050, "type": "substation", "capacity_kw": 35000},
    {"id": "PHANGAN-LD", "name": "Koh Phangan Load",                "lat": 9.7400,  "lon": 100.0300, "type": "load",       "capacity_kw": 22000},
    # Koh Tao — terminal node (45 km submarine cable, 33 kV)
    {"id": "GRID-CBL",   "name": "Koh Tao Cable Landing (33 kV)",   "lat": 10.0810, "lon": 99.8410,  "type": "substation", "capacity_kw": 24000},
    {"id": "DG-01",      "name": "Koh Tao Diesel Plant (10 MW)",    "lat": 10.0945, "lon": 99.8360,  "type": "diesel",     "capacity_kw": 10000},
    {"id": "BESS01",     "name": "Koh Tao BESS (50 MWh)",           "lat": 10.0950, "lon": 99.8350,  "type": "bess",       "capacity_kw": 12500},
    {"id": "PV-AGG",     "name": "Koh Tao PV Aggregate",            "lat": 10.1000, "lon": 99.8260,  "type": "pv",         "capacity_kw": 4000},
    {"id": "LD-MAE",     "name": "Mae Haad Load",                   "lat": 10.0997, "lon": 99.8264,  "type": "load",       "capacity_kw": 3500},
    {"id": "LD-SAI",     "name": "Sairee Load",                     "lat": 10.0991, "lon": 99.8226,  "type": "load",       "capacity_kw": 4500},
    {"id": "LD-CHA",     "name": "Chalok Baan Kao Load",            "lat": 10.0667, "lon": 99.8350,  "type": "load",       "capacity_kw": 2000},
]

# Cable network — broken into segments so the map can render voltage tiers + tooltips.
CABLE_SEGMENTS = [
    {
        "id": "khanom-samui",
        "name": "Khanom ↔ Samui",
        "voltage_kv": 115,
        "circuits": 4,
        "length_km": 32,
        "status": "operational",
        "coords": [
            [99.8500, 9.2000], [99.8900, 9.2700], [99.9400, 9.3500],
            [99.9900, 9.4400], [100.0136, 9.5120],
        ],
    },
    {
        "id": "samui-phangan",
        "name": "Samui ↔ Phangan",
        "voltage_kv": 33,
        "circuits": 2,
        "length_km": 18,
        "status": "operational",
        "coords": [[100.0136, 9.5120], [100.0100, 9.6300], [100.0050, 9.7330]],
    },
    {
        "id": "phangan-tao",
        "name": "Phangan ↔ Koh Tao (radial)",
        "voltage_kv": 33,
        "circuits": 1,
        "length_km": 45,
        "status": "operational",
        "coords": [
            [100.0050, 9.7330], [99.9700, 9.8200], [99.9300, 9.9100],
            [99.8800, 9.9900], [99.8410, 10.0810],
        ],
    },
    {
        "id": "future-230kv",
        "name": "Khanom ↔ Samui · 230 kV (EGAT 2029)",
        "voltage_kv": 230,
        "circuits": 1,
        "length_km": 32,
        "status": "planned-2029",
        "coords": [
            [99.8500, 9.2000], [99.9000, 9.2900], [99.9700, 9.3900],
            [100.0050, 9.4700], [100.0136, 9.5120],
        ],
    },
]

# Backwards-compatible flat coordinate list (legacy)
CABLE_ROUTE = [c for seg in CABLE_SEGMENTS if seg["status"] == "operational" for c in seg["coords"]]

BESS_CAPACITY_KWH = 50_000
BESS_POWER_KW = 12_500
DIESEL_CAP_KW = 10_000
GRID_CAP_KW = 24_000
PV_CAP_KW = 4_000

SOURCES = [
    {"id": "SRC-GRID",   "name": "Main Grid (Cable)", "type": "main_grid", "cap_kw": GRID_CAP_KW,    "mape": 6.4},
    {"id": "SRC-DIESEL", "name": "Diesel Generator",  "type": "diesel",    "cap_kw": DIESEL_CAP_KW,  "mape": 7.8},
    {"id": "SRC-BESS",   "name": "BESS (50 MWh)",     "type": "bess",      "cap_kw": BESS_POWER_KW,  "mape": 8.5},
    {"id": "SRC-PV",     "name": "Solar PV",          "type": "pv",        "cap_kw": PV_CAP_KW,      "mape": 9.6},
]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def meta(horizon: int, t0: float) -> dict:
    return {
        "model": MODEL,
        "version": VERSION,
        "generated_at": now_iso(),
        "inference_ms": round((time.perf_counter() - t0) * 1000, 2),
        "horizon_hours": horizon,
    }


# ----- Synthetic profiles (Koh Tao tourism load) -----
def aggregate_load_kw(hour: float) -> float:
    """Total island demand. Two peaks: morning + evening, 10–14 MW range."""
    peak = 14_000
    base = 0.45 + 0.22 * math.sin((hour - 7) / 24 * 2 * math.pi)
    evening = 0.40 * math.exp(-((hour - 19.5) ** 2) / 5)
    return peak * max(0.30, base + evening)


def pv_kw(hour: float) -> float:
    if hour < 6 or hour > 18:
        return 0.0
    x = (hour - 6) / 12
    return PV_CAP_KW * math.sin(math.pi * x) * (0.85 + 0.1 * random.random())


def grid_available_kw(hour: float, cable_intact: bool = True) -> float:
    if not cable_intact:
        return 0.0
    # cable runs near max during peak, slight derating midday for thermal limits
    return GRID_CAP_KW * (0.95 if 9 <= hour <= 16 else 1.0)


def source_profile(source_type: str, hour: float) -> float:
    """Per-source forecast magnitude (kW) used in /api/forecast."""
    if source_type == "main_grid":
        net_residual = max(0.0, aggregate_load_kw(hour) - pv_kw(hour))
        return min(net_residual * 0.75, GRID_CAP_KW)  # grid carries ~75% of residual
    if source_type == "diesel":
        peak_hours = 18 <= hour <= 22 or 6 <= hour <= 8
        return (DIESEL_CAP_KW * 0.35) if peak_hours else (DIESEL_CAP_KW * 0.05)
    if source_type == "bess":
        # signed: positive = discharge, negative = charge. Forecast |abs|.
        return BESS_POWER_KW * (0.6 if 18 <= hour <= 22 else 0.3 if 10 <= hour <= 15 else 0.1)
    if source_type == "pv":
        return pv_kw(hour)
    return 0.0


# ----- Endpoints -----
@app.get("/healthz")
def healthz():
    return {"status": "ok", "model": MODEL, "edge_mlx": "ready"}


@app.get("/api/stations")
def stations():
    return {
        "stations": STATIONS,
        "cable_route": CABLE_ROUTE,
        "cable_segments": CABLE_SEGMENTS,
    }


@app.get("/api/forecast")
def forecast(horizon: int = 24):
    t0 = time.perf_counter()
    start = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    out = []
    mape_per_source = {}
    for src in SOURCES:
        mape_per_source[src["type"]] = src["mape"]
        points = []
        for h in range(horizon):
            t = start + timedelta(hours=h)
            base = source_profile(src["type"], t.hour + t.minute / 60)
            noise = max(50.0, base * 0.04)
            points.append({
                "t": t.isoformat(),
                "load_kw": round(base, 2),
                "pv_kw": round(pv_kw(t.hour) if src["type"] == "pv" else 0.0, 2),
                "lower_kw": round(base - 1.65 * noise, 2),
                "upper_kw": round(base + 1.65 * noise, 2),
            })
        out.append({
            "station_id": src["id"],
            "station_name": src["name"],
            "source_type": src["type"],
            "mape_pct": src["mape"],
            "points": points,
        })

    avg_mape = round(sum(mape_per_source.values()) / len(mape_per_source), 2)
    return {
        "meta": meta(horizon, t0),
        "stations": out,
        "sb_wape_pct": 17.93,
        "mape_per_source": mape_per_source,
        "mape_avg_pct": avg_mape,
        "mape_target_pct": 10.0,
    }


# ----- Optimizer + baseline -----
def _dispatch(weight_cost: float, horizon: int, ai: bool):
    """Return list of dispatch points + totals.

    AI dispatch: solves a greedy multi-objective allocation with PV → BESS → Grid → Diesel
    priority, modulated by carbon weight.
    Baseline: rule-based (current operator habit) — diesel-heavy, reactive BESS.
    """
    weight_carbon = 1.0 - weight_cost
    start = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    soc = 60.0  # %
    schedule = []
    totals = {
        "load_kwh": 0.0, "pv_kwh": 0.0, "grid_kwh": 0.0,
        "bess_kwh": 0.0, "diesel_kwh": 0.0,
        "thb_cost": 0.0, "co2_kg": 0.0,
    }

    for h in range(horizon):
        t = start + timedelta(hours=h)
        load = aggregate_load_kw(t.hour)
        pv = pv_kw(t.hour)
        grid_cap = grid_available_kw(t.hour)
        net = load - pv

        if ai:
            # PV first (free), then prefer cheap grid up to 70% of cap (leave headroom for cable risk),
            # BESS for peak shaving, diesel only when grid+BESS insufficient.
            if net < 0:  # PV surplus → charge BESS
                charge = min(-net, BESS_POWER_KW, (95 - soc) / 100 * BESS_CAPACITY_KWH)
                bess = -charge
                grid = 0.0
                diesel = 0.0
            else:
                grid_share = 0.55 + 0.10 * weight_cost          # cheap grid first
                grid = min(net * grid_share, grid_cap * 0.85)
                residual = max(0.0, net - grid)
                # BESS shaves the next portion (more aggressive when carbon-weighted)
                bess_share = 0.40 + 0.40 * weight_carbon
                bess_cap_now = min(BESS_POWER_KW, max(0.0, (soc - 20) / 100 * BESS_CAPACITY_KWH * 0.5))
                bess = max(0.0, min(residual * bess_share, bess_cap_now))
                residual -= bess
                # Diesel covers what's left (spec target ≥30% diesel reduction → keep some diesel)
                diesel = max(0.0, min(residual, DIESEL_CAP_KW))
            soc -= bess / BESS_CAPACITY_KWH * 100
            soc = max(15.0, min(95.0, soc))
        else:
            # Baseline: operator-habit dispatch — minimal BESS use, lots of diesel during peaks
            if net < 0:
                bess = -min(-net * 0.25, BESS_POWER_KW * 0.4)   # mostly curtailed
                grid = 0.0
                diesel = 0.0
            else:
                grid = min(net * 0.50, grid_cap * 0.75)         # under-utilized grid
                residual = max(0.0, net - grid)
                diesel = min(residual, DIESEL_CAP_KW)            # diesel-first
                bess = max(0.0, residual - diesel) * 0.3
            soc -= bess / BESS_CAPACITY_KWH * 100
            soc = max(15.0, min(95.0, soc))

        thb_cost = (
            max(0.0, grid) * GRID_THB_PER_KWH
            + max(0.0, diesel) * DIESEL_THB_PER_KWH
        )
        co2_kg = (
            max(0.0, grid) * GRID_KGCO2_PER_KWH
            + max(0.0, diesel) * DIESEL_KGCO2_PER_KWH
        )

        # "thb_saved" / "co2_saved_kg" kept for legacy frontend fields:
        # diesel-only baseline reference cost, then subtract this hour.
        diesel_only_cost = load * DIESEL_THB_PER_KWH
        diesel_only_co2 = load * DIESEL_KGCO2_PER_KWH

        schedule.append({
            "t": t.isoformat(),
            "load_kw": round(load, 2),
            "pv_kw": round(pv, 2),
            "grid_kw": round(grid, 2),
            "bess_kw": round(bess, 2),
            "diesel_kw": round(diesel, 2),
            "soc_pct": round(soc, 1),
            "thb_saved": round(diesel_only_cost - thb_cost, 2),
            "co2_saved_kg": round(diesel_only_co2 - co2_kg, 2),
        })
        totals["load_kwh"] += load
        totals["pv_kwh"] += pv
        totals["grid_kwh"] += max(0.0, grid)
        totals["bess_kwh"] += abs(bess)
        totals["diesel_kwh"] += diesel
        totals["thb_cost"] += thb_cost
        totals["co2_kg"] += co2_kg

    totals = {k: round(v, 2) for k, v in totals.items()}
    return schedule, totals


@app.get("/api/optimize")
def optimize(weight_cost: float = 0.7, horizon: int = 24):
    t0 = time.perf_counter()
    weight_cost = max(0.0, min(1.0, weight_cost))
    weight_carbon = 1.0 - weight_cost

    ai_schedule, ai_totals = _dispatch(weight_cost, horizon, ai=True)
    _, base_totals = _dispatch(weight_cost, horizon, ai=False)

    # totals shape kept backwards-compatible with frontend (load/pv/bess/diesel kwh + thb_saved + co2_saved_kg)
    totals = {
        "load_kwh": ai_totals["load_kwh"],
        "pv_kwh": ai_totals["pv_kwh"],
        "bess_kwh": ai_totals["bess_kwh"],
        "diesel_kwh": ai_totals["diesel_kwh"],
        "grid_kwh": ai_totals["grid_kwh"],
        "thb_saved": round(base_totals["thb_cost"] - ai_totals["thb_cost"], 2),
        "co2_saved_kg": round(base_totals["co2_kg"] - ai_totals["co2_kg"], 2),
    }

    diesel_litres_ai = ai_totals["diesel_kwh"] * 0.27       # rough kWh→L conversion
    diesel_litres_base = base_totals["diesel_kwh"] * 0.27
    daily_savings = totals["thb_saved"]
    # Cap annual estimate near the spec target (8M ฿/yr/site) — synthetic data
    # otherwise extrapolates wildly. Real calibration replaces this with SCADA history.
    annual_savings = min(round(daily_savings * 365), 9_500_000)

    return {
        "meta": meta(horizon, t0),
        "weight_cost": weight_cost,
        "weight_carbon": weight_carbon,
        "schedule": ai_schedule,
        "totals": totals,
        "baseline": {
            "diesel_kwh": base_totals["diesel_kwh"],
            "diesel_litres": round(diesel_litres_base, 1),
            "thb_cost": base_totals["thb_cost"],
            "co2_kg": base_totals["co2_kg"],
        },
        "ai": {
            "diesel_kwh": ai_totals["diesel_kwh"],
            "diesel_litres": round(diesel_litres_ai, 1),
            "thb_cost": ai_totals["thb_cost"],
            "co2_kg": ai_totals["co2_kg"],
        },
        "savings_vs_baseline": {
            "diesel_kwh_avoided": round(base_totals["diesel_kwh"] - ai_totals["diesel_kwh"], 2),
            "diesel_litres_avoided": round(diesel_litres_base - diesel_litres_ai, 1),
            "thb_saved_today": daily_savings,
            "thb_saved_annual_est": annual_savings,
            "co2_kg_avoided_today": round(base_totals["co2_kg"] - ai_totals["co2_kg"], 2),
            "diesel_pct_reduction": round(
                100 * (base_totals["diesel_kwh"] - ai_totals["diesel_kwh"]) / max(1.0, base_totals["diesel_kwh"]),
                1,
            ),
        },
    }


# ----- Alerts -----
@app.get("/api/alerts")
def alerts():
    t0 = time.perf_counter()
    now = datetime.now(timezone.utc).replace(microsecond=0)

    items = [
        {
            "id": "A-CABLE-01",
            "severity": "critical",
            "station_id": "GRID-CBL",
            "title": "Submarine cable derating projected",
            "message": (
                "33 kV cable from Koh Phangan trending toward 60% capacity drop in 4.5 h "
                "(thermal + sea-current model). At 19:30, load forecast (13.8 MW) will exceed "
                "available cable + PV. Pre-charge BESS to 90% SoC by 17:00 and stage Diesel."
            ),
            "lead_time_h": 4.5,
            "issued_at": now.isoformat(),
            "eta": (now + timedelta(hours=4, minutes=30)).isoformat(),
            "scenario": "submarine_cable_partial_loss",
            "recommendation": {
                "actions": [
                    {"source": "BESS",   "action": "charge",    "amount_kw": 6500,
                     "from": now.isoformat(),
                     "to": (now + timedelta(hours=2, minutes=30)).isoformat(),
                     "reason": "Pre-charge to 90% SoC before cable derating window."},
                    {"source": "DIESEL", "action": "stage",     "amount_kw": 4500,
                     "from": (now + timedelta(hours=4)).isoformat(),
                     "to": (now + timedelta(hours=7)).isoformat(),
                     "reason": "Cover 13.8 MW evening peak when cable + BESS insufficient."},
                    {"source": "BESS",   "action": "discharge", "amount_kw": 8000,
                     "from": (now + timedelta(hours=4, minutes=30)).isoformat(),
                     "to": (now + timedelta(hours=6, minutes=30)).isoformat(),
                     "reason": "Discharge during peak to minimize diesel hours."},
                ],
                "expected_outcome": "Zero blackout. Diesel runtime limited to 3 h vs 7 h baseline.",
            },
        },
        {
            "id": "A-PEAK-02",
            "severity": "warn",
            "station_id": "LD-SAI",
            "title": "Sairee evening peak — BESS pre-charge",
            "message": (
                "Sairee load forecast 4.2 MW at 19:00 exceeds local PV + grid share by 280 kW. "
                "BESS pre-charge by 17:00 keeps diesel off."
            ),
            "lead_time_h": 4.0,
            "issued_at": now.isoformat(),
            "eta": (now + timedelta(hours=4)).isoformat(),
            "scenario": "load_peak",
            "recommendation": {
                "actions": [
                    {"source": "BESS", "action": "charge", "amount_kw": 1800,
                     "from": now.isoformat(),
                     "to": (now + timedelta(hours=2)).isoformat(),
                     "reason": "Reach 80% SoC before peak."}
                ],
                "expected_outcome": "Diesel kept off through peak window.",
            },
        },
        {
            "id": "A-PV-03",
            "severity": "info",
            "station_id": "PV-AGG",
            "title": "Midday PV surplus expected",
            "message": "PV surplus 220 kWh between 11:00–14:00. Auto-routing to BESS.",
            "lead_time_h": 2.0,
            "issued_at": now.isoformat(),
            "eta": (now + timedelta(hours=2)).isoformat(),
            "scenario": "pv_surplus",
            "recommendation": {
                "actions": [
                    {"source": "BESS", "action": "charge", "amount_kw": 220,
                     "from": (now + timedelta(hours=2)).isoformat(),
                     "to": (now + timedelta(hours=5)).isoformat(),
                     "reason": "Absorb PV surplus instead of curtailing."},
                ],
                "expected_outcome": "BESS reaches 92% SoC, no PV curtailment.",
            },
        },
    ]
    return {"meta": meta(24, t0), "alerts": items}


# ----- Adaptive Adjacency Matrix -----
@app.get("/api/graph")
def graph():
    t0 = time.perf_counter()
    n = len(STATIONS)
    ids = [s["id"] for s in STATIONS]
    rng = random.Random(42)

    matrix = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            base = 0.05 + 0.15 * rng.random()
            if STATIONS[i]["type"] == "substation" or STATIONS[j]["type"] == "substation":
                base += 0.45  # cable hub dominates the graph
            if STATIONS[i]["type"] == "bess" and STATIONS[j]["type"] in ("pv", "load"):
                base += 0.20
            matrix[i][j] = base
        m = max(matrix[i])
        exps = [math.exp(v - m) for v in matrix[i]]
        s = sum(exps)
        matrix[i] = [round(e / s, 4) for e in exps]

    edges = [
        {"source": ids[i], "target": ids[j], "weight": matrix[i][j]}
        for i in range(n)
        for j in range(n)
        if i != j and matrix[i][j] > 0.08
    ]
    return {"meta": meta(24, t0), "stations": STATIONS, "edges": edges, "matrix": matrix}


# ----- Savings -----
@app.get("/api/savings")
def savings():
    return {
        "model": MODEL,
        "annual_net_savings_thb": 8_000_000,
        "annual_diesel_avoided_kwh": 1_250_000,
        "annual_co2_avoided_tons": 1_100,
        "payback_months": 12,
        "pilot_months": 4,
        "sb_wape_pct": 17.93,
        "inference_ms_cpu": 50,
        "model_size_mb": 8.4,
        "stations_nationwide": 4_100,
        "edge_supermlx": True,
    }
