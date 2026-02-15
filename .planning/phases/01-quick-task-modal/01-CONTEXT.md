# Phase 1: Quick Task Modal - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Redesign the task creation modal from a 10+ field form into a Todoist-style minimal input. Default mode shows only title + "היום" date chip. A radio toggle switches between one-time (save immediately) and recurring (expand to full form). The existing backend API stays unchanged — this is a frontend-only change to TaskForm.jsx and its modal wrapper.

</domain>

<decisions>
## Implementation Decisions

### Modal trigger & appearance
- Small centered popup (not full overlay, not bottom sheet)
- Replace the current FAB (+) — the button now opens this minimal modal instead of the old full form
- Same appearance on mobile and desktop — centered popup everywhere
- Backdrop: Claude's discretion

### Quick save flow
- After saving a one-time task, the modal closes immediately
- Enter key in the title field saves the task (fastest possible flow: type → Enter → done)
- Toast notification "משימה נוצרה" appears briefly after save
- Title is required — block save with subtle error if empty

### Date chip interaction
- Default label says "היום" inside the title field on the right side
- Clicking the chip opens an inline calendar dropdown below it (like TodoIt)
- After selecting a different date, chip text updates to show the selected date (e.g., "מחר" or "07/02")
- Default date is always today

### Recurring mode expansion
- Radio toggle (חד-פעמית / חוזרת) sits below the title field
- One-time is the default selection
- Toggling to "חוזרת" makes the modal grow in place (smooth expansion, stays centered) to show the full form fields
- Reuse existing TaskForm fields as-is (frequency, days, time, system, employee, priority, duration) — no redesign of these fields
- User can toggle back from חוזרת to חד-פעמית — modal collapses back to minimal

### Claude's Discretion
- Backdrop style (dim, blur, or none)
- Animation timing and easing for modal open/close and expansion
- Exact toast notification style and duration
- Save button text and styling in minimal mode
- Calendar dropdown positioning edge cases

</decisions>

<specifics>
## Specific Ideas

- "Like Todoist" — the user referenced Todoist's quick task entry as the inspiration. Small, fast, minimal friction.
- "Like TodoIt" — the date picker interaction should feel like TodoIt's date chip
- The date chip sits INSIDE the title input field, on the right side (RTL: left side visually)
- The current TaskForm.jsx has all the fields for recurring mode — reuse them, don't rebuild

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-quick-task-modal*
*Context gathered: 2026-02-05*
