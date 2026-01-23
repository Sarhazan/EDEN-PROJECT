# Roadmap: Eden - מערכת ניהול אחזקת מבנים

**Created:** 2026-01-19
**Depth:** quick
**Phases:** 4
**Total Requirements:** 27

## Overview

המערכת הקיימת כוללת ניהול משימות חוזרות, שליחת משימות דרך WhatsApp, ודפי אישור אינטראקטיביים. הרודמאפ הזה מוסיף עדכונים בזמן אמת, העלאת תמונות והערות, מעקב אחר זמני ביצוע וסטטוסים, והיסטוריית משימות. כל פאזה מספקת ערך עצמאי - המנהל רואה שיפור הדרגתי ביכולת לעקוב ולנהל את העבודה בשטח.

## Phases

### Phase 1: Real-Time Infrastructure

**Goal:** המנהל רואה מיד בממשק כל שינוי שעובד מבצע בדף האינטראקטיבי

**Dependencies:** None (foundation phase)

**Requirements:**
- RT-01: WebSocket connection בין שרת ללקוח
- RT-02: עדכון מיידי במסך המנהל כשעובד מסמן משימה כהושלמה
- RT-03: עדכון מיידי במסך המנהל כשעובד מעלה תמונה
- RT-04: עדכון מיידי במסך המנהל כשעובד מוסיף הערה

**Success Criteria:**
1. מנהל פותח את הממשק ורואה "מחובר" בסטטוס החיבור
2. עובד מסמן משימה כהושלמה בדף האינטראקטיבי - מנהל רואה שינוי תוך שנייה בלי לרענן דף
3. חיבור WebSocket נשאר יציב במשך שעה ללא ניתוקים
4. מנהל יכול לפתוח את הממשק במספר טאבים - כל הטאבים מעודכנים בו-זמנית

**Estimated Effort:** Medium (WebSocket setup, client/server integration)

**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md — Server WebSocket setup and task broadcasting ✅ (RT-01)
- [x] 01-02-PLAN.md — Client WebSocket integration and real-time listeners ✅ (RT-01, RT-02)

---

### Phase 2: Enhanced Task Completion ✅

**Goal:** עובד יכול לצרף תמונות והערות למשימה, ומנהל רואה אותם מיד בממשק

**Dependencies:** Phase 1 (needs WebSocket for real-time updates)

**Requirements:**
- TC-01: ✅ עובד יכול להעלות תמונה מהדף האינטראקטיבי (mobile/desktop)
- TC-02: ✅ עובד יכול להוסיף הערת טקסט חופשית למשימה
- TC-03: ✅ תמונות נשמרות כקבצים בשרת (תחת `/uploads` או דומה)
- TC-04: ✅ מנהל רואה תמונות והערות שצורפו למשימה בממשק הניהול
- TC-05: ✅ תמונות מוצגות כתצוגה מקדימה עם אפשרות הגדלה

**Success Criteria:**
1. ✅ עובד מצלם תמונה בנייד מהדף האינטראקטיבי - תמונה נשלחת לשרת ומנהל רואה אותה מיד
2. ✅ עובד כותב הערה "מצאתי נזילה" - מנהל רואה את ההערה בממשק תוך שנייה
3. ✅ מנהל לוחץ על תמונה קטנה - תמונה נפתחת בגדול במודל או טאב חדש
4. ✅ תמונות נשמרות בתיקיית `/uploads` בשרת עם שמות ייחודיים
5. ✅ עובד מוסיף הערה ותמונה לאותה משימה - מנהל רואה את שניהם בכרטיס המשימה

**Estimated Effort:** Medium-High (file upload, storage, UI for media display)

**Plans:** 2 plans

Plans:
- [x] 02-01-PLAN.md — Backend infrastructure for image uploads and notes ✅
- [x] 02-02-PLAN.md — Frontend upload form and display UI with real-time updates ✅

---

### Phase 3: Status Tracking & Timing

**Goal:** מנהל רואה בבירור מה מאחר, מה בזמן, וכמה זמן נשאר/חרג לכל משימה

**Dependencies:** Phase 2 (needs completion flow with images/notes)

**Requirements:**
- TS-01: כל משימה כוללת הערכת זמן ביצוע (estimated_duration_minutes)
- TS-02: חישוב זמן סיום מוערך (scheduled_time + estimated_duration)
- TS-03: סטטוסים מפורשים: `pending`, `sent`, `in_progress`, `completed`, `late`
- TS-04: משימה מסומנת אוטומטית כ-`late` רק אם עבר הזמן המוערך לסיום והיא לא הושלמה
- TS-05: משימות מאוחרות מוצגות בצבע אדום בממשק המנהל
- TS-06: שמירת timestamp מדויק של מתי משימה הושלמה בפועל (`completed_at`)
- TS-07: חישוב פער הזמן בין הזמן המוערך לזמן ההשלמה בפועל
- TS-08: תצוגה ויזואלית של זמן שנותר/חריגה (כמה דקות נותרו או כמה דקות באיחור)

