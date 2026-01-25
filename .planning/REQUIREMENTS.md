# Requirements: Eden - מערכת ניהול אחזקת מבנים

**Defined:** 2026-01-25
**Core Value:** מנהל המבנה רואה בזמן אמת מה קורה בשטח - איזה משימה הושלמה, מי עושה מה, ומה מתעכב

## v2.0 Requirements

Requirements for v2.0: Enhanced UX & Mobile Experience. Each maps to roadmap phases.

### WhatsApp Connection - Loading States

- [ ] **WA-LOAD-01**: אינדיקטור טעינה מוצג כשלוחצים "התחבר ל-WhatsApp" בהגדרות
- [ ] **WA-LOAD-02**: ספירה לאחור מ-30 שניות מוצגת בזמן יצירת QR code
- [ ] **WA-LOAD-03**: הודעת טקסט מעודכנת: "מייצר QR code..." → "סורק QR code..." → "מתחבר..."
- [ ] **WA-LOAD-04**: אינדיקטור התקדמות עם 4 שלבים מוצג אחרי סריקת QR: אתחול → מתחבר → מזהה → מוכן
- [ ] **WA-LOAD-05**: אנימציית spinner חלקה מוצגת בכל שלבי החיבור
- [ ] **WA-LOAD-06**: אנימציה נעלמת אוטומטית כשחיבור הושלם (isReady = true)

### WhatsApp Connection - Status Display

- [ ] **WA-STAT-01**: אינדיקטור סטטוס WhatsApp מוצג בסיידבר (נפרד מ-WebSocket)
- [ ] **WA-STAT-02**: נורית ירוקה + טקסט "WhatsApp מחובר" כשחיבור פעיל
- [ ] **WA-STAT-03**: נורית אדומה + טקסט "WhatsApp מנותק" כשאין חיבור
- [ ] **WA-STAT-04**: נורית צהובה + טקסט "WhatsApp מתחבר..." במצב מעבר
- [ ] **WA-STAT-05**: סטטוס מתעדכן בזמן אמת (polling כל 5 שניות או Socket.IO event)

### WhatsApp Connection - Auto-Reconnect

- [ ] **WA-RECON-01**: מערכת מזהה אוטומטית כשחיבור WhatsApp מתנתק (disconnected event)
- [ ] **WA-RECON-02**: ניסיון reconnect אוטומטי מתחיל אחרי 5 שניות
- [ ] **WA-RECON-03**: עד 3 ניסיונות reconnect בפער של 10 שניות ביניהם
- [ ] **WA-RECON-04**: אינדיקטור "מנסה להתחבר מחדש... (ניסיון 1/3)" מוצג בזמן reconnect
- [ ] **WA-RECON-05**: אחרי 3 כשלונות, מוצגת הודעה למשתמש: "נכשל להתחבר מחדש. נא לחבור ידנית."

### WhatsApp Connection - Disconnect Alerts

- [ ] **WA-ALERT-01**: Toast notification מוצגת כשחיבור WhatsApp מתנתק
- [ ] **WA-ALERT-02**: הודעת toast כוללת טקסט: "חיבור WhatsApp התנתק" + כפתור "התחבר מחדש"
- [ ] **WA-ALERT-03**: התרעה בסיידבר מוצגת: "⚠️ משימות לא יישלחו ל-WhatsApp"
- [ ] **WA-ALERT-04**: Toast נעלמת אוטומטית אחרי 10 שניות או כשחיבור חוזר
- [ ] **WA-ALERT-05**: התרעה בסיידבר נעלמת כשחיבור חוזר (סטטוס ירוק)

### Stars System - Starring

- [ ] **STAR-FUNC-01**: כפתור כוכב מוצג בכל כרטיס משימה בעמוד "היום שלי"
- [ ] **STAR-FUNC-02**: כוכב זהוב מלא מוצג עבור משימות מסומנות (is_starred = true)
- [ ] **STAR-FUNC-03**: כוכב אפור ריק מוצג עבור משימות רגילות (is_starred = false)
- [ ] **STAR-FUNC-04**: click על כוכב עושה toggle של סטטוס starred
- [ ] **STAR-FUNC-05**: שינוי starred נשמר ב-database (עמודה is_starred, טבלת tasks)
- [ ] **STAR-FUNC-06**: עדכון starred משודר בזמן אמת דרך Socket.IO (אירוע task:updated)
- [ ] **STAR-FUNC-07**: כוכב מוצג גם במשימות שהושלמו (בהיסטוריה)

### Stars System - Filtering

- [ ] **STAR-FILT-01**: כפתור כוכב מוצג בכותרת "משימות לשבוע הקרוב" (ליד כפתור "שלח הכל")
- [ ] **STAR-FILT-02**: כוכב מוחשך (אפור) = מצב הכל, כוכב זהוב = מצב סינון
- [ ] **STAR-FILT-03**: click על כפתור כוכב עושה toggle בין "הכל" ל"רק מסומנים"
- [ ] **STAR-FILT-04**: כשמסנן לפי כוכב, מוצגות רק משימות עם is_starred = true
- [ ] **STAR-FILT-05**: משימות שהושלמו (completed) לא מופיעות גם כשמסנן לפי כוכב
- [ ] **STAR-FILT-06**: מצב הסינון (כל/כוכב) נשמר ב-localStorage
- [ ] **STAR-FILT-07**: סינון מתבצע לוקאלית (client-side) ללא קריאת API

### Mobile Responsiveness - Navigation

