# Admin Panel - Edit & Delete User Features - UI Guide

## Location: Admin Clients Page

Navigate to: `http://localhost:3000/admin/clients`

---

## User Row Display

```
╔════════════════════════════════════════════════════════════════════╗
║ EMAIL              │ NAME     │ STATUS   │ ROLE    │ BALANCE │ ... ║
║ user@example.com   │ John Doe │ Active   │ User    │ ₹5,000  │ ▼   ║
╚════════════════════════════════════════════════════════════════════╝
                                                              ↑
                                                     Expand Button
                                                     (Click to see actions)
```

---

## When You Click Expand (▼)

The row expands to show detailed information and action buttons:

```
╔════════════════════════════════════════════════════════════════════╗
║ User Details (Expanded)                                            ║
║                                                                    ║
║ User ID: 6a784511c2077a9d690e15bc                                ║
║ Account Status: Active                                             ║
║ Joined Date: 2026-08-09 09:14:57                                  ║
║                                                                    ║
║ ┌──────────────────────────────────────────────────────────────┐  ║
║ │ [💵 Edit Balance]  [🗑️  Delete Permanently]                 │  ║
║ │                    (Red - Disabled for Admin)               │  ║
║ └──────────────────────────────────────────────────────────────┘  ║
╚════════════════════════════════════════════════════════════════════╝
```

---

## Feature 1: Edit Balance (Blue Button)

### Before Click
```
Row is expanded showing basic info and blue "Edit Balance" button
```

### After Click - Edit Form Appears
```
╔════════════════════════════════════════════════════════════════════╗
║ Edit Balance Form (Blue Background)                               ║
║                                                                    ║
║ Current Balance: ₹0                                                ║
║ ┌──────────────────────────────────────────────────────────────┐  ║
║ │ [disabled input showing ₹0]                                 │  ║
║ └──────────────────────────────────────────────────────────────┘  ║
║                                                                    ║
║ New Balance: *                                                     ║
║ ┌──────────────────────────────────────────────────────────────┐  ║
║ │ [Input field]  ← Enter new amount here                      │  ║
║ │ Placeholder: "Enter new balance amount"                     │  ║
║ └──────────────────────────────────────────────────────────────┘  ║
║                                                                    ║
║ Reason (Optional):                                                 ║
║ ┌──────────────────────────────────────────────────────────────┐  ║
║ │ [Input field]  ← e.g., "Deposit", "Refund"                 │  ║
║ │ Placeholder: "e.g., Deposit, Refund, etc."                 │  ║
║ └──────────────────────────────────────────────────────────────┘  ║
║                                                                    ║
║ [✓ Save Changes]  [✗ Cancel]                                      ║
║                                                                    ║
║ Green button = Save    Gray button = Cancel                        ║
╚════════════════════════════════════════════════════════════════════╝
```

### After Clicking Save
```
Browser will show a confirmation popup:
┌─────────────────────────────────────┐
│ Confirm Balance Change              │
├─────────────────────────────────────┤
│ Change user@example.com's balance   │
│ from ₹0 to ₹5000?                   │
│                                     │
│ [OK]  [Cancel]                      │
└─────────────────────────────────────┘
```

### After Confirmation
```
- Balance is saved to database
- Audit log created
- Row updates to show new balance: ₹5,000
- Form closes
- Form collapses back to show expanded row again
```

---

## Feature 2: Delete Permanently (Red Button)

### Before Click
```
Row is expanded showing basic info and red "Delete Permanently" button
(Button is grayed out/disabled if user is admin)
```

### After Click - Confirmation Dialog
```
╔════════════════════════════════════════════════════════════════════╗
║ Confirm Permanent Deletion (Red Background)                       ║
║                                                                    ║
║ ⚠️  WARNING: You are about to permanently delete                  ║
║    user@example.com                                               ║
║    This action CANNOT be undone.                                  ║
║                                                                    ║
║ Deletion Reason (Optional):                                        ║
║ ┌──────────────────────────────────────────────────────────────┐  ║
║ │ [Input field]  ← e.g., "Fraudulent", "User request"        │  ║
║ │ Placeholder: "e.g., Fraudulent activity, User request"      │  ║
║ └──────────────────────────────────────────────────────────────┘  ║
║                                                                    ║
║ [🗑️  Yes, Delete]  [✗ Cancel]                                   ║
║                                                                    ║
║ Red button = Delete    Gray button = Cancel                        ║
╚════════════════════════════════════════════════════════════════════╝
```

### After Clicking "Yes, Delete"
```
Browser will show another confirmation popup:
┌─────────────────────────────────────┐
│ Confirm Permanent Deletion          │
├─────────────────────────────────────┤
│ Are you SURE you want to            │
│ permanently delete user@example.com?│
│ This cannot be undone.              │
│                                     │
│ [YES, DELETE]  [CANCEL]             │
└─────────────────────────────────────┘
```

