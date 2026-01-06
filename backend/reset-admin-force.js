import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // This is the service_role key ideally, but might be anon

console.log('Connecting to:', supabaseUrl);

// We need a key that can WRITE to users. If SUPABASE_KEY is anon, RLS might block UPDATE.
// However, the user said they have data. 
// If the key in .env is anon, we rely on the RLS policy allowing updates? 
// No, usually users can only update themselves. Admin updates require service_role.
// But wait, the user's .env had a long key. Let's hope it has permissions or we are admin.

const supabase = createClient(supabaseUrl, supabaseKey);

async function forceReset() {
    const login = 'admin';
    const newPassword = 'admin';

    console.log(`Resetting password for user: ${login}...`);

    // 1. Generate hash using the EXACT library the project uses
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    console.log('New Hash generated:', hash);

    // 2. Update user
    const { data, error } = await supabase
        .from('users')
        .update({
            password_hash: hash,
            is_first_login: false,
            must_change_password: false,
            login: 'admin' // Ensure login is set
        })
        .eq('login', login)
        .select();

    if (error) {
        console.error('❌ Error updating user:', error);
    } else {
        console.log('✅ User updated successfully:', data);
    }
}

forceReset();
