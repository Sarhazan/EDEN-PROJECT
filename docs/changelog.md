# Docs Changelog

## 2026-02-11
- Added `docs/README.md` as docs index and workflow source of truth.
- Added `docs/features/hq-dashboard.md` with Feature #1 spec, API contract, risks, and acceptance checklist.
- Added `docs/roadmap.md` with approval-gated feature plan.

## 2026-02-12
- Aligned HQ dashboard frontend endpoint to `/api/history/hq-summary`.
- Added dedicated HQ portal split (MVP): `/hq/login` + `/hq/dashboard` route separation with role-based guard.
- Removed HQ dashboard entry from the site-manager sidebar/menu.
- Updated `docs/roadmap.md` Feature #2 to “HQ Portal Separation”.

Open:
- React + `re-resizable` compatibility verification.
- Replace MVP hardcoded credentials with managed accounts/secure auth flow.
