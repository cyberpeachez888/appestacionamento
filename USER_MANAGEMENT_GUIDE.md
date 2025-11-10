# User Management - Quick Reference Guide

## 🚀 Quick Start

### Opening User Management
1. Login as an admin or user with `manageUsers` permission
2. Navigate to **Users** page from sidebar
3. You'll see the user management interface

---

## 📋 Main Features

### Creating a New User
1. Click **"Criar usuário"** button (top right)
2. Fill in the form:
   - **Name**: User's full name
   - **Email**: Email address (unique)
   - **Login**: Username for login (unique)
   - **Password**: Minimum 8 characters, 3 character types
3. Choose **Role**:
   - **Admin**: Full access
   - **Operator**: Limited access
4. Set **Permissions** (or use presets):
   - Click preset buttons for quick setup
   - Or manually check permissions needed
5. Click **"Criar"**

**Quick Presets:**
- **Admin**: All permissions enabled
- **Operacional**: Basic operations (customers, cash register)
- **Financeiro**: Financial tasks (rates, reports, cash)

---

### Editing a User
1. Find user in the list
2. Click **"Editar"** button
3. Modify fields as needed
4. Apply preset if desired
5. Click **"Salvar"**

---

### Resetting Password
1. Find user in the list
2. Click **"Senha"** button
3. Enter credentials:
   - **Admin**: Only new password needed
   - **Regular user**: Old password + new password required
4. Confirm new password
5. Click **"Atualizar"**

**Note:** If you change your own password, you'll be logged out.

---

### Deleting a User
1. Find user in the list
2. Click **"Excluir"** button (red)
3. Confirm in dialog

**Restrictions:**
- ❌ Cannot delete yourself
- ❌ Cannot delete the last admin

---

## 🔍 Search & Filter

### Searching
- Type in the search box at the top
- Searches: Name, Login, Email
- Updates in real-time (300ms delay)

### Filtering
1. **By Role**: Use "Papel" dropdown
   - All / Admin / Operator
2. **By Permission**: Use "Permissão" dropdown
   - Select specific permission to filter

### Clear Filters
Click **"Limpar filtros"** button to reset all filters

---

## 📦 Bulk Operations

### Selecting Users
- ✅ Click checkbox next to each user
- ✅ Click header checkbox to select all visible users

### Bulk Actions
1. Select users via checkboxes
2. Choose action:
   - **Definir papel**: Change role to Admin or Operator
   - **Aplicar preset**: Apply permission preset to all selected
3. Confirm in dialog

**Yellow toolbar appears when users are selected**

---

## 📊 Audit Log

### Opening Audit Log
Click **"Log de Auditoria"** button (top of page)

### Viewing Events
- See all user actions in chronological order
- Click expand icon (▶️) to see event details
- Color-coded by action type:
  - 🟢 Green: Create
  - 🔵 Blue: Update
  - 🔴 Red: Delete
  - 🟣 Purple: Close/Finalize
  - 🟢 Emerald: Open

### Filtering Events
1. **Date Range**: Set start and/or end date
2. **Action**: Select specific action type
3. **User**: Filter by who performed action
4. Click **"Atualizar"** to apply filters

### Event Details
Each event shows:
- Action performed
- User who performed it
- Target (what was affected)
- Timestamp
- Additional details (expandable JSON)

---

## 💾 Exporting Data

### Export CSV
1. Apply filters if needed
2. Click **"Exportar CSV"**
3. File downloads with filtered users

### Export JSON
1. Apply filters if needed
2. Click **"Exportar JSON"**
3. File downloads with full user data

---

## 🔐 Permissions Guide

| Permission | Description | Grants Access To |
|------------|-------------|------------------|
| **Gerenciar tarifas** | Manage rates | Create, edit, delete rates |
| **Gerenciar mensalistas** | Manage monthly customers | Add, edit monthly customers & payments |
| **Ver relatórios** | View reports | Access financial & operational reports |
| **Gerenciar usuários** | Manage users | Full user management (this page) |
| **Configurações da empresa** | Company config | Edit company settings |
| **Tipos de veículos** | Vehicle types | Manage vehicle type list |
| **Abrir/Fechar caixa** | Cash operations | Open/close register, finalize tickets |

---

## 🛡️ Security Notes

### Password Requirements
- Minimum 8 characters
- Must include 3 of 4 types:
  - Lowercase letters (a-z)
  - Uppercase letters (A-Z)
  - Numbers (0-9)
  - Symbols (!@#$%)

### Password Strength Levels
- 🔴 Very Weak
- 🟠 Weak
- 🟡 Medium
- 🟢 Strong
- 🟢 Very Strong

**Only "Strong" or "Very Strong" passwords are accepted**

### Protection Rules
- ✅ Admin can reset any user password
- ❌ Cannot delete your own account
- ❌ Cannot delete the last admin
- ❌ Cannot demote all admins at once
- ✅ All actions are logged in audit log

---

## 💡 Tips & Tricks

### Quick User Setup
1. Use preset buttons when creating users
2. Adjust individual permissions if needed
3. Save time with common role configurations

### Finding Users
- Use search for quick lookup
- Combine role + permission filters for precision
- Export filtered list for reports

### Bulk Efficiency
1. Filter users first
2. Select all visible
3. Apply role or preset in one action
4. Great for onboarding multiple users

### Audit Review
1. Filter by date to review recent changes
2. Filter by action to track specific operations
3. Filter by user for individual accountability
4. Export for compliance reporting

---

## ⚠️ Common Issues

### "Cannot delete user"
- Check if it's your own account
- Check if it's the last admin
- Verify you have `manageUsers` permission

### "Password too weak"
- Ensure 8+ characters
- Include uppercase, lowercase, number, symbol
- Check strength indicator

### "Cannot access page"
- Verify you have `manageUsers` permission
- Contact admin to grant permission

### Audit log not showing events
- Check date range filters
- Clear all filters and retry
- Verify `viewReports` permission

---

## 🎯 Best Practices

### User Creation
1. Use descriptive names
2. Set email for password recovery
3. Apply least privilege (minimum permissions needed)
4. Use presets then refine

### Password Management
1. Encourage strong passwords
2. Reset passwords periodically
3. Log password changes in audit

### Regular Audits
1. Review user list monthly
2. Remove inactive users
3. Verify permissions are current
4. Check audit log for unusual activity

### Data Management
1. Export user list regularly
2. Keep CSV backups
3. Document role changes
4. Track permission modifications

---

## 📞 Need Help?

### Not sure about a permission?
- Hover over the ℹ️ icon next to each permission
- Read the detailed tooltip

### Want to test changes?
- Create a test user
- Assign permissions
- Login as test user to verify

### Made a mistake?
- All changes are logged in audit
- Admins can revert changes
- Check audit log for change details

---

**Last Updated:** November 10, 2025  
**Version:** 1.0 - Production Ready
