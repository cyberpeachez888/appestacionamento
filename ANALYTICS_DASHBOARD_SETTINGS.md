# Analytics Dashboard Settings - Setup Guide

## Overview
The Analytics Dashboard Settings feature allows administrators to customize their dashboard experience, configure KPI monitoring, and schedule automated reports.

## Features

### 1. General Dashboard Settings
- **Refresh Interval**: How often dashboard data updates (in seconds)
- **Data Retention**: How long to keep historical data (in days)
- **Default Date Range**: Initial time period shown on dashboard
- **Theme**: Visual appearance (light/dark/auto)
- **Comparisons**: Toggle period-over-period comparisons

### 2. Dashboard Widgets
- Customize which widgets appear on dashboard
- Configure widget position and size
- Toggle widget visibility
- Set widget-specific refresh intervals
- Available widget types:
  - Revenue tracking
  - Vehicle counts
  - Occupancy rates
  - Monthly customers
  - Charts and graphs

### 3. KPI Thresholds & Alerts
- Set minimum/maximum values for key metrics
- Configure alert severity levels (info/warning/critical)
- Enable/disable alerts
- Specify alert recipients
- Monitor metrics like:
  - Daily revenue
  - Vehicle throughput
  - Occupancy percentage
  - Monthly customer retention

### 4. Report Schedules
- Automate report delivery via email
- Configure frequencies (daily/weekly/monthly)
- Set delivery time
- Choose format (PDF/Excel/CSV)
- Define recipients
- Available report types:
  - Daily summary
  - Weekly summary
  - Monthly summary
  - Financial reports
  - Operational reports

## Setup Instructions

### Step 1: Run SQL Migration

Execute the SQL migration in your Supabase SQL Editor:

```bash
# Location: /backend/create-analytics-dashboard-settings.sql
```

This creates 4 tables:
- `dashboard_settings` - General preferences
- `dashboard_widgets` - Widget configurations
- `kpi_thresholds` - KPI monitoring rules
- `report_schedules` - Automated report schedules

### Step 2: Verify Backend is Running

The backend automatically includes the dashboard settings endpoints:

```bash
cd /workspaces/appestacionamento/backend
node src/server.js
```

### Step 3: Access the Dashboard Settings

1. Log in to the application
2. Navigate to "Dashboard Analytics" in the sidebar
3. The page has 4 tabs:
   - **Geral**: General settings
   - **Widgets**: Dashboard widget configuration
   - **KPIs**: KPI thresholds and alerts
   - **Relatórios**: Report scheduling

## API Endpoints

All endpoints require authentication (`requireAuth`). Modification endpoints require `manageCompanyConfig` permission.

### Dashboard Settings
- `GET /dashboard-settings` - Get current settings
- `PUT /dashboard-settings` - Update settings

### Widgets
- `GET /dashboard-widgets` - List all widgets
- `GET /dashboard-widgets/:id` - Get specific widget
- `POST /dashboard-widgets` - Create new widget
- `PUT /dashboard-widgets/:id` - Update widget
- `DELETE /dashboard-widgets/:id` - Delete widget
- `POST /dashboard-widgets/reorder` - Reorder widgets

### KPI Thresholds
- `GET /kpi-thresholds` - List all thresholds
- `GET /kpi-thresholds/:id` - Get specific threshold
- `POST /kpi-thresholds` - Create new threshold
- `PUT /kpi-thresholds/:id` - Update threshold
- `DELETE /kpi-thresholds/:id` - Delete threshold

### Report Schedules
- `GET /report-schedules` - List all schedules
- `GET /report-schedules/:id` - Get specific schedule
- `POST /report-schedules` - Create new schedule
- `PUT /report-schedules/:id` - Update schedule
- `DELETE /report-schedules/:id` - Delete schedule
- `POST /report-schedules/:id/test` - Send test email

## Usage Examples

### Configure General Settings

1. Go to "Dashboard Analytics" > "Geral" tab
2. Set refresh interval (e.g., 60 seconds)
3. Set data retention (e.g., 365 days)
4. Choose default date range (e.g., "Últimos 30 dias")
5. Enable/disable comparisons
6. Click "Salvar Configurações"

### Add a KPI Alert

1. Go to "Dashboard Analytics" > "KPIs" tab
2. Click "Adicionar Limite KPI"
3. Enter KPI name (e.g., "Receita Diária")
4. Select metric type (e.g., "Moeda")
5. Set operator (e.g., "Menor que")
6. Set threshold value (e.g., 1000)
7. Select severity (e.g., "Aviso")
8. Enable alerts
9. Click "Salvar"

