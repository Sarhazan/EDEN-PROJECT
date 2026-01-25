# Deployment Guide - Eden Maintenance System

## Quick Deploy to Render.com

### Prerequisites
- GitHub account with this repository pushed
- Render.com account (free tier available)
- API keys for Gemini and Google Translate (optional)

### Step-by-Step Deployment

#### 1. Push to GitHub
```bash
git push origin master
git push --tags
```

#### 2. Deploy on Render.com

1. **Sign up/Login** to [Render.com](https://render.com)

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `Sarhazan/EDEN-PROJECT`
   - Click "Connect"

3. **Configure Service**
   - **Name**: `eden-maintenance` (or your preferred name)
   - **Region**: Frankfurt (or closest to you)
   - **Branch**: `master`
   - **Runtime**: `Node`
   - **Build Command**:
     ```
     npm install && npm run install:all && npm run build
     ```
   - **Start Command**:
     ```
     NODE_ENV=production npm start
     ```
   - **Plan**: Free

4. **Add Environment Variables** (optional - for translation features)
   - Click "Environment" tab
   - Add `GEMINI_API_KEY` (get from [Google AI Studio](https://aistudio.google.com/apikey))
   - Add `GOOGLE_TRANSLATE_API_KEY` (get from Google Cloud Console)

5. **Deploy**
   - Click "Create Web Service"
   - Wait 5-10 minutes for deployment
   - You'll get a public URL like: `https://eden-maintenance.onrender.com`

#### 3. Access Your App

Your app will be available at: `https://your-service-name.onrender.com`

**Important Notes:**
- Free tier apps go to sleep after 15 minutes of inactivity
- First request after sleep will take 30-60 seconds to wake up
- Database and WhatsApp session are stored in ephemeral storage (reset on redeploy)

### Alternative: Deploy to Railway.app

1. Visit [Railway.app](https://railway.app)
2. Click "Start a New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect Node.js and deploy
5. Add environment variables in Railway dashboard
6. Get your public URL from Railway

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Set to `production` |
| `PORT` | Auto-set | Railway/Render sets automatically |
| `GEMINI_API_KEY` | Optional | For translation (free tier: 1500 req/day) |
| `GOOGLE_TRANSLATE_API_KEY` | Optional | Fallback translation (paid) |

## Post-Deployment

### 1. WhatsApp Connection
- Open your deployed URL
- Navigate to WhatsApp settings
- Scan QR code with your WhatsApp
- Connection will persist until server restart

### 2. Database Setup
- Database is created automatically on first run
- Add employees, systems, locations, and suppliers via the UI

### 3. Testing
- Create a test task
- Assign to an employee
- Send via WhatsApp
- Verify real-time updates work

## Troubleshooting

### App Not Loading
- Check Render logs for errors
- Verify build completed successfully
- Check that PORT is bound to `0.0.0.0`

### WhatsApp Not Connecting
- Ensure WhatsApp Web is not open on your phone
- Try reconnecting via the UI
- Check server logs for connection errors

### Real-time Updates Not Working
- Verify WebSocket connection in browser console
- Check that Socket.IO is properly initialized
- Ensure client connects to correct URL (same origin in production)

## Production Checklist

- [ ] Code pushed to GitHub with latest changes
- [ ] Render service created and deployed
- [ ] Environment variables configured (if using translation)
- [ ] App accessible via public URL
- [ ] WhatsApp connected successfully
- [ ] Test task created and sent
- [ ] Real-time updates verified
- [ ] Multi-language support tested (if applicable)

## Cost Estimate

**Free Tier (Render.com):**
- Web service: $0/month (with 15-min sleep)
- No credit card required
- Perfect for testing and small teams

**Paid Tier (if needed):**
- Render: $7/month (no sleep, always on)
- Railway: $5/month + usage

**Translation API:**
- Gemini: FREE (1500 requests/day)
- Google Translate: ~$20/million characters (fallback only)

## Support

For issues or questions, check:
- Server logs in Render dashboard
- Browser console for client errors
- GitHub Issues for known problems
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
