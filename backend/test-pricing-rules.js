/**
 * Test script to verify pricing rules endpoints
 * Run with: node backend/test-pricing-rules.js
 */

import { supabase } from './src/config/supabase.js';

async function testPricingRules() {
  console.log('🧪 Testing Pricing Rules System\n');

  // Test 1: Check if pricing_rules table exists
  console.log('1️⃣ Checking if pricing_rules table exists...');
  try {
    const { data, error } = await supabase
      .from('pricing_rules')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Table does not exist or has permission issues:', error.message);
      console.log('\n⚠️  ACTION NEEDED: Execute the SQL migration');
      console.log('   File: /backend/create-pricing-rules-table.sql');
      console.log('   Run in: Supabase SQL Editor\n');
      return;
    }
    console.log('✅ Table exists\n');
  } catch (err) {
    console.error('❌ Error checking table:', err.message);
    return;
  }

  // Test 2: Check if rates table has data
  console.log('2️⃣ Checking for existing rates...');
  try {
    const { data: rates, error } = await supabase
      .from('rates')
      .select('id, vehicle_type, rate_type')
      .limit(5);
    
    if (error) {
      console.error('❌ Error fetching rates:', error.message);
      return;
    }
    
    if (!rates || rates.length === 0) {
      console.log('⚠️  No rates found. Create at least one rate first.');
      return;
    }
    
    console.log(`✅ Found ${rates.length} rates:`);
    rates.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.vehicle_type} - ${r.rate_type} (ID: ${r.id})`);
    });
    console.log('');

    // Test 3: Try to create a test pricing rule
    console.log('3️⃣ Creating test pricing rule...');
    const testRateId = rates[0].id;
    
    const { data: newRule, error: createError } = await supabase
      .from('pricing_rules')
      .insert([{
        rate_id: testRateId,
        rule_type: 'first_hour',
        conditions: {},
        value_adjustment: { type: 'override', value: 10 },
        priority: 1,
        description: 'TEST: Primeira hora R$ 10',
        is_active: true
      }])
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creating rule:', createError.message);
      return;
    }
    
    console.log(`✅ Test rule created: ${newRule.description} (ID: ${newRule.id})\n`);

    // Test 4: Fetch rules for that rate
    console.log('4️⃣ Fetching rules for rate...');
    const { data: fetchedRules, error: fetchError } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('rate_id', testRateId);
    
    if (fetchError) {
      console.error('❌ Error fetching rules:', fetchError.message);
      return;
    }
    
    console.log(`✅ Found ${fetchedRules.length} rule(s):\n`);
    fetchedRules.forEach(rule => {
      console.log(`   - ${rule.description}`);
      console.log(`     Type: ${rule.rule_type}`);
      console.log(`     Priority: ${rule.priority}`);
      console.log(`     Active: ${rule.is_active}`);
      console.log('');
    });

    // Test 5: Clean up test data
    console.log('5️⃣ Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('pricing_rules')
      .delete()
      .eq('id', newRule.id);
    
    if (deleteError) {
      console.error('❌ Error deleting test rule:', deleteError.message);
    } else {
      console.log('✅ Test rule deleted\n');
    }

    console.log('✅ ALL TESTS PASSED! System is ready.\n');
    console.log('📌 Next steps:');
    console.log('   1. Open frontend at http://localhost:5173');
    console.log('   2. Go to Tarifas page');
    console.log('   3. Click ⚙️ icon on any rate');
    console.log('   4. Create your first pricing rule\n');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

testPricingRules().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}).catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
