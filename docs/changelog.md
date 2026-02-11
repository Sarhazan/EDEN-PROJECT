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
- Added planned Feature #3 “Forms Hub (HQ + Site Manager)” with role-based scope:
  - HQ: per-site logo/contracts management.
  - Site manager: interactive forms to suppliers/tenants (signature, card details, debt payment, message).

- Added Forms Hub V1 foundation:
  - HQ Forms page (`/hq/forms`) for per-building logo + contracts management.
  - Site Manager Forms page (`/forms`) for sending interactive form templates to tenants/suppliers.
  - Backend `/api/forms/*` endpoints and DB tables for branding/contracts/form dispatches.

Open:
- React + `re-resizable` compatibility verification.
- Replace MVP hardcoded credentials with managed accounts/secure auth flow.
- Harden payment-card flow for PCI compliance before production use.
