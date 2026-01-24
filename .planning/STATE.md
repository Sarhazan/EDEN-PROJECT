# State: Eden - מערכת ניהול אחזקת מבנים

**Last updated:** 2026-01-25

## Project Reference

**Core Value:** מנהל המבנה רואה בזמן אמת מה קורה בשטח - איזה משימה הושלמה, מי עושה מה, ומה מתעכב

**Current Focus:** הוספת עדכונים בזמן אמת, העלאת תמונות והערות, מעקב טיימינג והיסטוריה למערכת קיימת

## Current Position

**Phase:** 5 of 5 (Multi-Language Support) ⏳ IN PROGRESS
**Plan:** 05b of 06
**Status:** Phase 5 in progress - Translation UI indicators complete
**Last activity:** 2026-01-25 - Completed 05-05b-PLAN.md (Translation UI Indicators)
**Next Plan:** Phase 5 verification and gap closure (if needed)

**Progress:**
```
Milestone: v1 Feature Additions (Complete) + v2 Multi-Language
[███████████████████░] 94% (33/35 requirements)

Phase 1: Real-Time Infrastructure [██████████] 4/4 ✅ COMPLETE
Phase 2: Enhanced Task Completion [██████████] 5/5 ✅ COMPLETE
Phase 3: Status Tracking & Timing [██████████] 8/8 ✅ COMPLETE
Phase 4: History & Archive [██████████] 8/8 ✅ COMPLETE
Phase 5: Multi-Language Support [██████░░░░] 5/8 ⏳ IN PROGRESS
```

## Performance Metrics

**Since:** Project start (2026-01-19)

| Metric | Value |
|--------|-------|
| Requirements completed | 33/35 (94%) |
| Plans completed | 16 |
| Phases completed | 4/5 (80%) |
| Phases planned | 5/5 (100%) |
| Days in milestone | 7 (Jan 19-25) |
| Blockers encountered | 1 (Gemini API activation) |
| Context reloads | 3 |

## Accumulated Context

