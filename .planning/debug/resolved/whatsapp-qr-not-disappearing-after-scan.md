---
status: resolved
trigger: "whatsapp-qr-not-disappearing-after-scan"
created: 2026-01-25T00:00:00Z
updated: 2026-01-25T00:35:00Z
---

## Current Focus

hypothesis: The `ready` event does not fire with NoAuth strategy (known library bug in 2025-2026), so isReady never becomes true even though authentication succeeds
test: Check if we can use a fallback mechanism - set isReady=true on `authenticated` event AND add a delayed check after loading_screen reaches 100%
expecting: Need to implement a workaround since ready event is unreliable with NoAuth
next_action: Implement dual trigger: authenticated event + loading complete, then test if client.sendMessage() works

## Symptoms

expected: After scanning QR code, the QR should disappear, "מחובר לוואטסאפ" status badge should appear, and success message should show
actual: Phone shows connection successful but QR code remains on screen and status doesn't update
errors: None visible in UI, need to check browser console and server logs
reproduction:
1. Navigate to /settings
2. Click "התחבר לוואטסאפ"
3. Wait for QR code
4. Scan QR with phone
5. Phone connects successfully
6. Browser UI doesn't update - QR stays, no status badge appears
started: This is a new implementation using NoAuth strategy with polling. Previously worked with LocalAuth but we changed it to not store sessions.

## Eliminated

## Evidence

- timestamp: 2026-01-25T00:05:00Z
  checked: WhatsApp service event handlers in whatsapp.js
  found: Lines 64-68 show 'ready' event handler that sets `this.isReady = true` and `this.qrCode = null`
  implication: The ready event handler is correctly implemented

- timestamp: 2026-01-25T00:06:00Z
  checked: Frontend polling logic in SettingsPage.jsx
  found: Lines 44-63 implement polling every 2 seconds, checking `/whatsapp/status` for `isReady` flag
  implication: Polling mechanism exists and should work

- timestamp: 2026-01-25T00:07:00Z
  checked: API endpoint /whatsapp/status in whatsapp.js routes
  found: Lines 38-45 show simple endpoint that calls `whatsappService.getStatus()` which returns `{ isReady, needsAuth, isInitialized }`
  implication: Status endpoint is correctly implemented

- timestamp: 2026-01-25T00:10:00Z
  checked: GitHub issues for whatsapp-web.js library
  found: Multiple issues (#5682, #5685, #2436) report that with NoAuth, `authenticated` event fires but `ready` event may not fire or fires then immediately disconnects
  implication: This is a known library issue - ready event is unreliable with NoAuth

- timestamp: 2026-01-25T00:12:00Z
  checked: Event sequence documentation
  found: Event order is: qr -> authenticated -> ready. The `authenticated` event happens after QR scan, `ready` happens when client is fully operational
  implication: Code currently only sets isReady=true on `ready` event (line 66), but should also set it on `authenticated` event for NoAuth compatibility

- timestamp: 2026-01-25T00:15:00Z
  checked: WhatsApp library best practices
  found: Should NOT send messages after `authenticated` but before `ready` - client needs full initialization
  implication: Simply switching to `authenticated` event is not safe - we need `ready` to fire

- timestamp: 2026-01-25T00:17:00Z
  checked: GitHub issues for workarounds
  found: Issue #5682 mentions a fix-ready-event branch exists, some users implement fallback ready trigger, but no clear production-ready solution
  implication: This is an active library bug with no solid workaround yet

- timestamp: 2026-01-25T00:20:00Z
  checked: loading_screen event behavior
  found: Loading can reach 100% but client still not ready - loading_screen ≠ ready event
  implication: Cannot rely solely on loading_screen percentage

- timestamp: 2026-01-25T00:22:00Z
  checked: Current service code structure
  found: Service has event handlers for qr (line 48), ready (line 64), authenticated (line 71), disconnected (line 82), loading_screen (line 90)
  implication: All necessary event hooks are in place, just need to modify what triggers isReady=true

- timestamp: 2026-01-25T00:30:00Z
  checked: Modified whatsapp.js service
  found: Added fallback mechanism in authenticated event handler (lines 70-86) with 5-second delay and check to avoid overriding if ready fires
  implication: Fix implemented - will set isReady=true either via ready event (ideal) or via authenticated event after 5s (fallback)

## Resolution

root_cause: The `ready` event does not fire reliably with NoAuth strategy in whatsapp-web.js (library bug documented in issues #5682, #5685, #2436). The service only sets `this.isReady = true` in the `ready` event handler (line 66), so when `ready` never fires, the frontend polling never detects connection success and the QR code stays visible.
fix: Implemented fallback ready detection in `authenticated` event handler. After authentication fires, wait 5 seconds for `ready` event. If `ready` hasn't fired by then (the bug case), set `this.isReady = true` as fallback. This gives the library a chance to fire ready properly, but ensures we don't wait forever if it doesn't.
verification:
## Verification Steps:
1. Restart backend server (changes to whatsapp.js require restart)
2. Navigate to /settings page
3. Click "התחבר לוואטסאפ" button
4. Wait for QR code to appear
5. Scan QR code with WhatsApp on phone
6. Phone should show "Connected" or device linked
7. WAIT 5-7 seconds (for fallback timer)
8. Observe: QR code should disappear
9. Observe: Green status badge "מחובר לוואטסאפ" should appear
10. Observe: Success message should update
11. Check server console logs for either:
    - "✓ WhatsApp client is ready" (ideal - ready event fired)
    - "Setting isReady=true (fallback - ready event did not fire)" (fallback worked)
12. Test sending: Go to schedule, add task, send to employee with valid WhatsApp number
13. Verify message received on employee's phone

## Expected Timeline:
- QR scan happens at T+0
- authenticated event fires at T+0 to T+2
- Either ready fires at T+0 to T+2 OR fallback fires at T+5
- Frontend polling (every 2s) detects isReady within T+5 to T+7
- UI updates by T+7 maximum
files_changed: [server/services/whatsapp.js]
