# Business Hours Display Issue - Debugging Guide

## Problem
The 7 business hours cards are not showing in the "Horários de Funcionamento" tab.

## Debugging Steps Added

### 1. Enhanced Console Logging
Added comprehensive debug logging to track the entire data flow:

**Component Mount:**
- Logs API_BASE_URL value
- Logs VITE_API_URL environment variable
- Confirms component mounted

**API Fetch:**
- Logs the full API URL being called
- Logs if authentication token exists
- Logs HTTP response status
- Logs the full API response data
- Logs success/failure and error messages

**State Updates:**
- Logs when businessHours state changes
- Logs the count of business hours
- Logs the first business hour object for inspection

**Rendering:**
- Logs each hour being rendered
- Shows empty state message if no data

### 2. Empty State UI
Added a message that displays when `businessHours.length === 0`:
```
"Nenhum horário configurado. Verifique o console para detalhes."
```

## How to Debug

1. **Open the Page:**
   - Navigate to "Horários e Feriados" in the sidebar
   - Make sure you're on the "Horários" tab

2. **Open Browser DevTools:**
   - Press F12 or right-click > Inspect
   - Go to the Console tab

3. **Check the Debug Logs:**
   Look for lines starting with `[DEBUG]`:

   ```
   [DEBUG] Component mounted
   [DEBUG] API_BASE_URL: <URL>
   [DEBUG] import.meta.env.VITE_API_URL: <value>
   [DEBUG] Fetching business hours from: <URL>
   [DEBUG] Token exists: true/false
   [DEBUG] Response status: 200/401/500
   [DEBUG] Business hours data received: {...}
   [DEBUG] Setting business hours, count: 7
   [DEBUG] businessHours state updated, count: 7
   [DEBUG] First business hour: {...}
   [DEBUG] Rendering hour: {...}
   ```

4. **Common Issues to Look For:**

   **Issue 1: NetworkError**
   ```
   [DEBUG] Error fetching business hours: NetworkError
   ```
   - **Cause:** API_BASE_URL is using localhost:3000 in Codespaces
   - **Solution:** Set VITE_API_URL environment variable or use relative path

   **Issue 2: 401 Unauthorized**
   ```
   [DEBUG] Response status: 401
   [DEBUG] Token exists: false
   ```
   - **Cause:** Not logged in or token expired
   - **Solution:** Log in again

   **Issue 3: Empty Data**
   ```
   [DEBUG] Business hours data received: {success: true, data: []}
   [DEBUG] Setting business hours, count: 0
   ```
   - **Cause:** Database has no business hours records
   - **Solution:** Run the SQL migration: `backend/create-business-hours-table.sql`

   **Issue 4: API Returns success=false**
   ```
   [DEBUG] API returned success=false: Database error message
   ```
   - **Cause:** Database query failed
   - **Solution:** Check backend logs and database connection

   **Issue 5: Data Received but Not Rendered**
   ```
   [DEBUG] Setting business hours, count: 7
   [DEBUG] businessHours state updated, count: 0
   ```
   - **Cause:** State update failed or data format mismatch
   - **Solution:** Check data structure matches TypeScript interface

## Expected Console Output (Success)

```
[DEBUG] Component mounted
[DEBUG] API_BASE_URL: http://localhost:3000
[DEBUG] import.meta.env.VITE_API_URL: undefined
[DEBUG] Fetching business hours from: http://localhost:3000/business-hours
[DEBUG] Token exists: true
[DEBUG] Response status: 200
[DEBUG] Business hours data received: {success: true, data: Array(7)}
[DEBUG] Setting business hours, count: 7
[DEBUG] businessHours state updated, count: 7
[DEBUG] First business hour: {id: "...", day_name: "Segunda-feira", is_open: true, ...}
[DEBUG] Rendering hour: {id: "...", day_name: "Segunda-feira", ...}
[DEBUG] Rendering hour: {id: "...", day_name: "Terça-feira", ...}
... (5 more)
```

## Database Verification

To verify data exists in the database, run this query in Supabase SQL Editor:

```sql
SELECT * FROM business_hours ORDER BY day_of_week;
```

Expected: 7 rows (Sunday through Saturday)

## Quick Fixes

### Fix 1: Re-run SQL Migration
```bash
cd /workspaces/appestacionamento/backend
# Copy the SQL from create-business-hours-table.sql
# Paste and run in Supabase SQL Editor
```

### Fix 2: Check Backend Running
```bash
ps aux | grep "node.*server" | grep -v grep
curl http://localhost:3000/rates  # Test if backend responds
```

### Fix 3: Clear Cache and Reload
```javascript
// In browser console:
localStorage.clear();
location.reload();
// Then log in again
```

## File Locations

- **Frontend Component:** `/src/pages/HorariosFeriados.tsx`
- **Backend Controller:** `/backend/src/controllers/businessHoursController.js`
- **Routes:** `/backend/src/routes/index.js` (lines 120-123)
- **SQL Migration:** `/backend/create-business-hours-table.sql`

## Next Steps After Debugging

Once you identify the issue from the console logs, report:
1. What the console shows
2. Which debug messages appear
3. Any error messages
4. Response status and data structure

This will help pinpoint the exact problem and solution.