### Key Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-19 | WebSocket במקום polling | המנהל צריך לראות עדכונים מיידיים, polling גורם לעיכובים ולעומס |
| 2026-01-19 | תמונות נשמרות בשרת | לא משתמשים בשירות חיצוני (S3/Cloudflare) כדי לשמור על פשטות |
| 2026-01-19 | הערות כטקסט חופשי | עובדים כותבים הערות חופשיות, לא טפסים מובנים |
| 2026-01-19 | ארכיון 2 שנים | שמירה ארוכת טווח לצורך מעקב היסטורי ותחזוקה |
| 2026-01-19 | Socket.IO with http.Server wrapper | Integrated with existing Express server for robust WebSocket implementation |
| 2026-01-19 | Event naming: task:created/updated/deleted | Consistent pattern for clarity and easy client-side listening |
| 2026-01-19 | Full task objects in event payloads | Include system_name and employee_name to eliminate client refetch needs |
| 2026-01-20 | Dependency injection for Socket.IO in routes | Avoid circular dependency by using setIo() pattern instead of direct import |
| 2026-01-20 | Functional state updates in event handlers | Prevent stale closure bugs in WebSocket event listeners |
| 2026-01-20 | Separate task_attachments table vs JSON column | Better scalability for multiple images, supports foreign keys, easier querying |
| 2026-01-20 | File paths in DB, not BLOBs | Keep database compact, enable filesystem backups, better performance |
| 2026-01-20 | crypto.randomBytes for filenames | Prevents path traversal attacks, avoids collisions, security best practice |
| 2026-01-20 | 5MB file size limit | Balance between image quality and server storage/bandwidth |
| 2026-01-23 | Default task duration 30 minutes | Standard for maintenance tasks, can be overridden per task |
| 2026-01-23 | completed_at stores worker finish time | Timing variance measures worker performance, not approval delay |
| 2026-01-23 | No "late" status column | Late status computed dynamically to avoid stale data |
| 2026-01-23 | Enrichment after DB, before response | Keep DB lean with source data, calculate derived fields (is_late, timing_status) dynamically |
| 2026-01-23 | Near-deadline threshold: 10 minutes | Gives workers urgent attention window before task becomes late |
| 2026-01-23 | Hebrew time variance text | Manager UI localized - show "הושלם מוקדם ב-X דקות" for completed task variance |
| 2026-01-24 | MyDayPage layout: recurring vs one-time | Clear visual separation - right side for recurring tasks, left for one-time + late tasks |
| 2026-01-24 | Composite index order for history queries | status (constant) → completed_at (selective) → employee_id → system_id for optimal SQLite performance |
| 2026-01-24 | WAL mode for better concurrency | Allow reads during writes, prevents cleanup job from blocking history queries |
| 2026-01-24 | Default 7-day history view | Most managers want recent history, explicit date range for deeper analysis |
| 2026-01-24 | Decimal division in statistics | Use 100.0 not 100 to prevent integer division returning 0% |
| 2026-01-24 | NULL time_delta_minutes = on-time | Older tasks don't have delta populated, treating as late would skew statistics |
| 2026-01-24 | Transaction-wrapped cleanup | All-or-nothing deletion with automatic rollback on error for data safety |
| 2026-01-24 | URL-based filter state for history | Shareable/bookmarkable filtered views - copy URL to share exact filter with colleague |
| 2026-01-24 | react-tailwindcss-datepicker for date range | Hebrew localization support, responsive design, built-in shortcuts |
| 2026-01-24 | Component composition for history page | HistoryStats → HistoryFilters → HistoryTable pattern for separation of concerns |
| 2026-01-24 | Hybrid translation: Gemini → Google Translate | Start with FREE Gemini API (15 req/min, 1500/day), fallback to PAID Google Translate only when quota exceeded - cost optimization |
| 2026-01-24 | Track translation_provider in database | Monitor which API used (gemini/google-translate/none) for cost analysis and quota management |
| 2026-01-24 | Server-side translation on write | Translate once when employee submits note, not on every manager read - minimize API costs |
| 2026-01-24 | ISO 639-1 language codes for employees | Standard two-letter codes (he, en, ru, ar) for international compatibility with i18n libraries and translation APIs |
| 2026-01-24 | Database CHECK constraint for language validation | Data integrity at lowest level - prevents invalid languages from being stored even if API validation bypassed |
| 2026-01-24 | i18next for server-side translations only | Manager UI stays Hebrew-only, only employee-facing content needs translation |
| 2026-01-24 | Preload all 4 languages at startup with initImmediate:false | Ensures all languages available synchronously, prevents async loading race conditions |
| 2026-01-24 | Use getFixedT for all employee-facing translations | Thread-safe, prevents race conditions when serving multiple employees concurrently |
| 2026-01-24 | Organize translations into 3 namespaces (common, tasks, whatsapp) | Logical separation, allows loading only needed translations per context |
| 2026-01-24 | Flag emojis for language display | Visual language identification faster than reading text - 🇮🇱 🇬🇧 🇷🇺 🇸🇦 in employee cards |
| 2026-01-24 | getFixedT for WhatsApp translations | Thread-safe translation per employee prevents race conditions in concurrent bulk sends |
| 2026-01-24 | Language fallback: payload → DB → 'he' | Backward compatible with old clients, graceful degradation if employee data missing |
| 2026-01-24 | Preserve task data, translate UI text only | Task titles/descriptions are user input, not machine-translatable UI strings |
| 2026-01-24 | Query employee language via JOIN for HTML | Single database query more efficient than fetching employee separately in htmlGenerator |
| 2026-01-24 | Replace translation placeholders before data | Prevents accidentally replacing translated content that contains {{...}} syntax |
| 2026-01-24 | RTL for Hebrew/Arabic, LTR for English/Russian | Matches standard text direction conventions for these language families |
| 2026-01-24 | Remove hardcoded direction from CSS | Text direction controlled by html tag dir attribute for flexibility |
| 2026-01-25 | Gemini 2.0 Flash Lite model for translation | Gemini 1.5 models retired in 2026, gemini-2.0-flash-lite is current stable free-tier model |
| 2026-01-25 | Store original_language and translation_provider in DB | Track source language and API used for cost monitoring, debugging, and quality analysis |

### Roadmap Evolution

