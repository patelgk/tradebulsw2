# Microsoft Clarity Analytics Setup Guide

This document explains how to set up and configure Microsoft Clarity analytics for the Proprupee trading platform.

## Overview

Microsoft Clarity is integrated into the Proprupee application to track user behavior, sessions, and interactions. The implementation includes:

- **Automatic initialization** on app startup (if configured)
- **Automatic page view tracking** when users navigate between tabs/views
- **Sensitive data masking** to protect passwords, payment details, and API keys
- **User consent management** to respect privacy preferences
- **No multiple initializations** - Clarity loads once globally
- **Custom event tracking** for specific user actions

## Setup Instructions

### Step 1: Create a Clarity Project

1. Go to [Microsoft Clarity](https://clarity.microsoft.com/)
2. Sign in with your Microsoft account (create one if needed)
3. Click "Create Project"
4. Enter project details:
   - **Project Name**: `Proprupee Trading Platform`
   - **Website URL**: `https://tradebulsw2.onrender.com` (or your production domain)
5. Accept terms and create the project

### Step 2: Get Your Clarity Project ID

1. After creating the project, you'll see a dashboard
2. Click on "Setup" or "Settings"
3. Look for the **Project ID** (format: `i1234567890abc`)
4. Copy this ID

### Step 3: Configure the Environment Variable

1. Open `.env` file in the root directory
2. Find the `VITE_CLARITY_PROJECT_ID` variable (around line 32)
3. Set it to your Clarity Project ID:
   ```
   VITE_CLARITY_PROJECT_ID=i1234567890abc
   ```
4. Save the file

### Step 4: Restart the Application

1. Stop the development server (Ctrl+C)
2. Start it again: `npm run dev` or `npm start`
3. Clarity will now initialize automatically

### Step 5: Verify Clarity is Working

1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Look for messages like: `[Clarity] Microsoft Clarity initialized successfully`
4. Check the Network tab for requests to `clarity.ms`
5. Visit different pages/tabs in the app to generate events

## Features

### Automatic Page View Tracking

Page views are automatically tracked when users navigate between different views:
- **Trade View** - Main trading interface
- **Challenges View** - Challenge purchase page
- **Portfolio View** - User's trading portfolio
- **Profile View** - User profile and settings
- **Admin View** - Admin dashboard (if applicable)
- **Partner View** - Partner dashboard (if applicable)

### Sensitive Data Protection

The following data is automatically masked by Clarity:
- Password fields
- Credit card information
- CVV/CVC codes
- Card expiry dates
- API keys and secrets
- Credentials
- Any field marked with `data-clarity-mask="true"`

### Custom Events

To track specific user actions, use the Clarity service in your code:

```typescript
import clarityService from '../services/clarity';

// Track a custom event
clarityService.trackEvent('challenge_purchased', {
  challengeName: 'Nifty 50',
  fundingAmount: 100000,
  challengeFee: 5000,
});

// Track trade placement
clarityService.trackEvent('trade_placed', {
  symbol: 'Nifty 50 CE',
  quantity: 50,
  type: 'CE', // CALL
  action: 'BUY',
});

// Track trade closure
clarityService.trackEvent('trade_closed', {
  symbol: 'Nifty 50 CE',
  pnl: 2500,
  status: 'profit', // or 'loss'
});
```

### User Identification

To identify users in Clarity (for non-sensitive identifiers):

```typescript
import clarityService from '../services/clarity';

// Identify the user (use non-sensitive ID only, NOT email or password)
clarityService.identifyUser(user.uid);
```

### Consent Management

Clarity respects user privacy preferences:

```typescript
import clarityService from '../services/clarity';

// Update user consent
clarityService.updateConsent(true); // User gave consent
// or
clarityService.updateConsent(false); // User revoked consent
```

Consent is stored in browser localStorage and persists across sessions.

## Files Modified

- **`src/services/clarity.ts`** - Main Clarity service implementation
- **`src/App.tsx`** - Clarity initialization and page view tracking
- **`.env`** - Clarity Project ID configuration
- **`CLARITY_SETUP.md`** - This setup guide

## Security & Privacy

### What Data is NOT Captured

- Passwords
- API keys and secrets
- Credit card numbers
- CVV/CVC codes
- Trading credentials
- Sensitive authentication tokens

### What Data IS Captured

- User sessions (anonymously)
- Page navigation patterns
- User interactions (clicks, scrolls)
- Form submissions (non-sensitive fields)
- Performance metrics
- Device and browser information
- Geographic location (approximate)

### Compliance

- Clarity respects the Consent Preference (localStorage)
- All sensitive inputs are masked
- Data follows Microsoft privacy standards
- GDPR/Privacy compliant when consent is managed properly

## Troubleshooting

### Clarity Not Showing Messages

**Problem**: No `[Clarity] Microsoft Clarity initialized successfully` message in console

**Solutions**:
1. Check if `VITE_CLARITY_PROJECT_ID` is set in `.env`
2. Restart the development server after changing `.env`
3. Clear browser cache and localStorage
4. Check browser console for errors

### No Data in Clarity Dashboard

**Problem**: Clarity project ID is set, but no data appears in the dashboard

**Solutions**:
1. Wait a few minutes for data to appear (Clarity has a slight delay)
2. Verify the project ID is correct in `.env`
3. Check that users have given consent (check localStorage for `analytics_consent`)
4. Ensure you're visiting the configured domain (e.g., localhost:3000 for dev, production URL for prod)

### Too Many Sessions

**Problem**: Clarity is creating multiple sessions for the same user

**Solutions**:
1. Verify Clarity.init() is only called once (check console logs)
2. Clear browser cache and localStorage
3. Close other tabs with the same app open

## Production Deployment

When deploying to production:

1. **Create a new Clarity project** for production (or reuse the existing one)
2. **Get the production Project ID** from the Clarity dashboard
3. **Set the environment variable** on your hosting platform:
   - **Render**: Add `VITE_CLARITY_PROJECT_ID=your_id` to environment variables
   - **Vercel**: Add to `.env.production`
   - **AWS/GCP**: Add to your deployment configuration
4. **Redeploy** the application
5. **Monitor** the Clarity dashboard for sessions and events

### Example (Render.com)

1. Go to your Render service settings
2. Find "Environment" section
3. Add new variable: `VITE_CLARITY_PROJECT_ID=your_id`
4. Trigger a redeploy

## Support

For issues or questions:
- Check [Microsoft Clarity Documentation](https://learn.microsoft.com/en-us/clarity/)
- Review console logs in browser developer tools
- Check the implementation in `src/services/clarity.ts`

## Implementation Details

### Initialization Flow

```
App Startup
    ↓
useEffect triggers
    ↓
Load Clarity Service
    ↓
Check if VITE_CLARITY_PROJECT_ID is set
    ↓
Check if user has given consent
    ↓
Load Clarity script from clarity.ms
    ↓
Initialize data masking
    ↓
Clarity starts tracking
```

### Page View Tracking Flow

```
User clicks on tab
    ↓
activeTab state changes
    ↓
useEffect detects activeTab change
    ↓
Call clarityService.trackPageView(activeTab)
    ↓
Clarity receives page_view event
```

### No Re-initialization Protection

The Clarity service includes a guard to prevent re-initialization:
- First `.init()` call sets `this.initialized = true`
- Subsequent `.init()` calls are ignored with a debug log
- This prevents duplicate Clarity instances and session conflicts

## Next Steps

1. ✅ Set `VITE_CLARITY_PROJECT_ID` in `.env`
2. ✅ Restart the development server
3. ✅ Verify Clarity initialization in console
4. ✅ Test page navigation to ensure page views are tracked
5. ✅ Check the Clarity dashboard after a few minutes
6. ✅ (Optional) Add custom event tracking for specific user actions
7. ✅ Deploy to production with the production Project ID
