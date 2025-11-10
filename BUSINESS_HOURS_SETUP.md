# Business Hours & Holidays - Setup Instructions

## ⚠️ CRITICAL: SQL Migration Required

The "Horários e Feriados" page will show errors until you execute the SQL migration in Supabase.

## Status:
- ✅ Backend API: **READY** (all controllers and routes working)
- ✅ Frontend UI: **READY** (page created with 3 tabs)
- ❌ Database Tables: **NOT CREATED YET**

## Why You're Seeing Errors:

The error "Falha ao carregar eventos" (and similar errors) happens because:
1. The frontend tries to fetch data from `/business-hours`, `/holidays`, `/special-events`
2. The backend tries to query tables that **don't exist yet**
3. Supabase returns an error because tables are missing

## How to Fix:

### Step 1: Execute SQL Migration

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: `nnpvazzeomwklugawceg`

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Paste Migration**
   - Open file: `/workspaces/appestacionamento/backend/create-business-hours-table.sql`
   - Copy ALL content (360 lines)
   - Paste into Supabase SQL Editor

4. **Run Migration**
   - Click "Run" button (or press Ctrl+Enter)
   - Wait for success message

### Step 2: Verify Tables Created

After running the migration, verify in Supabase:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('business_hours', 'holidays', 'special_events');

-- Check default data was inserted
SELECT * FROM business_hours ORDER BY day_of_week;
SELECT * FROM holidays ORDER BY holiday_date;
```

You should see:
- ✅ 7 rows in `business_hours` (Sunday-Saturday)
- ✅ 11 rows in `holidays` (Brazilian national holidays)
- ✅ 0 rows in `special_events` (empty, ready for custom events)

### Step 3: Reload Frontend

After migration completes:
1. Go to `http://localhost:8080`
2. Login as admin
3. Click "Horários e Feriados" in sidebar
4. All 3 tabs should now work:
   - **Horário de Funcionamento**: Shows 7 cards (one per day) with Edit buttons
   - **Feriados**: Shows 11 Brazilian holidays with Add/Edit/Delete buttons
   - **Eventos Especiais**: Empty list with "Novo Evento" button

## What the Page Should Look Like:

### Tab 1: Horário de Funcionamento
- Grid of 7 cards (Domingo, Segunda, Terça, Quarta, Quinta, Sexta, Sábado)
- Each card shows:
  - Day name
  - Status badge (Aberto/Fechado)
  - Opening hours (e.g., "08:00 - 18:00")
  - After-hours surcharge info
  - **Edit button**
- Clicking Edit opens dialog with:
  - Toggle: Dia Aberto
  - Time pickers: Abertura / Fechamento
  - Toggle: Permitir Atendimento Fora do Horário
  - Input: Acréscimo (%)
  - **Salvar button**

### Tab 2: Feriados
- **"Adicionar Feriado" button** at top
- Grid of holiday cards showing:
  - Holiday name (e.g., "Ano Novo", "Natal")
  - Date formatted in Portuguese
  - Badges: Recorrente, Fechado/Aberto
  - Description
  - Edit and Delete buttons

### Tab 3: Eventos Especiais
- **"Novo Evento" button** at top
- Grid of event cards (empty initially) showing:
  - Event name
  - Date range
  - Price multiplier (e.g., "1.5x - +50%")
  - Active/Inactive badge
  - Edit and Delete buttons

## Default Data Included:

### Business Hours (Monday-Friday):
- Open: 08:00 - 18:00
- After-hours: Allowed (+20% surcharge)

### Saturday:
- Open: 08:00 - 14:00
- After-hours: Allowed (+30% surcharge)

### Sunday:
- Closed

### Holidays (11 Brazilian National Holidays):
1. Ano Novo (January 1) - Recurring
2. Carnaval 2025 (March 4) - Non-recurring
3. Sexta-feira Santa 2025 (April 18) - Non-recurring
4. Tiradentes (April 21) - Recurring
5. Dia do Trabalho (May 1) - Recurring
6. Corpus Christi 2025 (June 19) - Non-recurring
7. Independência do Brasil (September 7) - Recurring
8. Nossa Senhora Aparecida (October 12) - Recurring
9. Finados (November 2) - Recurring
10. Proclamação da República (November 15) - Recurring
11. Natal (December 25) - Recurring

## Troubleshooting:

### Still seeing errors after migration?
1. Check Supabase logs for error details
2. Verify token in localStorage is valid
3. Check browser console for network errors
4. Restart backend: `pkill -f "node.*server" && cd backend && npm start`

### Tables not showing in Supabase?
- Make sure you ran the migration in the correct project
- Check the "public" schema (not "auth" or other schemas)
- Verify no SQL syntax errors in migration output

### Frontend not loading data?
1. Open browser DevTools (F12)
2. Go to Network tab
3. Navigate to "Horários e Feriados"
4. Check responses from `/business-hours`, `/holidays`, `/special-events`
5. Look for error messages in response bodies

## Files Created for This Feature:

### Backend:
- `/backend/create-business-hours-table.sql` - Database migration (360 lines)
- `/backend/src/controllers/businessHoursController.js` - Business hours API
- `/backend/src/controllers/holidaysController.js` - Holidays API
- `/backend/src/controllers/specialEventsController.js` - Special events API
- `/backend/src/routes/index.js` - Routes added (lines 120-137)

### Frontend:
- `/src/pages/HorariosFeriados.tsx` - Main page component (653 lines)
- `/src/App.tsx` - Route added
- `/src/components/Sidebar.tsx` - Menu item added

## Next Steps After Migration:

1. ✅ Test all 3 tabs work correctly
2. ✅ Edit business hours for a day
3. ✅ Create a test holiday
4. ✅ Create a test special event
5. 🔄 Integrate with vehicle entry/exit validation
6. 🔄 Add after-hours surcharge calculation
7. 🔄 Display current status on dashboard
