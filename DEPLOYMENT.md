# מדריך פריסה ל-Railway

## שלב 1: הכנה ראשונית

1. צור חשבון ב-Railway:
   - גש ל-https://railway.app
   - הירשם עם GitHub (מומלץ)

2. התקן את Railway CLI (אופציונלי - אפשר גם דרך הממשק):
   ```bash
   npm install -g @railway/cli
   railway login
   ```

## שלב 2: פריסת השרת ל-Railway

### דרך 1: דרך GitHub (מומלץ)

1. דחוף את הקוד ל-GitHub repository שלך
2. ב-Railway Dashboard:
   - לחץ על "New Project"
   - בחר "Deploy from GitHub repo"
   - בחר את ה-repository של הפרויקט
   - Railway יזהה אוטומטית את הגדרות הפריסה

### דרך 2: דרך Railway CLI

```bash
# מתוך תיקיית הפרויקט
railway init
railway up
```

## שלב 3: הגדרת משתני סביבה ב-Railway

ב-Railway Dashboard, עבור ל-"Variables" והוסף:

```
PORT=3002
NODE_ENV=production
```

**חשוב:** אל תוסיף את `CLIENT_URL` או `API_URL` - Railway יספק אותם אוטומטית.

## שלב 4: קבלת ה-URL הציבורי

לאחר הפריסה, Railway יספק לך URL ציבורי בפורמט:
```
https://your-project-name.up.railway.app
```

העתק את ה-URL הזה.

## שלב 5: עדכון משתני הסביבה המקומיים

ערוך את `server/.env`:

```env
PORT=3002
CLIENT_URL=http://192.168.1.35:5174
API_URL=http://192.168.1.35:3002
PUBLIC_API_URL=https://your-project-name.up.railway.app
VERCEL_PROJECT_URL=https://eden-task-pages.vercel.app
```

החלף את `https://your-project-name.up.railway.app` ב-URL האמיתי שקיבלת מ-Railway.

## שלב 6: בדיקה

1. שלח משימה לעובד דרך WhatsApp
2. העובד יקבל קישור לדף האישור ב-Vercel
3. לחץ על "אישור קבלת כל המשימות"
4. ודא שהמשימות מתעדכנות לסטטוס "התקבל" במערכת

## פתרון בעיות

### הבעיה: Railway מנסה להריץ את ה-client במקום ה-server
**פתרון:** ודא ש-`railway.json` מכיל:
```json
{
  "deploy": {
    "startCommand": "cd server && node index.js"
  }
}
```

### הבעיה: Database file not found
**פתרון:** Railway יוצר מערכת קבצים קבועה. הדאטהבייס יישמר אוטומטית.

### הבעיה: WhatsApp session לא נשמר
**פתרון:** Railway תומך בקבצים קבועים. ה-session של WhatsApp יישמר ב-`.wwebjs_auth`.

## הערות חשובות

1. **SQLite על Railway**: Railway תומך ב-SQLite עם persistent storage
2. **WhatsApp Session**: ה-QR code יופיע פעם אחת בלוגים. סרוק אותו והוא יישמר
3. **Free Tier**: Railway מספק 500 שעות חינם בחודש (מספיק לפרויקט קטן)
4. **HTTPS**: כל ה-URLs של Railway כוללים HTTPS אוטומטית

## דפי האישור ב-Vercel

דפי האישור ימשיכו להתארח ב-Vercel ויתקשרו עם ה-API ב-Railway דרך ה-`PUBLIC_API_URL`.

לא צריך לעשות שום שינוי בדפי ה-HTML - הם כבר משתמשים במשתנה הנכון.