- **2026-01-24:** Phase 5 added - Multi-Language Support (8 requirements: employee language preference, translated WhatsApp messages, translated interactive pages, auto-translation of worker notes to Hebrew, RTL/LTR support)

### Active TODOs

- [x] Review and approve roadmap structure
- [x] Run `/gsd:plan-phase 1` to plan Real-Time Infrastructure phase
- [x] Begin Phase 1 execution
- [x] Complete 01-01 WebSocket Server Setup
- [x] Complete 01-02 Client WebSocket Connection
- [x] Verify Phase 1 completion
- [x] Run `/gsd:plan-phase 2` to plan Enhanced Task Completion phase
- [x] Begin Phase 2 execution
- [x] Complete 02-01 Backend Image Upload & Notes Infrastructure
- [x] Complete 02-02 Frontend Upload Form & Display
- [x] Complete Phase 3 (Status Tracking & Timing)
- [x] Create Phase 3 VERIFICATION.md
- [x] Run `/gsd:plan-phase 4` to plan History & Archive phase
- [x] Execute 04-01 Backend History Infrastructure
- [x] Execute 04-02 Frontend History Page
- [x] Verify Phase 4 completion
- [x] Complete milestone v1
- [ ] Plan Phase 5 (Multi-Language Support)
- [ ] Execute Phase 5

### Pending Todos

2 todos captured for future work (see `.planning/todos/pending/`):
- Deploy to GitHub (deployment)
- Use consistent port for entire project (infrastructure)

### Known Blockers

None currently.

### Recent Changes

**2026-01-25:**
- **Completed 05-05a-PLAN.md:** Hybrid Translation Service (Gemini API + Google Translate)
  - Updated Gemini model from retired gemini-1.5-flash to gemini-2.0-flash-lite
  - Hybrid translation service: Gemini API (FREE, primary) → Google Translate (PAID, fallback) → Original text
  - Bidirectional translation: translateToHebrew (employee notes → Hebrew), translateFromHebrew (tasks → employee language)
  - Database tracking: original_language, translation_provider columns in tasks table
  - Task completion endpoint translates non-Hebrew notes before storing
  - Graceful degradation: provider='none' when APIs unavailable
  - Cost monitoring via getProviderStats()
  - Duration: ~2 hours (including API troubleshooting)
  - Commits: 07b8102 (model update), 6d25591 (README docs), 4b8ec09 (SUMMARY)
  - Infrastructure complete ✅ | API activation pending ⚠️
  - Requirements satisfied: ML-06 (employee note translation infrastructure)

**2026-01-24 (Phase 5 continued):**
- **Completed 05-03-PLAN.md:** Multilingual Interactive HTML Pages
  - Replaced all hardcoded Hebrew in task-confirmation.html with 27 translation placeholders
  - Updated htmlGenerator to query employee language via JOIN on task_confirmations
  - Implemented i18n integration with getFixedT for thread-safe translations
  - Text direction logic: RTL for Hebrew/Arabic, LTR for English/Russian
  - Added 12 new translation keys to all 4 language files (he, en, ru, ar)
  - Verified all languages generate correct HTML with proper lang/dir attributes
  - Fallback to Hebrew if language is NULL or translation fails
  - Duration: 5min 39sec
  - Commits: 134e962 (template placeholders), 8441de7 (htmlGenerator i18n), c988268 (RTL verification)
  - Requirements satisfied: ML-03 (multilingual HTML), ML-04 (translated UI), ML-05 (dir attribute), ML-06 (server-side translation), ML-08 (RTL/LTR support)
- **Completed 05-04-PLAN.md:** WhatsApp Message Translation
  - Modified server/routes/whatsapp.js to use i18n service
  - Extract language from request payload or query from employees table
  - Use getFixedT(employeeLanguage, 'whatsapp') for thread-safe translation
  - Translate greeting, task list header, click-to-view message
  - Preserve task titles and descriptions (not translated)
  - Fallback to Hebrew if language missing or invalid
  - Each employee receives WhatsApp message in their configured language
  - Duration: 1min 39sec
  - Commits: 4832a04 (feat)
  - Requirements satisfied: ML-02 (WhatsApp translations)
