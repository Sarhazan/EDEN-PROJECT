# Requirements: Eden v3.0

**Defined:** 2026-02-05
**Core Value:** Manager sees in real-time what's happening on the ground -- which task completed, who's doing what, and what's delayed

## v3.0 Requirements

Requirements for v3.0 Quick Task Entry & Clean UI.

### Quick Task Modal

- [ ] **MODAL-01**: Modal opens with minimal layout -- title field + "today" tag only
- [ ] **MODAL-02**: "Today" tag is tappable -- opens inline date picker to change date
- [ ] **MODAL-03**: Radio toggle between one-time and recurring
- [ ] **MODAL-04**: One-time mode -- saves task immediately with title + date only (no system, no employee)
- [ ] **MODAL-05**: Recurring mode -- expands the modal to show all fields (frequency, days, time, system, employee)
- [ ] **MODAL-06**: Task created without employee can be edited later to add employee and send via WhatsApp

### MyDay Page Redesign

- [ ] **MYDAY-01**: Redesigned timeline -- shows 15 days ahead with cleaner, smoother design
- [ ] **MYDAY-02**: Smaller stats cards -- less prominent, keep the info in compact form
- [ ] **MYDAY-03**: Unified filter code -- 3 copies merged into one shared component

## Future Requirements

Deferred from v2.0, not in v3.0 scope:

### WhatsApp Monitoring

- **WMON-01**: Loading states and visual connection states for WhatsApp
- **WMON-02**: Auto-reconnect with status indicator
- **WMON-03**: Alerts on WhatsApp disconnection

### External Integrations

- **EXTINT-01**: Gmail integration for receiving tasks from email
- **EXTINT-02**: Outlook integration for receiving tasks from email

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full stats removal | User wants to keep the info, just make it smaller |
| Backend/API changes | v3.0 is UI improvement only, API exists |
| WhatsApp monitoring | Deferred, not in v3.0 focus |
| External integrations | Deferred, not in v3.0 focus |
| Authentication | System is open by design |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MODAL-01 | Phase 1 | Pending |
| MODAL-02 | Phase 1 | Pending |
| MODAL-03 | Phase 1 | Pending |
| MODAL-04 | Phase 1 | Pending |
| MODAL-05 | Phase 1 | Pending |
| MODAL-06 | Phase 1 | Pending |
| MYDAY-01 | Phase 2 | Pending |
| MYDAY-02 | Phase 2 | Pending |
| MYDAY-03 | Phase 2 | Pending |

**Coverage:**
- v3.0 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0

---
*Requirements defined: 2026-02-05*
*Last updated: 2026-02-05 after roadmap creation*