### After Final Confirmation
```
- User deleted from database
- All user's trades deleted
- All user's fund history deleted
- All user's transactions deleted
- Audit log created with deletion reason
- User disappears from the clients list
- Table refreshes
- Total user count decreases by 1
```

---

## Disabled State: Delete Button for Admin Users

```
For admin users, the Delete button is disabled:

╔════════════════════════════════════════════════════════════════════╗
║ Row: admin@indotrader.com                                         ║
║ ...                                                                ║
║                                                                    ║
║ [💵 Edit Balance]  [🗑️ Delete User] ← GREYED OUT (disabled)     │
║                    "Cannot delete admin users"                    │
╚════════════════════════════════════════════════════════════════════╝
```

---

## Complete Workflow Example

### Scenario: Edit a user's balance from ₹0 to ₹5,000

```
STEP 1: View Clients Page
│
└─→ http://localhost:3000/admin/clients
    See table with all users

STEP 2: Expand User Row
│
└─→ Click ▼ icon on user row
    User row expands showing details + action buttons

STEP 3: Edit Balance
│
└─→ Click [💵 Edit Balance] button
    Form appears with current balance shown

STEP 4: Enter New Amount
│
└─→ Type "5000" in "New Balance" field
    Optionally type reason: "Deposit received"

STEP 5: Click Save
│
└─→ Click [✓ Save Changes]
    Popup: "Change balance from ₹0 to ₹5000?"

STEP 6: Confirm
│
└─→ Click [OK]
    Backend processes request
    FundHistory log created
    AdminAction log created

STEP 7: Success
│
└─→ Form closes
    Row updates to show: Balance ₹5,000
    Confirmation message shows
    Everything saved to database
```

---

## Workflow Example 2: Delete a User

```
STEP 1: View Clients Page
│
└─→ http://localhost:3000/admin/clients

STEP 2: Expand User Row
│
└─→ Click ▼ on user to delete

STEP 3: Click Delete Button
│
└─→ Click [🗑️ Delete Permanently]
    Red confirmation dialog appears

STEP 4: Add Reason (Optional)
│
└─→ Type: "Fraudulent account"
    Click [🗑️ Yes, Delete]

STEP 5: Final Confirmation
│
└─→ Browser popup: "Are you SURE?"
    Click [YES, DELETE]

STEP 6: Deletion Processed
│
└─→ User deleted from database
    Associated records deleted
    Audit log created
    User disappears from table

STEP 7: Verification
│
└─→ Total Users count decreased by 1
    User no longer appears in client list
    When refreshed, user is gone
```

---

## UI Color Scheme

| Element | Color | Meaning |
|---------|-------|---------|
| Edit Balance Button | Blue | Safe, informational action |
| Delete Button | Red | Destructive action, high impact |
| Save Button | Green/Emerald | Confirms and saves changes |
| Cancel Button | Gray/Slate | Cancels without making changes |
| Edit Form Background | Blue tinted | Related to edit operation |
| Delete Dialog Background | Red tinted | Warning for destructive operation |
| Confirmation Dialogs | Standard | Browser native dialogs |

---

## Tips & Best Practices

✅ **Always verify** the user email before editing/deleting  
✅ **Add a reason** for audit trail (even though optional)  
✅ **Test on non-essential users** first  
✅ **Check the confirmation dialogs** carefully before proceeding  
✅ **Be aware** deletion cannot be undone  
✅ **Use edit balance** for corrections, not deletion  
✅ **Only delete** fraudulent or duplicate accounts  

---

## Error States

If something goes wrong:

```
Edit Balance Errors:
├─ "Invalid balance amount" → Enter a valid number ≥ 0
├─ "User not found" → User was already deleted
└─ "Admin required" → You're not logged in as admin

Delete User Errors:
├─ "Cannot delete admin users" → Cannot delete admins
├─ "User not found" → User was already deleted
└─ "Admin required" → You're not logged in as admin
```

---

## What Gets Deleted When a User is Deleted?

✅ User account record  
✅ All trades by that user  
✅ All fund history entries  
✅ All transactions  
❌ Does NOT delete: AdminAction logs (kept for audit trail)

---

## Data Retained for Audit

Even after deletion, these are kept:
- AdminAction logs showing who deleted what and when
- Reason for deletion
- Deleted user's data (saved in AdminAction details)
- Timestamp of deletion

This ensures complete audit trail for compliance.

---

## Production Checklist

Before using in production:

✅ Test edit balance on test user  
✅ Test delete on duplicate test account  
✅ Verify audit logs in MongoDB  
✅ Confirm confirmations work properly  
✅ Check that admin users can't be deleted  
✅ Verify only admins can access these features  
✅ Test with different balance amounts  
✅ Test with and without reason field  

You're ready to use these features!
