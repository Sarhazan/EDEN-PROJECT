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

## API Endpoints

- \`/api/tasks\` - ניהול משימות
- \`/api/systems\` - ניהול מערכות
- \`/api/suppliers\` - ניהול ספקים
- \`/api/employees\` - ניהול עובדים
- \`/api/locations\` - ניהול מיקומים
- \`/api/whatsapp\` - אינטגרציית WhatsApp
- \`/api/confirm\` - דפי אישור משימות (webhook)
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

---

**Eden v1.0** | נבנה עם ❤️ בישראל
