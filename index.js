import express from 'express';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory token storage (for beginner-friendly example)
let accessToken = process.env.UPSTOX_ACCESS_TOKEN || '';

// --- Route 1: Login ---
app.get('/login', (req, res) => {
    const clientId = process.env.UPSTOX_CLIENT_ID;
    const redirectUri = process.env.UPSTOX_REDIRECT_URI;

    if (!clientId || !redirectUri) {
        return res.status(400).send('Missing UPSTOX_CLIENT_ID or UPSTOX_REDIRECT_URI in .env');
    }

    const authUrl = `https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    console.log('[Upstox] Redirecting user to login...');
    res.redirect(authUrl);
});

// --- Route 2: Callback ---
app.get('/api/market/upstox/callback', async (req, res) => {
    const code = req.query.code;
    const clientId = process.env.UPSTOX_CLIENT_ID;
    const clientSecret = process.env.UPSTOX_CLIENT_SECRET;
    const redirectUri = process.env.UPSTOX_REDIRECT_URI;

    if (!code) {
        return res.status(400).send('No authorization code received from Upstox.');
    }

    console.log('[Upstox] Exchanging code for access token...');

    try {
        const response = await axios.post('https://api.upstox.com/v2/login/authorization/token', 
            new URLSearchParams({
                code: code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                }
            }
        );

        accessToken = response.data.access_token;
        console.log('[Upstox] Access Token received successfully!');
        
        res.send(`
            <h1>Authentication Successful!</h1>
            <p>Token has been saved in memory.</p>
            <a href="/option-chain">View NIFTY 50 Option Chain</a>
        `);
    } catch (error) {
        console.error('[Upstox] Token exchange error:', error.response?.data || error.message);
        res.status(500).send('Failed to exchange code for token.');
    }
});

// --- Route 3: Option Chain ---
app.get('/option-chain', async (req, res) => {
    if (!accessToken) {
        return res.status(401).send('No access token found. Please <a href="/login">Login</a> first.');
    }

    console.log('[Upstox] Fetching NIFTY 50 option chain...');

    try {
        const response = await axios.get('https://api.upstox.com/v2/market-quote/option-chain', {
            params: {
                instrument_key: 'NSE_INDEX|Nifty 50',
                expiry_date: '2024-05-09' // Example expiry
            },
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('[Upstox] Option chain error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to fetch option chain', 
            details: error.response?.data || error.message 
        });
    }
});

// --- Vite Integration for Frontend ---
if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    async function setupVite() {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa'
        });
        app.use(vite.middlewares);
    }
    setupVite();
} else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`- Login: http://localhost:${PORT}/login`);
    console.log(`- Option Chain: http://localhost:${PORT}/option-chain`);
});
