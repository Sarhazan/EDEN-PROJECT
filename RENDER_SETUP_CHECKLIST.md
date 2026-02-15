# ✅ Render Setup Checklist - Eden Maintenance

## 📝 Pre-Deployment Checklist

### 1. GitHub Repository
- [x] Code pushed to GitHub (master branch)
- [x] render-build.sh exists and is executable
- [x] docs/ directory exists with .gitkeep

### 2. Render Account
- [ ] Logged in to https://dashboard.render.com
- [ ] Connected GitHub account to Render
- [ ] Identified existing service OR ready to create new one

---

## 🚀 Deployment Steps

### Step 1: Create/Update Web Service

**If you DON'T have a Render service yet:**
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Select your GitHub repository: `EDEN-PROJECT`
4. Fill in the following:

**Service Configuration:**
```
Name:              eden-maintenance
Environment:       Node
Region:            Frankfurt (closest to Israel)
Branch:            master
Build Command:     chmod +x render-build.sh && ./render-build.sh
Start Command:     node server/index.js
```

**If you ALREADY have a Render service:**
1. Go to your existing service dashboard
2. Go to "Settings" → "Build & Deploy"
3. Update:
   - Build Command: `chmod +x render-build.sh && ./render-build.sh`
   - Start Command: `node server/index.js`
4. Trigger manual deploy

---

### Step 2: Upgrade to Starter Plan ($7/month)

**Why Starter is CRITICAL for WhatsApp:**
- ✅ No cold starts = instant WhatsApp responses
- ✅ Persistent disk = WhatsApp stays authenticated
- ✅ 512MB RAM = stable for Puppeteer/Chrome
- ❌ Free plan = cold starts every 15 min + WhatsApp disconnects

**How to upgrade:**
1. In service dashboard → "Settings" → "Plan"
2. Select "Starter" ($7/month)
3. Confirm upgrade

---

### Step 3: Add Persistent Disk (CRITICAL FOR WHATSAPP)

**Without this, WhatsApp will disconnect on every deploy!**

1. In service settings → "Disks"
2. Click "Add Disk"
3. Configure:
   ```
   Name:        whatsapp-auth
   Mount Path:  /opt/render/project/src/.wwebjs_auth
   Size:        1 GB
   ```
4. Save

**What this does:**
- Stores WhatsApp session data persistently
- WhatsApp stays authenticated between deploys
- No need to re-scan QR code every time

---

### Step 4: Configure Environment Variables

**Go to "Environment" tab and add these variables:**

#### Required Variables:
```bash
NODE_ENV=production
PORT=10000
```

#### Your Production URLs:
**IMPORTANT:** Replace `your-service-name` with your actual Render service name!

If your service URL is `https://eden-maintenance.onrender.com`:
```bash
CLIENT_URL=https://eden-maintenance.onrender.com
API_URL=https://eden-maintenance.onrender.com
PUBLIC_API_URL=https://eden-maintenance.onrender.com
```

Copy this and replace the URL:
```
NODE_ENV=production
PORT=10000
CLIENT_URL=https://YOUR-SERVICE-NAME.onrender.com
API_URL=https://YOUR-SERVICE-NAME.onrender.com
PUBLIC_API_URL=https://YOUR-SERVICE-NAME.onrender.com
```

#### Optional but Recommended:
```bash
# Google Gemini API for translations (FREE)
# Get key: https://aistudio.google.com/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# URL Shortening (enabled by default)
URL_SHORTENER_ENABLED=true
```

**How to add:**
1. Click "Add Environment Variable"
2. Paste key name (e.g., `NODE_ENV`)
3. Paste value (e.g., `production`)
4. Repeat for all variables
5. Click "Save Changes"

---

### Step 5: Deploy

1. Click "Manual Deploy" → "Deploy latest commit"
2. Watch logs (this takes 5-10 minutes first time):
   ```
   === Eden Build Script for Render ===
   Installing npm dependencies...
   Installing Puppeteer Chrome...
   === Build complete ===
   ```
3. Wait for: `Your service is live 🎉`

**Check logs for:**
- ✅ `Database tables initialized successfully`
- ✅ `WhatsApp service connected to Socket.IO`
- ✅ `🚀 Initializing WhatsApp client...`
- ✅ `Server running on port 10000`

---

### Step 6: Connect WhatsApp

**IMPORTANT:** Do this from your phone!

1. Open your service URL: `https://YOUR-SERVICE-NAME.onrender.com`
2. Navigate to "הגדרות" (Settings) page
3. Scroll to "חיבור לוואטסאפ" section
4. Click "התחבר לוואטסאפ" button
5. **Wait for QR code** to appear (takes 20-30 seconds first time)
6. Open WhatsApp on your phone
7. Go to: Settings → Linked Devices → Link a Device
8. Scan the QR code
9. Wait for: "מחובר לוואטסאפ בהצלחה!" (Connected successfully!)

