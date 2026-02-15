# 🚂 Railway Deployment Guide - Eden Maintenance

## ✅ Prerequisites Completed:
- [x] Railway account created
- [x] Upgraded to Hobby Plan ($5/month)
- [x] GitHub repository ready
- [x] nixpacks.toml configured

---

## 🚀 Quick Deployment Steps

### Step 1: Create New Project

1. In Railway Dashboard, click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose repository: **`EDEN-PROJECT`**
4. Railway will auto-detect and start deploying

### Step 2: Configure Environment Variables

Click on your deployed service → **"Variables"** tab → Add these:

```bash
NODE_ENV=production
PORT=${{RAILWAY_PUBLIC_PORT}}
```

**After first deploy, get your public URL and add:**
```bash
# Replace YOUR-APP with your actual Railway URL
CLIENT_URL=https://YOUR-APP.up.railway.app
API_URL=https://YOUR-APP.up.railway.app
PUBLIC_API_URL=https://YOUR-APP.up.railway.app
```

**Optional (recommended):**
```bash
# Google Gemini API for translations (FREE)
GEMINI_API_KEY=your_gemini_api_key_here

# URL Shortening
URL_SHORTENER_ENABLED=true
```

### Step 3: Add Persistent Volume

**CRITICAL for WhatsApp session!**

1. Go to service → **"Volumes"** tab
2. Click **"New Volume"**
3. Configure:
   ```
   Mount Path: /.wwebjs_auth
   Size: 1 GB
   ```
4. Click **"Add"**

### Step 4: Wait for Deployment

Watch the **"Deployments"** tab:
- ✅ Building...
- ✅ Installing dependencies...
- ✅ Building client...
- ✅ Installing Puppeteer Chrome...
- ✅ Starting server...
- 🎉 **Deployed!**

### Step 5: Get Your Public URL

1. Go to **"Settings"** tab
2. Click **"Generate Domain"**
3. Copy the URL: `https://eden-maintenance-production.up.railway.app`

### Step 6: Update Environment Variables

Now that you have the URL, update the variables:

```bash
CLIENT_URL=https://eden-maintenance-production.up.railway.app
API_URL=https://eden-maintenance-production.up.railway.app
PUBLIC_API_URL=https://eden-maintenance-production.up.railway.app
```

**Save** → Railway will redeploy automatically

---

## 📱 Connect WhatsApp

1. Open your Railway URL: `https://YOUR-APP.up.railway.app`
2. Navigate to **"הגדרות"** (Settings)
3. Scroll to **"חיבור לוואטסאפ"**
4. Click **"התחבר לוואטסאפ"**
5. Wait for QR code (~30 seconds)
6. Scan with WhatsApp on your phone
7. ✅ **Connected!**

---

## 🧪 Test WhatsApp Sending

1. Go to **"היום שלי"** (My Day)
2. Select tomorrow's date
3. Assign tasks to an employee
4. Click **"שלח כל המשימות"**
5. Employee receives WhatsApp with **PUBLIC LINK**:
   ```
   https://eden-maintenance-production.up.railway.app/docs/task-xxx.html
   ```

---

## 📊 Monitor Usage & Costs

### Check Usage:
1. Dashboard → **"Usage"** tab
2. See real-time:
   - Memory usage
   - CPU usage
   - Network bandwidth

### Expected Costs:
```
512MB RAM @ 60% avg = ~$3/month
0.5 vCPU @ 20% avg = ~$2/month
────────────────────────────────
Total: ~$5/month (covered by $5 credit)
```

**Actual bill: $5/month** (just the subscription)

---

## 🐛 Troubleshooting

### Issue: Build fails with "Chromium not found"
**Solution:** nixpacks.toml includes Chromium in aptPkgs

### Issue: WhatsApp disconnects after deploy
**Solution:** Verify persistent volume is mounted at `/.wwebjs_auth`

### Issue: "Cannot find module 'express'"
**Solution:** Check build logs - `npm ci` should run in phases.install

### Issue: Client shows "Cannot connect to server"
**Solution:** Verify PUBLIC_API_URL is set correctly with HTTPS

### Issue: High memory usage
**Solution:**
- Check Railway dashboard for actual usage
- Puppeteer/Chrome uses ~300-400MB RAM
- Normal for WhatsApp bot

---

## 🔄 Updating Code

1. Push changes to GitHub:
   ```bash
   git add .
   git commit -m "Update feature"
   git push origin master
   ```

2. Railway auto-deploys from GitHub
3. Watch deployment in Dashboard
4. WhatsApp stays connected (persistent volume!)

---

## 💰 Cost Summary

| Item | Cost |
|------|------|
| **Hobby Plan Subscription** | $5/month |
| **Resource Usage** | ~$0-5/month (covered by $5 credit) |
| **Total** | **$5/month** |

Much better than:
- Render Professional: $19/month
- Heroku: $7-25/month

---

## ✅ Success Checklist

After deployment, verify:

- [ ] Service is live and accessible
- [ ] Environment variables set correctly
- [ ] Persistent volume mounted
- [ ] WhatsApp QR code appears in Settings
- [ ] WhatsApp connects successfully
- [ ] Test task message sent
- [ ] Public link works on any device
- [ ] Employee can acknowledge/complete tasks

**When all checked: You're live! 🎉**

---

## 📝 Important URLs

Save these:

- **Railway Dashboard:** https://railway.com/dashboard
- **Your Service:** `https://YOUR-APP.up.railway.app`
- **Settings Page:** `https://YOUR-APP.up.railway.app/settings`
- **API Status:** `https://YOUR-APP.up.railway.app/api/whatsapp/status`

---

## 🆘 Need Help?

- Railway Docs: https://docs.railway.com
- Railway Community: https://station.railway.com
- This project on GitHub: https://github.com/Sarhazan/EDEN-PROJECT

---

**Ready? Go to your Railway Dashboard and follow Step 1!** 🚀
