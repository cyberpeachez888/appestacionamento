import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('URL:', supabaseUrl);
console.log('Key (start):', supabaseKey ? supabaseKey.substring(0, 10) + '...' : 'undefined');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSettings() {
    console.log('Querying company_settings...');
    const { data, error } = await supabase
        .from('company_settings')
        .select('*');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Data:', data);
    }

    console.log('Querying users count...');
    const { count, error: userError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

    if (userError) {
        console.error('User Error:', userError);
    } else {
        console.log('Users count:', count);
    }
}

checkSettings();
