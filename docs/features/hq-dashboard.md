# Feature #1 — HQ Dashboard

Status: **In progress**  
Owner: Documentation Lead  
Last updated: 2026-02-11

---

## Problem
HQ needs one screen to monitor task execution health fast: active load, overdue risk, on-time performance, and who needs attention.

Without this, decision-making is reactive and fragmented across views.

## Scope (MVP)
- Summary KPIs for HQ monitoring.
- Manager performance table.
- Drilldown list of tasks.
- Filters: manager, building, date range.
- Backed by `/api/history/hq-summary`.

## Non-goals (for Feature #1)
- Advanced analytics/forecasting.
- Real-time push updates (websocket-first dashboard behavior).
- Export/reporting engine.
- Permission model redesign.

---

## API Contract — `GET /api/history/hq-summary`

Source: `server/routes/history.js`

### Query Params
- `managerId` (number, optional)
- `employeeId` (number, optional; fallback if `managerId` absent)
- `buildingId` (number, optional)
- `startDate` (ISO date string, optional)
- `endDate` (ISO date string, optional; inclusive until `23:59:59` for completed filters)
- `limit` (number, optional, default `50`)
- `offset` (number, optional, default `0`)

### Response Shape
```json
{
  "kpis": {
    "total_active_tasks": 0,
    "overdue_tasks": 0,
    "on_time_percentage": 0,
    "avg_work_duration_minutes": 0
  },
  "manager_table": [
    {
      "employee_id": 0,
      "employee_name": "string",
      "manager_name": "string",
      "total_tasks": 0,
      "active_tasks": 0,
      "completed_tasks": 0,
      "overdue_tasks": 0,
      "on_time_percentage": 0,
      "avg_work_duration_minutes": 0
    }
  ],
  "drilldown": {
    "items": [],
    "pagination": {
      "total": 0,
      "limit": 50,
      "offset": 0,
      "hasMore": false
    },
    "filters": {
      "managerId": null,
      "buildingId": null,
      "startDate": null,
      "endDate": null
    }
  }
}
```

### Error
- `500` with `{ "error": "Failed to load HQ dashboard summary" }`

### Current integration status
- Backend endpoint exists at `/api/history/hq-summary` ✅
- UI page (`HQDashboardPage.jsx`) currently fetches `/api/history/hq-dashboard` ⚠️
- Result: integration mismatch risk / likely broken data load until endpoint path or client path aligned.

---

## Data Model Notes

### `manager_id`
- Table: `employees`
- Column: `manager_id INTEGER` (nullable)
- FK: references `employees(id)`, `ON DELETE SET NULL`.
- Migration path exists in `server/database/schema.js` for backward compatibility.

### Relevant indexes
From `server/database/schema.js`:
- `idx_employees_manager_id` on `employees(manager_id)`
- `idx_tasks_building_status_completed_at` on `tasks(building_id, status, completed_at DESC)`
- `idx_tasks_employee_status_completed_at` on `tasks(employee_id, status, completed_at DESC)`
- `idx_tasks_status_start_date_start_time` on `tasks(status, start_date, start_time)`
- Additional history indexes for completed/task lookup paths.

Note: query path mixes active + completed windows; monitor query plan once dataset grows.

---

## UI Expectations (HQ)

### KPI cards
Expected cards (minimum):
1. Active tasks
2. Overdue tasks
3. On-time %
4. Avg work duration

Current UI has different KPI set (`total/completed/late/activeManagers`) — needs alignment decision.

### Manager table
- Sort by operational urgency (overdue desc, then active desc).
- Include: manager/employee name, totals, active, completed, overdue, on-time %.
- Click row to focus drilldown.

### Filters
- Date range
- Building
- Manager
- Optional pagination controls for drilldown

### Drilldown
- Task-level rows with status, schedule/completion timestamps, and context (employee/building).
- Should respect current filters and selected manager.

---

## Acceptance Checklist (Feature #1)
- [ ] API route and frontend route are aligned (`hq-summary` vs `hq-dashboard`).
- [ ] KPI naming/semantics aligned between backend response and UI mapping.
- [ ] Manager table renders data from `manager_table` reliably.
- [ ] Drilldown consumes `drilldown.items` + pagination.
- [ ] Filters applied consistently in API and UI.
- [ ] Empty/error/loading states are clear in Hebrew UX.
- [ ] Basic performance sanity check on realistic data volume.
- [ ] Product owner approval recorded in roadmap gate.

---

## Open Risks + Mitigation

### Risk 1 — React + `re-resizable` compatibility
- `client/package.json` uses React `19.2.0` with `re-resizable` `6.9.17`.
- Potential peer dependency mismatch / runtime edge behavior risk.

Mitigation:
1. Run explicit compatibility check in CI/local install logs.
2. If warnings/errors: lock a compatible `re-resizable` version or replace component where used.
3. Keep this risk tracked as **Open** until verified in actual build/runtime.

### Risk 2 — API/UI contract drift
- Current endpoint naming mismatch indicates contract drift already exists.

Mitigation:
1. Establish API contract in this doc as source of truth.
2. Add smoke test for `/api/history/hq-summary` + UI fetch path.
3. Block release until checklist item #1 is closed.

---

## Current Reality Snapshot
- Backend foundation for HQ summary: **implemented**.
- Frontend HQ page: **implemented but contract appears misaligned**.
- Feature status overall: **In progress (not approved as done)**.
