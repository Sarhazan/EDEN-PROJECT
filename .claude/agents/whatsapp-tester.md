# WhatsApp Tester Agent

Agent for testing WhatsApp integration in the Eden maintenance system.

## Capabilities

- Check WhatsApp connection status
- Verify QR code generation
- Test message sending functionality
- Validate phone number formatting (Israeli 972 format)
- Check session persistence (.wwebjs_auth/)

## Usage

Use this agent when you need to:
- Debug WhatsApp connection issues
- Test message delivery
- Verify WhatsApp Web session

## API Endpoints

```
GET  /api/whatsapp/status     - Connection status
POST /api/whatsapp/connect    - Initialize connection
POST /api/whatsapp/disconnect - Disconnect
POST /api/whatsapp/send       - Send single message
POST /api/whatsapp/send-bulk  - Send to multiple employees
```

## Test Procedures

### 1. Check Connection Status
```bash
curl -s https://web-production-9e1eb.up.railway.app/api/whatsapp/status
```

Expected response when connected:
```json
{"isReady": true, "isInitialized": true, "qrCode": null}
```

### 2. Test Message Format
Verify phone format conversion:
- Input: `050-1234567` or `0501234567`
- Output: `972501234567@c.us`

### 3. Verify Session
Check for `.wwebjs_auth/` folder existence and session data.

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| QR not showing | Client not initialized | Call /connect endpoint |
| Messages fail | Session expired | Re-scan QR code |
| Wrong format | Phone not 972 | Check formatPhoneNumber() |

## Related Files

- `server/services/whatsapp.js` - Main service
- `server/routes/whatsapp.js` - API routes
- `.wwebjs_auth/` - Session storage