**Success Criteria:**
1. מנהל יוצר משימה עם זמן התחלה 08:00 ומשך מוערך 30 דקות - בממשק רואים "סיום מוערך: 08:30"
2. השעה 08:31 והעובד עדיין לא סיים - כרטיס המשימה הופך אדום ורשום "באיחור 1 דקות"
3. עובד מסיים משימה ב-08:35 - מנהל רואה "הושלם ב-08:35 (איחור של 5 דקות)"
4. בממשק היום מנהל רואה 3 משימות ירוקות (בזמן), 2 אדומות (באיחור), 1 כתומה (בביצוע קרוב לסיום)
5. משימה שהושלמה לפני הזמן (08:20) מציגה "הושלם מוקדם ב-10 דקות"

**Estimated Effort:** Medium (DB schema updates, status logic, UI indicators)

**Plans:** 0 plans

Plans:
- [ ] TBD (created by /gsd:plan-phase 3)

---

### Phase 4: History & Archive

**Goal:** מנהל יכול לחפש ולצפות במשימות שהושלמו בעבר עד 2 שנים אחורה

**Dependencies:** Phase 3 (needs full completion data with timing)

**Requirements:**
- HA-01: משימות שהושלמו נשמרות במסד הנתונים למשך 2 שנים
- HA-02: עמוד היסטוריה מציג משימות שהושלמו בעבר
- HA-03: סינון היסטוריה לפי תאריך (טווח תאריכים)
- HA-04: סינון היסטוריה לפי עובד
- HA-05: סינון היסטוריה לפי מערכת
- HA-06: סינון היסטוריה לפי מיקום
- HA-07: סטטיסטיקות בסיסיות: כמה משימות הושלמו, כמה מאוחרות, אחוז הצלחה
- HA-08: ניקוי אוטומטי של משימות ישנות מ-2 שנים (cron job או scheduled task)

**Success Criteria:**
1. מנהל נכנס לעמוד "היסטוריה" ורואה רשימת משימות שהושלמו בשבוע האחרון
2. מנהל בוחר טווח תאריכים 01/01/2025 - 31/01/2025 - רואה רק משימות שהושלמו בינואר
3. מנהל מסנן לפי עובד ספציפי - רואה רק משימות של אותו עובד
4. בראש עמוד ההיסטוריה רשום: "102 משימות הושלמו, 12 באיחור (88% בזמן)"
5. משימה מ-15/01/2024 (2 שנים + יום) נמחקת אוטומטית מהמסד נתונים
6. מנהל מחפש משימה לפי מערכת "מיזוג אוויר" ומיקום "קומה 3" - רואה רק משימות מתאימות

**Estimated Effort:** Medium (archive table, filters, cleanup job, stats calculations)

**Plans:** 0 plans

Plans:
- [ ] TBD (created by /gsd:plan-phase 4)

---

## Progress

| Phase | Status | Requirements | Completed |
|-------|--------|--------------|-----------|
| 1 - Real-Time Infrastructure | ✅ Complete | RT-01 ✅, RT-02 ✅, RT-03 ✅, RT-04 ✅ | 4/4 |
| 2 - Enhanced Task Completion | ✅ Complete | TC-01 ✅, TC-02 ✅, TC-03 ✅, TC-04 ✅, TC-05 ✅ | 5/5 |
| 3 - Status Tracking & Timing | Ready to Plan | TS-01, TS-02, TS-03, TS-04, TS-05, TS-06, TS-07, TS-08 | 0/8 |
| 4 - History & Archive | Pending | HA-01, HA-02, HA-03, HA-04, HA-05, HA-06, HA-07, HA-08 | 0/8 |

**Overall:** 9/27 requirements completed (33%)

---

## Next Steps

1. ✅ ~~Review and approve this roadmap~~
2. ✅ ~~Run `/gsd:plan-phase 1` to create execution plan for Real-Time Infrastructure~~
3. ✅ ~~Execute Phase 1 plan~~
4. ✅ ~~Verify Phase 1 success criteria~~
5. ✅ ~~Continue to Phase 2~~
6. **Run `/gsd:plan-phase 3` to create execution plan for Status Tracking & Timing**
7. Execute Phase 3 plan
8. Verify Phase 3 success criteria
9. Continue to Phase 4

---

*Roadmap created: 2026-01-19*
*Last updated: 2026-01-20*
