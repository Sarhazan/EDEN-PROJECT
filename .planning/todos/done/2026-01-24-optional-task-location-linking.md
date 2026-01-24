---
created: 2026-01-24T18:45
title: Add optional location linking to tasks with pin icon
area: ui
files:
  - client/src/pages/MyDayPage.js
  - client/src/pages/ManagerDashboard.js
  - server/routes/tasks.js
  - server/db/schema.sql
---

## Problem

Currently, tasks are associated with systems, and systems are associated with locations. However, there's no direct way for users to see or filter tasks by location from the task view itself.

Users want:
1. A pin icon (📍) next to each task
2. Clicking the pin allows linking the task to a location (optional)
3. Location should appear as a field in the task list view
4. Ability to filter/group tasks by location

This would improve task organization and help workers/managers quickly identify where they need to go.

## Solution

**Database:**
- Consider adding `location_id` column directly to `tasks` table (optional FK to locations)
- This would denormalize the data slightly (task→system→location) but enable direct location filtering

**Frontend:**
- Add pin icon (📍) to task cards in MyDayPage and ManagerDashboard
- Clicking pin opens a modal/dropdown to select location
- Display location name/badge in task card if linked
- Add location filter to task lists (alongside existing filters)

**UX Considerations:**
- Should be optional (not all tasks need location override)
- When task has direct location, show that; fallback to system's location
- Pin icon should be subtle when no location linked, highlighted when linked

**Alternative Approach:**
- Keep current system→location relationship
- Add location column to task list views (derived from system.location_id)
- Add location filter without modifying task schema
- This is simpler but doesn't support location overrides
