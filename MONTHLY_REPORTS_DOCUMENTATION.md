# 📊 Monthly Financial Cycle Closure System

## Overview

Complete end-of-month financial cycle closure system for parking management. Generates comprehensive reports, archives operational data, and resets the system for a new monthly cycle.

---

## 🎯 Key Features

### 1. **Comprehensive Monthly Reports**
- Complete financial summary for accounting purposes
- Aggregates all revenues (Avulsos + Mensalistas)
- Payment methods breakdown (Cash, PIX, Debit, Credit)
- Operational statistics (tickets, customers)
- Company and operator information
- Timestamp and period tracking

### 2. **Database Storage Strategy** ✅ RECOMMENDED
**Why Database (Supabase)?**
- ✅ Centralized access from any device
- ✅ Automatic backups and disaster recovery
- ✅ Multi-user access for all operators
- ✅ Scalable for growing business
- ✅ Query and filter capabilities
- ✅ Professional audit trail
- ✅ Cloud reliability (99.9% uptime)
- ✅ No local PC dependency

### 3. **Operational Table Cleanup**
- Archives all tickets (entry/exit records)
- Moves data to `archived_tickets` table
- Clears operational table after archival
- Starts fresh for new monthly cycle
- Preserves all data in monthly report

### 4. **Report Viewing & Download**
- Dedicated page to view all monthly reports
- Filter by year and period
- View detailed financial breakdowns
- Download reports as documents
- Access historical data anytime

---

## 📁 Files Created

### Backend

#### SQL Schema
**`backend/create-monthly-reports-table.sql`**
- Creates `monthly_reports` table
- Creates `archived_tickets` table
- Indexes for performance
- Unique constraint per month/year
- Comprehensive data storage (JSONB fields)

#### Controller
**`backend/src/controllers/monthlyReportsController.js`**
- `generateMonthly()` - Generate and archive report
- `listMonthly()` - List all reports
- `getMonthly()` - Get report details
- `deleteMonthly()` - Admin-only deletion

#### Routes
**`backend/src/routes/index.js`** (updated)
```javascript
POST   /api/reports/monthly      - Generate monthly report
GET    /api/reports/monthly      - List all reports
GET    /api/reports/monthly/:id  - Get specific report
DELETE /api/reports/monthly/:id  - Delete report (admin)
```

### Frontend

#### API Client
**`src/lib/api.ts`** (updated)
- `generateMonthlyReport()` - Create new report
- `getMonthlyReports()` - Fetch reports list
- `getMonthlyReportById()` - Get report details
- `deleteMonthlyReport()` - Delete report

#### Components
**`src/components/MonthlyReportDialog.tsx`**
- Month and year selection
- Clear operational records option
- Confirmation with warnings
- Loading states

#### Pages
**`src/pages/Financeiro.tsx`** (updated)
- "Generate Monthly Report" button
- Dialog integration
- Success/error handling

**`src/pages/RelatoriosMensais.tsx`** (new)
- List all monthly reports
- View detailed breakdowns
- Download report documents
- Filter and search capabilities

#### Navigation
**`src/App.tsx`** (updated)
- Added `/relatorios-mensais` route

**`src/components/Sidebar.tsx`** (updated)
- Added "Relatórios Mensais" link

---

## 🚀 How to Use

### Step 1: Setup Database

Run the SQL migration in your Supabase SQL Editor:

```bash
# Open Supabase Dashboard > SQL Editor
# Run: backend/create-monthly-reports-table.sql
```

This creates:
- `monthly_reports` table
- `archived_tickets` table
- Indexes and constraints

### Step 2: Generate Monthly Report

1. **Navigate to Finance Page** (`/financeiro`)
2. **Click "Gerar Relatório Mensal"** button
3. **Select period:**
   - Month (1-12)
   - Year
   - ✅ Clear operational records (recommended)
4. **Review warnings:**
   - Archives all financial data
   - Generates comprehensive report
   - Clears tickets table (if selected)
5. **Click "Gerar Relatório"**

### Step 3: View Reports

1. **Navigate to "Relatórios Mensais"** page
2. **Browse all generated reports**
3. **Click "Ver Detalhes"** on any report
4. **View complete breakdown:**
   - Financial summary
   - Payment methods
   - Operational stats
   - Company info
5. **Download document** for records

---

## 📋 Report Contents

### Company Information
- Name and Legal Name
- CNPJ
- Address and Phone
- Snapshot at time of generation

### Operator Information
- Operator name
- User ID
- Generation timestamp

### Financial Summary
- **Total Revenue**: All income for the period
- **Avulsos Revenue**: One-time parking fees
- **Mensalistas Revenue**: Monthly subscription payments

### Payment Methods Breakdown
- Cash (Dinheiro)
- PIX
- Debit Card (Cartão Débito)
- Credit Card (Cartão Crédito)

### Operational Statistics
- Total tickets created
- Tickets closed (completed)
- Active monthly customers count
- Monthly payments received

### Archived Data (JSONB)
- All tickets from the period
- All payments made
- Monthly customers snapshot
- Full structured report

