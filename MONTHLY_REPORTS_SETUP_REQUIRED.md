# ⚠️ SETUP REQUIRED: Monthly Reports

## Error: "Unexpected error" on Relatórios Mensais page

### 🔍 Cause
The `monthly_reports` table has not been created in your Supabase database yet.

---

## ✅ SOLUTION: Run SQL Migration (5 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to **Supabase Dashboard**: https://app.supabase.com
2. Select your project
3. Click **"SQL Editor"** in left sidebar

### Step 2: Run the Migration
1. Click **"+ New Query"**
2. Open file: `backend/create-monthly-reports-table.sql`
3. **Copy the entire contents**
4. **Paste into SQL Editor**
5. Click **"Run"** (or press Ctrl+Enter)

### Step 3: Reload Schema Cache
After the migration completes, run this command:
```sql
NOTIFY pgrst, 'reload schema';
```

### Step 4: Verify Setup
Run this command from your terminal:
```bash
node backend/test-monthly-reports-setup.js
```

You should see: **"✨ ALL TESTS PASSED!"**

---

## 📋 What Gets Created

The migration creates:
- ✅ `monthly_reports` table (stores all monthly reports)
- ✅ `archived_tickets` table (historical operational data)
- ✅ Indexes for performance
- ✅ Unique constraints (one report per month)
- ✅ Foreign key relationships
- ✅ Auto-update triggers

---

## 🧪 After Setup

### Test the System
1. **Open app** → Navigate to **"Relatórios Mensais"**
2. Page should load without errors
3. You'll see: "Nenhum relatório gerado" (no reports yet)
4. Go to **Financeiro** page
5. Click **"Gerar Relatório Mensal"**
6. Generate your first report!

---

## ❓ Troubleshooting

### Still seeing errors after migration?

**Problem: "Table not found"**
```sql
-- Run in Supabase SQL Editor:
NOTIFY pgrst, 'reload schema';
```

**Problem: "Permission denied"**
- Check you're logged into correct Supabase project
- Verify you have admin access to the database

**Problem: "Relation already exists"**
- Migration already ran successfully
- Just reload schema cache (step 3 above)

### Verify manually in Supabase
1. Go to **Table Editor**
2. Look for `monthly_reports` table
3. Should see all columns (id, report_month, report_year, etc.)

---

## 🚀 Quick Commands

```bash
# Test if setup is complete
node backend/test-monthly-reports-setup.js

# If tables exist but errors persist, restart backend
cd backend
npm start
```

---

## 📄 Files Involved

- `backend/create-monthly-reports-table.sql` - The migration to run
- `backend/test-monthly-reports-setup.js` - Verification script
- `src/pages/RelatoriosMensais.tsx` - The page that needs the table

---

## ✅ Success Indicators

After proper setup:
- ✅ No errors on Relatórios Mensais page
- ✅ Can click "Gerar Relatório Mensal" button
- ✅ Can view generated reports
- ✅ Can download report documents

---

**Need help?** Check `MONTHLY_REPORTS_DOCUMENTATION.md` for full guide.
