---
created: 2026-01-25T19:35:00Z
title: Use consistent port for entire project
area: infrastructure
files:
  - server/index.js
  - client/src/context/AppContext.jsx
  - .env
---

## Problem

Currently the project uses inconsistent port configuration. The server may run on different ports (3001 or 3002) and the client needs to know which port to connect to. This creates confusion and potential connection issues.

The user requested: "צריך להשתמש בפוקט קבוע לכל הפרויקט" (Need to use a consistent port for the entire project)

## Solution

1. Define a single port in environment variable (e.g., PORT=3001 or PORT=3002)
2. Update server/index.js to use process.env.PORT with a clear default
3. Update client API_URL and SOCKET_URL to use the same consistent port
4. Document the port in README
5. Consider using dotenv for environment variable management
6. Ensure both Express server and Socket.IO server use the same port

TBD: Decide on standard port (3001 or 3002) and update all configuration files.
