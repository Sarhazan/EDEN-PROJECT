# Requirements: Eden v3.0

**Defined:** 2026-02-05
**Core Value:** מנהל המבנה רואה בזמן אמת מה קורה בשטח - איזה משימה הושלמה, מי עושה מה, ומה מתעכב

## v3.0 Requirements

Requirements for v3.0 Quick Task Entry & Clean UI.

### Quick Task Modal

- [ ] **MODAL-01**: מודל נפתח עם layout מינימלי — שדה כותרת + תגית "היום" בלבד
- [ ] **MODAL-02**: תגית "היום" לחיצה — פותחת date picker inline לשינוי תאריך
- [ ] **MODAL-03**: Radio toggle בין חד-פעמית לחוזרת
- [ ] **MODAL-04**: מצב חד-פעמית — שומר משימה מיד עם כותרת + תאריך בלבד (ללא מערכת, ללא עובד)
- [ ] **MODAL-05**: מצב חוזרת — מרחיב את המודל ומציג את כל השדות (תדירות, ימים, שעה, מערכת, עובד)
- [ ] **MODAL-06**: משימה שנוצרה ללא עובד ניתנת לעריכה מאוחר יותר להוספת עובד ושליחה ב-WhatsApp

### MyDay Page Redesign

- [ ] **MYDAY-01**: ציר זמן מעוצב מחדש — מציג 15 ימים קדימה עם עיצוב חלק ונקי יותר
- [ ] **MYDAY-02**: כרטיסי סטטיסטיקות מוקטנים — פחות בולטים, שומרים את המידע בצורה קומפקטית
- [ ] **MYDAY-03**: קוד פילטרים מאוחד — 3 העתקים ממוזגים לקומפוננטה משותפת אחת

## Future Requirements

Deferred from v2.0, not in v3.0 scope:

### WhatsApp Monitoring

- **WMON-01**: Loading states ומצבי חיבור ויזואליים ל-WhatsApp
- **WMON-02**: Auto-reconnect עם אינדיקטור סטטוס
- **WMON-03**: התראות על ניתוק WhatsApp

### External Integrations

- **EXTINT-01**: שילוב Gmail לקבלת משימות ממייל
- **EXTINT-02**: שילוב Outlook לקבלת משימות ממייל

## Out of Scope

| Feature | Reason |
|---------|--------|
| הסרה מלאה של סטטיסטיקות | המשתמש רוצה לשמור את המידע, רק להקטין |
| שינוי backend/API | v3.0 הוא שיפור UI בלבד, ה-API קיים |
| WhatsApp monitoring | נדחה, לא בפוקוס של v3.0 |
| External integrations | נדחה, לא בפוקוס של v3.0 |
| Authentication | המערכת פתוחה by design |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MODAL-01 | TBD | Pending |
| MODAL-02 | TBD | Pending |
| MODAL-03 | TBD | Pending |
| MODAL-04 | TBD | Pending |
| MODAL-05 | TBD | Pending |
| MODAL-06 | TBD | Pending |
| MYDAY-01 | TBD | Pending |
| MYDAY-02 | TBD | Pending |
| MYDAY-03 | TBD | Pending |

**Coverage:**
- v3.0 requirements: 9 total
- Mapped to phases: 0
- Unmapped: 9

---
*Requirements defined: 2026-02-05*
*Last updated: 2026-02-05 after initial definition*
