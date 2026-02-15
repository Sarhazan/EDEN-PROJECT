# Roadmap: Eden v3.0

## Milestones

- v1.0 MVP (shipped 2026-01-25)
- v2.0 Enhanced UX & Mobile Experience (shipped 2026-02-05)
- **v3.0 Quick Task Entry & Clean UI** (in progress)

## Overview

v3.0 transforms task creation from a multi-field form into a fast, minimal-friction experience inspired by Todoist, then cleans up the MyDay page to reduce visual noise. Phase 1 rebuilds the task creation modal with a one-tap/two-field default and progressive disclosure for recurring tasks. Phase 2 redesigns the MyDay timeline, shrinks stats cards, and consolidates duplicated filter code into a single shared component.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Quick Task Modal** - Minimal task creation with progressive disclosure for recurring tasks
- [ ] **Phase 2: MyDay Cleanup** - Redesigned timeline, compact stats, and deduplicated filter code

## Phase Details

### Phase 1: Quick Task Modal
**Goal**: Manager can create a task in under 5 seconds -- title, tap save, done. Recurring tasks expand the modal only when needed.
**Depends on**: Nothing (first phase)
**Requirements**: MODAL-01, MODAL-02, MODAL-03, MODAL-04, MODAL-05, MODAL-06
**Success Criteria** (what must be TRUE):
  1. Manager opens the modal and sees only a title field and a "today" tag -- no other fields visible
  2. Manager taps the "today" tag and an inline date picker appears to change the date
  3. Manager toggles to "recurring" and the modal expands to show frequency, days, time, system, and employee fields
  4. Manager creates a one-time task with just a title and date -- no system or employee required -- and it saves immediately
  5. Manager can later edit a task that was created without an employee to assign one and send via WhatsApp
**Plans**: 1 plan

Plans:
- [ ] 01-01-PLAN.md -- Build QuickTaskModal with DateChip, wire into App.jsx, visual verification

### Phase 2: MyDay Cleanup
**Goal**: MyDay page is visually clean -- the timeline shows 15 days ahead with a refined design, stats cards are compact, and filter code is consolidated into one component.
**Depends on**: Nothing (independent of Phase 1)
**Requirements**: MYDAY-01, MYDAY-02, MYDAY-03
**Success Criteria** (what must be TRUE):
  1. MyDay timeline displays 15 days forward with a cleaner, smoother visual design
  2. Stats cards are smaller and less visually dominant while preserving the same information
  3. Filter UI across the app uses a single shared component (no duplicated filter code in 3 places)
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Quick Task Modal | 0/1 | Planned | - |
| 2. MyDay Cleanup | 0/TBD | Not started | - |
