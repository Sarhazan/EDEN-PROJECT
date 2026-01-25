# Roadmap: Eden v2.0 - Enhanced UX & Mobile Experience

## Overview

Eden v2.0 transforms the production maintenance management app into a mobile-first experience with enhanced WhatsApp connection visibility. Starting with a foundational starring system for task prioritization, adding customizable column layouts, implementing responsive mobile design with RTL support for Hebrew users, and finishing with comprehensive WhatsApp connection monitoring including loading states, auto-reconnect, and clear status indicators.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Stars System** - Task prioritization with starring and filtering
- [x] **Phase 2: Resizable Columns** - Customizable column layouts with persistence
- [ ] **Phase 2.1: WhatsApp Gateway Integration** (INSERTED) - Simple WhatsApp Web connection via local gateway
- [x] **Phase 3: Mobile Responsive Experience** - Full mobile optimization with hamburger menu and touch UI
- [ ] **Phase 4: WhatsApp Connection Monitoring** - Comprehensive connection visibility and auto-recovery
- [ ] **Phase 5: WhatsApp Web Integration** - Single-number WhatsApp Web connection for system notifications

## Phase Details

### Phase 1: Stars System
**Goal**: Users can prioritize important tasks with starring and filter to focus on what matters
**Depends on**: Nothing (first phase)
**Requirements**: STAR-FUNC-01, STAR-FUNC-02, STAR-FUNC-03, STAR-FUNC-04, STAR-FUNC-05, STAR-FUNC-06, STAR-FUNC-07, STAR-FILT-01, STAR-FILT-02, STAR-FILT-03, STAR-FILT-04, STAR-FILT-05, STAR-FILT-06, STAR-FILT-07
**Success Criteria** (what must be TRUE):
  1. Manager can click star icon on any task card to toggle starred status
  2. Starred tasks show gold star, unstarred tasks show gray outline star
  3. Star status persists across browser refresh and is visible in history
  4. Manager can click star filter button to view only starred tasks
  5. Starred filter excludes completed tasks automatically
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Database + backend API for star toggle
- [x] 01-02-PLAN.md — Star icon UI with real-time updates
- [x] 01-03-PLAN.md — Global star filter with localStorage

### Phase 2: Resizable Columns
**Goal**: Managers can customize column widths in "My Day" view to match their workflow preferences
**Depends on**: Phase 1
**Requirements**: RESIZE-01, RESIZE-02, RESIZE-03, RESIZE-04, RESIZE-05, RESIZE-06, RESIZE-07, RESIZE-08, RESIZE-09, RESIZE-10, RESIZE-11
**Success Criteria** (what must be TRUE):
  1. Manager can drag slider between columns to adjust width dynamically
  2. Column widths are constrained between 250px minimum and 70% maximum
  3. Adjusted widths persist across browser sessions via localStorage
  4. Reset button restores default 50-50 split
  5. Resizable slider only appears on desktop screens (>= 1024px)
**Plans**: 1 plan

Plans:
- [x] 02-01-PLAN.md — Install re-resizable, implement resizable columns with localStorage persistence, add reset button

### Phase 2.1: WhatsApp Gateway Integration (INSERTED)
**Goal**: WhatsApp messages are reliably sent from single number via local gateway
**Depends on**: Phase 2 (no UI dependencies)
**Requirements**: None (existing implementation validation and UX improvements)
**Success Criteria** (what must be TRUE):
  1. Manager can start local WhatsApp gateway with simple npm command
  2. Manager scans QR code once and WhatsApp session persists
  3. All task notifications are sent successfully from connected WhatsApp number
  4. Messages appear in recipient's WhatsApp with proper formatting
  5. System shows clear error message when gateway is not running
**Plans**: 2 plans

Plans:
- [ ] 02.1-01-PLAN.md — Enhanced error handling with Hebrew messages and UI status indicator
- [ ] 02.1-02-PLAN.md — End-to-end validation, convenience scripts, and manager documentation

