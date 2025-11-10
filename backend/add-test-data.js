#!/usr/bin/env node

/**
 * Add Test Data for November 2025
 * Creates sample tickets and avulso payments for testing report generation
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuid } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function addTestData() {
  console.log('\n📝 Adding test data for November 2025...\n');

  try {
    // Create test tickets
    const tickets = [
      {
        id: uuid(),
        vehicle_plate: 'ABC1234',
        vehicle_type: 'Carro',
        entry_time: '2025-11-01T10:00:00.000Z',
        exit_time: '2025-11-01T12:00:00.000Z',
        duration_minutes: 120,
        amount: 20.00,
        status: 'closed'
      },
      {
        id: uuid(),
        vehicle_plate: 'XYZ5678',
        vehicle_type: 'Moto',
        entry_time: '2025-11-02T14:30:00.000Z',
        exit_time: '2025-11-02T16:00:00.000Z',
        duration_minutes: 90,
        amount: 15.00,
        status: 'closed'
      },
      {
        id: uuid(),
        vehicle_plate: 'DEF9012',
        vehicle_type: 'Carro',
        entry_time: '2025-11-03T08:00:00.000Z',
        exit_time: '2025-11-03T18:00:00.000Z',
        duration_minutes: 600,
        amount: 50.00,
        status: 'closed'
      }
    ];

    const { error: ticketsError } = await supabase
      .from('tickets')
      .insert(tickets);

    if (ticketsError) {
      console.error('❌ Error creating tickets:', ticketsError.message);
      return;
    }
    console.log(`✅ Created ${tickets.length} test tickets`);

    // Create corresponding avulso payments
    const payments = tickets.map(t => ({
      id: uuid(),
      date: t.exit_time,
      value: t.amount,
      method: ['cash', 'pix', 'debit_card'][Math.floor(Math.random() * 3)],
      target_type: 'ticket',
      target_id: t.id
    }));

    const { error: paymentsError } = await supabase
      .from('payments')
      .insert(payments);

    if (paymentsError) {
      console.error('❌ Error creating payments:', paymentsError.message);
      return;
    }
    console.log(`✅ Created ${payments.length} test avulso payments`);

    console.log('\n✨ Test data created successfully!');
    console.log('\nNow you can:');
    console.log('1. Go to Financeiro page - you should see values > R$ 0,00');
    console.log('2. Go to Operacional page - you should see 3 tickets');
    console.log('3. Generate report for November 2025');
    console.log('4. Check "Limpar Registros Operacionais"');
    console.log('5. Verify data is cleared after generation\n');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

addTestData();
