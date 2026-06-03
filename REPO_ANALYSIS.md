# Repository Analysis

## 1. Complete Folder Structure

- `.env.example`
- `.gitignore`
- `.vscode`
  - `launch.json`
- `README.md`
- `db.ts`
- `index.html`
- `metadata.json`
- `package.json`
- `package-lock.json`
- `server.ts`
- `tsconfig.json`
- `vercel.json`
- `vite.config.ts`
- `scripts`
  - `dev.ps1`
- `controllers`
  - `dhanController.ts`
- `routes`
  - `dhanRoutes.ts`
- `services`
  - `dhanService.ts`
- `src`
  - `api.ts`
  - `App.tsx`
  - `db.client.ts`
  - `dhanService.ts`
  - `index.css`
  - `main.tsx`
  - `types.ts`
  - `vite-env.d.ts`
  - `components`
    - `LandingPage.tsx`

## 2. Frontend Framework

- React (React 19)
- Vite as frontend bundler/dev server
- Tailwind CSS via `@tailwindcss/vite`
- `src/main.tsx`, `src/App.tsx`, `src/components/LandingPage.tsx` are React + TSX files
- `package.json` includes `react`, `react-dom`, `@vitejs/plugin-react`, and `vite`

## 3. Backend Framework

- Express.js web server in `server.ts`
- `package.json` includes `express`, `cors`, `mongoose`, `ws`, `socket.io`, `nodemailer`
- `server.ts` also uses `dotenv`, `http`, `vite` server middleware, `mongoose` for MongoDB, and `socket.io`
- Backend runtime uses `tsx` via `server.ts` and `package.json` scripts

## 4. All API Routes

### Dhan routes (`routes/dhanRoutes.ts`) mounted on `/` and `/api`
- `GET /test`
- `GET /funds`
- `POST /option-chain`

### Server routes in `server.ts`
- `GET /api/health`
- `GET /api/market/quotes`
- `GET /api/debug/market-status`
- `GET /api/market/status`
- `GET /api/market/dhan/status`
- `GET /api/users`
- `GET /api/users/:uid`
- `POST /api/users`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/admin-login`
- `GET /api/trades`
- `POST /api/trades`
- `PUT /api/trades/:id`
- `GET /api/challenges`
- `POST /api/challenges`
- `DELETE /api/challenges/:id`
- `GET /api/rules`
- `POST /api/rules`
- `DELETE /api/rules/:id`
- `GET /api/settings/:id`
- `POST /api/settings/:id`
- `GET /api/transactions`
- `POST /api/transactions`
- `POST /api/market/dhan/connect`
- `POST /api/market/dhan/reconnect`
- `POST /api/market/expiry`
- `GET /api/market/history/:symbol`

### Error handlers
- `app.use("/api/*", ...)` returns 404 JSON for unmatched API routes
- `app.use("/api", ...)` global JSON error handler

## 5. WebSocket Implementations

### Server-side WebSockets
- `services/dhanService.ts` uses native `ws` to connect to Dhan live feed (`WebSocket` from `ws`)
- `server.ts` also imports `ws` and contains a Dhan WebSocket manager / reconnect logic
- `server.ts` creates a `socket.io` server instance and emits events like `marketUpdate`

### Client-side WebSockets
- `src/App.tsx` imports `socket.io-client` and creates a socket connection to receive live updates
- `src/App.tsx` listens for `marketStatus` and `marketUpdate`
- `vite.config.ts` proxies `/socket.io` with `ws: true`
- `vercel.json` includes `/socket.io` proxy configuration

## 6. Market Data Services

- `services/dhanService.ts`
  - Dhan API base URL: `https://api.dhan.co/v2`
  - Dhan WebSocket URL: `wss://api-feed.dhan.co`
  - `getFunds()` and `getOptionChain()` implementations
  - `connectWebSocket()` to subscribe to Nifty 50 live quotes

- `server.ts`
  - `marketData` object stores instruments like `Nifty 50`, `Bank Nifty`, `Fin Nifty`, `Midcap Nifty`, `RELIANCE`
  - `fetchMarketData()` and `updateSettings()` manage market feed state and polling
  - `dhanManager.fetchOptionChain(...)` and `dhanManager.getHistory(...)`
  - broadcasting live updates via `socket.io`
  - helper functions for `isMarketOpen()`, `getNextExpiry()`, and `generateOptionChain()`

- `src/api.ts`
  - client-side API wrapper for `/api/market/*` endpoints and general app data routes

- `.env.example`
  - Dhan config variables
  - Upstox config placeholder values (not used elsewhere in code)

## 7. Option Chain Components

### Back-end
- `controllers/dhanController.ts`
  - `getOptionChain()` handler for `POST /option-chain`
- `services/dhanService.ts`
  - `getOptionChain(payload)` method calls Dhan's `/optionchain`
- `server.ts`
  - market data option chain storage and update logic
  - `POST /api/market/expiry` updates expiry and refetches option chain
  - `GET /api/market/quotes` returns `optionChain` data with market quotes

### Front-end
- `src/App.tsx`
  - `OptionChainView` component for visualizing strikes, CE/PE OI, LTPs, and expiry selection
  - `showOptionChain` state toggles option-chain view
  - `selectedExpiry` and `onExpiryChange` control option-chain expiry selection
  - option chain rendering uses `marketData[selectedSymbol].optionChain`
  - fetches `/api/market/expiry` when expiry changes

## 8. Environment Variable Files

- `.env.example` is present and documents:
  - `MONGODB_URI`
  - `VITE_DHAN_CLIENT_ID`
  - `VITE_DHAN_ACCESS_TOKEN`
  - `DHAN_CLIENT_ID`
  - `DHAN_ACCESS_TOKEN`
  - SMTP email settings
  - Upstox config variables
  - `PORT`
  - `NODE_ENV`

No committed `.env` file is present in the repository snapshot.

## 9. Dhan Integration Points

- `routes/dhanRoutes.ts` exposes Dhan-specific endpoints: `/test`, `/funds`, `/option-chain`
- `controllers/dhanController.ts` handles Dhan REST requests and delegates to `dhanServiceInstance`
- `services/dhanService.ts` is the main Dhan integration service with HTTP and WebSocket support
- `server.ts` uses Dhan config from env vars and maintains live Dhan feed state
- `src/App.tsx` uses `dhanService` stub and server API calls:
  - `/api/market/dhan/connect`
  - `/api/market/dhan/reconnect`
  - `/api/market/dhan/status`
  - `/api/market/expiry`
  - `/api/market/quotes`
- `.env.example` lists Dhan credentials for both `VITE_` and non-prefixed env variables
- `vite.config.ts` and `vercel.json` configure proxying for backend and socket.io, enabling Dhan-backed live market feed integration
