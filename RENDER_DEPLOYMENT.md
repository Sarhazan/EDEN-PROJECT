# Render Deployment Guide

## Prerequisites
- GitHub repository with the project
- Render account (free or Starter plan $7/month recommended)

## Deployment Steps

### 1. Create New Web Service on Render

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `eden-maintenance` (or your preferred name)
   - **Environment**: `Node`
   - **Region**: Choose closest to Israel (e.g., Frankfurt)
   - **Branch**: `master` (or your main branch)
   - **Build Command**: `chmod +x render-build.sh && ./render-build.sh`
   - **Start Command**: `node server/index.js`
   - **Plan**: Starter ($7/month) - recommended for persistent WhatsApp connection

### 2. Environment Variables

Add these environment variables in Render dashboard:

**Required:**
```bash
NODE_ENV=production
PORT=10000
CLIENT_URL=https://your-client-url.onrender.com
API_URL=https://your-server-url.onrender.com
PUBLIC_API_URL=https://your-server-url.onrender.com
```

**Optional but recommended:**
```bash
# Google Gemini API for translations (FREE tier)
GEMINI_API_KEY=your_gemini_api_key_here

# URL Shortening (enabled by default)
URL_SHORTENER_ENABLED=true
```

**Advanced (optional):**
```bash
# Google Cloud Translation API (PAID fallback)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

### 3. Persistent Storage for WhatsApp Session

Render's Starter plan includes persistent disks. Configure:

1. In service settings → "Disk"
2. Add disk:
   - **Name**: `whatsapp-auth`
   - **Mount Path**: `/opt/render/project/src/.wwebjs_auth`
   - **Size**: 1GB (sufficient for WhatsApp session)

This ensures WhatsApp stays authenticated between deploys.

### 4. Deploy

1. Click "Create Web Service"
2. Render will:
   - Clone your repository
   - Run `render-build.sh` (installs Chrome for Puppeteer)
   - Start the server with `node server/index.js`
   - Assign a public URL: `https://eden-maintenance.onrender.com`

### 5. Post-Deployment Setup

#### A. Update Environment Variables

Once deployed, update `PUBLIC_API_URL` with your actual Render URL:

```bash
PUBLIC_API_URL=https://eden-maintenance.onrender.com
```

Then trigger a manual deploy or wait for auto-deploy.

#### B. WhatsApp Authentication

1. Open your Render service URL: `https://eden-maintenance.onrender.com`
2. Navigate to Settings page
3. Click "Connect WhatsApp"
4. Scan the QR code with your phone
5. WhatsApp session will persist in the mounted disk

#### C. Test Task Sending

1. Go to "My Day" page
2. Assign tasks to an employee
3. Click "שלח כל המשימות" (Send All Tasks)
4. Employee should receive WhatsApp message with public URL
5. URL should be: `https://eden-maintenance.onrender.com/docs/task-xxx.html`

## Architecture

### How It Works

1. **Server** runs on Render with persistent disk for WhatsApp auth
2. **HTML Files** are generated in `docs/` directory and served via Express static middleware
3. **WhatsApp Messages** contain links to: `https://your-server.onrender.com/docs/task-xxx.html`
4. **Employees** click the link and can view/acknowledge tasks from anywhere
5. **Completions** are sent back to the server via API calls

### File Flow

```
┌─────────────────┐
│  Render Server  │
│                 │
│  ┌───────────┐  │
│  │ Node.js   │  │
│  │ Express   │  │
│  └───────────┘  │
│       │         │
│       ├─ /api   │  ← API endpoints
│       │         │
│       ├─ /docs  │  ← Static HTML files (task confirmations)
│       │         │
│       └─ /      │  ← React frontend (built)
│                 │
│  ┌───────────┐  │
│  │ .wwebjs_  │  │  ← Persistent WhatsApp session
│  │   auth/   │  │     (mounted disk)
│  └───────────┘  │
└─────────────────┘
        │
        │ Public URL
        ▼
https://eden-maintenance.onrender.com
```

## Troubleshooting

### WhatsApp Not Connecting
- Check logs in Render dashboard
- Verify persistent disk is mounted at `.wwebjs_auth`
- Re-scan QR code if needed

### HTML Files Not Accessible
- Verify `docs/` directory exists in deployment
- Check Express static middleware is configured: `app.use('/docs', express.static('docs'))`
- Test URL directly: `https://your-url.onrender.com/docs/test.html`

### URL Shortening Not Working
- Check `urlShortener.js` service
- Verify `is.gd` API is accessible
- Fallback: full URLs will be used if shortening fails

## Upgrading from Free to Starter Plan

If you started with free plan, upgrade to Starter for:
- Persistent disk (WhatsApp session survives restarts)
- No cold starts (instant WhatsApp message sending)
- Better reliability

Steps:
1. Go to service settings → "Plan"
2. Select "Starter" ($7/month)
3. Add persistent disk as described above
4. Re-authenticate WhatsApp

## Maintenance

### Viewing Logs
```bash
# In Render dashboard
1. Go to your service
2. Click "Logs" tab
3. See real-time logs including:
   - WhatsApp connection status
   - Message sending logs
   - HTML generation logs
```

### Updating Code
1. Push changes to GitHub
2. Render auto-deploys on push
3. WhatsApp stays connected (persistent disk)

### Cleaning Old HTML Files
Task confirmation HTML files auto-delete after 30 days (see `htmlGenerator.cleanOldFiles()`).

## Security Notes

1. **Environment Variables**: Never commit `.env` to GitHub
2. **WhatsApp Session**: Stored in persistent disk (not in code)
3. **API Keys**: Set in Render dashboard environment variables
4. **HTTPS**: Automatic with Render (Let's Encrypt)

## Cost Breakdown

**Render Starter Plan: $7/month**
- Includes:
  - 512MB RAM
  - Persistent disk
  - No cold starts
  - Automatic HTTPS
  - Custom domain support

**Total Monthly Cost: $7**

(Compare to: Railway $5-20/month + Vercel free/paid)

---

**Ready to Deploy?** Follow steps 1-5 above and you're live! 🚀
