# Eden - מערכת ניהול תחזוקה

מערכת מקיפה לניהול משימות תחזוקה, מערכות, ספקים, עובדים ומיקומים עם אינטגרציה של WhatsApp.

## תכונות עיקריות

### ניהול משימות
- יצירה, עריכה ומחיקה של משימות תחזוקה
- שיוך משימות למערכות, ספקים, עובדים ומיקומים
- מעקב אחר סטטוס משימות (ממתין, בביצוע, הושלם)
- מעקב אחר סוגי משימות (תקלה, תחזוקה, פרויקט)
- מעקב אחר רמות דחיפות (רגיל, דחוף, קריטי)

### אינטגרציה עם WhatsApp
- חיבור לחשבון WhatsApp Web
- שליחת התראות למשתמשים בעת יצירת משימות
- מעקב אחר הודעות שנשלחו עם תאריך ושעה
- הצגת סטטוס שליחה עם סימון וי

### תמיכה רב-לשונית
- תמיכה בעברית (עברית), אנגלית (English), רוסית (Русский) וערבית (العربية)
- העדפת שפה לכל עובד (נשמרת במאגר)
- הודעות WhatsApp בשפת העובד המבוקשת
- דפי משימות אינטראקטיביים בשפת העובד עם כיוון טקסט אוטומטי (RTL/LTR)
- תרגום אוטומטי של הערות עובדים לעברית למנהל
- תרגום תוכן משימות לשפת העובד
- שירות תרגום היברידי: Gemini API (חינם) → Google Translate (בתשלום) → טקסט מקורי

### ניהול מערכות
- רישום מערכות תחזוקה (חשמל, מזגן, אינסטלציה, וכו')
- תיאור ופרטי קשר לכל מערכת
- מעקב אחר משימות פעילות למערכת

### ניהול ספקים
- רישום ספקים וקבלני משנה
- ניהול תשלומים ומעקב תאריכים
- תזכורות לתשלומים עתידיים
- סימון תשלומים כשולמו

### ניהול עובדים
- רישום עובדי תחזוקה
- שיוך משימות לעובדים
- מעקב אחר משימות פעילות לכל עובד

### ניהול מיקומים
- רישום מיקומים פיזיים
- העלאת תמונות למיקומים (Drag & Drop)
- שמירת קואורדינטות GPS
- קישור ישיר ל-Google Maps

## טכנולוגיות

### Frontend
- React 18, React Router v6, Tailwind CSS, Vite
- Axios, date-fns, React Icons

### Backend
- Node.js, Express 5, Better-SQLite3
- Multer, WhatsApp-Web.js, CORS

## התקנה

\`\`\`bash
# התקנת תלויות שרת
npm install

# התקנת תלויות לקוח
cd client && npm install && cd ..
\`\`\`

### הגדרת שירות תרגום (אופציונלי)

למערכת תמיכה רב-לשונית מלאה, הגדר מפתח API של Google Gemini:

1. צור מפתח API ב-[Google AI Studio](https://aistudio.google.com/apikey)
2. הוסף לקובץ \`server/.env\`:

\`\`\`bash
# Google Gemini API (FREE tier - primary translation provider)
# Free tier: 15 requests/minute, 1,500 requests/day
GEMINI_API_KEY=your-api-key-here
\`\`\`

3. (אופציונלי) להגדרת Google Cloud Translation API כ-fallback:

\`\`\`bash
# Google Cloud Translation API (PAID fallback - optional)
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
\`\`\`

**הערה:** המערכת פועלת גם ללא מפתח API - הודעות וממשק משתמש יתורגמו, אך הערות עובדים לא יתורגמו אוטומטית.

## הפעלה

### פיתוח מקומי

\`\`\`bash
# מצב פיתוח (שרת + לקוח)
npm run dev
\`\`\`

- **לקוח**: http://localhost:5174
- **שרת**: http://localhost:3002

### פריסה לייצור (Railway)

למדריך מפורט לפריסה ב-Railway, ראה [DEPLOYMENT.md](DEPLOYMENT.md)

**סיכום מהיר:**
1. צור חשבון ב-[Railway](https://railway.app)
2. חבר את ה-GitHub repository
3. Railway יפרוס אוטומטית
4. קבל URL ציבורי (למשל: `https://eden-server.up.railway.app`)
5. עדכן `PUBLIC_API_URL` בקובץ `.env` המקומי

## מבנה הפרויקט

\`\`\`
eden-claude/
├── client/          # Frontend (React + Vite)
│   └── src/
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── App.jsx
└── server/          # Backend (Node.js + Express)
    ├── database/
    ├── routes/
    ├── services/
    └── index.js
\`\`\`

## הגדרת שפת עובד

לכל עובד ניתן להגדיר העדפת שפה:

\`\`\`sql
UPDATE employees SET language = 'en' WHERE name = 'Eden Kennedy';
-- Supported: 'he' (עברית), 'en' (English), 'ru' (Русский), 'ar' (العربية)
\`\`\`

**תוצאה:**
- הודעות WhatsApp בשפת העובד
- דפי HTML עם כיוון טקסט נכון (\`lang="en" dir="ltr"\` או \`lang="he" dir="rtl"\`)
- ממשק מתורגם לחלוטין (כפתורים, תוויות, הודעות)
- הערות שהעובד כותב מתורגמות לעברית למנהל

## API Endpoints

- \`/api/tasks\` - ניהול משימות
- \`/api/systems\` - ניהול מערכות
- \`/api/suppliers\` - ניהול ספקים
- \`/api/employees\` - ניהול עובדים
- \`/api/locations\` - ניהול מיקומים
- \`/api/whatsapp\` - אינטגרציית WhatsApp
- \`/api/task-confirmation/:token\` - דפי אישור משימות עם תמיכה רב-לשונית
- \`/api/data\` - ניהול נתוני דמה

## ארכיטקטורת הפריסה

**שרת (Railway):**
- Node.js backend עם Express
- SQLite database עם persistent storage
- WhatsApp-web.js session management
- Socket.IO לעדכונים בזמן אמת

**דפי אישור (Vercel):**
- HTML סטטי עם JavaScript
- מתארח ב-Vercel Pages
- מתקשר עם Railway API דרך \`PUBLIC_API_URL\`
- Git automation לעדכון אוטומטי
- תמיכה רב-לשונית עם כיוון טקסט אוטומטי

**שירות תרגום:**
- Google Gemini API (חינם): 15 בקשות/דקה, 1,500 בקשות/יום
- Google Cloud Translation API (fallback בתשלום): $20 למיליון תווים
- מעקב אחר ספק תרגום ושפה מקורית במאגר
- ירידה חלקה (\`provider: 'none'\`) כאשר APIs לא זמינים

---

**Eden v1.0** | נבנה עם ❤️ בישראל