- **Completed 05-02-PLAN.md:** Employee Language Preference
  - Added language column to employees table with CHECK constraint
  - Updated employee CRUD endpoints to accept and validate language field
  - Added language dropdown to employee creation/editing form
  - Display employee language with flag emojis in employee list
  - Include employee language in bulk WhatsApp send request payload
  - All changes maintain backward compatibility (default to Hebrew)
  - Duration: 3min 53sec
  - Commits: 34cb393 (database), f5a8338 (API), 221c7e3 (UI)
  - Requirements satisfied: MLS-01 to MLS-05
- **Started PHASE 5: Multi-Language Support**
  - Progress: 4/8 requirements, 3/5 plans complete
  - Installed i18next@25.8.0 and i18next-fs-backend@2.6.1
  - Created 12 translation JSON files (4 languages × 3 namespaces)
  - Built server-side i18n service with thread-safe getFixedT
  - Duration: 4min 28sec
  - Commits: 3eb021d (dependencies), e94a9cc (translations), f571540 (i18n service)
- **Completed 05-01-PLAN.md:** i18n Infrastructure Setup
  - Installed i18next and i18next-fs-backend packages
  - Created translation files for Hebrew, English, Russian, Arabic
  - Namespaces: common (empty), tasks (employee page), whatsapp (messages)
  - Created server/services/i18n.js with preload and initImmediate:false
  - All languages load synchronously at startup for instant availability
  - getFixedT provides thread-safe translations for concurrent requests
  - Interpolation tested and working: {{name}} → "Hello John"
  - Requirements satisfied: ML-01 (i18n infrastructure)

**2026-01-24 (continued):**
- **✅ COMPLETED PHASE 4: History & Archive**
  - All 8 requirements satisfied (HA-01 through HA-08, partial HA-09)
  - Phase completed with 2 plans: Backend (04-01) + Frontend (04-02)
  - Total duration: 9min 13sec (6min 48sec backend + 2min 25sec frontend)
  - Progress: 96% (26/27 requirements complete)
- **Completed 04-02-PLAN.md:** Frontend History Page
  - Installed react-tailwindcss-datepicker for date range selection
  - Created useHistoryFilters hook with URL-based state management
  - Built HistoryFilters component (date range, employee, system, location)
  - Built HistoryStats component (total completed, late count, on-time%)
  - Built HistoryTable component (task list with completion details)
  - Created HistoryPage integrating all components
  - Added /history route and sidebar navigation link
  - URL-based filters enable shareable/bookmarkable views
  - Image lightbox for viewing task attachments
  - Duration: 2min 25sec
  - Commits: d7fd897 (hook), 5077aaa (components), 1bec0bc (page)
  - Requirements satisfied: HA-03, HA-04, HA-05, HA-06 (filters), HA-07 (stats), HA-09 (notes/images)
- **Completed 04-01-PLAN.md:** Backend History Infrastructure
  - Created GET /api/history endpoint with multi-filter support (date, employee, system, location)
  - Built composite indexes for optimal query performance (idx_tasks_history, idx_tasks_retention)
  - Implemented scheduled data retention with node-cron (2-year cleanup, daily at 2 AM)
  - Added location_id to systems table for location filtering
  - Added time_delta_minutes to tasks table for statistics
  - Enabled WAL mode for concurrent reads during writes
  - Fixed SQL quoting and NULL handling bugs
  - Duration: 6min 48sec
  - Commits: 4d4ffc4 (history endpoint), 6501e11 (indexes), 3f0b474 (retention), 1708efd (bug fixes)
  - Requirements satisfied: HA-01 (API endpoint), HA-02 (filters), HA-06 (location), HA-07 (stats), HA-08 (retention)

**2026-01-24:**
- **✅ COMPLETED PHASE 3: Status Tracking & Timing**
  - All 8 requirements satisfied (TS-01 through TS-08)
  - Created VERIFICATION.md documenting phase completion
  - UAT completed: 13/18 tests passed, 5 technical skipped, 0 issues
  - Updated ROADMAP.md: Phase 3 marked complete, 17/27 requirements (63%)
  - Updated STATE.md: Progress 63%, Phase 3 complete
