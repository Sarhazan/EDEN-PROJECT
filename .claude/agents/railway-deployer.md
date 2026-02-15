# Railway Deployer Agent

Agent for managing deployments to Railway and Vercel for the Eden maintenance system.

## Capabilities

- Deploy to Railway (main application)
- Deploy to Vercel (static HTML confirmation pages)
- Monitor deployment status
- Manage environment variables
- Check deployment logs

## Deployment Targets

### Railway (Production Server)
- **URL:** https://web-production-9e1eb.up.railway.app
- **Project:** spirited-empathy
- **Service:** web
- **Dashboard:** https://railway.com/project/d89fd3f2-7f40-42ab-885f-d94129c826b5

### Vercel (Static HTML Pages)
- **Purpose:** Task confirmation pages
- **Folder:** `docs/`
- **Config:** `vercel.json`

## Environment Variables (Railway)

Required variables for Railway deployment:

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | production |
| `PORT` | Auto-assigned by Railway |
| `PUBLIC_API_URL` | Railway public URL |
| `GEMINI_API_KEY` | For task translation |
| `URL_SHORTENER_ENABLED` | true |

## Deployment Procedures

### 1. Deploy to Railway (via Git)
```bash
git add .
git commit -m "feat: description"
git push origin master
```
Railway auto-deploys on push to master.

### 2. Check Railway Deployment Status
```bash
# Via browser - Railway dashboard logs
https://railway.com/project/d89fd3f2-7f40-42ab-885f-d94129c826b5/logs
```

### 3. Update Railway Variables
1. Go to Railway dashboard
2. Select "web" service
3. Go to "Variables" tab
4. Add/edit variable
5. Click "Deploy" to apply

### 4. Verify Deployment
```bash
curl -s https://web-production-9e1eb.up.railway.app/api/employees | head -50
```

## Vercel Deployment (Legacy)

For static HTML pages in `docs/`:
```bash
cd docs && vercel --prod
```

Note: Railway deployment handles dynamic HTML generation now.

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 502 Bad Gateway | App crashed | Check Railway logs |
| DB missing | Ephemeral filesystem | Auto-seeds on startup |
| Env vars not working | Not redeployed | Click "Deploy" after changes |
| WhatsApp disconnected | Session lost | Re-scan QR in Railway logs |

## Related Files

- `server/index.js` - Entry point
- `server/database/schema.js` - DB initialization
- `.env` - Local environment (not in git)
