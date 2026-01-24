---
created: 2026-01-25T20:45:00Z
title: Replace localhost URLs with public shortened URLs for employee pages
area: infrastructure
files:
  - server/routes/whatsapp.js
  - server/routes/taskConfirmation.js
  - server/services/htmlGenerator.js
---

## Problem

Currently, employee task confirmation links use localhost URLs (e.g., `http://localhost:5174/confirm/abc123`), which only work on the local development machine. These links are sent via WhatsApp to employees and need to be publicly accessible.

The user requested: "צריך להחליף את כתובת השרת המקומי לכתובת מקוצרת ציבורית ניתנת ללחיצה שתעביר לדף העובד" (Need to replace the local server address with a public shortened clickable URL that will lead to the employee page)

## Solution

1. **Deploy application to public hosting** (Render, Railway, Vercel, Heroku, etc.)
2. **Update URL generation logic** to use production domain:
   - Set `PUBLIC_URL` or `BASE_URL` environment variable
   - Update WhatsApp message link generation in `server/routes/whatsapp.js`
   - Update confirmation link generation in `server/routes/taskConfirmation.js`
   - Update HTML generator links in `server/services/htmlGenerator.js`
3. **Optional: URL shortening service**:
   - Integrate with Bitly, TinyURL, or custom shortener
   - Generate short URLs for cleaner WhatsApp messages
   - Track click analytics
4. **Update environment configuration**:
   - Development: use `http://localhost:5174`
   - Production: use public domain (e.g., `https://eden-maintenance.onrender.com`)

TBD: Choose hosting provider and decide whether URL shortening is necessary or if clean domain is sufficient.