- **Bonus: MyDayPage Layout Reorganization**
  - Right side: All recurring tasks (is_recurring = 1)
  - Left side: One-time tasks (is_recurring = 0) + Late tasks (is_late = true)
  - Clear visual separation for better task organization
  - Commits: a67670e (layout reorganization), 2f9aa33 (maxCount scope fix)

**2026-01-23 (continued):**
- **Completed 03-02-PLAN.md:** Backend Late Detection & Timing Status
  - Applied enrichTaskWithTiming to all 7 task API endpoints
  - All responses now include: estimated_end_time, is_late, minutes_remaining, timing_status
  - Completed tasks include: time_delta_minutes, time_delta_text (Hebrew)
  - Real-time Socket.IO broadcasts enriched with timing data
  - Late detection: minutesRemaining < 0
  - Near-deadline: minutesRemaining < 10
  - Enrichment pattern: after DB query, before response (keeps DB lean)
  - Duration: 4min 53sec
  - Requirements satisfied: TS-03 (status logic), TS-04 (auto late detection), TS-07 (time variance calculation)

**2026-01-23:**
- **Completed 03-01-PLAN.md:** Timing Infrastructure
  - Added estimated_duration_minutes (INTEGER DEFAULT 30) column to tasks table
  - Added completed_at (TIMESTAMP) column to tasks table
  - Modified taskConfirmation.js to save completion timestamp on worker finish
  - Created calculateEstimatedEnd(task) helper function in tasks.js
  - Added enrichTaskWithTiming and calculateTimeDelta helper functions
  - Duration: 92 seconds
  - Requirements satisfied: TS-01 (duration field), TS-02 (partial), TS-06 (completion timestamp)

**2026-01-20 (continued):**
- **Completed 02-01-PLAN.md:** Backend Image Upload & Notes Infrastructure
  - Added task_attachments table with id, task_id, file_path, file_type, uploaded_at columns
  - Added completion_note TEXT column to tasks table
  - Installed and configured multer for secure file uploads
  - Created POST /api/confirm/:token/complete endpoint accepting multipart/form-data
  - Image MIME type validation (jpeg, png, jpg only) with 5MB limit
  - Secure filename generation using crypto.randomBytes(16)
  - Token validation, expiration check, task ownership verification
  - Broadcasts task:updated event via Socket.IO after completion
  - Fixed static uploads path inconsistency (project root vs server subdirectory)
  - Duration: 3min 33sec
  - Requirements satisfied: TC-01 backend, TC-02 backend (partial)

**2026-01-20:**
- **✅ COMPLETED PHASE 1: Real-Time Infrastructure**
  - All 4 requirements satisfied (RT-01, RT-02, RT-03, RT-04)
  - RT-03 & RT-04: Infrastructure ready for images/notes (features in Phase 2)
  - Created VERIFICATION.md documenting phase completion
- **Completed 01-02-PLAN.md:** Client WebSocket Connection
  - Installed socket.io-client in React app
  - Implemented WebSocket connection in AppContext
  - Added real-time event listeners (task:created, task:updated, task:deleted)
  - Created connection status indicator in Sidebar ("מחובר" / "מנותק")
  - **Bug Fix:** Resolved circular dependency in server/routes/tasks.js using dependency injection
  - **Bug Fix:** Fixed DELETE route to send full task object instead of just ID
  - Verified real-time updates across multiple browser tabs
  - Duration: ~45 minutes
  - Requirements satisfied: RT-01 (WebSocket connection), RT-02 (Real-time task updates)

**2026-01-19:**
- Roadmap created with 4 phases derived from 27 v1 requirements
- Phase structure: Real-Time → Task Completion → Status Tracking → History
- Depth set to "quick" (3-5 phases, critical path)
- All requirements mapped to phases with 100% coverage
- **Completed 01-01-PLAN.md:** WebSocket Server Setup
  - Socket.IO 4.8.2 installed and integrated with Express
  - All task mutation endpoints broadcast real-time events (task:created, task:updated, task:deleted)
  - Duration: 3min 38sec
  - Commits: c7d099d (feat: Socket.IO setup), db30bbd (feat: broadcasting)

## Session Continuity

**Last session:** 2026-01-24
**Stopped at:** Completed 05-03-PLAN.md (Multilingual Interactive HTML Pages)
**Resume file:** None

