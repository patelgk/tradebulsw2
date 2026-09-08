# Proprupee Admin Panel - System Documentation

## Overview
The **Proprupee Admin Panel** is a centralized administrative management hub designed to oversee platform users, trading challenges, affiliate partner networks, commissions, payouts, transactions, and global platform settings.

---

## Access & Authentication
- **Access Route**: Available via the sidebar / bottom navigation when logged in as an admin user (`role: 'admin'` or designated admin email).
- **Security**: Protected by backend and frontend authorization checks ensuring only authorized administrative personnel can access client balances, approve/reject challenge purchases, or manage system parameters.

---

## Admin Sub-Tabs & Functionality

### 1. Clients (`clients`)
- **Purpose**: Manage platform registered users and trading accounts.
- **Features**:
  - View all user profiles, UIDs, emails, and current wallet balances.
  - Modify or update user balances directly.
  - Review client trading statuses (active, suspended, challenge status).

### 2. Partners (`partners`)
- **Purpose**: Oversee affiliate partner applications and networks.
- **Features**:
  - List all registered affiliate partners and their custom referral codes.
  - Approve pending partner applications with single-click verification.

### 3. Commissions (`commissions`)
- **Purpose**: Track affiliate partner earnings.
- **Features**:
  - View commission records generated from referred trader volume and challenge purchases.
  - Monitor commission amounts and payout eligibility per partner.

### 4. Payouts (`payouts`)
- **Purpose**: Manage partner withdrawal requests.
- **Features**:
  - Review pending partner payout requests.
  - Mark payouts as **Paid** (with UTR / transaction reference numbers) or **Reject** with review notes.

### 5. Payments (`payments`)
- **Purpose**: Manage challenge purchases and funding payments.
- **Features**:
  - Filter challenge purchases by status (`pending`, `approved`, `rejected`, `all`).
  - View user payment details, fees, and invoice references.
  - **Approve**: Activates the user's funded trading account and updates wallet balance.
  - **Reject**: Rejects the purchase with optional admin review reasons.

### 6. Challenges (`challenges`)
- **Purpose**: Configure prop trading challenge tiers and plans.
- **Features**:
  - Create new challenge plans (`Add Plan`).
  - Edit plan names, tags, prices, funding amounts, profit targets, max drawdown limits, and daily drawdown thresholds.
  - Mark plans as recommended or delete obsolete tiers.

### 7. Rules (`rules`)
- **Purpose**: Maintain platform trading rules and compliance guidelines.
- **Features**:
  - Add, edit, or remove trading rules displayed to users during challenges.

### 8. General Settings (`api`)
- **Purpose**: Configure platform-wide market feeds and notification parameters.
- **Features**:
  - Manage market feed integrations, API endpoints, and notification settings.

---

## API Endpoints Reference
- `GET /api/users` - Fetch all clients/users.
- `GET /api/challenge-purchases` - Fetch all challenge purchase orders.
- `POST /api/challenge-purchases/:id/approve` - Approve purchase and activate trading account.
- `POST /api/challenge-purchases/:id/reject` - Reject purchase order.
- `GET /api/partners` - List affiliate partners.
- `POST /api/partners/:id/approve` - Approve partner application.
- `GET /api/admin/commissions` - List all affiliate commissions.
- `GET /api/admin/payouts` - List partner payout requests.
- `POST /api/admin/payouts/:id/mark-paid` - Mark payout as paid with reference.
- `POST /api/admin/payouts/:id/reject` - Reject payout request.