**Status should show:**
- ✅ מחובר (Connected)
- ✅ QR disappeared
- ✅ Green indicator

---

### Step 7: Test WhatsApp Sending

**Send test message to Eden Kandy:**

1. Go to "היום שלי" (My Day) page
2. Select tomorrow's date
3. Find tasks assigned to עדן קנדי
4. Click green "שלח כל המשימות" button
5. Confirm

**What should happen:**
1. Backend logs show:
   ```
   === BULK SEND START ===
   Processing employee עדן קנדי
   Generating HTML...
   URL to send: https://YOUR-SERVICE.onrender.com/docs/task-xxx.html
   ✅ Message sent successfully
   ```

2. Eden Kandy receives WhatsApp message with:
   - Task list
   - Clickable link: `https://YOUR-SERVICE.onrender.com/docs/task-xxx.html`

3. Clicking link opens task confirmation page (works on any device!)

---

## 🔍 Verification

### Check Backend Logs:
1. Go to Render dashboard → "Logs"
2. Look for:
   - `✅ WhatsApp client is ready!`
   - `📤 Sending message to 972...`
   - `✅ Message sent successfully`

### Check WhatsApp Status API:
```bash
curl https://YOUR-SERVICE.onrender.com/api/whatsapp/status
```

Expected response:
```json
{
  "isReady": true,
  "needsAuth": false,
  "isInitialized": true
}
```

### Check HTML File Serving:
```bash
curl https://YOUR-SERVICE.onrender.com/docs/.gitkeep
```

Should return empty file (proves /docs is accessible)

---

## 🐛 Troubleshooting

### Issue: WhatsApp keeps disconnecting
**Solution:**
- Verify persistent disk is mounted at `/opt/render/project/src/.wwebjs_auth`
- Check disk is 1GB+
- Re-scan QR code once after adding disk

### Issue: QR code not appearing
**Solution:**
- Check logs for: `🚀 Initializing WhatsApp client...`
- Wait 30 seconds (Chrome download + initialization)
- Refresh Settings page
- Check: `📱 QR CODE RECEIVED` in logs

### Issue: "URL not accessible" error when sending
**Solution:**
- Verify PUBLIC_API_URL is set correctly (no trailing slash)
- Check service is running: `https://YOUR-SERVICE.onrender.com`
- Verify docs/ directory exists and is accessible

### Issue: Build fails with Chrome error
**Solution:**
- Verify render-build.sh is executable
- Check logs show: `Installing Puppeteer Chrome...`
- Ensure Starter plan (Free plan may have memory limits)

### Issue: Messages send but links are localhost
**Solution:**
- PUBLIC_API_URL is NOT set or still has localhost
- Go to Environment → Update PUBLIC_API_URL
- Trigger manual deploy

---

## 📊 Monitoring

### Daily Checks:
- [ ] WhatsApp status: `/api/whatsapp/status`
- [ ] Service uptime in Render dashboard
- [ ] Check logs for errors

### Weekly Checks:
- [ ] Disk usage (WhatsApp session shouldn't grow much)
- [ ] Check `/docs` directory size (auto-cleaned after 30 days)

### Monthly Checks:
- [ ] Review Render invoice ($7/month)
- [ ] Check WhatsApp still authenticated
- [ ] Test full flow: assign task → send → employee receives

---

## 💰 Cost Breakdown

**Render Starter: $7/month**

Includes:
- Persistent disk (1GB)
- No cold starts
- 512MB RAM
- Automatic HTTPS
- Custom domain support (optional)

**Total: $7/month**

Much simpler than:
- Railway ($5-20/month) + Vercel ($0-20/month)
- Everything in one place!

---

## 🎉 Success Checklist

After completing all steps, verify:

- [ ] Service is live at `https://YOUR-SERVICE.onrender.com`
- [ ] WhatsApp shows "מחובר" (Connected) in Settings
- [ ] Test message sent to employee successfully
- [ ] Employee receives WhatsApp with PUBLIC link
- [ ] Link opens task confirmation page on any device
- [ ] Employee can acknowledge/complete tasks
- [ ] Backend logs show all operations

**When all checked:** You're ready to use WhatsApp for daily task assignments! 🚀

---

## 📝 Important URLs

After deployment, save these:

- **Service URL:** `https://YOUR-SERVICE-NAME.onrender.com`
- **Settings Page:** `https://YOUR-SERVICE-NAME.onrender.com/settings`
- **API Status:** `https://YOUR-SERVICE-NAME.onrender.com/api/whatsapp/status`
- **Render Dashboard:** https://dashboard.render.com/web/YOUR-SERVICE-ID

---

**Need help?** Check [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for detailed explanations.
