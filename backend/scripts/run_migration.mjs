#!/usr/bin/env node
/**
 * Script para executar migração do banco de dados via Supabase
 * Uso: node backend/scripts/run_migration.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
dotenv.config({ path: join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados!');
    console.error('Configure estes valores no arquivo backend/.env');
    process.exit(1);
}

console.log('🔧 Conectando ao Supabase...');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Ler arquivo SQL
const migrationPath = join(__dirname, '..', 'migrations', 'migrate_convenios_to_unified.sql');
console.log(`📄 Lendo migração: ${migrationPath}`);

let sql;
try {
    sql = readFileSync(migrationPath, 'utf8');
    console.log(`✅ Arquivo lido (${sql.length} bytes)`);
} catch (error) {
    console.error(`❌ Erro ao ler arquivo: ${error.message}`);
    process.exit(1);
}

// Executar migração
console.log('\n🚀 Executando migração...\n');
console.log('='.repeat(60));

try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('\n❌ ERRO NA MIGRAÇÃO:');
        console.error(error);
        console.error('\n⚠️  A migração falhou. O banco de dados não foi alterado.');
        process.exit(1);
    }

    console.log('='.repeat(60));
    console.log('\n✅ MIGRAÇÃO EXECUTADA COM SUCESSO!\n');

    if (data) {
        console.log('Resultado:');
        console.log(data);
    }

    console.log('\n📋 Próximos passos:');
    console.log('  1. Reiniciar o backend');
    console.log('  2. Testar endpoints da API');
    console.log('  3. Verificar funcionamento do frontend\n');

} catch (error) {
    console.error('\n❌ ERRO INESPERADO:');
    console.error(error);
    process.exit(1);
}
