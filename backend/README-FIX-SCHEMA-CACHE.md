# 🔧 Fix: "Could not find parkingSlot column" Error

## Problem
When editing monthly customers on the Mensalistas page, the system shows:
```
Erro ao salvar cliente: Could not find the 'parkingSlot' column of 'monthly_customers' in the schema cache
```

## Root Cause
The `parking_slot` column exists in your database, but **Supabase's PostgREST schema cache is outdated**. This happens when columns are added via SQL migrations but Supabase hasn't refreshed its API layer cache.

---

## ✅ SOLUTION (Choose one method)

### 🎯 Method 1: SQL Editor (Recommended)
1. Go to your **Supabase Dashboard**
2. Click **SQL Editor** in the sidebar
3. Paste and run this command:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
4. Click **Run** or press `Ctrl+Enter`
5. ✅ Done! Test by editing a monthly customer

**Or use the provided script:**
- Open file: `backend/FIX-SCHEMA-CACHE.sql`
- Copy entire contents
- Paste in Supabase SQL Editor
- Run it

### 🎯 Method 2: Dashboard UI
1. Go to your **Supabase Dashboard**
2. Navigate to **Settings** (gear icon)
3. Click **API** in settings menu
4. Scroll to **Schema Cache** section
5. Click **"Reload schema"** button
6. ✅ Done!

### 🎯 Method 3: Restart Services (if above fail)
If you're running Supabase locally with Docker:
```bash
supabase stop
supabase start
```

Or through Docker directly:
```bash
docker restart supabase_rest_<project>
```

---

## 🧪 Verification Steps

After reloading the schema:

1. **Go to Mensalistas page**
2. **Click on a customer** (or right-click and select "Editar")
3. **Change any field** (name, phone, parking slot, etc.)
4. **Click "Salvar Cliente"**
5. **Success!** The customer should save without errors

---

## 📊 Technical Details

### What Happened
- ✅ Database column `parking_slot` **EXISTS** (verified)
- ✅ Backend code **CORRECTLY** uses `parking_slot` (snake_case)
- ✅ Frontend sends `parkingSlot` (camelCase) - **properly converted**
- ❌ Supabase PostgREST cache **OUT OF DATE**

### Why This Happens
Supabase's PostgREST caches the database schema for performance. When you:
1. Add columns via SQL migrations
2. Without using Supabase Migrations CLI

The cache doesn't automatically update. Manual reload is required.

### Error Message Breakdown
```
Could not find the 'parkingSlot' column
```
- This is PostgREST looking for column based on API request
- The actual database column is `parking_slot` (snake_case)
- PostgREST usually auto-converts, but not if column isn't in cache

---

## 🛡️ Prevention

To avoid this in the future:

### Option A: Use Supabase Migrations
```bash
# Create migration
supabase migration new add_parking_slot

# Edit the generated file with your SQL

# Apply migration (auto-reloads schema)
supabase db push
```

### Option B: Always Reload After Manual SQL
After running SQL migrations manually:
1. Always run `NOTIFY pgrst, 'reload schema';`
2. Or click "Reload schema" in Supabase Dashboard
3. Verify columns in Table Editor before using in app

---

## 📁 Related Files

### Migration Scripts
- `backend/COMPLETE-MIGRATION.sql` - Full schema setup
- `backend/add-parking-slot-column.sql` - Parking slot column
- `backend/MIGRATION-parking-slot.sql` - Alternative migration
- `backend/update-monthly-customers-schema.sql` - CPF/phone/plates

### Backend Code
- `backend/src/controllers/monthlyController.js` - CRUD operations
- `backend/src/routes/index.js` - API routes

### Frontend Code
- `src/pages/Mensalistas.tsx` - Monthly customers page
- `src/components/CustomerDialog.tsx` - Edit/create dialog
- `src/contexts/ParkingContext.tsx` - Data management
- `src/lib/api.ts` - API client

---

## 🆘 Still Having Issues?

### Verify Column Exists
Run in SQL Editor:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'monthly_customers'
AND column_name = 'parking_slot';
```

Expected output:
```
column_name  | data_type | is_nullable
-------------+-----------+-------------
parking_slot | integer   | YES
```

### If Column Is Missing
Run the complete migration:
```sql
-- Open and run: backend/COMPLETE-MIGRATION.sql
```

### Check PostgREST Logs
In Supabase Dashboard:
1. Go to **Logs** > **PostgREST Logs**
2. Look for schema cache messages
3. Should see "Schema cache loaded" after reload

### Test Direct Database Access
```sql
-- Try updating directly
UPDATE monthly_customers
SET parking_slot = 10
WHERE id = 'your-customer-id-here';
```

If this works but API doesn't, schema cache is definitely the issue.

---

## 📞 Support

If none of these solutions work:
1. Check Supabase status: https://status.supabase.com
2. Verify you have the correct Supabase project selected
3. Ensure you're running the latest version of Supabase CLI
4. Try creating a new table column via UI to trigger cache refresh

---

## ✨ Success Indicators

After applying the fix, you should be able to:
- ✅ Edit monthly customer names
- ✅ Edit customer CPF and phone
- ✅ Change parking slot numbers
- ✅ Add/remove vehicle plates
- ✅ Update monthly values
- ✅ See all changes persist correctly

**The error should be completely gone!** 🎉
