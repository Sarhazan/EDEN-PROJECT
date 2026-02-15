---
phase: 05-multi-language-support
plan: 02
subsystem: employee-management
tags: [database, schema, employees, language, i18n, crud, ui]

# Dependency graph
requires:
  - phase: 02-enhanced-task-completion
    plan: 01
    provides: Task completion infrastructure
provides:
  - Employee language preference stored in database
  - Manager UI for configuring employee language
  - Language field included in bulk WhatsApp send payload
affects: [whatsapp-messages, interactive-pages, translations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Database CHECK constraint for language validation
    - ISO 639-1 language codes (he, en, ru, ar)
    - Flag emoji display in employee cards
    - Language preference in form state management

key-files:
  created: []
  modified:
    - server/database/schema.js
    - server/routes/employees.js
    - client/src/components/forms/EmployeeForm.jsx
    - client/src/pages/EmployeesPage.jsx
    - client/src/pages/MyDayPage.jsx

key-decisions:
  - "ISO 639-1 language codes for standard compliance (he, en, ru, ar)"
  - "DEFAULT 'he' for backward compatibility with existing employees"
  - "CHECK constraint at database level for data integrity"
  - "Server-side validation in API routes for early error detection"
  - "Flag emojis for visual language identification in UI"
  - "Language included in bulk send payload for future translation"

patterns-established:
  - "Database migration pattern: ALTER TABLE with try/catch for idempotency"
  - "Language field propagated through entire stack: DB → API → UI → WhatsApp"
  - "Dropdown selector pattern for language preference"
  - "Fallback to 'he' when language not specified"

# Metrics
duration: 3min 53sec
completed: 2026-01-24
---

# Phase 5 Plan 2: Employee Language Preference Summary

**Foundation for multilingual communication - employee language preference stored in database and configurable in manager UI**

## Performance

- **Duration:** 3 min 53 sec
- **Started:** 2026-01-24T20:53:39Z
- **Completed:** 2026-01-24T20:57:32Z
- **Tasks:** 3
- **Files created:** 0
- **Files modified:** 5
- **Commits:** 3

## Accomplishments

- Added language column to employees table with CHECK constraint
- Updated employee CRUD endpoints to accept and validate language field
- Added language dropdown to employee creation/editing form
- Display employee language with flag emojis in employee list
- Include employee language in bulk WhatsApp send request payload
- All changes maintain backward compatibility (default to Hebrew)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add language column to employees table** - `34cb393` (feat)
   - Added language column with TEXT type, DEFAULT 'he'
   - CHECK constraint ensures only valid codes: he, en, ru, ar
   - Migration placed after completed_at migration
   - ISO 639-1 language codes: he (Hebrew), en (English), ru (Russian), ar (Arabic)

2. **Task 2: Update employee API routes to handle language** - `f5a8338` (feat)
   - POST /api/employees accepts language field and validates against allowed codes
   - PUT /api/employees updates language field with validation
   - Default language is 'he' if not provided
   - Validation rejects invalid language codes with Hebrew error message
   - GET endpoints automatically return language field via SELECT *

3. **Task 3: Add language selector to manager UI and include in bulk send** - `221c7e3` (feat)
   - EmployeeForm: Added language dropdown with 4 options (he, en, ru, ar)
   - EmployeeForm: Added language to formData state and useEffect initialization
   - EmployeesPage: Display employee language with flag emojis (🇮🇱 🇬🇧 🇷🇺 🇸🇦)
   - MyDayPage: Include employee.language in tasksByEmployee payload for bulk send
   - Language field included in form submission to API
   - Help text explains language usage for WhatsApp messages and interactive pages

## Files Created/Modified

### Modified
- `server/database/schema.js` - Added language column migration to employees table
- `server/routes/employees.js` - Added language field to POST/PUT endpoints with validation
- `client/src/components/forms/EmployeeForm.jsx` - Added language dropdown and form state
- `client/src/pages/EmployeesPage.jsx` - Added language display with flag emojis
- `client/src/pages/MyDayPage.jsx` - Include employee.language in bulk send payload

## Decisions Made

1. **ISO 639-1 Language Codes**
   - Rationale: Standard two-letter codes for international compatibility
   - Codes: he (Hebrew), en (English), ru (Russian), ar (Arabic)
   - Benefit: Compatible with i18n libraries, translation APIs, browser standards

2. **Database CHECK Constraint**
   - Rationale: Data integrity at lowest level - prevents invalid languages from ever being stored
   - Implementation: `CHECK(language IN ('he', 'en', 'ru', 'ar'))`
   - Benefit: Database rejects invalid data even if API validation bypassed

3. **DEFAULT 'he' for Backward Compatibility**
   - Rationale: Existing employees and new employees without specified language default to Hebrew
   - Implementation: `DEFAULT 'he'` in column definition
   - Benefit: No data migration needed for existing employees, system continues to work

4. **Server-Side Validation in API Routes**
   - Rationale: Early error detection with clear Hebrew error messages for manager
   - Implementation: Validate language in POST/PUT before database operation
   - Benefit: Better UX than raw database error, fail fast before database call

5. **Flag Emojis for Visual Identification**
   - Rationale: Manager quickly identifies employee language preference without reading text
   - Implementation: 🇮🇱 עברית, 🇬🇧 English, 🇷🇺 Русский, 🇸🇦 العربية
   - Benefit: Visual scanning faster than reading, works across languages

6. **Language Included in Bulk Send Payload**
   - Rationale: Foundation for future translation - WhatsApp service will receive employee.language
   - Implementation: Added to tasksByEmployee[id].language in MyDayPage
   - Benefit: No API changes needed when implementing translation

## Deviations from Plan

None - plan executed exactly as written. All components implemented per specification.

## Database Schema

### employees Table (Updated)

```sql
CREATE TABLE employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  position TEXT,
  language TEXT DEFAULT 'he' CHECK(language IN ('he', 'en', 'ru', 'ar')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Language Codes

| Code | Language | Native Name | Flag |
|------|----------|-------------|------|
| he   | Hebrew   | עברית       | 🇮🇱   |
| en   | English  | English     | 🇬🇧   |
| ru   | Russian  | Русский     | 🇷🇺   |
| ar   | Arabic   | العربية     | 🇸🇦   |

## API Changes

### POST /api/employees

**Request:**
```json
{
  "name": "John Smith",
  "phone": "0501234567",
  "position": "Technician",
  "language": "en"
}
```

**Response:**
```json
{
  "id": 10,
  "name": "John Smith",
  "phone": "0501234567",
  "position": "Technician",
  "language": "en",
  "created_at": "2026-01-24 20:55:00"
}
```

**Validation:**
- Invalid language → `400 Bad Request: "שפה לא חוקית. בחר: he, en, ru, ar"`
- No language → Defaults to "he"

### PUT /api/employees/:id

**Request:**
```json
{
  "name": "John Smith",
  "phone": "0501234567",
  "position": "Senior Technician",
  "language": "ru"
}
```

**Response:**
```json
{
  "id": 10,
  "name": "John Smith",
  "phone": "0501234567",
  "position": "Senior Technician",
  "language": "ru",
  "created_at": "2026-01-24 20:55:00"
}
```

**Validation:**
- Same as POST endpoint
- Invalid language rejected with Hebrew error message

### GET /api/employees

**Response:**
```json
[
  {
    "id": 1,
    "name": "יוסי כהן",
    "phone": "0501111111",
    "position": "טכנאי",
    "language": "he",
    "created_at": "2026-01-20 10:00:00",
    "active_tasks_count": 5
  },
  {
    "id": 10,
    "name": "John Smith",
    "phone": "0501234567",
    "position": "Senior Technician",
    "language": "en",
    "created_at": "2026-01-24 20:55:00",
    "active_tasks_count": 0
  }
]
```

## UI Changes

### Employee Form

**Before:**
```
┌─────────────────────┐
│ שם העובד *          │
│ ┌─────────────────┐ │
│ │                 │ │
│ └─────────────────┘ │
│ טלפון               │
│ ┌─────────────────┐ │
│ │                 │ │
│ └─────────────────┘ │
│ תפקיד               │
│ ┌─────────────────┐ │
│ │                 │ │
│ └─────────────────┘ │
│ [ביטול]  [צור עובד] │
└─────────────────────┘
```

**After:**
```
┌─────────────────────┐
│ שם העובד *          │
│ ┌─────────────────┐ │
│ │                 │ │
│ └─────────────────┘ │
│ טלפון               │
│ ┌─────────────────┐ │
│ │                 │ │
│ └─────────────────┘ │
│ תפקיד               │
│ ┌─────────────────┐ │
│ │                 │ │
│ └─────────────────┘ │
│ שפה                 │
│ ┌─────────────────┐ │
│ │ עברית (Hebrew) ▼│ │ ← NEW DROPDOWN
│ └─────────────────┘ │
│ השפה שבה העובד     │
│ יקבל הודעות ודפים  │
│ אינטראקטיביים      │
│ [ביטול]  [צור עובד] │
└─────────────────────┘
```

### Dropdown Options

```
┌───────────────────────┐
│ עברית (Hebrew)        │ ← Selected by default
├───────────────────────┤
│ English               │
├───────────────────────┤
│ Русский (Russian)     │
├───────────────────────┤
│ العربية (Arabic)      │
└───────────────────────┘
```

### Employee Card Display

**Before:**
```
┌────────────────────────────┐
│ 👤  [Edit] [Delete]         │
│                             │
│ יוסי כהן                    │
│ טכנאי                       │
│ 📞 0501111111              │
│                             │
│ משימות פעילות: 5           │
└────────────────────────────┘
```

**After:**
```
┌────────────────────────────┐
│ 👤  [Edit] [Delete]         │
│                             │
│ יוסי כהן                    │
│ טכנאי                       │
│ 📞 0501111111              │
│ שפה: 🇮🇱 עברית             │ ← NEW LANGUAGE DISPLAY
│                             │
│ משימות פעילות: 5           │
└────────────────────────────┘
```

## Bulk Send Integration

### MyDayPage tasksByEmployee Payload

**Before:**
```javascript
tasksByEmployee[employeeId] = {
  phone: employee.phone,
  name: employee.name,
  tasks: [...],
  date: '24/01/2026'
};
```

**After:**
```javascript
tasksByEmployee[employeeId] = {
  phone: employee.phone,
  name: employee.name,
  tasks: [...],
  date: '24/01/2026',
  language: employee.language || 'he'  // ← NEW FIELD
};
```

### POST /api/whatsapp/send-bulk

**Request body now includes language:**
```json
{
  "tasksByEmployee": {
    "1": {
      "phone": "0501111111",
      "name": "יוסי כהן",
      "tasks": [...],
      "date": "24/01/2026",
      "language": "he"
    },
    "10": {
      "phone": "0501234567",
      "name": "John Smith",
      "tasks": [...],
      "date": "24/01/2026",
      "language": "en"
    }
  }
}
```

## Testing Scenarios

### Database Level

1. **Default language for new employee**
   ```sql
   INSERT INTO employees (name, phone) VALUES ('Test', '0500000000');
   SELECT language FROM employees WHERE name = 'Test';
   -- Result: 'he'
   ```

2. **CHECK constraint validation**
   ```sql
   INSERT INTO employees (name, language) VALUES ('Invalid', 'fr');
   -- Error: CHECK constraint failed: language IN ('he', 'en', 'ru', 'ar')
   ```

3. **Valid language codes accepted**
   ```sql
   INSERT INTO employees (name, language) VALUES ('English', 'en');
   INSERT INTO employees (name, language) VALUES ('Russian', 'ru');
   INSERT INTO employees (name, language) VALUES ('Arabic', 'ar');
   -- All succeed
   ```

### API Level

1. **Create employee with English**
   ```bash
   curl -X POST http://localhost:3002/api/employees \
     -H "Content-Type: application/json" \
     -d '{"name":"English Speaker","phone":"0501234567","language":"en"}'
   # Response: {"id":10,"name":"English Speaker","language":"en",...}
   ```

2. **Invalid language rejected**
   ```bash
   curl -X POST http://localhost:3002/api/employees \
     -H "Content-Type: application/json" \
     -d '{"name":"Invalid","language":"fr"}'
   # Response: 400 {"error":"שפה לא חוקית. בחר: he, en, ru, ar"}
   ```

3. **Update employee language**
   ```bash
   curl -X PUT http://localhost:3002/api/employees/10 \
     -H "Content-Type: application/json" \
     -d '{"name":"English Speaker","language":"ru"}'
   # Response: {"id":10,"name":"English Speaker","language":"ru",...}
   ```

### UI Level

1. **Create employee with Russian**
   - Navigate to Employees page
   - Click "הוסף עובד"
   - Fill name, phone, position
   - Select "Русский (Russian)" from dropdown
   - Click "צור עובד"
   - ✅ Employee card shows "שפה: 🇷🇺 Русский"

2. **Edit employee language**
   - Click Edit on existing employee
   - Change dropdown from "עברית (Hebrew)" to "English"
   - Click "עדכן עובד"
   - ✅ Employee card updates to "שפה: 🇬🇧 English"

3. **Language included in bulk send**
   - Navigate to My Day page
   - Select tasks for multiple employees (different languages)
   - Click "שלח הכל"
   - Open browser DevTools Network tab
   - ✅ POST /send-bulk request includes language field for each employee

## Requirements Satisfied

From ROADMAP.md Phase 5:

- ✅ **MLS-01:** Employee language preference stored in database (he/en/ru/ar)
- ✅ **MLS-02:** Manager can select employee language in UI dropdown
- ✅ **MLS-03:** Language preference persists across edits
- ✅ **MLS-04:** Default language is Hebrew for backward compatibility
- ✅ **MLS-05:** Language included in bulk WhatsApp send payload

## Next Phase Readiness

**Ready for:**
- 05-03: Translation of WhatsApp messages based on employee.language
- 05-04: Translation of interactive task confirmation pages
- 05-05: Auto-translation of worker notes from employee language to Hebrew

**Provides:**
- Employee language preference infrastructure
- Manager UI for language configuration
- Language data flow through entire stack (DB → API → UI → WhatsApp)

**Foundation established:**
- Language codes standardized (ISO 639-1)
- Database validation ensures data integrity
- API endpoints handle language field
- UI displays and captures language preference
- Bulk send includes language for future translation

**No blockers** - Employee language preference complete and integrated throughout system

---
*Phase: 05-multi-language-support*
*Completed: 2026-01-24*
