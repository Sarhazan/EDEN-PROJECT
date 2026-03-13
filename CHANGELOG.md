# CHANGELOG — EDEN Maintenance System

כל גרסה שעולה לפרודקשן מתועדת כאן.
פורמט: `vMAJOR.MINOR.PATCH — YYYY-MM-DD`

---

## v1.1.0 — 2026-03-13

### ✨ פיצ'רים חדשים
- **דיאלוג scope לגרירת משימה חוזרת** — בחירה "משימה זו בלבד" / "כל המשימות" + סיכום שינוי (תאריך/שעה ישן → חדש)
- **דיאלוג scope לשינוי משך זמן** — אותו דיאלוג כשגוררים תחתית המשימה, עם סיכום "30 דק׳ → 45 דק׳"
- **שינוי תדירות (weekly→monthly)** — מוחק ישנות, יוצר חדשות; scope=all עם דיאלוג
- **חסימת חפיפה** — גרירה לשעה תפוסה: ghost אדום + toast "יש חפיפה" + חסימת שמירה
- **ברירת מחדל "חוזרת"** — יצירת משימה מיומן נפתחת במצב "חוזרת" במקום "חד פעמי"
- **שעת ברירת מחדל** — dropdown שעה נפתח תמיד מהשעה הנוכחית מעוגלת
- **TimePicker מותאם** — תמיד נפתח כלפי מטה, גולל לשעה הנבחרת

### 🐛 תיקוני באגים
- **frequency change root cause** — UPDATE רץ לפני DELETE שגרם לתיקון חלקי; תוקן ע"י חישוב `frequencyChanged` לפני ה-UPDATE
- **תיקון date compare בconflict detection** — השוואת string ישירה ללא המרת Date

### ⚡ שיפורי ביצועים
- **Index חדש בDB** — `idx_tasks_recurring_series` על `(employee_id, start_time, frequency, start_date)` לשאילתות scope=all

### 🎨 UI / UX
- **Spinner component** — `<Spinner>` + `<LoadingSection>` לשימוש אחיד בכל המסכים
- **כפתורי שמירה** — spinner + disabled בזמן שמירה (TaskForm, QuickTaskModal)
- **Loading states** — כל "טוען..." הוחלף ב-spinner מונפש (Dashboard, Dispatch, History, Locations, Forms, Lists)

### 🏗️ תשתית
- **Error handling אחיד** — `server/middleware/errorHandler.js` + `client/src/utils/apiError.js`; כל `alert()` הוחלף ב-`toast.error()`
- **API Test Suite** — `server/tests/runner.js`: 6 בדיקות, 21 assertions (Create, Update, Scope=All, Frequency Change, Past Protection, Delete)
- **restart-server.ps1** — סקריפט בטוח לאתחול שרת EDEN בלבד (לא הורג Gateway)

---

## v1.0.0 — 2026-03-01

גרסה ראשונה בפרודקשן.
- יומן עובדים עם גרירה
- משימות חוזרות
- שליחת WhatsApp
- דשבורד HQ
