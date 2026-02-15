---
created: 2026-01-27T14:45
title: Employee task pagination with acknowledgment button
area: ui
files:
  - client/src/pages/TaskConfirmationPage.jsx
  - client/src/pages/SettingsPage.jsx
  - server/services/htmlGenerator.js
  - server/routes/taskConfirmation.js
---

## Problem

כשיש לעובד הרבה משימות, הדף האינטראקטיבי נהיה עמוס ומבלבל. צריך:

1. **כפתור "קיבלתי"** - העובד לוחץ עליו כאישור שקיבל את המשימות (עם אייקון 👍)
   - רק אחרי לחיצה על "קיבלתי" העובד יכול לסמן משימות
   - מחליף את ה-acknowledge הנוכחי

2. **הגבלת משימות בדף** - פרמטר חדש בהגדרות: "מספר משימות בהודעה"
   - ברירת מחדל: 3
   - העובד רואה רק N משימות בכל רגע נתון
   - כשמשימה מושלמת ונשלחת לאישור → נעלמת מהדף → נכנסת המשימה הבאה
   - תמיד נשארות מקסימום N משימות פעילות בדף

**דוגמה:**
- עובד מקבל 10 משימות
- מוצגות רק 3 ראשונות
- עובד מסיים משימה 1 → נעלמת → מוצגת משימה 4
- עובד תמיד רואה 3 משימות (או פחות אם נגמרו)

## Solution

1. **Settings Page:**
   - הוסף שדה `tasks_per_employee_page` (ברירת מחדל 3)
   - שמור ב-settings table

2. **TaskConfirmationPage:**
   - הוסף state: `acknowledgedAt`, `visibleTaskIds`
   - כפתור "קיבלתי" גדול עם 👍 במקום הקיים
   - הצג רק N משימות לפי ההגדרה
   - בהשלמת משימה - הסר ממוצגות והוסף הבאה בתור

3. **Server side:**
   - API לקריאת ההגדרה
   - לוגיקה לניהול תור המשימות

**Production only** - הפיצ'ר רלוונטי רק לפרודקשן (בסביבת TEST אפשר להשאיר את כל המשימות גלויות)
