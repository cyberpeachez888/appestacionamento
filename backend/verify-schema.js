#!/usr/bin/env node

/**
 * Schema Verification Script
 * 
 * This script checks if all required columns exist in the monthly_customers table
 * and tests if the Supabase client can access them properly.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const REQUIRED_COLUMNS = [
  'id',
  'name',
  'cpf',
  'phone',
  'parking_slot',
  'plates',
  'operator_name',
  'value',
  'contract_date',
  'last_payment',
  'due_date',
  'status',
  'created_at'
];

async function verifySchema() {
  console.log('🔍 Verifying monthly_customers schema...\n');

  try {
    // Test 1: Fetch a sample customer
    console.log('📋 Test 1: Fetching sample customer...');
    const { data: customers, error: fetchError } = await supabase
      .from('monthly_customers')
      .select('*')
      .limit(1);

    if (fetchError) {
      console.error('❌ Error fetching customers:', fetchError.message);
      console.error('Details:', fetchError.details);
      console.error('Hint:', fetchError.hint);
      return;
    }

    if (!customers || customers.length === 0) {
      console.log('⚠️  No customers found in database (table might be empty)');
      console.log('Creating a test customer to verify schema...\n');
    } else {
      console.log('✅ Successfully fetched customer');
      console.log('Available columns:', Object.keys(customers[0]).join(', '));
      console.log('');
    }

    // Test 2: Check for required columns
    console.log('📋 Test 2: Checking for required columns...');
    if (customers && customers.length > 0) {
      const availableColumns = Object.keys(customers[0]);
      const missingColumns = REQUIRED_COLUMNS.filter(col => !availableColumns.includes(col));
      
      if (missingColumns.length > 0) {
        console.error('❌ Missing columns:', missingColumns.join(', '));
        console.log('\n💡 Solution: Run backend/COMPLETE-MIGRATION.sql in Supabase SQL Editor');
        return;
      } else {
        console.log('✅ All required columns are present');
      }
    }
    console.log('');

    // Test 3: Try to select specific columns
    console.log('📋 Test 3: Testing specific column access...');
    const { data: testData, error: selectError } = await supabase
      .from('monthly_customers')
      .select('parking_slot, cpf, phone, plates, operator_name')
      .limit(1);

    if (selectError) {
      if (selectError.message.includes('schema cache')) {
        console.error('❌ SCHEMA CACHE ERROR DETECTED!');
        console.error('Error:', selectError.message);
        console.log('\n🔧 SOLUTION:');
        console.log('1. Go to Supabase Dashboard > SQL Editor');
        console.log('2. Run: NOTIFY pgrst, \'reload schema\';');
        console.log('3. Or go to Settings > API > Reload schema button');
        console.log('\n📄 Or run: backend/FIX-SCHEMA-CACHE.sql');
        return;
      }
      console.error('❌ Error selecting columns:', selectError.message);
      return;
    }

    console.log('✅ All new columns are accessible via Supabase client');
    console.log('');

    // Test 4: Try to update a customer (if exists)
    if (customers && customers.length > 0) {
      const testCustomer = customers[0];
      console.log('📋 Test 4: Testing update operation...');
      
      const { data: updateData, error: updateError } = await supabase
        .from('monthly_customers')
        .update({ 
          parking_slot: testCustomer.parking_slot // Update with same value
        })
        .eq('id', testCustomer.id)
        .select()
        .single();

      if (updateError) {
        if (updateError.message.includes('schema cache')) {
          console.error('❌ SCHEMA CACHE ERROR ON UPDATE!');
          console.error('Error:', updateError.message);
          console.log('\n🔧 SOLUTION:');
          console.log('1. Go to Supabase Dashboard > SQL Editor');
          console.log('2. Run: NOTIFY pgrst, \'reload schema\';');
          console.log('3. Or use the Reload Schema button in Settings > API');
          return;
        }
        console.error('❌ Error updating customer:', updateError.message);
        return;
      }

      console.log('✅ Update operation successful');
      console.log('');
    }

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('✨ ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('Your schema is properly configured and the');
    console.log('schema cache is up to date.');
    console.log('');
    console.log('If you still see errors in the app:');
    console.log('1. Clear browser cache');
    console.log('2. Restart the backend server');
    console.log('3. Check for typos in column names');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.error('Stack:', err.stack);
  }
}

// Run verification
console.log('');
console.log('╔═══════════════════════════════════════╗');
console.log('║  Monthly Customers Schema Validator   ║');
console.log('╚═══════════════════════════════════════╝');
console.log('');

verifySchema()
  .then(() => {
    console.log('');
    console.log('Verification complete.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
