# 🚀 Quick Start: Monthly Financial Reports

## Setup (One-time)

### 1. Run SQL Migration
```sql
-- In Supabase SQL Editor, run:
backend/create-monthly-reports-table.sql
```

### 2. Reload Schema Cache
```sql
NOTIFY pgrst, 'reload schema';
```

---

## Usage (Monthly)

### Generate Monthly Report

1. **Finance Page** → Click **"Gerar Relatório Mensal"**
2. Select **Month** and **Year**
3. Check **☑ Clear operational records** (recommended)
4. Click **"Gerar Relatório"**
5. ✅ Done!

### View Reports

1. Navigate to **"Relatórios Mensais"**
2. Click **"Ver Detalhes"** on any report
3. Click **"Baixar Documento"** to download

---

## What It Does

### ✅ Generates
- Complete financial summary
- Company information snapshot
- Operator details
- Revenue breakdown (Avulsos + Mensalistas)
- Payment methods totals
- Operational statistics

### ✅ Archives
- All tickets (entry/exit records)
- All payments made
- Monthly customers snapshot
- Full report data (JSONB)

### ✅ Clears
- Operational tickets table (if selected)
- Starts fresh for new month

---

## Storage Strategy

### ✅ Database (Recommended)
- Centralized cloud storage
- Automatic backups
- Access from any device
- Multi-user support
- Professional audit trail

### Why Not Local?
- ❌ Risk of data loss (PC crash/theft)
- ❌ Single-device limitation
- ❌ Manual backup required
- ❌ Not scalable

---

## Permissions

**Required:** `viewReports`

- Admins: Full access + delete
- Operators: Generate + view reports

---

## Files Created

### Backend
- `backend/create-monthly-reports-table.sql` - Database schema
- `backend/src/controllers/monthlyReportsController.js` - Business logic
- `backend/src/routes/index.js` - API routes (updated)

### Frontend
- `src/components/MonthlyReportDialog.tsx` - Generation dialog
- `src/pages/RelatoriosMensais.tsx` - Reports list page
- `src/pages/Financeiro.tsx` - Button added
- `src/lib/api.ts` - API methods (updated)
- `src/App.tsx` - Route added
- `src/components/Sidebar.tsx` - Navigation link

---

## API Endpoints

```
POST   /api/reports/monthly      - Generate report
GET    /api/reports/monthly      - List all reports
GET    /api/reports/monthly/:id  - Get specific report
DELETE /api/reports/monthly/:id  - Delete report (admin)
```

---

## Best Practices

### Before Generating
- ✓ Close all tickets
- ✓ Record all payments
- ✓ Close cash register
- ✓ Verify data accuracy

### After Generating
- ✓ Download document
- ✓ Verify totals
- ✓ Share with accounting
- ✓ Archive for records

---

## Troubleshooting

### "Report already exists"
→ One report per month allowed
→ Admin can delete if needed

### "Schema cache error"
→ Run: `NOTIFY pgrst, 'reload schema';`

### Can't see reports
→ Check `viewReports` permission
→ Verify user is logged in

---

## Support

Full documentation: `MONTHLY_REPORTS_DOCUMENTATION.md`

**Ready to use!** 🎉
