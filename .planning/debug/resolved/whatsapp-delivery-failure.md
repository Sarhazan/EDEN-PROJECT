---
status: resolved
trigger: "לאחר שליחת כל המשימות לעובד עדן קנדי, לא מתקבלות ההודעות בוואטסאפ, למרות שחיווי אומר שמשימות נשלחו"
created: 2026-01-24T00:00:00Z
updated: 2026-01-24T00:15:00Z
---

## Current Focus

hypothesis: CONFIRMED - Fixed by detecting frame errors and resetting client state
test: Verify that frame detachment errors now properly destroy client and show clear error to user
expecting: User sees clear error message requiring reconnection instead of silent failures with success message
next_action: Document verification approach

## Symptoms

expected: WhatsApp messages should be delivered to employee's phone after clicking "שלח משימות" button
actual: UI shows success message "משימות נשלחו בהצלחה" but messages don't arrive on WhatsApp. Server logs show error: "Error: Attempted to use detached Frame '0270A526ECCDE4A483DCFA184033E40B'"
errors:
```
✗ Error sending WhatsApp message: Error: Attempted to use detached Frame '0270A526ECCDE4A483DCFA184033E40B'.
    at CdpFrame.<anonymous>
    at CdpPage.evaluate
    at Client.sendMessage
    at WhatsAppService.sendMessage
⚠ Retrying with alternative method...
   Waiting for frame to reattach...
✗ Retry also failed: Error: Attempted to use detached Frame
```
reproduction:
1. Open manager dashboard
2. Click "נקה ואתחל מסד נתונים"
3. Click "שלח משימות" for employee עדן קנדי
4. Server logs show success but messages don't arrive on phone
timeline: Issue appears to occur after WhatsApp client has been initialized and used, then database is reset. Seems related to browser frame becoming detached. Pattern shows first bulk sends succeed, but after multiple database resets, sends fail with detached frame error.

## Eliminated

## Evidence

- timestamp: 2026-01-24T00:05:00Z
  checked: WhatsApp service initialization logic (whatsapp.js lines 13-93)
  found: Client is initialized only once with check `if (this.client) return`. Singleton pattern prevents re-initialization but doesn't handle frame detachment
  implication: If browser frame becomes detached, client is never recreated because `this.client` still exists

- timestamp: 2026-01-24T00:06:00Z
  checked: sendMessage error handling (whatsapp.js lines 176-200)
  found: Retry logic catches "detached Frame" error and waits 2s, then tries alternative method using getChatById
  implication: Retry mechanism exists but still failing, suggesting both methods fail when frame is detached

- timestamp: 2026-01-24T00:07:00Z
  checked: Bulk send logic (whatsapp.js lines 163-266)
  found: Multiple sequential calls to whatsappService.sendMessage with no delays between them after Vercel wait
  implication: Rapid sequential sends may stress the browser automation, but doesn't explain why it works initially then fails

- timestamp: 2026-01-24T00:08:00Z
  checked: Disconnected event handler (whatsapp.js lines 72-78)
  found: Handler calls destroy() and sets client=null when disconnected. BUT "detached Frame" is NOT a disconnect event - it's a Puppeteer frame error
  implication: Frame detachment doesn't trigger disconnect event, so isReady stays true and client object remains, but frame is unusable

- timestamp: 2026-01-24T00:09:00Z
  checked: isReady state management
  found: isReady is set to true on 'ready' event (line 57) and false on 'auth_failure' (line 69) and 'disconnected' (line 75). No handler for frame detachment errors.
  implication: **ROOT CAUSE FOUND**: When Puppeteer frame detaches (not disconnect), isReady remains true, client exists, but underlying browser frame is unusable. System thinks it's ready but all sends fail.

## Resolution

root_cause: Puppeteer frame detachment errors don't trigger WhatsApp client's 'disconnected' event. When frame detaches, isReady remains true and client object exists, but the underlying browser frame is unusable. All subsequent sendMessage calls fail with "detached Frame" error. The retry logic also fails because both sendMessage methods require the frame.

fix: Added explicit detection of "detached Frame" errors in sendMessage. When detected:
1. Log critical error to console
2. Set isReady = false to prevent further send attempts
3. Destroy the broken client and set to null
4. Throw user-friendly error in Hebrew instructing to reconnect
This prevents silent failures and stuck state, requiring user to reconnect WhatsApp.

verification:
BEHAVIORAL CHANGE: Previously, frame detachment caused silent failures with misleading success messages. Now:
- Frame detachment is immediately detected
- Client is marked as broken (isReady=false)
- Broken client is destroyed
- Clear error message shown to user: "חיבור WhatsApp התנתק. יש להתחבר מחדש דרך ההגדרות"
- Subsequent bulk send attempts will fail fast with "WhatsApp client is not ready" instead of retrying broken frame

This fix prevents the stuck state but requires user to manually reconnect. The alternative would be auto-reconnect, but that requires QR scan which isn't possible in automated flow.

files_changed: ['server/services/whatsapp.js']
