# 📦 Archive — Historical Artifacts (V9.x Calibration Era)

This folder preserves the full research trail behind OpenGravity's calibration.
**These artifacts are frozen** — they document how the V10 engine was built and
validated, but they are no longer maintained.

> ⚠️ **Note on paths:** scripts in `archive/scripts/` were written when the
> repo had a flat layout. If you want to re-run one, execute it from the repo
> root or adjust its relative paths (datasets now live in `archive/data/`).

## Contents

| Folder | What's inside |
|---|---|
| `scripts/` | One-off experiment scripts: mass audits (`run_*_audit_*`), stress tests, Monte Carlo simulations, blind validators, the **Truth Monolith** calibration engines (v9.6.x), SEC/API harvesters, war-room debates |
| `data/` | Datasets and results: `ground_truth_v1.json`, train/OOD splits, company encyclopedias, forensic case files (SpaceX, Nikola, Rivian, Deel), isotonic calibration maps, Brier score reports |
| `reports/` | Calibration reports (CSV), audit reports (MD), stress logs and dashboard screenshots (PNG) |

## Why keep them?

1. **Reproducibility** — every number in the V10 calibration can be traced.
2. **Honesty** — the documented limitations (N=30, synthetic MOE proxy) live in these files.
3. **Regression safety** — future recalibrations can diff against the V9.x methodology.

## What's *not* here

The production system lives in:

- `main.py`, `models.py`, `scoring.py` → Bayesian Oracle (FastAPI)
- `src/` → Telegram bot core (TypeScript)
- `ui/` → Institutional Dashboard (Next.js)
- `tests/` → Engine regression suite
