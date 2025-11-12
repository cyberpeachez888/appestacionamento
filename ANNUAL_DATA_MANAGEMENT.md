# 📊 Annual Data Management Guide

## Performance & Storage Strategy

### Current Setup:

- **Monthly Reports**: Stored in `monthly_reports` table (Supabase)
- **Archived Tickets**: Stored in `archived_tickets` table (backup)
- **Year Filter**: UI shows only selected year (default: current year)

---

## 🎯 Recommended Yearly Workflow

### **Option 1: Keep Everything in Database** ⭐ RECOMMENDED

**Best for: Most users**

✅ **Advantages:**

- No manual intervention needed
- All data searchable and accessible
- Supabase handles 10+ years easily
- Free tier: 500 MB (enough for decades)

📋 **What to do at year-end:**

1. Nothing! Just keep using the system
2. Use year filter (← →) to view previous years
3. Database automatically maintains everything

💾 **Storage estimates:**

- 12 reports/year ≈ **5-10 MB**
- 10 years ≈ **50-100 MB**
- Well within database limits

---

### **Option 2: Export + Keep Database** 💼 RECOMMENDED FOR COMPLIANCE

**Best for: Legal/audit requirements**

📥 **Export yearly summary:**

```bash
# Run at end of each year (e.g., December 31, 2025)
node backend/export-yearly-summary.js --year 2025
```

This creates:

- ✅ `reports_2025_summary.pdf` - Professional financial summary
- ✅ `reports_2025_full_data.json` - Complete raw data backup
- ✅ `reports_2025_payments.csv` - Payments spreadsheet

💡 **Then:**

1. Save exported files to your PC/cloud
2. Keep database data as-is (searchable online)
3. Sleep well knowing you have offline backups

---

### **Option 3: Database Archiving** 🗄️ ADVANCED

**Best for: Very high volume (1000+ tickets/day)**

After **3-5 years**, move old reports to cold storage:

```sql
-- Archive reports older than 3 years to separate table
INSERT INTO monthly_reports_archive
SELECT * FROM monthly_reports
WHERE report_year < EXTRACT(YEAR FROM NOW()) - 3;

-- Then delete from active table
DELETE FROM monthly_reports
WHERE report_year < EXTRACT(YEAR FROM NOW()) - 3;
```

---

## 🚀 Implementation: Yearly Export Script

I'll create the export script for you:
