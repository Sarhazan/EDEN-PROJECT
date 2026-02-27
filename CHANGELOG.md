# Changelog

## 2026-02-27 — Stable Release (end-of-day + employee calendar)

### Added
- מנגנון סוף יום אוטומטי למשימות (`taskAutoClose`) לפי `workday_end_time`.
- סטטוס חדש `not_completed` ("לא בוצע") ב-DB, שרת ו-UI.
- לייבל חזותי "לא בוצע" בכרטיסי משימה.
- קונטיינר "לא בוצע" בכרטיס עובד (Employees Page).
- יומן עובד חדש בכרטיס עובד (מודאל):
  - תצוגות יום / שבוע / חודש
  - Drag & Drop לשינוי תאריך/שעה
  - צבע לפי סטטוס
  - עריכת משימה בלחיצה
  - יצירה מהיומן דרך QuickTaskModal עם prefill של תאריך/שעה/עובד

### Changed
- `MyDay` → משימות חד-פעמיות ב"משימות מנהל" נשארות גלויות גם אחרי שיוך לעובד אחר.
- `MyDay` → משימות `not_completed` נשארות מוצגות באותו יום (לא נגררות ליום הבא).
- שינוי שעת סוף יום בהגדרות מפעיל בדיקה מיידית של auto-close.
- לוגיקת סוף יום עודכנה לריצה גם אחרי השעה (לא רק בדקה המדויקת).
- יצירת משימות אחרי סוף יום מסמנת `not_completed` בהתאם ללוגיקה.

### Fixed
- חסימת תאריך עבר במשימות חוזרות (UI + server-side validation).
- תיקוני datepicker (פתיחה תקינה + מניעת הקלדת תאריך עבר).
- תיקוני RTL במוד שבועי ביומן עובד (overflow / separators).
- הסרת גלילה אופקית במוד יום/שבוע ביומן עובד.

### Internal
- עודכנו סטטיסטיקות active/history כך ש-`not_completed` לא ייספר כ-active.
- סדרת תיקוני schema/migration לסטטוס החדש.

### Release refs
- Range: `619f328` → `21793f6`
- Branch: `master`
- Remote: `origin/master`
