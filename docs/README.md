# Docs Index (GSD)

_Last updated: 2026-02-11_

## TL;DR (Decision-first)
- Source of truth for product execution is now under `docs/`.
- Feature docs live in `docs/features/`.
- Delivery is **approval-gated**: no feature moves to build/release without explicit user approval.

---

## 1) Product Docs
- `docs/roadmap.md` — feature-by-feature plan, status, approval gates.
- `docs/features/hq-dashboard.md` — Feature #1 spec + implementation status (in-progress).

## 2) Architecture
- `server/database/schema.js` — DB schema, migrations, indexes.
- `server/routes/` — API route implementations.
- `README.md` (root) — project-level overview.

## 3) API
- `server/routes/history.js` — history endpoints including HQ summary.
- `docs/features/hq-dashboard.md` — API contract section for `/api/history/hq-summary`.

## 4) Rollout / Deployment
- `DEPLOYMENT.md`
- `RAILWAY_DEPLOYMENT.md`
- `RENDER_DEPLOYMENT.md`
- `RENDER_SETUP_CHECKLIST.md`

## 5) Changelog
- `docs/changelog.md` — decision log / docs-level changes.

---

## Working Agreement (איך עובדים מכאן)
1. Open/Update feature doc in `docs/features/<feature>.md`.
2. Mark explicit status: `Not started / In progress / Done / Blocked`.
3. Add approval gate entry in `docs/roadmap.md`.
4. After approval, implement.
5. Update `docs/changelog.md` with what changed (and what is still pending).

No "assumed done". אם לא אומת בפועל — מסומן כ-In progress.