**What happened this session:**
- Executed 05-03-PLAN.md (Multilingual Interactive HTML Pages)
- Replaced all hardcoded Hebrew in task-confirmation.html with 27 translation placeholders
- Updated htmlGenerator.js to integrate i18n service
- Query employee language via JOIN on task_confirmations table
- Use getFixedT for thread-safe language-locked translations
- Determine text direction: RTL for Hebrew/Arabic, LTR for English/Russian
- Added 12 new translation keys to all 4 language files
- Verified HTML generation for all languages (he, en, ru, ar)
- Verified fallback to Hebrew when language is NULL
- Verified RTL/LTR support in HTML and WhatsApp
- Created 05-03-SUMMARY.md documenting completion
- Updated STATE.md: Progress 89% (31/35 requirements), Phase 5 in progress
- 3 commits: 134e962 (template), 8441de7 (htmlGenerator), c988268 (RTL verification)

**What needs to happen next session:**
- **API Activation (user action):** Activate GEMINI_API_KEY in Google AI Studio to enable translation
- Execute Plan 05-05b: Translation UI Indicators in Manager Interface
- Verify Phase 5 completion with all 8 requirements

**Context to preserve:**
- **History UI complete:**
  - /history route with HistoryPage component
  - URL-based filters (shareable/bookmarkable): start, end, employee, system, location
  - Date range picker with Hebrew localization
  - Statistics dashboard: total completed, late count, on-time percentage
  - Task history table with completion details, notes, images
  - Image lightbox for viewing attachments
  - Responsive grid layouts (1-3 columns)
- **History API ready:**
  - GET /api/history with filters: startDate, endDate, employeeId, systemId, locationId
  - Returns: tasks[], pagination{}, stats{}
  - Default: last 7 days, limit 50, offset 0
  - Statistics: total_completed, total_late, on_time_percentage (decimal division)
  - Composite indexes: idx_tasks_history (performance < 100ms for 10k tasks)
  - WAL mode enabled for concurrent reads during writes
- **Data retention service:**
  - node-cron scheduled daily at 2:00 AM Israel time
  - Deletes completed tasks > 2 years old
  - Transaction-wrapped for atomicity
  - Manual trigger available: cleanupOldTasks()
- **Schema additions:**
  - systems.location_id (INTEGER REFERENCES locations) for location filtering
  - tasks.time_delta_minutes (INTEGER) for statistics (NULL = on-time)
- Backend infrastructure ready for image uploads and completion notes
- Upload endpoint: POST /api/confirm/:token/complete (multipart/form-data)
- Accepts fields: taskId (required), note (optional), image (optional file)
- Images stored in uploads/ directory with crypto-generated hex filenames
- Image paths in task_attachments table, notes in tasks.completion_note column
- 5MB file size limit, MIME type validation (jpeg, png, jpg only)
- **Timing infrastructure ready:**
  - tasks.estimated_duration_minutes (INTEGER DEFAULT 30)
  - tasks.completed_at (TIMESTAMP) - saved when worker finishes task
  - calculateEstimatedEnd(task) helper in tasks.js
  - enrichTaskWithTiming(task) helper for late detection
  - calculateTimeDelta(task) helper for completed task variance
  - **All task API endpoints enriched with timing data:**
    - Non-completed: estimated_end_time, is_late, minutes_remaining, timing_status
    - Completed: time_delta_minutes, time_delta_text (Hebrew)
  - Near-deadline threshold: 10 minutes
  - Late detection: past estimated end time
  - Socket.IO broadcasts include enriched timing fields
- Server has Socket.IO running on port 3002 (updated from 3001)
- Event naming convention: task:created, task:updated, task:deleted
- Event payloads include full task objects with system_name and employee_name
- Client connects automatically on AppContext mount
- Connection status tracked in state and displayed in Sidebar
- Dependency injection pattern used for Socket.IO in routes (setIo() function)
- All existing functionality continues to work (WhatsApp, task management, confirmation pages)
- Real-time updates verified working across multiple browser tabs
- Must stay with React + Node.js + SQLite (no tech changes)
- All UI must remain in Hebrew
- System is intentionally open (no authentication)

---

*State initialized: 2026-01-19*
*Last session: 2026-01-24*
