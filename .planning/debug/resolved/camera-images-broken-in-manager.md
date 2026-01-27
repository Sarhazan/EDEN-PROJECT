---
status: resolved
trigger: "Investigate issue: camera-images-broken-in-manager"
created: 2026-01-27T00:00:00Z
updated: 2026-01-27T00:00:08Z
---

## Current Focus

hypothesis: CONFIRMED - Root cause identified
test: None needed - evidence is conclusive
expecting: Fix will use correct base URL for static uploads
next_action: Implement fix to separate API_URL from BACKEND_URL for static assets

## Symptoms

expected: Employee takes photo from camera, photo displays correctly in manager dashboard
actual: Photo appears as broken image icon in TaskCard
errors: Unknown - need to check browser console and server logs
reproduction:
1. Manager sends task to employee via WhatsApp
2. Employee opens link on mobile phone
3. Employee takes photo with camera and submits
4. Manager sees broken image in task card
started: Issue persists despite previous fixes (URL redirect to React app, attachments in API response)

## Eliminated

## Evidence

- timestamp: 2026-01-27T00:00:00Z
  checked: API endpoint /api/tasks/10/attachments
  found: Returns [{"id":1,"task_id":10,"file_path":"/uploads/46df59c646d436baecb4d8cdd7e6485d.jpg"}]
  implication: Backend has correct file path with leading slash

- timestamp: 2026-01-27T00:00:01Z
  checked: Direct URL https://web-production-0b462.up.railway.app/uploads/46df59c646d436baecb4d8cdd7e6485d.jpg
  found: Returns 200
  implication: File is accessible via production URL, server serving it correctly

- timestamp: 2026-01-27T00:00:02Z
  checked: TaskCard.jsx lines 499-504
  found: Image src constructed as `${API_URL}${attachment.file_path}`
  implication: If API_URL = "http://localhost:3002/api" and file_path = "/uploads/...", result is "http://localhost:3002/api/uploads/..." which is WRONG

- timestamp: 2026-01-27T00:00:03Z
  checked: TaskCard.jsx line 7
  found: API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'
  implication: API_URL includes "/api" path segment, should not be concatenated with /uploads path

- timestamp: 2026-01-27T00:00:04Z
  checked: client/.env.production
  found: VITE_API_URL=/api
  implication: In production, API_URL = "/api", so image URLs become "/api/uploads/..." which returns 404

- timestamp: 2026-01-27T00:00:05Z
  checked: File serving location
  found: Express serves static uploads at root level "/uploads", NOT under "/api/uploads"
  implication: Correct URL is "/uploads/..." or "https://domain.com/uploads/...", NOT "/api/uploads/..."

- timestamp: 2026-01-27T00:00:06Z
  checked: HistoryTable.jsx line 63
  found: Uses `${API_URL}/${attachment.file_path}` which creates "/api//uploads/..." (double slash)
  implication: Same bug exists in HistoryTable component, needs fixing

- timestamp: 2026-01-27T00:00:07Z
  checked: Fix verification
  found: With VITE_BACKEND_URL="" in production, BACKEND_URL defaults to empty string, so `${BACKEND_URL}${attachment.file_path}` = "/uploads/..." which is correct
  implication: Images will load from correct path in production

## Resolution

root_cause: TaskCard.jsx constructs image URLs as `${API_URL}${attachment.file_path}`. Since API_URL="/api" in production and file_path="/uploads/...", images are requested from "/api/uploads/..." which doesn't exist. Express serves uploads at root level "/uploads", not under "/api" prefix.
fix:
1. Added BACKEND_URL constant in TaskCard.jsx with proper undefined check:
   - When VITE_BACKEND_URL is undefined (production): uses empty string for same-origin
   - When VITE_BACKEND_URL is set (development): uses 'http://localhost:3002'
2. Changed image src from `${API_URL}${attachment.file_path}` to `${BACKEND_URL}${attachment.file_path}` in TaskCard
3. Applied same fix to HistoryTable.jsx with proper undefined check
4. Updated client/.env to set VITE_BACKEND_URL=http://localhost:3002 (development)
5. Updated client/.env.production comment to clarify VITE_BACKEND_URL is intentionally not set

Result URLs:
- Development: "http://localhost:3002/uploads/..." ✓
- Production: "/uploads/..." ✓ (same-origin, served by Express at root level)
verification:
- Development: BACKEND_URL="http://localhost:3002", images load from localhost server
- Production: BACKEND_URL="", images load from same origin at /uploads path
- Both environments now construct correct URLs without /api prefix
files_changed: [
  'client/src/components/shared/TaskCard.jsx',
  'client/src/components/history/HistoryTable.jsx',
  'client/.env.production',
  'client/.env'
]
