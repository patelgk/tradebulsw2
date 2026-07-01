# Proprupee Trading App

Full-stack trading dashboard with Express, Socket.IO, MongoDB, Dhan market feed, and a Vite/React frontend.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and fill required values.

3. Start frontend and backend together:

```bash
npm run dev
```

## Production Deploy

Use a long-running Node web service such as Render, Railway, or Fly.io. Static-only hosting and serverless-only hosting are not recommended because the app uses Socket.IO and a persistent market-feed process.

Build command:

```bash
npm ci && npm run build
```

Start command:

```bash
npm start
```

Required production environment variables:

```env
NODE_ENV=production
MONGODB_URI=
DHAN_CLIENT_ID=
DHAN_ACCESS_TOKEN=
ENABLE_MARKET_SIMULATOR=false
TEST_MODE=false
DISABLE_DHAN_WS=false
DISABLE_DHAN_AUTOFETCH=false
```

Optional email variables:

```env
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
ADMIN_EMAIL=
```

## Deployment Notes

- Do not commit `.env`.
- Do not expose Dhan tokens with a `VITE_` prefix.
- Keep `ENABLE_MARKET_SIMULATOR=false` and `TEST_MODE=false` in production.
- Make sure MongoDB Atlas allows connections from the deployment platform.
- If any old Dhan or Upstox token was committed or shared, rotate it before deployment.
