# Product Roadmap (GSD + Approval Gates)

_Last updated: 2026-02-11_

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

### Feature #2 — (TBD)
- Status: **Planned**
- Depends on: Feature #1 approval
- Gate A required before writing implementation plan.

### Feature #3 — (TBD)
- Status: **Planned**
- Depends on: Feature #2 scope confirmation

---

## Immediate Next Actions (Execution)
1. Close contract mismatch: frontend endpoint path vs backend route.
2. Align KPI semantics and naming between API and UI.
3. Validate drilldown pagination wiring.
4. Run Gate B/C review with user; capture approvals in this file.

---

## Approval Log (append-only)
- _No approvals recorded yet._
