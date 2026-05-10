# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**WattGraphNet** — attention-based spatial-temporal GCN with adaptive adjacency matrix for virtual power plant load forecasting across 6 Chulalongkorn buildings. Research project from SuperAI SS5. Best result: 17.93% SB-WAPE.

Two parts coexist in one repo:
- **Research / training code** (Python, PyTorch + PyTorch Geometric) — `src/`, `notebooks/`, `models/`, `data/`.
- **Demo web frontend** (Next.js 16 + React 19 + Tailwind) — `demo/frontend/`. Deployed via AWS Amplify (`amplify.yml`, static export).

## Commands

### Python (research)
```bash
conda create -n wattgraphnet python=3.11 && conda activate wattgraphnet
pip install -r requirements.txt
pip install pyg_lib torch_scatter torch_sparse torch_cluster torch_spline_conv \
  -f https://data.pyg.org/whl/torch-2.7.0+cu128.html
python setup.py                     # verify env + create data/results/logs dirs
python src/train_autogluon.py       # train AutoGluon baselines
jupyter notebook notebooks/experiment_WattGraphNet_Attention.ipynb  # main model
```
No pytest suite present — evaluation lives in notebooks (`comparision.ipynb`, `error_analysis.ipynb`) and `src/utils/error_analyzer.py`.

### Demo frontend
```bash
cd demo/frontend
npm ci
npm run dev      # local dev
npm run build    # static export → demo/frontend/out (Amplify artifact)
npm run lint
```

## Architecture

### Model code (`src/model/`)
- `model_core_architecture.py` — core ASTGCN-style spatial-temporal GCN block.
- `attention.py` — multi-head temporal/spatial attention + adaptive adjacency matrix learning. This is the WattGraphNet contribution (AAM).
- `model_experiment.py` — experiment wiring used by the attention notebook.
- `astgcnv2_50epoch.onnx` — exported model used by the demo.

Inputs: 6 stations × multivariate time series. Default config: 12hr context → 24hr horizon. Adjacency is **learned**, not fixed — do not hardcode a graph.

### Data pipeline (`src/utils/`)
Run order matches directory layout `data/raw → cleaned → preprocessed`:
1. `concatenate_data.py` — merge per-station Excel demand reports.
2. `build_station_weight.py` — inverse-frequency station weights for **SB-WAPE** (the primary metric — station-balanced WAPE; do not substitute MAPE/WAPE).
3. `split_train_test_data.py` — chronological 80/20 split (no shuffling — temporal order matters).
4. `error_analyzer.py` — per-station + aggregate metrics, drives `error_analysis.ipynb`.
5. `visualizer.py` — graph maps + plots into `results/visualizations/`.

`src/config.py` is the single source for paths, station list, and hyperparameters — read it before hardcoding anything.

### Notebooks
Authoritative entry points (lots of `.xpynb` zero-byte files and exploratory notebooks exist — ignore unless asked):
- `experiment_WattGraphNet_Attention.ipynb` — main training/eval.
- `comparision.ipynb` — head-to-head vs AutoGluon SOTA models.
- `error_analysis.ipynb` — per-station diagnostics.
- `full_pipeline.ipynb` — end-to-end.

### Demo
`demo/frontend/` is a standalone Next.js app (static export, `output: 'export'`). It loads the ONNX model for in-browser inference. Amplify build config: `amplify.yml` at repo root sets `appRoot: demo/frontend`, artifact dir `out`.

## Project conventions

- **Metric**: SB-WAPE is canonical. Always report alongside MAE for station-level analysis.
- **Splits**: chronological only. Never shuffle time series.
- **Stations**: 6 fixed buildings (Chamchuri 4/9, Julajakrapong, Boromrajakumari, Wittayanives, EV charging). Mixed Thai/English names appear in raw data.
- **Notebook outputs are large** (some >1MB). Avoid re-saving notebooks unless asked.
- **No automated tests** — verification is metric-based (SB-WAPE on held-out 20%).

## Behavioral guidelines (from Karpathy)

1. **Think before coding** — surface assumptions, ask when unclear, present alternatives instead of silently picking.
2. **Simplicity first** — minimum code, no speculative abstractions/flexibility/error handling.
3. **Surgical changes** — match existing style; clean only orphans your change created; don't refactor adjacent code.
4. **Goal-driven** — define a verifiable success criterion before looping.