- [ ] **MOB-NAV-01**: hamburger menu (☰) מוצג בפינה הימנית העליונה במובייל (< 768px)
- [ ] **MOB-NAV-02**: Sidebar הרגיל מוסתר אוטומטית במובייל
- [ ] **MOB-NAV-03**: click על hamburger פותח drawer מימין לשמאל (RTL) עם backdrop
- [ ] **MOB-NAV-04**: drawer כולל את כל פריטי הניווט מהסיידבר + לוגו + logout
- [ ] **MOB-NAV-05**: drawer נסגר ב-click על backdrop, כפתור X, או בחירת פריט ניווט
- [ ] **MOB-NAV-06**: אנימציית slide-in/slide-out חלקה (300ms)
- [ ] **MOB-NAV-07**: swipe מימין לשמאל סוגר את ה-drawer

### Mobile Responsiveness - Grids & Layouts

- [ ] **MOB-GRID-01**: רשימת משימות ב"היום שלי" מוצגת ב-`grid-cols-1` במובייל
- [ ] **MOB-GRID-02**: עמודות "משימות קבועות" ו"משימות לשבוע" stack vertically במובייל
- [ ] **MOB-GRID-03**: stats bar למעלה מוצג ב-`grid-cols-2` במובייל (במקום 4)
- [ ] **MOB-GRID-04**: TaskCard תופס רוחב מלא במובייל עם padding מותאם
- [ ] **MOB-GRID-05**: Modal/Form מוצגים ברוחב מלא במובייל (100vw)
- [ ] **MOB-GRID-06**: רשימות בעמודים אחרים (עובדים, מערכות) ב-`grid-cols-1` במובייל
- [ ] **MOB-GRID-07**: Timeline chart בעמוד "היום שלי" מותאם לגלילה אופקית במובייל

### Mobile Responsiveness - Touch Optimization

- [ ] **MOB-TOUCH-01**: כל הכפתורים בגודל מינימום 44x44px (Apple HIG standard)
- [ ] **MOB-TOUCH-02**: ריווח מינימום 8px בין אלמנטים ניתנים ללחיצה
- [ ] **MOB-TOUCH-03**: אזור לחיצה של כרטיס משימה מורחב ל-min-height: 64px
- [ ] **MOB-TOUCH-04**: hover states מוחלפים ב-active states במובייל
- [ ] **MOB-TOUCH-05**: tap feedback ויזואלי (scale או background change) לכל כפתור
- [ ] **MOB-TOUCH-06**: floating action button (כפתור +) בגודל 56x56px במובייל
- [ ] **MOB-TOUCH-07**: dropdown menus מוחלפים ב-native select במובייל

### Resizable Columns

- [ ] **RESIZE-01**: slider (מחוון) מוצג בין שתי העמודות בעמוד "היום שלי"
- [ ] **RESIZE-02**: גרירה אופקית של slider משנה רוחב העמודות באופן דינמי
- [ ] **RESIZE-03**: min-width: 250px נאכף לכל עמודה (למנוע עמודה צרה מדי)
- [ ] **RESIZE-04**: max-width: 70% נאכף לכל עמודה (למנוע עמודה רחבה מדי)
- [ ] **RESIZE-05**: cursor: col-resize מוצג בזמן hover על slider
- [ ] **RESIZE-06**: קו מפריד ויזואלי (border) מסמן את ה-slider
- [ ] **RESIZE-07**: רוחב עמודות נשמר ב-localStorage (key: myDayColumnWidths)
- [ ] **RESIZE-08**: רוחב עמודות משוחזר אוטומטית בטעינת הדף
- [ ] **RESIZE-09**: debounce של 100ms לשמירה ב-localStorage (למנוע writes מרובים)
- [ ] **RESIZE-10**: כפתור "איפוס" מחזיר לברירת מחדל (50-50)
- [ ] **RESIZE-11**: resizable columns מוצג רק בדסקטופ (>= 1024px)

## v3.0 Requirements (Deferred)

Requirements deferred to future milestones:

### Known Limitations from v1.0
- **AUTO-REFRESH**: Auto-refresh UI for countdown updates (no manual refresh needed)
- **MULTI-IMG**: Multiple images per task (currently limited to one)
- **MANAGER-ALERT**: Manager alerts for late tasks (push notifications or email)
- **EXPORT**: Excel/PDF export of history and reports
- **HISTORY-I18N**: History page UI in all 4 languages (currently Hebrew-only)

### Additional Features
- **WEBSOCKET-NOTIF**: WebSocket disconnect notification to user
- **WEBSOCKET-RECON**: Auto-reconnect on WebSocket disconnect
- **TASK-NOTES**: Rich text editor for task notes (currently plain text)
- **BULK-ACTIONS**: Bulk operations on tasks (delete, send, update)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Browser notifications | לא רלוונטי - המנהל רואה בזמן אמת במסך |
| Native mobile app | הדפים האינטראקטיביים כבר מותאמים למובייל |
| User authentication | המערכת פתוחה by design - לא צריך אימות |
| Advanced reporting | לא בשלב הזה - רק תצוגה בסיסית |
| Automatic reminders | לא צריך - עובדים מקבלים משימה פעם אחת ב-WhatsApp |
| Offline mode | Core value הוא real-time - offline סותר את זה |
| Desktop application | Web app מספיק - אין צורך באפליקציה נפרדת |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TBD | TBD | Pending |

**Coverage:**
- v2.0 requirements: 57 total
- Mapped to phases: 0
- Unmapped: 57 ⚠️

---
*Requirements defined: 2026-01-25*
*Last updated: 2026-01-25 after initial definition*
