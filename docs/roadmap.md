# Product Roadmap (GSD + Approval Gates)

_Last updated: 2026-02-12_

## Rules of engagement
- כל פיצ'ר עובר Gate לפני מעבר לשלב הבא.
- **No implementation/release without explicit user approval.**
- Status vocabulary: `Planned | In progress | Ready for review | Approved | Released | Blocked`.

---

## Feature Plan

### Feature #1 — HQ Dashboard
- Status: **In progress**
- Doc: `docs/features/hq-dashboard.md`
- Goal: HQ operational monitoring with KPIs + manager table + drilldown.

#### Gates
- [ ] Gate A — Scope approved (problem/scope/non-goals)
- [ ] Gate B — API contract approved (`/api/history/hq-summary`)
- [ ] Gate C — UI/UX expectations approved (cards/table/filters/drilldown)
- [ ] Gate D — Pre-release validation approved (acceptance checklist)
- [ ] Gate E — Release approved by user

### Feature #2 — HQ Portal Separation (Regional Manager)
- Status: **In progress**
- Goal: HQ runs in a dedicated portal with separate login and role-based access.
- Scope (MVP): `/hq/login`, `/hq/dashboard`, HQ-only route guard, remove HQ entry from site-manager sidebar.
- Depends on: Feature #1 baseline dashboard
- Gate A required before final rollout.

### Feature #3 — Forms Hub (HQ + Site Manager)
- Status: **In progress**
- Goal: add a dedicated "טפסים" button/menu for both roles with role-specific capabilities.
- Scope:
  - **HQ (מנהל אזור):** select site/compound, manage branding and legal assets per site:
    - logo per site
    - contracts/documents per site
  - **Site Manager (מנהל אחזקה):** send interactive forms to suppliers/tenants:
    - regulation signature form
    - credit card details form
    - debt payment form
    - message/notification form
- Notes:
  - Site forms must be interactive and sendable to external recipients.
  - Strong security/compliance is required for sensitive forms (especially payment/card details).
- Depends on: HQ portal + dispatch baseline

### Feature #4 — Multi-site parallel environment (deferred)
- Status: **Planned (Deferred)**
- Goal: run additional site-manager instance on separate frontend/backend ports with isolated demo data.
- Note: explicitly postponed; current focus stays on HQ manager interface.
- Depends on: HQ interface milestones

---

## Immediate Next Actions (Execution)
1. Validate Feature #1 on seeded/demo data (KPI semantics and drilldown correctness).
2. Continue HQ interface focus: distribution lists + bulk dispatch UX.
3. Start Feature #3 planning: Forms Hub IA (menu + role split + security boundaries).
4. Run Gate B/C review with user; capture approvals in this file.

---

## Approval Log (append-only)
- _No approvals recorded yet._
