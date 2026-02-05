# Eden - מערכת ניהול אחזקת מבנים

## What This Is

מערכת לניהול משימות אחזקת מבנים עם שילוב WhatsApp, מותאמת למובייל עם תמיכה מלאה ב-RTL. מנהל מבנה יכול ליצור משימות חוזרות או חד-פעמיות, לסמן משימות חשובות בכוכב, להקצות לעובדים דרך WhatsApp, ולעקוב בזמן אמת אחרי ההתקדמות — מדסקטופ או מהטלפון. העובדים מקבלים דפים אינטראקטיביים שדרכם הם מסמנים משימות כהושלמו, מצרפים תמונות והערות.

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

**v2.0 (shipped 2026-02-05):**
- ✓ מערכת כוכבים - סימון משימות חשובות עם toggle ושמירה ב-DB — v2.0
- ✓ פילטר כוכב גלובלי עם localStorage persistence ו-cross-tab sync — v2.0
- ✓ כוכב מוצג גם במשימות שהושלמו בהיסטוריה — v2.0
- ✓ עמודות resizable ב"היום שלי" עם drag-to-resize ו-localStorage — v2.0
- ✓ WhatsApp client משולב בשרת הראשי (לא gateway נפרד) — v2.0
- ✓ QR code מוצג ב-Settings page דרך Socket.IO (לא API חיצוני) — v2.0
- ✓ כפתור disconnect ב-Settings page — v2.0
- ✓ WhatsApp session persistent עם LocalAuth — v2.0
- ✓ Hamburger menu במובייל עם RTL drawer slide-in — v2.0
- ✓ Responsive grids - משימות stack vertically במובייל — v2.0
- ✓ Touch targets מינימום 44x44px (Apple HIG) — v2.0
- ✓ Swipe-to-close drawer במובייל — v2.0
- ✓ FAB בגודל 56x56px במובייל — v2.0
- ✓ Native select elements במובייל — v2.0
- ✓ Modal/Form ברוחב מלא במובייל — v2.0
- ✓ Employee task pagination עם כפתור "קיבלתי" — v2.0
- ✓ העלאת מספר תמונות מדף העובד — v2.0
- ✓ שלוש סביבות: Local, EDEN-TEST, EDEN-PRODUCTION — v2.0
- ✓ הגנות סביבה: כפתורי ניהול נתונים מושבתים בפרודקשן — v2.0

### Active

(No active requirements — next milestone not yet planned)

### Out of Scope

- התרעות/נוטיפיקציות בדפדפן - לא רלוונטי, המנהל רואה בזמן אמת
- אפליקציית מובייל נפרדת - responsive web app עובד היטב במובייל
- אימות משתמשים - המערכת פתוחה, הדפים האינטראקטיביים נגישים לכל מי שיש לו את הקישור
- דיווחים וסטטיסטיקות מתקדמות - לא בשלב הזה, רק תצוגה בסיסית
- תזכורות אוטומטיות לעובדים - לא צריך בשלב זה
- Offline mode — Core value הוא real-time, offline סותר את זה

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
- **URL**: https://web-production-0b462.up.railway.app
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

**Shipped:** v2.0 Enhanced UX & Mobile Experience (2026-02-05)

**Codebase:**
- 11,654 lines of JavaScript/JSX/CSS (client + server)
- Frontend: React 19 + Vite + Tailwind CSS (http://localhost:5179)
- Backend: Node.js + Express + SQLite with better-sqlite3 (http://localhost:3002)
- WebSocket: Socket.IO 4.8.2 integrated with Express server
- WhatsApp: whatsapp-web.js integrated in main server (LocalAuth persistent sessions)
- Deployment: Railway (TEST on develop, PRODUCTION on master)
- Database: SQLite with WAL mode, 2-year data retention
- Internationalization: i18next with 5 languages (he/en/ru/ar/hi)
- Translation: Hybrid Gemini API → Google Translate → original text
- Mobile: Responsive with RTL drawer, 44px touch targets, react-swipeable

**Architecture:**
- Real-time updates via WebSocket broadcast on task changes
- Image uploads with Multer (5MB limit, JPEG/PNG/HEIC with auto-conversion)
- Server-side translation on write (translate once, not on every read)
- Automatic late task detection with visual indicators
- History with composite indexes for fast filtering
- Cron job for automatic data cleanup (2 AM Israel time)
- WhatsApp client singleton with Socket.IO event bridge (qr/ready/disconnected)
- Employee task pagination with acknowledgment gating

**Known Limitations (by design):**
- No authentication - system intentionally open
- No auto-refresh UI for countdown updates (manual refresh required)
- History page UI Hebrew-only (data is multilingual)
- Star filter missing in mobile drawer (integration gap from v2.0)
- Star button touch target 36x36px on mobile (below 44px spec)

## Constraints

- **Tech stack**: חייבים להישאר עם React + Node.js + SQLite - אין מעבר לטכנולוגיות אחרות
- **WhatsApp**: חייבים להשתמש ב-whatsapp-web.js (לא WhatsApp Business API) כי זה מה שכבר עובד
- **Deployment**: Railway for server (TEST + PRODUCTION), Vercel for static HTML pages
- **Hebrew**: כל הממשק בעברית - הודעות, תגובות, UI
- **No authentication**: המערכת פתוחה - אין צורך באימות משתמשים
- **Mobile-first**: כל פיצ'ר חדש חייב לעבוד גם במובייל עם touch targets מתאימים

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
| SQLite BOOLEAN for is_starred | INTEGER 0/1 with DEFAULT 0, atomic CASE toggle | ✅ Working | v2.0 |
| Star filter in Sidebar (global) | Available on all pages, not per-page | ✅ Working | v2.0 |
| re-resizable with --legacy-peer-deps | React 19 peer dependency resolution | ✅ Working | v2.0 |
| Desktop-only resizable columns | ≥1024px breakpoint, stacked on mobile | ✅ Working | v2.0 |
| WhatsApp client as server singleton | Simpler than separate gateway process | ✅ Working | v2.0 |
| QR via Socket.IO data URL | No external API dependency for QR display | ✅ Working | v2.0 |
| LocalAuth for WhatsApp persistence | clientId 'eden-whatsapp', .wwebjs_auth dir | ✅ Working | v2.0 |
| 1024px mobile/desktop breakpoint | Tailwind lg, aligns with iPad landscape | ✅ Working | v2.0 |
| react-swipeable for gestures | Avoids 10+ edge cases (multi-touch, velocity, iOS) | ✅ Working | v2.0 |
| iOS scroll lock via position: fixed | Safari ignores overflow: hidden | ✅ Working | v2.0 |
| 44x44px touch targets (Apple HIG) | Exceeds WCAG 2.5.8 24px minimum | ✅ Working | v2.0 |
| Native select on mobile | OS-native picker UI better than custom | ✅ Working | v2.0 |
| Three Railway environments | Local/TEST(develop)/PROD(master) with safety guards | ✅ Working | v2.0 |
| Employee task pagination with "קיבלתי" | Controls task visibility, prevents overwhelm | ✅ Working | v2.0 |
| v2.0 rescoped at completion | Phases 4-6 deferred to v3.0 | — Pending | v2.0 |

---
*Last updated: 2026-02-05 after v2.0 milestone*
