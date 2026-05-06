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

// --- Route: Config Check ---
app.get('/config-check', (req, res) => {
    const clientId = process.env.CLIENT_ID || process.env.UPSTOX_CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET || process.env.UPSTOX_CLIENT_SECRET;
    const redirectUri = process.env.REDIRECT_URI || process.env.UPSTOX_REDIRECT_URI;

    res.json({
        CLIENT_ID: clientId ? `Set (Starts with ${clientId.substring(0, 4)}...)` : 'MISSING',
        CLIENT_SECRET: clientSecret ? 'Set' : 'MISSING',
        REDIRECT_URI: redirectUri ? `Set (${redirectUri})` : 'MISSING',
        PORT: PORT,
        NODE_ENV: process.env.NODE_ENV
    });
});

// --- Route: Home Page ---
app.get('/', async (req, res, next) => {
    // Check if this is an OAuth callback
    if (req.query.code || req.query.error) {
        const code = req.query.code;
        const error = req.query.error;
        const errorDescription = req.query.error_description;

        const clientId = process.env.CLIENT_ID || process.env.UPSTOX_CLIENT_ID;
        const clientSecret = process.env.CLIENT_SECRET || process.env.UPSTOX_CLIENT_SECRET;
        const redirectUri = process.env.REDIRECT_URI || process.env.UPSTOX_REDIRECT_URI;

        if (error) {
            console.error('[Upstox] Callback error from Upstox:', error, errorDescription);
            return res.status(400).send(`Upstox Login Error: ${errorDescription || error}`);
        }

        if (code) {
            console.log('[Upstox] Exchanging code from root for access token...');
            try {
                const tokenParams = new URLSearchParams({
                    code: code,
                    client_id: clientId,
                    client_secret: clientSecret,
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code'
                });

                const response = await axios.post('https://api.upstox.com/v2/login/authorization/token', 
                    tokenParams.toString(),
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Accept': 'application/json'
                        }
                    }
                );

                accessToken = response.data.access_token;
                console.log('[Upstox] Access Token received successfully via root callback!');
                
                return res.send(`
                    <div style="font-family: sans-serif; padding: 2rem; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
                        <h1 style="color: #4CAF50;">Authentication Successful!</h1>
                        <p>Access Token has been saved in memory.</p>
                        <div style="margin-top: 2rem;">
                            <a href="/option-chain" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View NIFTY 50 Option Chain</a>
                            <a href="/" style="margin-left: 10px; color: #666;">Go Back Home</a>
                        </div>
                    </div>
                `);
            } catch (err) {
                const errorData = err.response?.data;
                console.error('[Upstox] Token exchange error:', JSON.stringify(errorData || err.message));
                return res.status(500).json({
                    error: 'Authentication failed',
                    message: err.message,
                    upstox_error: errorData
                });
            }
        }
    }
    
    // If no code, either serve Vite or a simple home page if not in dev
    if (process.env.NODE_ENV === 'production' && !req.query.code) {
        return next(); // Let static handler take it
    }
    
    // Default Home Page for debugging
    res.send(`
        <div style="font-family: sans-serif; padding: 2rem; max-width: 600px; margin: 0 auto;">
            <h1>Upstox API Integration</h1>
            <p>Status: ${accessToken ? '<span style="color: green;">Authenticated</span>' : '<span style="color: red;">Not Authenticated</span>'}</p>
            <hr />
            <div style="margin-top: 1rem;">
                <a href="/login" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Login with Upstox</a>
                <a href="/option-chain" style="margin-left: 10px; color: #007bff;">Check Option Chain</a>
                <a href="/config-check" style="margin-left: 10px; color: #666;">Check Config</a>
            </div>
            <div style="margin-top: 2rem; font-size: 0.8rem; color: #999;">
                <p><strong>Note for Preview:</strong> Ensure your Upstox App Redirect URI matches the URL you see in the browser address bar (including the sub-path if any).</p>
                <p>Current Configured Redirect URI: <code>${process.env.REDIRECT_URI || 'Not Set'}</code></p>
            </div>
        </div>
    `);
});

// --- Route 1: Login ---
app.get('/login', (req, res) => {
    const clientId = process.env.CLIENT_ID || process.env.UPSTOX_CLIENT_ID;
    const redirectUri = process.env.REDIRECT_URI || process.env.UPSTOX_REDIRECT_URI;

    if (!clientId || !redirectUri) {
        return res.status(400).send('Missing CLIENT_ID or REDIRECT_URI in .env');
    }

    const authUrl = `https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    console.log('[Upstox] Redirecting user to login URL:', authUrl);
    res.redirect(authUrl);
});

// --- Route 2: Callback ---
app.get('/api/market/upstox/callback', async (req, res) => {
    const code = req.query.code;
    const error = req.query.error;
    const errorDescription = req.query.error_description;

    const clientId = process.env.CLIENT_ID || process.env.UPSTOX_CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET || process.env.UPSTOX_CLIENT_SECRET;
    const redirectUri = process.env.REDIRECT_URI || process.env.UPSTOX_REDIRECT_URI;

    if (error) {
        console.error('[Upstox] Callback error from Upstox:', error, errorDescription);
        return res.status(400).send(`Upstox Login Error: ${errorDescription || error}`);
    }

    if (!code) {
        console.error('[Upstox] No code found in callback query params');
        return res.status(400).send('No authorization code received.');
    }

    console.log('[Upstox] Exchanging code for access token...');
    console.log('[Upstox] Using CLIENT_ID:', clientId ? 'Set' : 'MISSING');
    console.log('[Upstox] Using REDIRECT_URI:', redirectUri);

    try {
        const tokenParams = new URLSearchParams({
            code: code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        });

        const response = await axios.post('https://api.upstox.com/v2/login/authorization/token', 
            tokenParams.toString(),
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
            <p>Access Token has been saved in memory.</p>
            <a href="/option-chain">Fetch NIFTY 50 Option Chain</a>
        `);
    } catch (error) {
        const errorData = error.response?.data;
        console.error('[Upstox] Token exchange error response:', JSON.stringify(errorData || {}));
        console.error('[Upstox] Token exchange error message:', error.message);
        
        res.status(500).json({
            error: 'Authentication failed during token exchange',
            message: error.message,
            upstox_error: errorData
        });
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