---

## 🔐 Permissions

### Required Permission: `viewReports`

**Who can access:**
- Admins (all permissions)
- Operators with `viewReports` permission

**What they can do:**
- Generate monthly reports
- View past reports
- Download report documents

**Admin only:**
- Delete monthly reports (corrections)

---

## 🎨 User Interface

### Finance Page Updates
```
┌─────────────────────────────────────────┐
│ Financeiro                              │
├─────────────────────────────────────────┤
│                                         │
│ [Exportar CSV] [Gerar Relatório Mensal]│
│                                         │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│ │ Avulsos │ │Mensalst.│ │  Total  │  │
│ │R$ 1.200 │ │R$ 3.600 │ │R$ 4.800 │  │
│ └─────────┘ └─────────┘ └─────────┘  │
└─────────────────────────────────────────┘
```

### Monthly Report Dialog
```
┌───────────────────────────────────────┐
│ Gerar Relatório Mensal            [X] │
├───────────────────────────────────────┤
│                                       │
│ Mês: [Outubro ▼]                     │
│ Ano: [2025 ▼]                        │
│                                       │
│ ☑ Limpar registros operacionais      │
│   Remove tickets após arquivamento    │
│                                       │
│ ⚠️  ATENÇÃO:                          │
│ • Arquiva dados de Outubro/2025      │
│ • Gera relatório completo            │
│ • Limpa tabela operacional           │
│                                       │
│        [Cancelar]  [Gerar Relatório] │
└───────────────────────────────────────┘
```

### Monthly Reports Page
```
┌─────────────────────────────────────────┐
│ Relatórios Mensais                      │
├─────────────────────────────────────────┤
│                                         │
│ ┌──────────────┐ ┌──────────────┐     │
│ │ Outubro 2025 │ │ Setembro 2025│     │
│ │ R$ 4.800,00  │ │ R$ 4.200,00  │     │
│ │ [Ver Detalhes]│ │ [Ver Detalhes]│    │
│ └──────────────┘ └──────────────┘     │
│                                         │
│ ┌──────────────┐ ┌──────────────┐     │
│ │ Agosto 2025  │ │ Julho 2025   │     │
│ │ R$ 5.100,00  │ │ R$ 3.900,00  │     │
│ │ [Ver Detalhes]│ │ [Ver Detalhes]│    │
│ └──────────────┘ └──────────────┘     │
└─────────────────────────────────────────┘
```

---

## 🔄 Monthly Cycle Workflow

### End of Month Process

```
1. Operator clicks "Gerar Relatório Mensal"
   ↓
2. Selects month/year (defaults to previous month)
   ↓
3. Confirms archival and cleanup
   ↓
4. System generates report:
   • Fetches all payments
   • Calculates totals
   • Aggregates statistics
   • Captures company info
   • Records operator details
   ↓
5. Saves to database:
   • monthly_reports table
   • archived_tickets table
   ↓
6. Clears operational tables (if selected):
   • Deletes tickets from tickets table
   ↓
7. Success notification
   ↓
8. Ready for new monthly cycle ✓
```

### New Month Starts Fresh

```
✓ Clean operational table
✓ Previous data archived
✓ Report accessible anytime
✓ Ready for new entries
```

---

## 🛡️ Data Safety

### What's Preserved
- ✅ All financial data (payments)
- ✅ All operational data (tickets)
- ✅ Monthly customers snapshot
- ✅ Company configuration
- ✅ Operator information
- ✅ Complete audit trail

### What's Cleared
- ❌ Operational tickets table (only if selected)
- ℹ️  Data moved to archived_tickets
- ℹ️  Also stored in report JSONB

### Backup Strategy
1. **Primary**: Supabase automatic backups
2. **Secondary**: JSONB fields in report
3. **Tertiary**: archived_tickets table
4. **Manual**: Downloadable documents

---

## 📊 Database Schema

### `monthly_reports` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `report_month` | INTEGER | 1-12 |
| `report_year` | INTEGER | e.g., 2025 |
| `generated_at` | TIMESTAMP | Creation time |
| `company_name` | TEXT | Company name |
| `company_cnpj` | TEXT | CNPJ |
| `operator_id` | UUID | Who generated |
| `operator_name` | TEXT | Operator name |
| `total_revenue` | NUMERIC | Total income |
| `avulsos_revenue` | NUMERIC | One-time parking |
| `mensalistas_revenue` | NUMERIC | Monthly subscriptions |
| `cash_total` | NUMERIC | Cash payments |
| `pix_total` | NUMERIC | PIX payments |
| `debit_card_total` | NUMERIC | Debit payments |
| `credit_card_total` | NUMERIC | Credit payments |
| `total_tickets` | INTEGER | Ticket count |
| `tickets_closed` | INTEGER | Completed tickets |
| `monthly_customers_count` | INTEGER | Subscriber count |
| `tickets_data` | JSONB | Archived tickets |
| `payments_data` | JSONB | All payments |
| `report_json` | JSONB | Full structured data |
| `status` | TEXT | 'completed' |

