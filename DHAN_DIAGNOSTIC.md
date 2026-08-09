# Dhan Diagnostic Tool

Test Dhan market feed connection and data reception.

## Quick Start

### Via API
```bash
# Start test
curl -X POST "http://localhost:3000/api/admin/dhan/diagnostic/start?adminEmail=kushwahgourav2018@gmail.com"

# Check status
curl "http://localhost:3000/api/admin/dhan/diagnostic/status?adminEmail=kushwahgourav2018@gmail.com&sessionId=<sessionId>"

# List sessions
curl "http://localhost:3000/api/admin/dhan/diagnostic/sessions?adminEmail=kushwahgourav2018@gmail.com"

# Clear old sessions
curl -X DELETE "http://localhost:3000/api/admin/dhan/diagnostic/clear?adminEmail=kushwahgourav2018@gmail.com"
```

### Via CLI Script
```bash
npx tsx DHAN_DIAGNOSTIC_TEST.ts
```

## Features

- ✅ Tests WebSocket connection
- ✅ Verifies authentication
- ✅ Tests instrument subscriptions
- ✅ Receives live market data
- ✅ Zero impact on production
- ✅ Admin-only access
- ✅ In-memory sessions (no DB)

## Files

- `routes/dhanDiagnosticRoutes.ts` - API endpoints
- `DHAN_DIAGNOSTIC_TEST.ts` - CLI test script
- `server.ts` - Route registration (lines 28, 1350)

## Status

✅ Production Ready | Minimal Risk | Zero Data Impact
