#!/usr/bin/env node

/**
 * Check Current Data
 * Shows what payments and tickets exist in the database with their dates
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkData() {
  console.log('\n📊 Checking current database data...\n');

  try {
    // Check payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, date, value, target_type, method')
      .order('date', { ascending: false })
      .limit(10);

    if (paymentsError) {
      console.error('❌ Error fetching payments:', paymentsError.message);
    } else {
      console.log(`💰 Recent Payments (${payments?.length || 0}):`);
      if (payments && payments.length > 0) {
        payments.forEach(p => {
          const date = new Date(p.date);
          console.log(`   ${date.toLocaleString('pt-BR')} - R$ ${Number(p.value).toFixed(2)} (${p.target_type}) [${p.method}]`);
        });
      } else {
        console.log('   No payments found');
      }
    }

    // Check tickets
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('id, entry_time, exit_time, status, amount')
      .order('entry_time', { ascending: false })
      .limit(10);

    if (ticketsError) {
      console.error('❌ Error fetching tickets:', ticketsError.message);
    } else {
      console.log(`\n🎫 Recent Tickets (${tickets?.length || 0}):`);
      if (tickets && tickets.length > 0) {
        tickets.forEach(t => {
          const entry = new Date(t.entry_time);
          const exit = t.exit_time ? new Date(t.exit_time).toLocaleString('pt-BR') : 'N/A';
          console.log(`   ${entry.toLocaleString('pt-BR')} - Exit: ${exit} (${t.status}) R$ ${Number(t.amount || 0).toFixed(2)}`);
        });
      } else {
        console.log('   No tickets found');
      }
    }

    console.log('\n');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

checkData();
