# Admin Panel Access Guide

## ✅ Admin Credentials (VERIFIED WORKING)

- **Email**: `admin@indotrader.com`
- **Password**: `888981`
- **Admin UID**: `39bc1539-6d8d-48ac-8e32-f343883fc40e`
- **Current Balance**: ₹9,992,108.65

## How to Access the Admin Panel

### Step 1: Navigate to Admin Login
Open your browser and go to:
```
http://localhost:3000/admin
```

### Step 2: Enter Login Credentials
- **Admin Email**: `admin@indotrader.com`
- **Password**: `888981`

Click "Sign In as Admin"

### Step 3: View Dashboard
After successful login, you'll be redirected to:
```
http://localhost:3000/admin/dashboard
```

You should see:
- **Total Users**: 11
- **Funded Users**: 4 (balance > 0)
- **No Fund Users**: 7 (balance = 0)
- **Total Funds**: ₹10,661,320.62
- **Active Traders**: 2
- **Total Revenue**: ₹0 (no challenge purchases yet)

### Step 4: View All Users
Navigate to:
```
http://localhost:3000/admin/clients
```

You'll see all 11 registered users with:
- Email
- Name
- Account Status (active/inactive)
- Role (user/admin/partner)
- Balance
- Join Date

### Step 5: Real-Time Updates
The dashboard automatically refreshes every 30 seconds to show:
- New user registrations
- Balance changes
- Payment updates

---

## ✅ Verified Working APIs

All backend APIs are tested and returning real data:

### 1. Admin Statistics
```bash
curl -X POST http://localhost:3000/api/admin/stats \
  -H "Content-Type: application/json" \
  -d '{"uid":"39bc1539-6d8d-48ac-8e32-f343883fc40e"}'

Response:
{
  "totalUsers": 11,
  "fundedUsers": 4,
  "noFundUsers": 7,
  "totalFunds": 10661320.62361695,
  "activeTraders": 2,
  "totalPayouts": 0,
  "totalPayoutAmount": 0,
  "totalRevenue": 0
}
```

### 2. Admin Users List
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{"uid":"39bc1539-6d8d-48ac-8e32-f343883fc40e","page":1,"limit":100}'

Response: [11 users with full details]
```

### 3. Admin Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@indotrader.com","password":"888981"}'

Response:
{
  "_id": "6a1ffb4135edbf46f1825082",
  "uid": "39bc1539-6d8d-48ac-8e32-f343883fc40e",
  "email": "admin@indotrader.com",
  "role": "admin",
  "balance": 9992108.6524128,
  "name": "System Admin",
  "accountStatus": "inactive",
  "createdAt": "2026-06-03T10:00:33.304Z"
}
```

---

## Database Contents (VERIFIED)

| Email | Role | Balance | Status |
|-------|------|---------|--------|
| admin@indotrader.com | admin | ₹9,992,108.65 | inactive |
| kushwagourav2018@gmail.com | user | ₹113,533.81 | inactive |
| kushwourav2018@gmail.com | user | ₹105,678.16 | inactive |
| referred@example.com | user | ₹450,000 | active |
| partner1@example.com | user | ₹0 | inactive |
| partner@example.com | partner | ₹0 | inactive |
| (5 other users) | user/partner | ₹0 | inactive |

**Total Users**: 11  
**Total Balance Across All Users**: ₹10,661,320.62

---

## Troubleshooting

### Q: Admin page shows 0 users or empty statistics?
**A**: Make sure you've successfully logged in first. The page reads the UID from localStorage (`trader_user`). If you see "0", it means:
1. Check browser DevTools → Application → Local Storage
2. Look for key: `trader_user`
3. The value should contain `uid: "39bc1539-6d8d-48ac-8e32-f343883fc40e"`
4. If empty, re-login with credentials above

### Q: How do I know I'm logged in?
**A**: 
- URL should be at `/admin/dashboard` (not `/admin`)
- You should see admin layout with sidebar
- Top right should show admin user name/email
- No error messages about "Admin Login Required"

### Q: How to refresh data manually?
**A**: Click the "Refresh" button on the dashboard (bottom left). This manually triggers `/api/admin/stats` again.

### Q: Can I view payments and payouts?
**A**: Yes, navigate to:
- `/admin/payments` - View all payment requests
- `/admin/payouts` - View all withdrawal requests

### Q: How to create a new admin user?
**A**: Currently only one admin user exists. To add more admins:
1. Create a regular user account
2. Update their `role` field in MongoDB to `'admin'`
3. They can then log in with their credentials

---

## Server Status

✅ MongoDB Connection: Active  
✅ Admin APIs: All working  
✅ Real data loading: Confirmed  
✅ Auto-refresh: 30 seconds  

**Last Verified**: 2026-09-09 at 06:40 UTC

---

## Next Steps

1. **Login** to the admin panel: http://localhost:3000/admin
2. **Enter credentials**: admin@indotrader.com / 888981
3. **View dashboard**: All statistics should load with real data
4. **Explore sections**: Clients, Payments, Payouts, CRM, etc.

If you encounter any issues, check the browser console (F12) for error messages and refer to the troubleshooting section above.
