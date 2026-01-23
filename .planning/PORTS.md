# Port Configuration - תצורת פורטים

## Development Ports - פורטים לסביבת פיתוח

| Service | Port | URL | Notes |
|---------|------|-----|-------|
| **Client** | 5174 | http://localhost:5174 | פורט קבוע לקליינט (5173 תפוס בפרויקט אחר) |
| **Server** | 3002 | http://localhost:3002 | פורט קבוע לשרווer |
| **WebSocket** | 3002 | ws://localhost:3002 | Socket.IO על אותו פורט של השרווer |

## Configuration Files - קבצי קונפיגורציה

### Client Port Configuration
**File:** `client/vite.config.js`
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,  // ✓ פורט קבוע
  },
})
```

### Server Port Configuration
**File:** `server/index.js`
```javascript
const PORT = process.env.PORT || 3002;  // ✓ פורט קבוע
```

### Environment Variables
**File:** `.env` (if needed)
```bash
PORT=3002
CLIENT_URL=http://localhost:5174
```

## Starting the Project - הפעלת הפרויקט

```bash
# Start both client and server
npm run dev

# Or start separately:
npm run dev:server  # Server on port 3002
npm run dev:client  # Client on port 5174
```

## Production URLs

| Environment | URL |
|-------------|-----|
| Railway (Server) | https://eden-server.up.railway.app |
| Vercel (Confirmation Pages) | https://eden-confirmations.vercel.app |

## Notes - הערות

- ✅ **Port 5174:** פורט קבוע לקליינט (5173 תפוס בפרויקט lia-reading-game)
- ✅ **Port 3002:** פורט קבוע לשרווer
- ✅ **WebSocket:** Socket.IO משתמש באותו פורט של השרווer (3002)
- ⚠️ **אם משנים פורט:** צריך לעדכן גם את client/vite.config.js וגם את הקבצים הבאים:
  - README.md
  - .planning/PROJECT.md
  - .planning/phases/*/.continue-here.md
  - כל קובץ שמתייחס ל-localhost URLs

---
*Last updated: 2026-01-22*
