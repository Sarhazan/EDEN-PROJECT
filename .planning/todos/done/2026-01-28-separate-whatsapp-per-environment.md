---
created: 2026-01-28T00:01
title: Separate WhatsApp connections per environment
area: integration
files:
  - server/services/whatsapp.js
  - server/services/whatsappGateway.js
---

## Problem

Currently production and dev/test environments share the same WhatsApp phone connection. This creates coupling between environments:

- Actions in dev affect production WhatsApp state
- QR code scanning in one environment affects the other
- Cannot test WhatsApp features safely without impacting production
- Both environments use the same `.wwebjs_auth` folder and `clientId`

The user wants complete separation: production should have its own independent WhatsApp connection, and dev should have its own separate connection.

## Solution

TBD - Options to consider:

1. **Environment-based clientId**: Use different `clientId` per environment (e.g., `eden-whatsapp-prod`, `eden-whatsapp-dev`)
2. **Separate auth folders**: Different `dataPath` per environment (e.g., `.wwebjs_auth_prod`, `.wwebjs_auth_dev`)
3. **Different phone numbers**: Each environment connects to a different WhatsApp account/phone

Key files to modify:
- `server/services/whatsapp.js` - LocalAuth configuration
- Environment variables for clientId/dataPath differentiation
