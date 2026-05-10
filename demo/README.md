# WattGraphNet SEMS Demo — PEA Hackathon 2026

Interactive demo of the **WattGraphNet** Smart Energy Management System
(Track 4 — Energy Resource Optimization, Koh Tao pilot).

```
demo/
├── backend/    FastAPI · 4-source mock SEMS · deploy → Railway
└── frontend/   Next.js 16 + R3F · deploy → Vercel
```

## What it shows

Three modules aligned to PEA Track 4 acceptance criteria:

- **Forecast** — 24 h load + DER forecast across 4 sources (Main Grid,
  Diesel, BESS, PV) with per-source MAPE (target ≤ 10%).
- **Optimize** — multi-objective dispatch (cost ↔ carbon slider).
  Returns AI schedule + baseline comparison: ทำตาม vs ไม่ทำตาม with
  diesel/cost/CO₂ deltas and projected annual savings (~9.5M ฿/site/yr,
  spec target 8M).
- **Alert** — Early warning with submarine-cable derating scenario.
  Lead time 4.5 h, structured Source / Amount / Time recommendation.
- **AAM Graph** — learned adaptive adjacency matrix
  `A = softmax(ReLU(E₁·E₂ᵀ))`.
- **3D Island** — interactive `react-three-fiber` viewer of Koh Tao;
  segment decals projected onto island terrain show live per-zone
  consumption on hover.

## Run locally

### Backend

```bash
cd demo/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

OpenAPI: <http://localhost:8000/docs>

### Frontend

```bash
cd demo/frontend
cp .env.example .env.local       # already points at localhost:8000
npm ci
npm run dev
```

Open <http://localhost:3000>.

## Configuration

`demo/frontend/.env.local`:

| Key | Default | Purpose |
|-----|---------|---------|
| `NEXT_PUBLIC_API_BASE` | `http://localhost:8000` | Backend URL |
| `NEXT_PUBLIC_ISLAND_MODEL` | `azure-paradise` | One of: `azure-paradise`, `emerald-archipelago-1`, `emerald-archipelago-2`, `turquoise-isle` |

GLBs live in `frontend/public/models/min/*.glb` (meshopt + WebP, ~5–8 MB
each — compressed 10× from the originals in `public/models/`).

## Deploy

### Backend → Railway

```bash
cd demo/backend
railway login              # interactive
railway init               # create new project
railway up                 # build + deploy
railway domain             # generate public URL → copy
```

Files used by Railway:

- `Procfile` — `web: uvicorn main:app --host 0.0.0.0 --port $PORT`
- `railway.toml` — healthcheck `/healthz`, restart=always
- `nixpacks.toml` — Python 3.11 + pip install

Optional: lock CORS via env var on the Railway service:

```
CORS_ALLOW_ORIGINS=https://your-vercel-domain.vercel.app
```

### Frontend → Vercel

```bash
cd demo/frontend
vercel link                # one-time
vercel env add NEXT_PUBLIC_API_BASE production
# paste the Railway URL from above
vercel --prod
```

## API reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/healthz` | Liveness probe |
| GET | `/api/stations` | Koh Tao topology |
| GET | `/api/forecast?horizon=24` | Per-source 24 h forecast + MAPE |
| GET | `/api/optimize?weight_cost=0.7` | AI dispatch + baseline comparison |
| GET | `/api/alerts` | Active warnings + structured recommendations |
| GET | `/api/graph` | AAM adjacency matrix + edges |
| GET | `/api/savings` | Annual savings + deployment KPIs |

## Architecture

```
 Browser ─────────────► Vercel (Next.js 16 App Router + R3F 3D)
                           │ fetch NEXT_PUBLIC_API_BASE
                           ▼
                        Railway (FastAPI + uvicorn)
                           │
                           ▼
                    WattGraphNet (A-STGCN + AAM)
```

Synthetic data path: backend generates plausible Koh Tao tourism load
profiles (10–14 MW peak) and a rule-based "baseline operator" dispatch
to compare against the AI schedule. Wire the real ONNX (`src/model/
astgcnv2_50epoch.onnx`) into `/api/forecast` when SCADA data lands.

## Hackathon context

Performance (SB-WAPE, lower is better):

| Model | SB-WAPE |
|-------|---------|
| **WattGraphNet (ours)** | **17.93 %** |
| PatchTST | 20.95 % |
| ChronosZeroShot | 23.04 % |
| TiDE | 23.22 % |
| SeasonalNaive | 24.38 % |

Projected business impact at Koh Tao: **~8 M ฿ / site / year**,
**12-month payback**, pilot-ready in **4 months** on AWS + GDCC.
Scalable across **4,100+ PEA stations**.
