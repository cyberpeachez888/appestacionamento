# Troubleshooting: Schema Cache Error

## Problem
When editing monthly customers, you get the error:
```
Erro ao salvar cliente: Could not find the 'parkingSlot' column of 'monthly_customers' in the schema cache
```

## Root Cause
This error occurs when Supabase's PostgREST schema cache is outdated. The `parking_slot` column exists in the database, but Supabase's API layer hasn't refreshed its cache to recognize it.

## Solutions

### Solution 1: Run SQL Command (Recommended)
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run this command:
```sql
NOTIFY pgrst, 'reload schema';
```

### Solution 2: Use Dashboard UI
1. Go to your Supabase Dashboard
2. Navigate to **Settings** > **API**
3. Find the **Schema Cache** section
4. Click **"Reload schema"** button

### Solution 3: Restart Supabase (if above methods fail)
If you're running Supabase locally:
```bash
supabase db reset
# or
supabase stop
supabase start
```

## Verification
After reloading the schema, test by:
1. Go to the Mensalistas page
2. Try editing a monthly customer
3. The edit should save successfully without errors

## Prevention
When adding new columns via SQL migrations:
1. Always reload the schema cache after running migrations
2. Or use Supabase migrations which auto-reload the cache
3. Check that columns appear in the Table Editor before using them in the app

## Technical Details
- The `parking_slot` column exists in the database (verified)
- The backend code correctly uses `parking_slot` (snake_case) for database operations
- The frontend sends `parkingSlot` (camelCase) which is properly converted
- The error message references `parkingSlot` but the actual database column is `parking_slot`
- PostgREST caches the schema for performance; manual reload is sometimes needed

## Related Files
- Migration scripts: `backend/COMPLETE-MIGRATION.sql`, `backend/add-parking-slot-column.sql`
- Controller: `backend/src/controllers/monthlyController.js`
- Frontend: `src/pages/Mensalistas.tsx`, `src/components/CustomerDialog.tsx`
