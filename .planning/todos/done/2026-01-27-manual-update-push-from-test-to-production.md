---
created: 2026-01-27T21:15
title: Manual update push from TEST to PRODUCTION
area: ui
files:
  - client/src/hooks/useVersionCheck.js
  - client/src/components/layout/Sidebar.jsx
  - client/src/components/layout/MobileDrawer.jsx
  - server/routes/api.js (or new route)
---

## Problem

כרגע כפתור "עדכון זמין" מופעל אוטומטית כשהגרסה משתנה - זה בעייתי כי:
1. ב-PRODUCTION - הכפתור דולק כל הזמן (גרסה חדשה = כפתור דולק מיד)
2. אין שליטה מתי המשתמש רואה את ההתראה

המשתמש רוצה שליטה ידנית:
- **EDEN-PRODUCTION**: כפתור "עדכון זמין" כבוי באופן קבוע, נדלק רק כשנשלח עדכון מ-TEST
- **EDEN-TEST**: כפתור "שלח עדכון" שמפעיל את ההתראה ב-PRODUCTION

## Solution

1. **הפרדת סביבות** - environment variable (VITE_ENV=test/production)

2. **PRODUCTION behavior:**
   - לא לבדוק version.json אוטומטית
   - להאזין ל-Socket.IO event: `update:available`
   - כשמגיע event → הדלק כפתור מהבהב

3. **TEST behavior:**
   - הוסף כפתור "שלח עדכון" (רק ב-TEST)
   - לחיצה → emit Socket.IO event ל-PRODUCTION
   - או: קריאת API שמעדכנת flag בשרת

4. **שרת:**
   - endpoint: POST /api/push-update
   - שולח Socket.IO broadcast לכל החיבורים
   - או: שומר flag ב-DB שהלקוחות בודקים

5. **אפשרות פשוטה יותר:**
   - שני version.json files: version.json (לבדיקה) ו-production-version.json (לעדכון)
   - TEST עורך את production-version.json
   - PRODUCTION בודק רק את production-version.json
