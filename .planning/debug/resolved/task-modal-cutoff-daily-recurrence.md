---
status: resolved
trigger: "Investigate issue: task-modal-cutoff-daily-recurrence"
created: 2026-01-24T00:00:00Z
updated: 2026-01-24T00:20:00Z
---

## Current Focus

hypothesis: CONFIRMED and FIXED - Modal now uses flexbox layout with constrained height
test: Code review confirms fix is correct; awaiting manual browser verification
expecting: Modal displays full form with scrollbar, no cutoff, update button visible
next_action: User should verify in browser and test regression scenarios

## Symptoms

expected: Modal should auto-resize to fit content - the entire task editing form should be displayed with all fields and the update button accessible
actual: Modal is cut off at the bottom, no update button visible - the modal height is limited and the bottom section including the update button is not visible
errors: Console not yet checked - need to investigate if there are any JavaScript errors or warnings
reproduction: Open MyDayPage and edit a daily task - click the edit icon on any daily recurring task card on the My Day page
timeline: After recent translation/Hebrew language changes - started happening after the multi-language support work (phases 05-05a)
scope: Only tasks with daily recurrence (מופי יומי) - the issue is specific to daily recurring tasks, not all tasks

## Eliminated

## Evidence

- timestamp: 2026-01-24T00:05:00Z
  checked: Modal component (client/src/components/shared/Modal.jsx)
  found: Modal has max-h-[90vh] with overflow-hidden on container, and overflow-y-auto only on inner content div (p-8)
  implication: The inner content div should scroll, but if content div (p-8) doesn't have explicit height constraint relative to parent, overflow-y-auto may not work properly

- timestamp: 2026-01-24T00:06:00Z
  checked: TaskForm component (client/src/components/forms/TaskForm.jsx)
  found: For daily frequency tasks, additional UI section appears (lines 315-344) with weekly days checkboxes in a bg-blue-50 container - this adds significant vertical height
  implication: Daily tasks have extra content (7 checkbox inputs for days of week) that increases form height significantly compared to non-daily tasks

- timestamp: 2026-01-24T00:07:00Z
  checked: Modal structure in Modal.jsx
  found: Line 30 - outer div has `max-h-[90vh] overflow-hidden`, Line 43 - inner div has `p-8 overflow-y-auto` but NO max-height constraint
  implication: The overflow-y-auto on line 43 won't create a scrollbar because it has no height limit - it will try to expand to full content height, but parent has overflow-hidden which cuts it off

## Resolution

root_cause: Modal inner content div (line 43 in Modal.jsx) has overflow-y-auto but lacks a max-height constraint. The outer container has max-h-[90vh] overflow-hidden which hides overflow, but the inner div tries to expand to full content height. For daily recurring tasks, the extra weekly days selection UI (315-344 in TaskForm.jsx) pushes content beyond viewport, causing cutoff with no scrollbar.

fix: Applied flexbox layout to Modal component:
1. Added `flex flex-col` to outer container (max-h-[90vh])
2. Added `flex-shrink-0` to header to prevent it from shrinking
3. Added `flex-1` to content div to take remaining space and enable proper scrolling
This ensures the content div has a constrained height within the 90vh limit, allowing overflow-y-auto to function properly.

verification: Manual browser testing required:
1. Navigate to http://localhost:5177
2. Go to MyDayPage (היום שלי)
3. Click edit on a daily recurring task (משימות יומיות)
4. Verify modal displays completely:
   ✓ All fields visible (title, description, employee, location, etc.)
   ✓ Weekly days checkboxes section fully visible
   ✓ Estimated duration field visible
   ✓ Both buttons visible at bottom (ביטול and עדכן משימה)
   ✓ If content exceeds viewport, scrollbar appears in content area
   ✓ Header remains fixed at top while scrolling
5. Test other modals (System, Employee, etc.) to ensure no regression
6. Test on different viewport sizes (resize browser window)

Technical verification:
- Modal outer container: max-h-[90vh] with flex flex-col layout
- Header: flex-shrink-0 to prevent compression
- Content div: flex-1 to fill remaining space, overflow-y-auto for scrolling
- This ensures content area has constrained height, enabling proper overflow behavior

files_changed: ['client/src/components/shared/Modal.jsx']
