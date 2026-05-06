# WattGraphNet Demo — PEA Hackathon 2026

Interactive demo of the **WattGraphNet** Smart Energy Management System
(Track 4 — Energy Resource Optimization, Koh Tao pilot).

```
demo/
├── backend/    FastAPI — deploy to Railway
└── frontend/   Next.js  — deploy to Vercel
```

The demo showcases all three modules:

- **Forecast** — 24-hour station-level load + DER forecast with 90% CI
- **Optimize** — multi-objective dispatch (cost ↔ carbon slider), 24 h plan
- **Alert** — projected imbalance warnings with 2–6 h lead time
- **AAM Graph** — learned adaptive adjacency matrix,
  `A = softmax(ReLU(E₁·E₂ᵀ))`

## Run locally

### Backend

```bash
cd demo/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Visit `http://localhost:8000/docs` for the OpenAPI UI.

### Frontend

```bash
cd demo/frontend
cp .env.example .env.local       # already points at localhost:8000
npm install                       # or pnpm/bun
npm run dev
```

Open `http://localhost:3000`.

## Deploy

### 1 · Backend on Railway

1. Push this repo to GitHub.
2. In Railway → **New Project → Deploy from GitHub repo**.
3. Set the project root to `demo/backend`.
4. Railway auto-detects Python via `nixpacks.toml`. No env vars required
   to run the demo (CORS is open by default).
5. After deploy, copy the public URL (e.g. `https://wattgraphnet.up.railway.app`).

Railway config:
- `Procfile` — starts `uvicorn main:app` on `$PORT`
- `railway.toml` — healthcheck at `/healthz`, restart on failure
- `nixpacks.toml` — Python 3.11 + pip install

Optional: set `CORS_ALLOW_ORIGINS=https://your-vercel-domain.vercel.app`
to lock down the CORS origin.

### 2 · Frontend on Vercel

1. In Vercel → **Add New → Project** → import the same repo.
2. Set the **Root Directory** to `demo/frontend`.
3. Vercel auto-detects Next.js — no build overrides needed.
4. In **Environment Variables**, add:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_BASE` | `https://<your-railway-app>.up.railway.app` |

5. Deploy. That's it.

### CLI alternative

```bash
# Backend
cd demo/backend && railway up

# Frontend
cd demo/frontend && vercel --prod
```

## API reference

All routes live under `/api/*` on the Railway service.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/healthz` | Liveness probe |
| GET | `/api/stations` | Koh Tao station topology |
| GET | `/api/forecast?horizon=24` | Per-station 24 h load + PV forecast |
| GET | `/api/optimize?weight_cost=0.7` | Multi-objective dispatch |
| GET | `/api/alerts` | Active imbalance warnings |
| GET | `/api/graph` | AAM adjacency matrix + edges |
| GET | `/api/savings` | Projected savings & KPIs |

## Swap mocks for the real ONNX model

The backend currently generates plausible synthetic outputs so the demo
runs without GPU. To wire up the real model:

1. `pip install onnxruntime numpy`
2. Copy `src/model/astgcnv2_50epoch.onnx` into `demo/backend/`.
3. In `main.py`, replace the body of `/api/forecast` with an
   `InferenceSession` call that feeds the last 12 h of preprocessed
   station load (shape `[1, num_nodes, 1, 12]`) and returns the 24 h
   prediction.

Everything else on the frontend is already wired to the same response
schemas.

## Architecture

```
 Browser ─────────────► Vercel (Next.js 16 App Router)
                           │ fetch NEXT_PUBLIC_API_BASE
                           ▼
                        Railway (FastAPI + uvicorn)
                           │
                           ▼
                    WattGraphNet (A-STGCN + AAM)
```

## Hackathon context

Performance vs competitors (SB-WAPE, lower is better):

| Model | SB-WAPE |
|-------|---------|
| **WattGraphNet (ours)** | **17.93%** |
| PatchTST | 20.95% |
| ChronosZeroShot | 23.04% |
| TiDE | 23.22% |
| SeasonalNaive | 24.38% |

Projected business impact at Koh Tao: **8 M THB / site / year**,
**12-month payback**, pilot-ready in **4 months** on AWS + GDCC.
Scalable SaaS across **4,100+ PEA stations** nationwide.
