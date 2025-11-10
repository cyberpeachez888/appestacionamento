# Setup: Analytics Dashboard Settings

## ⚠️ Required Action: Execute SQL Migration

The Analytics Dashboard Settings feature requires database tables that haven't been created yet.

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New query**

### Step 2: Copy and Execute Migration

1. Open the file: `/workspaces/appestacionamiento/backend/create-analytics-dashboard-settings.sql`
2. Copy **all 361 lines** of the SQL code
3. Paste into the Supabase SQL Editor
4. Click **RUN** button

### Step 3: Verify Tables Created

After executing, you should see 5 new tables:
- ✅ `dashboard_settings` - User preferences
- ✅ `dashboard_widgets` - Dashboard widget configurations  
- ✅ `kpi_thresholds` - KPI monitoring alerts
- ✅ `report_schedules` - Automated report schedules
- ✅ `kpi_alert_history` - Alert history tracking

### Step 4: Refresh the Frontend

1. Reload the Analytics Dashboard page in your browser
2. The 4 JSON parsing errors should disappear
3. You should see default widgets and settings loaded

---

## Current Error Explanation

The errors you're seeing:
```
Error fetching schedules: SyntaxError: JSON.parse: unexpected character at line 1 column 1
Error fetching thresholds: SyntaxError: JSON.parse: unexpected character at line 1 column 1  
Error fetching settings: SyntaxError: JSON.parse: unexpected character at line 1 column 1
Error fetching widgets: SyntaxError: JSON.parse: unexpected character at line 1 column 1
```

**Root Cause:** The backend API is trying to query tables that don't exist yet, causing database errors. The error responses are HTML error pages (not JSON), which causes JSON.parse() to fail.

**Solution:** Execute the SQL migration to create the required database tables.

---

## Default Data Included

The migration will automatically create:
- Default settings for all existing users (5-minute refresh, 24-month retention)
- 4 sample widgets per user (Revenue Chart, Occupancy Rate, Recent Activity, Monthly Customers)
- 2 example KPI thresholds per user (Minimum Daily Revenue, Maximum Occupancy Rate)

After migration, you can customize everything from the Dashboard Analytics page!

---

## Estimated Time

⏱️ **2-5 minutes total**
- SQL execution: 30 seconds
- Verification: 1 minute  
- Testing: 1-3 minutes
