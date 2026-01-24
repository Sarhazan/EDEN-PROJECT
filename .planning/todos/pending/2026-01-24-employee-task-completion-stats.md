---
created: 2026-01-24T23:15
title: Add employee task completion statistics with circular progress bars
area: ui
files:
  - client/src/pages/EmployeesPage.jsx
  - server/routes/employees.js
---

## Problem

The EmployeesPage currently shows a list of employees with basic information (name, phone, WhatsApp, language), but doesn't display any performance metrics.

Need to add visual statistics showing:
- How many tasks each employee has completed (percentage)
- Display as circular progress bars (like a donut chart)
- Should show completion percentage for each employee

This will help managers quickly identify:
- Which employees are most productive
- Who might need support or additional training
- Overall team performance at a glance

## Solution

**Backend:**
- Add GET /api/employees/stats endpoint (or enhance existing GET /api/employees)
- Calculate for each employee:
  - Total tasks assigned
  - Total tasks completed
  - Completion percentage
- Query example:
  ```sql
  SELECT employee_id,
    COUNT(*) as total_tasks,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
    ROUND(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as completion_percentage
  FROM tasks
  GROUP BY employee_id
  ```

**Frontend:**
- Add circular progress indicator to each employee card in EmployeesPage
- Use creative design (circular bar, radial progress, donut chart)
- Display percentage in center of circle
- Color coding:
  - Green: 80%+ completion
  - Yellow/Orange: 50-79% completion
  - Red: <50% completion
- Possible libraries: recharts, react-circular-progressbar, or custom SVG

**UX Notes:**
- Trust in creative design ("סומך עליך עם העיצוב חבר")
- Should be visually appealing and easy to understand
- Consider showing additional metrics: total tasks, completed count
- Maybe add tooltip with more details on hover
