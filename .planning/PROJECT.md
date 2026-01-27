# Eden - מערכת ניהול אחזקת מבנים

## What This Is

מערכת לניהול משימות אחזקת מבנים עם שילוב WhatsApp. מנהל מבנה יכול ליצור משימות חוזרות או חד-פעמיות, להקצותן לעובדים דרך WhatsApp, ולעקוב בזמן אמת אחרי ההתקדמות. העובדים מקבלים דפים אינטראקטיביים שדרכם הם מסמנים משימות כהושלמו, מצרפים תמונות והערות.

## Core Value

מנהל המבנה רואה בזמן אמת מה קורה בשטח - איזה משימה הושלמה, מי עושה מה, ומה מתעכב. זה חייב לעבוד בזמן אמת כדי שהמנהל יוכל להגיב מהר לבעיות.

## Requirements

### Validated

הפיצ'רים הבאים כבר קיימים ועובדים במערכת:

**Base System (existing):**
- ✓ יצירת משימות (חד-פעמיות וחוזרות: יומי/שבועי/חודשי/שנתי) — existing
- ✓ ניהול עובדים עם מספרי טלפון — existing
- ✓ ניהול מערכות (מיזוג, אבטחה, מים, וכו') — existing
- ✓ ניהול מיקומים — existing
- ✓ ניהול ספקים — existing
- ✓ חיבור WhatsApp דרך QR code (WhatsApp Web) — existing
- ✓ שליחת משימות לעובדים ב-WhatsApp (טקסט + קישור לדף אינטראקטיבי) — existing
- ✓ דפי אישור אינטראקטיביים (HTML סטטי ב-Vercel) — existing
- ✓ סימון משימות כהושלמו בדף האינטראקטיבי — existing
- ✓ יצירה אוטומטית של משימות חוזרות — existing
- ✓ תצוגת "משימות היום" למנהל — existing

**v1.0 (shipped 2026-01-25):**
- ✓ WebSocket connection בין שרת ללקוח — v1.0
- ✓ עדכון מיידי במסך המנהל כשעובד מסמן משימה כהושלמה — v1.0
- ✓ עדכון מיידי במסך המנהל כשעובד מעלה תמונה — v1.0
- ✓ עדכון מיידי במסך המנהל כשעובד מוסיף הערה — v1.0
- ✓ עובד יכול להעלות תמונה מהדף האינטראקטיבי (mobile/desktop) — v1.0
- ✓ עובד יכול להוסיף הערת טקסט חופשית למשימה — v1.0
- ✓ תמונות נשמרות כקבצים בשרת (תחת `/uploads`) — v1.0
- ✓ מנהל רואה תמונות והערות שצורפו למשימה בממשק הניהול — v1.0
- ✓ תמונות מוצגות כתצוגה מקדימה עם אפשרות הגדלה — v1.0
- ✓ כל משימה כוללת הערכת זמן ביצוע (estimated_duration_minutes) — v1.0
- ✓ חישוב זמן סיום מוערך (scheduled_time + estimated_duration) — v1.0
- ✓ סטטוסים מפורשים: pending/sent/in_progress/completed + timing_status — v1.0
- ✓ משימה מסומנת אוטומטית כ-late כשעבר הזמן המוערך לסיום — v1.0
- ✓ משימות מאוחרות מוצגות בצבע אדום בממשק המנהל — v1.0
- ✓ שמירת timestamp מדויק של מתי משימה הושלמה בפועל (completed_at) — v1.0
- ✓ חישוב פער הזמן בין הזמן המוערך לזמן ההשלמה בפועל — v1.0
- ✓ תצוגה ויזואלית של זמן שנותר/חריגה (עם אמוג'י ופורמט עברי) — v1.0
- ✓ משימות שהושלמו נשמרות במסד הנתונים למשך 2 שנים — v1.0
- ✓ עמוד היסטוריה מציג משימות שהושלמו בעבר — v1.0
- ✓ סינון היסטוריה לפי תאריך (טווח תאריכים) — v1.0
- ✓ סינון היסטוריה לפי עובד — v1.0
- ✓ סינון היסטוריה לפי מערכת — v1.0
- ✓ סינון היסטוריה לפי מיקום — v1.0
- ✓ סטטיסטיקות בסיסיות: כמה משימות הושלמו, כמה מאוחרות, אחוז הצלחה — v1.0
- ✓ ניקוי אוטומטי של משימות ישנות מ-2 שנים (cron job) — v1.0
- ✓ הוספת שדה language לטבלת employees (עברית/אנגלית/רוסית/ערבית) — v1.0
- ✓ מנהל יכול לבחור שפת עובד בממשק ניהול העובדים — v1.0
- ✓ הודעות WhatsApp נשלחות בשפת העובד (תרגום דינמי) — v1.0
- ✓ דפי אישור אינטראקטיביים מוצגים בשפת העובד — v1.0
- ✓ כפתורים, תוויות, והודעות בדף האינטראקטיבי מתורגמים אוטומטית — v1.0
- ✓ הערות שעובד כותב בשפתו מתורגמות לעברית למנהל — v1.0
- ✓ ממשק המנהל תמיד בעברית עם תרגום אוטומטי להערות מעובדים — v1.0
- ✓ תמיכה ב-RTL (Right-to-Left) לעברית וערבית, LTR לאנגלית ורוסית — v1.0

### Active

## Current Milestone: v2.0 - Enhanced UX & Mobile Experience

**Goal:** שיפור חוויית המשתמש של חיבור WhatsApp, הוספת מערכת כוכבים למשימות חשובות, והתאמה מלאה למובייל

**Target features:**

**WhatsApp Connection UX (4 features):**
- אינדיקטור חיבור עם אנימציה וטיימר (30 שניות ליצירת QR + 15-30 שניות לאחר סריקה)
- סטטוס חיבור WhatsApp בסיידבר (נפרד מסטטוס WebSocket)
- Auto-reconnect אוטומטי כשיש ניתוק WhatsApp
- התרעה ברורה למשתמש כשחיבור WhatsApp מתנתק

**Task Management (1 feature):**
- מערכת כוכבים - סימון משימות חשובות ב"היום שלי" + פילטר כוכב (כוכב נשאר גם אחרי השלמה, אבל משימות שהושלמו לא מופיעות בסינון כוכב)

**Mobile Responsiveness (1 feature):**
- התאמה מלאה לסמארטפון - hamburger menu עם drawer, responsive grids (stack vertically), touch-friendly UI

**UI Improvements (1 feature):**
- Resizable columns ב"היום שלי" - מחוון (slider) לשינוי גודל העמודות של משימות קבועות וחד-פעמיות (שמור ב-localStorage)

### Out of Scope

- התרעות/נוטיפיקציות בדפדפן - לא רלוונטי, המנהל רואה בזמן אמת
- אפליקציית מובייל נפרדת - הדפים האינטראקטיביים כבר מותאמים למובייל
- אימות משתמשים - המערכת פתוחה, הדפים האינטראקטיביים נגישים לכל מי שיש לו את הקישור
- דיווחים וסטטיסטיקות מתקדמות - לא בשלב הראשון, רק תצוגה בסיסית
- תזכורות אוטומטיות לעובדים - לא צריך בשלב זה

## Environments

המערכת רצה בשלוש סביבות נפרדות:

### 1. Local Development (לוקאלי)
- **URL**: http://localhost:5179 (client), http://localhost:3002 (server)
- **מטרה**: פיתוח ובדיקות מקומיות
- **Database**: `maintenance.db` מקומי
- **WhatsApp**: חיבור WhatsApp Web מקומי (QR scan נדרש)
- **משתני סביבה**: ללא `VITE_ENV` (ברירת מחדל)
- **הגבלות**: אין - כל הפיצ'רים זמינים כולל כפתורי ניהול נתונים

### 2. EDEN-TEST (Railway - סביבת בדיקות)
- **URL**: https://web-production-9e1eb.up.railway.app
- **Branch**: `develop`
- **מטרה**: בדיקות לפני פרודקשן, הדגמות
- **Database**: Railway Volume (SQLite)
- **WhatsApp**: חיבור נפרד מפרודקשן
- **משתני סביבה**:
  - `VITE_ENV=test` - מציג "EDEN DEV" בסיידבר, מאפשר כפתורי ניהול נתונים
  - `ALLOW_DEMO_SEED=true` - מאפשר טעינת נתוני דמה אוטומטית
- **הגבלות**: אין - כל הפיצ'רים זמינים לבדיקות

### 3. EDEN-PRODUCTION (Railway - פרודקשן)
- **URL**: [להגדרה]
- **Branch**: `master`
- **מטרה**: סביבת פרודקשן אמיתית עם נתונים אמיתיים
- **Database**: Railway Volume (SQLite) - נתונים אמיתיים
- **WhatsApp**: חיבור WhatsApp הראשי לשליחת משימות
- **משתני סביבה**:
  - `VITE_ENV` לא מוגדר (או ריק) - מציג "PRODUCTION" בסיידבר
  - `ALLOW_DEMO_SEED` לא מוגדר - מונע טעינת נתוני דמה בטעות
- **הגבלות**:
  - כפתורי "טען נתוני דמה" ו"נקה נתונים" מושבתים (disabled)
  - כפתור "עדכון זמין" לא מוצג (רק בסביבת TEST)

### Environment Indicators
| סביבה | תגית בסיידבר | צבע | כפתורי ניהול נתונים |
|-------|-------------|------|---------------------|
| Local | ללא | - | ✅ מופעלים |
| EDEN-TEST | EDEN DEV | צהוב | ✅ מופעלים |
| PRODUCTION | PRODUCTION | ירוק | ❌ מושבתים |

## Current State

**Shipped:** v1.0 MVP (2026-01-25)

**Codebase:**
- 9,232 lines of JavaScript/JSX (client + server)
- Frontend: React 19 + Vite + Tailwind CSS (http://localhost:5179)
- Backend: Node.js + Express + SQLite with better-sqlite3 (http://localhost:3002)
- WebSocket: Socket.IO 4.8.2 integrated with Express server
- WhatsApp: whatsapp-web.js (unofficial API)
- Deployment: Vercel for static interactive HTML pages
- Database: SQLite with WAL mode, 2-year data retention
- Internationalization: i18next with 4 languages (he/en/ru/ar)
- Translation: Hybrid Gemini API → Google Translate → original text

**Architecture:**
- Real-time updates via WebSocket broadcast on task changes
- Image uploads with Multer (5MB limit, JPEG/PNG only)
- Server-side translation on write (translate once, not on every read)
- Automatic late task detection with visual indicators
- History with composite indexes for fast filtering
- Cron job for automatic data cleanup (2 AM Israel time)

**Known Limitations (by design):**
- No authentication - system intentionally open
- No auto-refresh UI for countdown updates (manual refresh required)
- History page UI Hebrew-only (data is multilingual)
- WebSocket disconnect doesn't show user notification
- One image per task (multiple images deferred to v2)

## Constraints

- **Tech stack**: חייבים להישאר עם React + Node.js + SQLite - אין מעבר לטכנולוגיות אחרות
- **WhatsApp**: חייבים להשתמש ב-whatsapp-web.js (לא WhatsApp Business API) כי זה מה שכבר עובד
- **Static hosting**: הדפים האינטראקטיביים חייבים להישאר סטטיים (HTML) כי זה כבר עובד עם Vercel
- **Hebrew**: כל הממשק בעברית - הודעות, תגובות, UI
- **No authentication**: המערכת פתוחה - אין צורך באימות משתמשים

## Key Decisions

| Decision | Rationale | Outcome | Version |
|----------|-----------|---------|---------|
| Socket.IO integrated with Express | Real-time updates needed, using http.Server wrapper | ✅ Working | v1.0 |
| CORS allow all origins | Development flexibility, no auth by design | ✅ Working | v1.0 |
| Images stored on server filesystem | Avoid external S3/Cloudflare for simplicity | ✅ Working | v1.0 |
| 5MB file size limit | Balance quality with server storage | ✅ Working | v1.0 |
| Default 30 min task duration | Based on typical maintenance tasks | ✅ Working | v1.0 |
| Composite index for history | Status → completed_at → employee_id → system_id | ✅ Working | v1.0 |
| WAL mode for SQLite | Better concurrency for WebSocket writes | ✅ Working | v1.0 |
| Default 7-day history view | Most relevant timeframe for managers | ✅ Working | v1.0 |
| Hybrid translation | Gemini FREE → Google Translate PAID → original | ✅ Working | v1.0 |
| Track translation_provider | Monitor costs, verify free tier usage | ✅ Working | v1.0 |
| Server-side translation on write | Translate once, not on every read | ✅ Working | v1.0 |
| ISO 639-1 language codes | International compatibility (he/en/ru/ar) | ✅ Working | v1.0 |
| Database CHECK constraints | Validate language values at DB layer | ✅ Working | v1.0 |
| Preload all 4 languages at startup | Synchronous availability in routes | ✅ Working | v1.0 |
| Flag emojis for language ID | Visual indicators (🇮🇱 🇬🇧 🇷🇺 🇸🇦) | ✅ Working | v1.0 |
| Preserve task data in Hebrew | Only translate UI text for employees | ✅ Working | v1.0 |
| RTL for Hebrew/Arabic | dir="rtl" for he/ar, dir="ltr" for en/ru | ✅ Working | v1.0 |
| Gemini 2.0 Flash Lite | 1.5 models retired, using 2.0 | ✅ Working | v1.0 |
| Dependency injection for Socket.IO | Fix circular dependency in tasks.js | ✅ Working | v1.0 |
| Daily recurring tasks start tomorrow | Avoid same-day execution confusion | ✅ Working | v1.0 |

---
*Last updated: 2026-01-27 after environment setup (Local, EDEN-TEST, PRODUCTION)*
