// Quick script to test Supabase data directly
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testData() {
    console.log('=== Testing Convenios Data ===\n');

    // Test 1: Get first convenio with plano
    const { data: convenios, error } = await supabase
        .from('convenios')
        .select(`
            id,
            nome_empresa,
            tipo_convenio,
            plano_ativo:convenios_planos(
                id,
                num_vagas_contratadas,
                valor_mensal,
                dia_vencimento_pagamento,
                dia_fechamento,
                dia_vencimento_pos_pago,
                ativo
            )
        `)
        .limit(3);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Raw data from Supabase:');
    console.log(JSON.stringify(convenios, null, 2));

    // Test 2: Check active plans directly
    console.log('\n=== Active Plans ===\n');
    const { data: planos } = await supabase
        .from('convenios_planos')
        .select('*')
        .eq('ativo', true)
        .limit(5);

    console.log(JSON.stringify(planos, null, 2));
}

testData().catch(console.error);
