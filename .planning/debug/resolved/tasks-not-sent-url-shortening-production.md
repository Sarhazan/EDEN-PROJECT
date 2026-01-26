---
status: resolved
trigger: "Investigate issue: tasks-not-sent-to-employee-page-url-not-shortened"
created: 2026-01-26T00:00:00Z
updated: 2026-01-26T00:11:00Z
---

## Current Focus

hypothesis: TinyURL's unofficial api-create.php endpoint is deprecated/restricted, causing 400 errors. Switching to is.gd API (free, no auth required, still operational in 2026) will fix the issue.
test: replace TinyURL endpoint with is.gd endpoint (https://is.gd/create.php?format=simple&url={url})
expecting: is.gd will successfully shorten URLs and return shortened links in plain text format
next_action: update urlShortener.js to use is.gd API instead of TinyURL

## Symptoms

expected: When sending tasks from "My Day" page, employees should receive WhatsApp message with shortened URL (TinyURL) linking to interactive task confirmation page

actual: WhatsApp messages are being sent, but contain full Railway URL instead of shortened URL. Tasks may not be reaching the interactive page properly.

errors: User has not checked Railway logs yet - need to investigate logs for errors

reproduction:
1. Go to "My Day" page in the application
2. Send tasks to employees via WhatsApp
3. Check WhatsApp messages received by employees
4. URLs show as full Railway URLs instead of TinyURL shortened links

started: Never worked in production environment (Railway deployment). This is the first production test after recent deployments and API changes.

context:
- Railway deployment on Hobby Plan ($5/month)
- WhatsApp Web.js with Puppeteer
- TinyURL API endpoint: https://tinyurl.com/api-create.php
- URL shortening service: server/services/urlShortener.js
- WhatsApp route: server/routes/whatsapp.js
- Environment: Production (Railway)

## Eliminated

## Evidence

- timestamp: 2026-01-26T00:01:00Z
  checked: server/services/urlShortener.js
  found: URL shortener implementation uses TinyURL API (https://tinyurl.com/api-create.php) with graceful fallback to original URL on failure. Service is enabled by default unless URL_SHORTENER_ENABLED=false. Has 5-second timeout for API calls.
  implication: If TinyURL API fails or times out, the service will silently return the original full Railway URL. This matches the observed behavior.

- timestamp: 2026-01-26T00:02:00Z
  checked: server/routes/whatsapp.js (lines 219-221)
  found: The bulk send endpoint calls urlShortener.shorten(htmlUrl) at line 220 and logs "Shortening URL for WhatsApp..." and "URL to send: {shortUrl}"
  implication: The code is attempting to shorten URLs. If full URLs are being sent, either: (1) TinyURL API is failing/timing out, (2) URL_SHORTENER_ENABLED env var is set to 'false', or (3) urlShortener service is not working properly.

- timestamp: 2026-01-26T00:03:00Z
  checked: server/services/htmlGenerator.js (lines 13-14, 101, 169)
  found: htmlGenerator builds URLs using PUBLIC_API_URL (Railway) or API_URL (fallback). The generated URL format is `${apiUrl}/docs/${filename}` where filename is `task-${token}.html`. HTML files are written to the /docs directory.
  implication: The URL being shortened is a Railway URL pointing to /docs/task-{token}.html. The shortened URL should point to this same destination.

- timestamp: 2026-01-26T00:04:00Z
  checked: server/services/urlShortener.js axios configuration (lines 33-38)
  found: CRITICAL - The axios.get() call has NO User-Agent header. Default axios user-agent is "axios/{version}". The request has minimal configuration: only params {url: longUrl} and timeout 5000ms.
  implication: TinyURL API likely blocks/rejects requests with axios default user-agent (common anti-bot measure). This would trigger catch block (line 48) and return original URL silently. The logs would show "URL shortening failed: {error}" but client gets full URL.

- timestamp: 2026-01-26T00:07:00Z
  checked: Test urlShortener with User-Agent header added
  found: Still getting "Request failed with status code 400" even with browser User-Agent header. TinyURL API returned 400 Bad Request for test URL https://example-railway-app.railway.app/docs/task-12345.html
  implication: User-Agent alone is not sufficient. TinyURL might be validating that the URL is accessible/valid before shortening it, OR there's a different API requirement (rate limiting, URL validation, etc.)

- timestamp: 2026-01-26T00:08:00Z
  checked: Web research on TinyURL api-create.php endpoint and 400 errors
  found: CRITICAL - The api-create.php endpoint is UNOFFICIAL and NOT documented in TinyURL's official API docs. It may have been deprecated or restricted. Official TinyURL API (https://tinyurl.com/app/dev) requires API key with Bearer authentication. Past reports show api-create.php suddenly stopped working (503 errors in 2021).
  implication: The root cause is using an unofficial, potentially deprecated endpoint. The 400 errors indicate the endpoint either no longer accepts unauthenticated requests OR has been shut down/restricted.

- timestamp: 2026-01-26T00:09:00Z
  checked: Web research on is.gd API as replacement
  found: is.gd API (https://is.gd/create.php) is free, requires no authentication, and still operational in 2026. API format: https://is.gd/create.php?format=simple&url={url}. Returns shortened URL in plain text. Intended for low-volume applications with per-IP rate limiting.
  implication: is.gd is a suitable replacement for TinyURL's unofficial endpoint. It meets all requirements: free, no auth, simple implementation.

- timestamp: 2026-01-26T00:10:00Z
  checked: Tested urlShortener.js with is.gd API endpoint
  found: Successfully shortened https://www.google.com to https://is.gd/EuvYes. Successfully shortened Railway-like URL https://example-app.up.railway.app/docs/task-abc123.html to https://is.gd/hZMCDk. Both tests completed in under 2 seconds.
  implication: Fix is VERIFIED locally. is.gd API works perfectly for both standard URLs and Railway deployment URLs. Ready for production deployment.

## Resolution

root_cause: TinyURL's unofficial api-create.php endpoint (https://tinyurl.com/api-create.php) is deprecated or restricted and returns 400 Bad Request errors. This endpoint is not documented in TinyURL's official API and has a history of reliability issues (503 errors in 2021). The official TinyURL API requires API key authentication. When the endpoint fails, urlShortener.shorten() catches the error and returns the original full Railway URL, causing employees to receive unshortened links.

fix: Replaced TinyURL api-create.php with is.gd API (https://is.gd/create.php). Updated server/services/urlShortener.js:
- Changed apiUrl from 'https://tinyurl.com/api-create.php' to 'https://is.gd/create.php'
- Added 'format: simple' parameter to API request
- Updated comments to reflect is.gd usage
- Kept User-Agent header and error handling unchanged

verification: ✓ VERIFIED LOCALLY - Successfully tested URL shortening with both standard URLs (google.com → is.gd/EuvYes) and Railway-like URLs (example-app.up.railway.app → is.gd/hZMCDk). Both tests completed successfully in under 2 seconds. Ready for production deployment.

Next steps for user: (1) Deploy updated code to Railway, (2) Send test task from My Day page, (3) Verify WhatsApp message contains shortened URL in is.gd/xxx format, (4) Verify shortened URL redirects to interactive task confirmation page.

files_changed: ['server/services/urlShortener.js']
