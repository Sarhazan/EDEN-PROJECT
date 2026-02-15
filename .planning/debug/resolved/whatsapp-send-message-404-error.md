---
status: resolved
trigger: "whatsapp-send-message-404-error"
created: 2026-01-25T00:00:00Z
updated: 2026-01-25T00:00:00Z
symptoms_prefilled: true
---

## Current Focus

hypothesis: CONFIRMED - Double /api in URL path
test: Fixing incorrect URL construction in affected files
expecting: Remove /api/ prefix from files that add it (since VITE_API_URL already includes /api)
next_action: Fix all instances of ${API_URL}/api/ by removing the redundant /api/ prefix

## Symptoms

expected: ההודעה אמורה להישלח לעובד ולהופיע סטטוס 'נשלח'
actual: הופיעה שגיאה 404 (Request failed with status code 404)
errors: Request failed with status code 404
reproduction:
1. התחבר לוואטסאפ (הצליח)
2. נסה לשלוח הודעה למשימה
3. מקבל שגיאת 404
timeline: עבד בעבר, הפסיק לעבוד היום (לאחר התיקונים שעשינו לוואטסאפ RemoteAuth)

## Eliminated

## Evidence

- timestamp: 2026-01-25T00:05:00Z
  checked: Routes registration in server/index.js and server/routes/whatsapp.js
  found: Route is registered as app.use('/api/whatsapp', require('./routes/whatsapp')) and POST /send endpoint exists at line 109
  implication: The endpoint SHOULD be available at /api/whatsapp/send - route definition looks correct

- timestamp: 2026-01-25T00:06:00Z
  checked: Client code in TaskCard.jsx line 103
  found: Client is calling axios.post(`${API_URL}/api/whatsapp/send`, {...})
  implication: Client is calling the correct path

- timestamp: 2026-01-25T00:07:00Z
  checked: Git history - recent WhatsApp commits
  found: Recent commits include RemoteAuth implementation, MongoDB session persistence, and various fixes
  implication: Timeline matches user's report that it stopped working after RemoteAuth modifications

- timestamp: 2026-01-25T00:08:00Z
  checked: client/.env file
  found: VITE_API_URL=http://localhost:3002/api (includes /api suffix)
  implication: This is problematic

- timestamp: 2026-01-25T00:09:00Z
  checked: TaskCard.jsx line 103 URL construction
  found: axios.post(`${API_URL}/api/whatsapp/send`, ...) where API_URL is from VITE_API_URL
  implication: Final URL becomes http://localhost:3002/api/api/whatsapp/send (double /api) - THIS IS THE BUG!

- timestamp: 2026-01-25T00:10:00Z
  checked: server listening on port
  found: Server is on port 3002, status endpoint works at /api/whatsapp/status
  implication: Server is working correctly, the issue is client URL construction

## Resolution

root_cause: Double /api in URL path. VITE_API_URL is set to "http://localhost:3002/api" but client code appends "/api/whatsapp/send", resulting in "/api/api/whatsapp/send" which returns 404

fix: Removed redundant /api/ prefix from all client-side API calls. Changed ${API_URL}/api/... to ${API_URL}/... to match the fact that VITE_API_URL already includes /api

verification:
  - Verified TaskCard.jsx now calls ${API_URL}/whatsapp/send (was ${API_URL}/api/whatsapp/send)
  - With VITE_API_URL=http://localhost:3002/api, final URL is now http://localhost:3002/api/whatsapp/send (correct)
  - Previously was http://localhost:3002/api/api/whatsapp/send (404 error)
  - Fix verified in all 6 affected files
  - All instances of ${API_URL}/api/ pattern removed from client code

files_changed:
  - client/src/components/shared/TaskCard.jsx
  - client/src/pages/HistoryPage.jsx
  - client/src/pages/LocationsPage.jsx
  - client/src/pages/MyDayPage.jsx
  - client/src/pages/TaskConfirmationPage.jsx
  - client/src/components/forms/LocationForm.jsx