### Schedule a Daily Report

1. Go to "Dashboard Analytics" > "Relatórios" tab
2. Click "Agendar Relatório"
3. Enter report name (e.g., "Resumo Diário")
4. Select type "Resumo Diário"
5. Set frequency "Diário"
6. Set time (e.g., "08:00")
7. Choose format "PDF"
8. Enter recipient emails (comma-separated)
9. Enable "Agendamento Ativo"
10. Click "Salvar"

### Test a Report Schedule

1. Find the schedule in the list
2. Click the mail icon (✉️) next to it
3. Check recipient inbox for test email

## Database Schema

### dashboard_settings
```sql
- id (UUID, PK)
- refresh_interval (INTEGER) - Seconds between updates
- data_retention_days (INTEGER) - Days to keep data
- default_date_range (VARCHAR) - Default time period
- theme (VARCHAR) - UI theme
- show_comparisons (BOOLEAN) - Show period comparisons
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### dashboard_widgets
```sql
- id (UUID, PK)
- widget_type (VARCHAR) - Type of widget
- title (VARCHAR) - Display title
- position_x, position_y (INTEGER) - Grid position
- width, height (INTEGER) - Size
- is_visible (BOOLEAN) - Visibility toggle
- config (JSONB) - Widget-specific settings
- refresh_interval (INTEGER) - Override refresh rate
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### kpi_thresholds
```sql
- id (UUID, PK)
- kpi_name (VARCHAR) - KPI identifier
- metric_type (VARCHAR) - currency/percentage/count
- threshold_value (DECIMAL) - Alert trigger value
- comparison_operator (VARCHAR) - <, >, <=, >=, =
- severity (VARCHAR) - info/warning/critical
- alert_enabled (BOOLEAN) - Enable alerts
- alert_recipients (TEXT[]) - Email addresses
- description (TEXT) - Optional notes
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### report_schedules
```sql
- id (UUID, PK)
- report_name (VARCHAR) - Schedule name
- report_type (VARCHAR) - Type of report
- frequency (VARCHAR) - daily/weekly/monthly
- schedule_time (TIME) - When to run
- recipients (TEXT[]) - Email addresses
- format (VARCHAR) - pdf/excel/csv
- is_active (BOOLEAN) - Enable/disable
- filters (JSONB) - Report filters
- last_run (TIMESTAMP) - Last execution
- next_run (TIMESTAMP) - Next scheduled run
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## Permissions

- **View Settings**: `viewReports` permission
- **Modify Settings**: `manageCompanyConfig` permission
- **Test Reports**: `manageCompanyConfig` permission

## Files Created/Modified

### Backend
- `/backend/create-analytics-dashboard-settings.sql` - Database migration (361 lines)
- `/backend/src/controllers/dashboardSettingsController.js` - API controller (722 lines)
- `/backend/src/routes/index.js` - Added 25 routes

### Frontend
- `/src/pages/ConfiguracoesDashboard.tsx` - Settings page (694 lines)
- `/src/App.tsx` - Added route (already existed)
- `/src/components/Sidebar.tsx` - Added menu item

## Troubleshooting

### Settings not saving
- Check browser console for errors
- Verify authentication token is valid
- Confirm user has `manageCompanyConfig` permission

### Test email not received
- Check backend logs for email service errors
- Verify integration settings in Integrations page
- Ensure recipient email is correct
- Check spam folder

### Widgets not appearing
- Verify widget `is_visible` is true
- Check widget position values
- Ensure default widgets were created in migration

### KPI alerts not firing
- Confirm `alert_enabled` is true
- Verify threshold values are correct
- Check that metric data is being collected
- Review backend logs for alert processing

## Next Steps

1. **Run the SQL migration** in Supabase
2. **Configure default settings** via the UI
3. **Add KPI thresholds** for critical metrics
4. **Schedule reports** for stakeholders
5. **Customize widgets** to match your workflow

## Notes

- Report emails require email integration to be configured (see Integrations page)
- KPI alerts check values when data is updated
- Data retention automatically archives old records
- Widget positions use a grid system (x,y coordinates)
- Scheduled reports run based on server timezone

## Support

For issues or questions:
1. Check browser console for errors
2. Review backend logs: `/tmp/backend.log`
3. Verify SQL migration completed successfully
4. Ensure all permissions are correctly set
