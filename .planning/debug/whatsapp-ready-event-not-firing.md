---
status: verifying
trigger: "After linking WhatsApp device (scanning QR), the app stays stuck at 'QR scanned! Waiting for connection verification' and never transitions to 'connected' status. The ready event from whatsapp-web.js never fires after authenticated event."
created: 2026-01-28T12:00:00Z
updated: 2026-01-28T12:15:00Z
---

## Current Focus

hypothesis: CONFIRMED - webVersionCache URL points to non-existent repo (404), causing ready event to never fire
test: Fix applied - replaced broken URL with wppconnect-team/wa-version
expecting: After deployment, WhatsApp should show ready event after authentication
next_action: Deploy to Railway and verify ready event fires after QR scan

## Symptoms

expected: After scanning QR code, UI should show "connected" status (מחובר לוואטסאפ בהצלחה)
actual: UI stays stuck at "QR נסרק! מאתחל את החיבור..." - never changes to connected
errors: Railway logs show "WhatsApp authenticated successfully" but NEVER show "WhatsApp client is ready!"
reproduction: 1. Go to Settings page, 2. Click connect to WhatsApp, 3. Scan QR code with phone, 4. QR disappears, message says "waiting for verification", 5. Never progresses to "connected"
started: Ongoing issue. Recent fix attempted (commit ee77d77) with @sparticuz/chromium, webVersionCache, and timeout detection, but issue persists

## Eliminated

## Evidence

- timestamp: 2026-01-28T12:01:00Z
  checked: server/services/whatsapp.js implementation
  found: |
    - Using whatsapp-web.js v1.34.4
    - Using LocalAuth strategy with env-specific paths
    - Has webVersionCache pointing to remote URL: https://raw.githubusercontent.com/AkhilDeveloperv/whatsapp-web-version/main/webVersion.json
    - Has authenticated/ready event handlers properly set up
    - Has loading_screen event handler
    - Production uses @sparticuz/chromium
    - authTimeoutMs: 120000 set
    - Client events: qr, ready, authenticated, disconnected, loading_screen, auth_failure, remote_session_saved
  implication: Implementation looks correct but webVersionCache URL may be unreliable third-party source

- timestamp: 2026-01-28T12:05:00Z
  checked: GitHub issues for whatsapp-web.js ready event not firing
  found: |
    - This is a WELL-KNOWN, ONGOING ISSUE with whatsapp-web.js v1.34.x
    - GitHub issues #3830, #3914, #5682, #2458 all report same symptom
    - Issue #3181: "Ready event is broken" - authenticated fires but ready never does
    - Issue #5682: Even fix-ready-event branch has issues (LOGOUT immediately after ready)
    - Common causes: webVersionCache misconfiguration, WhatsApp Web version incompatibility
    - Recommended: Use wppconnect-team/wa-version for webVersionCache, or try specific branches
    - Version 1.34.4 is NOT the latest (1.34.5-alpha.3 and 2.0.0-alpha.0 exist)
  implication: The third-party webVersionCache URL is likely unreliable; need official/maintained source

- timestamp: 2026-01-28T12:10:00Z
  checked: Current webVersionCache URL accessibility
  found: |
    - curl "https://raw.githubusercontent.com/AkhilDeveloperv/whatsapp-web-version/main/webVersion.json" returns 404 Not Found
    - GitHub API confirms repo "AkhilDeveloperv/whatsapp-web-version" does NOT EXIST (404)
    - The webVersionCache URL in current code is BROKEN - the repo was deleted or moved
  implication: ROOT CAUSE CONFIRMED - webVersionCache points to non-existent repo, causing version fetch failure

- timestamp: 2026-01-28T12:11:00Z
  checked: Alternative webVersionCache sources
  found: |
    - wppconnect-team/wa-version repo EXISTS and is actively maintained
    - Contains many versions including latest: 2.3000.1032534684-alpha.html
    - URL https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1032534684-alpha.html returns HTTP 200 OK
    - This is the OFFICIAL recommended source for WhatsApp Web version caching
  implication: Must switch from broken third-party URL to maintained wppconnect-team source

## Resolution

root_cause: |
  The webVersionCache remote URL (https://raw.githubusercontent.com/AkhilDeveloperv/whatsapp-web-version/main/webVersion.json)
  points to a DELETED/NON-EXISTENT GitHub repository. When whatsapp-web.js tries to fetch the web version,
  it fails silently or falls back to an incompatible version, causing the ready event to never fire
  after authentication completes.

fix: |
  Replace the broken webVersionCache URL with the official wppconnect-team/wa-version repository URL.
  Use a specific known-working version: https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1032534684-alpha.html

  Changes made to server/services/whatsapp.js:
  1. Changed webVersionCache.remotePath from broken AkhilDeveloperv URL to wppconnect-team URL
  2. Added comment explaining the source
  3. Added change_state event handler for better debugging
  4. Added log line showing which webVersionCache is being used

verification: PENDING - requires deployment to Railway and testing WhatsApp connection
files_changed:
  - server/services/whatsapp.js
