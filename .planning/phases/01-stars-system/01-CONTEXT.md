# Phase 1: Stars System - Context

**Gathered:** 2026-01-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Task prioritization through starring functionality - managers can mark important tasks with stars and filter their view to focus on what matters most. This phase delivers the starring mechanism and global filter. Task creation, editing, completion are separate phases already shipped in v1.0.

</domain>

<decisions>
## Implementation Decisions

### Star Placement & Interaction
- Star icon positioned in top-right corner of task card (RTL aligned for Hebrew interface)
- Click on star does immediate toggle (starred ↔ unstarred)
- Star click is isolated action - does NOT open task card details
- No confirmation dialog - single click toggles state immediately

### Filter Location & Scope
- Filter button placed in sidebar (not in page headers)
- Filter applies globally across ALL pages: MyDay, AllTasks, History
- Filter state persists across page navigation (global state)
- Filter state saved to localStorage and restored on browser refresh/reload

### Visual Design
- **Starred tasks:** Solid gold star (#FFD700 or similar golden/yellow color), filled completely
- **Unstarred tasks:** Gray outline star (gray-400 or similar), not filled
- **Filter button:** Star icon only in sidebar, no text label
- Filter button visual state: gray (inactive/show all) → gold (active/show starred only)

### Claude's Discretion
- Star icon size (20px, 24px, or 32px - choose what fits card layout best)
- Click feedback animation (pop/scale, fade, or simple color change)
- Exact hover/active states for accessibility
- Star icon library choice (FontAwesome, React Icons, etc.)
- localStorage key naming convention

</decisions>

<specifics>
## Specific Ideas

- User referenced image from another system showing star filter in toolbar - adapted to Eden's sidebar for consistency
- Filter should work like a toggle switch: click once to show only starred, click again to show all
- Completed tasks excluded from starred filter automatically (as discussed in requirements)
- Star status visible in history page (persists after task completion)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-stars-system*
*Context gathered: 2026-01-25*
