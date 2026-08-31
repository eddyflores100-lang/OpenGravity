# Contributing to OpenGravity

First off — thanks for even reading this file. OpenGravity is an
**AliceLabs proprietary (source-available) project**, so the rules are a bit
different from a typical OSS repo. This page explains what that means in
practice and how to get your first PR merged.

## Table of contents

1. [The license in 30 seconds](#1-the-license-in-30-seconds)
2. [What we accept](#2-what-we-accept)
3. [Getting started (dev environment)](#3-getting-started-dev-environment)
4. [The calibration contract (read before touching scoring.py)](#4-the-calibration-contract)
5. [Coding standards](#5-coding-standards)
6. [Commit & PR style](#6-commit--pr-style)
7. [Reporting security issues](#7-reporting-security-issues)

---

## 1. The license in 30 seconds

By opening a PR you agree that your contribution becomes part of OpenGravity
under the [AliceLabs Proprietary License](./LICENSE). In plain words:

- ✅ You can read, run, fork locally and study the code (non-commercial).
- ❌ You cannot sell it, host it as a paid service, or use its output to advise
  an investment vehicle without a commercial license.
- 📝 Contributions (code, docs, datasets, ideas) become part of the AliceLabs
  project. This acts as the CLA — don't submit code you don't have the right
  to contribute.

## 2. What we accept

| Great fit ✅ | Needs discussion first 💬 | Usually rejected ❌ |
|---|---|---|
| Bug fixes in `src/`, `main.py`, `scoring.py` | New scoring signals / coefficients | Feature dumps without tests |
| Test coverage in `tests/` | New LLM providers in `llm.ts` | Refactors of frozen `archive/` code |
| Docs, translations, README fixes | Schema changes in `models.py` | Any commit with secrets/keys |
| DevEx: Docker, CI, DX improvements | Data ingestion connectors | `git` history manipulation |

Open an issue **before** building anything in the 💬 column.

## 3. Getting started (dev environment)

Prereqs: Python 3.12+, Node 20+, Docker (optional but recommended).

```bash
git clone https://github.com/alicelabsllc/OpenGravity.git
cd OpenGravity

# Backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest tests/ -q                     # must be green before anything else

# Core bot
npm install
npm run typecheck

# Everything at once
cp .env.example .env
docker compose up --build
```

## 4. The calibration contract

`scoring.py` is not regular code — it is a **frozen calibration**. If your PR
changes any of the following, it MUST include:

1. A recalibration notebook/runbook in `archive/scripts/` style,
2. Updated regression tests in `tests/test_scoring.py`,
3. A line in `CHANGELOG.md` under a `### Calibration` heading,
4. And it will be reviewed by the maintainers against the historical dataset.

What counts as calibration-sensitive:

- Any constant in `OpenGravityEngine.COEFFICIENTS`
- The status thresholds (`INVEST_THRESHOLD`, `DROP_THRESHOLD`, ...)
- The confidence-interval spreads (±5% / ±15%)
- `models.py` validation ranges (they clamp the logit inputs)

## 5. Coding standards

**Python (backend)**
- Type hints everywhere (`pydantic` models define the contracts)
- Pydantic v2 syntax only (`min_length`, `model_config`, ...)
- `datetime.now(timezone.utc)` — never `datetime.utcnow()`
- Never hardcode keys; read from `os.environ` and fail fast with a clear message

**TypeScript (core bot)**
- `strict` mode must pass: `npm run typecheck`
- Native `fetch`/`undici` — no shell-outs (`execSync`/`curl`) ever
- Empty `catch {}` blocks are banned — log and fail over
- Secrets go in headers, never URLs

**Commits**
- Secrets never enter git history (we rewrite history to remove them — your
  commit will be dropped)

## 6. Commit & PR style

```
feat: add sector priors to logit model
fix: reverse-ordered history sent to LLM router
docs: translate API table to Spanish
test: lock CRITICAL flag threshold
chore: bump undici to 7.1
```

- One logical change per PR. Keep diffs reviewable (< ~400 lines).
- All CI checks green: backend tests + core typecheck.
- Describe *why*, not just *what*.

## 7. Reporting security issues

**Do not open a public issue for security problems** (leaked keys, injection,
auth bypass). Contact AliceLabs privately via
[github.com/alicelabsllc](https://github.com/alicelabsllc) with reproduction
steps. We acknowledge reports within 72 hours.

---

*Thanks for helping make OpenGravity better — calibrated probabilities for
everyone.* 🌌
