# Requirements: Eden - מערכת ניהול אחזקת מבנים

**Defined:** 2026-01-19
**Core Value:** מנהל המבנה רואה בזמן אמת מה קורה בשטח - איזה משימה הושלמה, מי עושה מה, ומה מתעכב

## v1 Requirements

### Real-Time Updates

- [x] **RT-01**: WebSocket connection בין שרת ללקוח
- [x] **RT-02**: עדכון מיידי במסך המנהל כשעובד מסמן משימה כהושלמה
- [x] **RT-03**: עדכון מיידי במסך המנהל כשעובד מעלה תמונה
- [x] **RT-04**: עדכון מיידי במסך המנהל כשעובד מוסיף הערה

### Task Completion

- [x] **TC-01**: עובד יכול להעלות תמונה מהדף האינטראקטיבי (mobile/desktop)
- [x] **TC-02**: עובד יכול להוסיף הערת טקסט חופשית למשימה
- [x] **TC-03**: תמונות נשמרות כקבצים בשרת (תחת `/uploads` או דומה)
- [x] **TC-04**: מנהל רואה תמונות והערות שצורפו למשימה בממשק הניהול
- [x] **TC-05**: תמונות מוצגות כתצוגה מקדימה עם אפשרות הגדלה

### Task Status & Timing

- [x] **TS-01**: כל משימה כוללת הערכת זמן ביצוע (estimated_duration_minutes)
- [x] **TS-02**: חישוב זמן סיום מוערך (scheduled_time + estimated_duration)
- [x] **TS-03**: סטטוסים מפורשים: `pending`, `sent`, `in_progress`, `completed`, `late`
- [x] **TS-04**: משימה מסומנת אוטומטית כ-`late` רק אף עבר הזמן המוערך לסיום והיא לא הושלמה
- [x] **TS-05**: משימות מאוחרות מוצגות בצבע אדום בממשק המנהל
- [x] **TS-06**: שמירת timestamp מדויק של מתי משימה הושלמה בפועל (`completed_at`)
- [x] **TS-07**: חישוב פער הזמן בין הזמן המוערך לזמן ההשלמה בפועל
- [x] **TS-08**: תצוגה ויזואלית של זמן שנותר/חריגה (כמה דקות נותרו או כמה דקות באיחור)

### History & Archive

- [x] **HA-01**: משימות שהושלמו נשמרות במסד הנתונים למשך 2 שנים
- [x] **HA-02**: עמוד היסטוריה מציג משימות שהושלמו בעבר
- [x] **HA-03**: סינון היסטוריה לפי תאריך (טווח תאריכים)
- [x] **HA-04**: סינון היסטוריה לפי עובד
- [x] **HA-05**: סינון היסטוריה לפי מערכת
- [x] **HA-06**: סינון היסטוריה לפי מיקום
- [x] **HA-07**: סטטיסטיקות בסיסיות: כמה משימות הושלמו, כמה מאוחרות, אחוז הצלחה
- [x] **HA-08**: ניקוי אוטומטי של משימות ישנות מ-2 שנים (cron job או scheduled task)

### Multi-Language Support

- [x] **ML-01**: הוספת שדה `language` לטבלת employees (עברית/אנגלית/רוסית/ערבית)
- [x] **ML-02**: מנהל יכול לבחור שפת עובד בממשק ניהול העובדים
- [x] **ML-03**: הודעות WhatsApp נשלחות בשפת העובד (תרגום דינמי)
- [x] **ML-04**: דפי אישור אינטראקטיביים מוצגים בשפת העובד
- [x] **ML-05**: כפתורים, תוויות, והודעות בדף האינטראקטיבי מתורגמים אוטומטית
- [x] **ML-06**: הערות שעובד כותב בשפתו מתורגמות לעברית למנהל
- [x] **ML-07**: ממשק המנהל תמיד בעברית עם תרגום אוטומטי להערות מעובדים
- [x] **ML-08**: תמיכה ב-RTL (Right-to-Left) לעברית וערבית, LTR לאנגלית ורוסית

## v2 Requirements

דרישות שנדחו לגרסה הבאה:

- **RT-05**: התחברות מחדש אוטומטית ל-WebSocket במקרה של ניתוק - ייעשה בשלב מאוחר יותר
- **TC-06**: העלאת מספר תמונות למשימה אחת - כרגע תמונה אחת מספיקה
- **TS-09**: התרעות למנהל על משימות מאוחרות - לא בשלב ראשון
- **HA-09**: ייצוא דוחות ל-Excel/PDF - לא בשלב ראשון

## Out of Scope

דרישות שלא ייבנו בכוונה:

| Feature | Reason |
|---------|--------|
| אימות משתמשים (login/password) | המערכת פתוחה בכוונה - דפים אינטראקטיביים נגישים לכל מי שיש לו את הקישור |
| אפליקציית מובייל נפרדת | הדפים האינטראקטיביים כבר מותאמים למובייל דרך דפדפן |
| שילוב עם מערכות חיצוניות | לא רלוונטי בשלב הזה |
| דיווחים מתקדמים וגרפים | רק סטטיסטיקות בסיסיות בשלב ראשון |
| תזכורות אוטומטיות לעובדים | לא צריך - העובדים מקבלים את המשימות ב-WhatsApp |
| ניהול הרשאות ותפקידים | כולם רואים הכל |

## Traceability

מיפוי בין דרישות לפאזות:

| Requirement | Phase | Status |
|-------------|-------|--------|
| RT-01 | Phase 1 | Complete |
| RT-02 | Phase 1 | Complete |
| RT-03 | Phase 1 | Complete |
| RT-04 | Phase 1 | Complete |
| TC-01 | Phase 2 | Complete |
| TC-02 | Phase 2 | Complete |
| TC-03 | Phase 2 | Complete |
| TC-04 | Phase 2 | Complete |
| TC-05 | Phase 2 | Complete |
| TS-01 | Phase 3 | Complete |
| TS-02 | Phase 3 | Complete |
| TS-03 | Phase 3 | Complete |
| TS-04 | Phase 3 | Complete |
| TS-05 | Phase 3 | Complete |
| TS-06 | Phase 3 | Complete |
| TS-07 | Phase 3 | Complete |
| TS-08 | Phase 3 | Complete |
| HA-01 | Phase 4 | Complete |
| HA-02 | Phase 4 | Complete |
| HA-03 | Phase 4 | Complete |
| HA-04 | Phase 4 | Complete |
| HA-05 | Phase 4 | Complete |
| HA-06 | Phase 4 | Complete |
| HA-07 | Phase 4 | Complete |
| HA-08 | Phase 4 | Complete |
| ML-01 | Phase 5 | Complete |
| ML-02 | Phase 5 | Complete |
| ML-03 | Phase 5 | Complete |
| ML-04 | Phase 5 | Complete |
| ML-05 | Phase 5 | Complete |
| ML-06 | Phase 5 | Complete |
| ML-07 | Phase 5 | Complete |
| ML-08 | Phase 5 | Complete |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35 (100%)
- Completed: 35 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-01-19*
*Last updated: 2026-01-25 after Phase 5 completion*