### Phase 3: Mobile Responsive Experience
**Goal**: Managers can effectively use Eden on smartphones with touch-optimized interface and RTL support
**Depends on**: Phase 2 (starred tasks and resizable columns must work on mobile)
**Requirements**: MOB-NAV-01, MOB-NAV-02, MOB-NAV-03, MOB-NAV-04, MOB-NAV-05, MOB-NAV-06, MOB-NAV-07, MOB-GRID-01, MOB-GRID-02, MOB-GRID-03, MOB-GRID-04, MOB-GRID-05, MOB-GRID-06, MOB-GRID-07, MOB-TOUCH-01, MOB-TOUCH-02, MOB-TOUCH-03, MOB-TOUCH-04, MOB-TOUCH-05, MOB-TOUCH-06, MOB-TOUCH-07
**Success Criteria** (what must be TRUE):
  1. Manager can open hamburger menu on mobile and access all navigation items
  2. Menu drawer slides from right-to-left (RTL) for Hebrew interface
  3. All buttons and tap targets are minimum 44x44px on mobile
  4. Task cards stack vertically in single column on mobile screens
  5. Manager can swipe right-to-left to close drawer on mobile
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — Hamburger navigation drawer with RTL slide-in and swipe-to-close
- [x] 03-02-PLAN.md — Grid layout transformations for mobile-first responsive design
- [x] 03-03-PLAN.md — Touch optimization with 44px targets and visual feedback

### Phase 4: WhatsApp Connection Monitoring
**Goal**: Managers have complete visibility into WhatsApp connection status with automatic recovery
**Depends on**: Phase 3 (must work on mobile)
**Requirements**: WA-LOAD-01, WA-LOAD-02, WA-LOAD-03, WA-LOAD-04, WA-LOAD-05, WA-LOAD-06, WA-STAT-01, WA-STAT-02, WA-STAT-03, WA-STAT-04, WA-STAT-05, WA-RECON-01, WA-RECON-02, WA-RECON-03, WA-RECON-04, WA-RECON-05, WA-ALERT-01, WA-ALERT-02, WA-ALERT-03, WA-ALERT-04, WA-ALERT-05
**Success Criteria** (what must be TRUE):
  1. Manager sees loading indicator with countdown timer when connecting to WhatsApp
  2. Connection progress shows distinct stages: QR generation, scanning, connecting, ready
  3. WhatsApp status indicator in sidebar shows current connection state with color-coded dot
  4. System attempts automatic reconnection up to 3 times when disconnected
  5. Manager receives toast notification when WhatsApp disconnects with reconnect button
**Plans**: TBD

Plans:
- [ ] TBD (to be determined during planning)

### Phase 5: WhatsApp Web Integration
**Goal**: System reliably sends WhatsApp notifications from single number via WhatsApp Web connection
**Depends on**: Phase 4 (connection monitoring must be in place first)
**Requirements**: TBD (to be defined during planning phase)
**Success Criteria** (what must be TRUE):
  1. Manager can connect system to WhatsApp Web using QR code from single phone number
  2. All task notifications are sent from the connected WhatsApp number
  3. WhatsApp connection persists across server restarts and deployments
  4. Manager receives confirmation when WhatsApp messages are successfully delivered
  5. System gracefully handles WhatsApp disconnections and reconnects automatically
**Plans**: TBD

Plans:
- [ ] TBD (to be determined during planning)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 2.1 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Stars System | 3/3 | Complete | 2026-01-25 |
| 2. Resizable Columns | 1/1 | Complete | 2026-01-25 |
| 2.1. WhatsApp Gateway (INSERTED) | 0/2 | In progress | - |
| 3. Mobile Responsive | 3/3 | Complete | 2026-01-25 |
| 4. WhatsApp Monitoring | 0/? | Not started | - |
| 5. WhatsApp Web Integration | 0/? | Not started | - |