### `archived_tickets` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `report_id` | UUID | FK to monthly_reports |
| `original_ticket_id` | UUID | Original ID |
| `vehicle_plate` | TEXT | License plate |
| `vehicle_type` | TEXT | Vehicle type |
| `entry_time` | TIMESTAMP | Entry time |
| `exit_time` | TIMESTAMP | Exit time |
| `amount` | NUMERIC | Charged amount |
| `status` | TEXT | Ticket status |

---

## 🧪 Testing

### Manual Testing Steps

1. **Create test data:**
   - Add some tickets (entries/exits)
   - Register monthly customer payments
   - Use different payment methods

2. **Generate report:**
   - Go to Finance page
   - Click "Generate Monthly Report"
   - Select current month
   - Check "Clear operational records"
   - Confirm generation

3. **Verify success:**
   - Check success message
   - Navigate to "Relatórios Mensais"
   - Find generated report
   - Click "Ver Detalhes"

4. **Validate data:**
   - Check totals match your test data
   - Verify payment methods breakdown
   - Confirm tickets count
   - Review company info

5. **Check cleanup:**
   - Go to Operational page
   - Verify tickets table is empty
   - Check database: `archived_tickets` has data

6. **Download document:**
   - Click "Baixar Documento"
   - Verify file downloads
   - Check report formatting

---

## 🐛 Troubleshooting

### Report Generation Fails

**Error: "Report already exists"**
- One report per month is allowed
- Delete existing report (admin) if needed
- Or select different month/year

**Error: "Database schema out of date"**
- Run the SQL migration
- Reload Supabase schema cache
- Restart backend server

**Error: "Unauthorized"**
- Check user has `viewReports` permission
- Verify auth token is valid
- Re-login if necessary

### Reports Not Showing

**Empty list on Reports page**
- No reports generated yet
- Generate first report from Finance page
- Check database for records

**Can't view details**
- Check network console for errors
- Verify API endpoint is accessible
- Check Supabase connection

### Operational Table Not Clearing

**Tickets still in table after report**
- Check "Clear operational records" was selected
- Verify no database errors in backend logs
- Data should be in `archived_tickets` table
- Manual cleanup: `DELETE FROM tickets WHERE entry_time < '2025-11-01'`

---

## 📈 Best Practices

### When to Generate Reports

- **End of each month** (recommended)
- After all payments are recorded
- Before starting new monthly cycle
- When cash register is closed

### Before Generating

✓ Verify all tickets are closed
✓ Record all outstanding payments
✓ Confirm monthly customer payments
✓ Close daily cash register
✓ Review financial summary

### After Generating

✓ Download document for backup
✓ Verify data accuracy
✓ Share with accounting department
✓ Archive physical copy (if required)
✓ Start fresh monthly cycle

### Data Retention

- Keep all digital reports indefinitely
- Download PDFs for external backups
- Store documents in accounting software
- Follow local tax regulations (usually 5-7 years)

---

## 🔮 Future Enhancements

### Phase 2 (Optional)
- [ ] PDF generation (replace text documents)
- [ ] Email reports to accounting
- [ ] Automated monthly scheduling
- [ ] Excel export with formulas
- [ ] Chart visualizations
- [ ] Year-over-year comparisons
- [ ] Tax report generation
- [ ] Cloud backup integration
- [ ] Multi-branch support

### Phase 3 (Advanced)
- [ ] AI-powered insights
- [ ] Predictive revenue analytics
- [ ] Automated reconciliation
- [ ] Bank integration
- [ ] Invoice generation
- [ ] Accounting software sync

---

## 📞 Support

### Common Questions

**Q: Can I generate multiple reports for the same month?**
A: No, one report per month. Delete existing if needed (admin only).

**Q: What happens if I don't clear operational records?**
A: Data stays in tickets table. You can clear manually later.

**Q: Can I retrieve archived tickets?**
A: Yes, view report details or query `archived_tickets` table.

**Q: Is it safe to clear tickets?**
A: Yes! Data is archived in multiple places before deletion.

**Q: Can operators delete reports?**
A: No, only admins can delete (for error corrections).

**Q: Where is the data stored?**
A: Supabase database (cloud), with automatic backups.

---

## ✨ Summary

### What You Get

✅ **Complete monthly financial reports**
✅ **Automatic data archival**
✅ **Operational table cleanup**
✅ **Historical report access**
✅ **Download capabilities**
✅ **Professional accounting documents**
✅ **Audit trail compliance**
✅ **Scalable cloud storage**

### Implementation Complete

All requirements have been implemented:
1. ✅ Storage strategy defined (database recommended)
2. ✅ Monthly report generation button
3. ✅ Comprehensive report contents
4. ✅ Company and operator information
5. ✅ Revenue summaries and breakdowns
6. ✅ Operational table cleanup
7. ✅ Report viewing and retrieval
8. ✅ Document download functionality

**System is ready for production use!** 🎉

---

Generated: November 2025
Version: 1.0
