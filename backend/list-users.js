import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
    console.log('Listing users...');
    const { data, error } = await supabase
        .from('users')
        .select('id, login, name, email, role');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Users found:', data);
    }
}

listUsers();
