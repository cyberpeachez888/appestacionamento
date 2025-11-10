import { supabase } from '../config/supabase.js';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';

/**
 * Setup Controller
 * Handles first-run setup and initialization
 */

/**
 * Check if first-run setup has been completed
 */
export const checkFirstRun = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('company_settings')
      .select('setup_completed')
      .single();

    if (error) {
      // Table might not exist yet
      return res.json({ 
        isFirstRun: true,
        needsSetup: true 
      });
    }

    res.json({
      isFirstRun: !data?.setup_completed,
      needsSetup: !data?.setup_completed
    });
  } catch (error) {
    console.error('Error checking first run:', error);
    res.status(500).json({ 
      error: 'Failed to check setup status',
      isFirstRun: true,
      needsSetup: true
    });
  }
};

/**
 * Clean up all test data from database
 */
export const cleanupTestData = async (req, res) => {
  try {
    // Delete in order to respect foreign key constraints
    const tables = [
      'user_events',
      'monthly_reports', 
      'receipts',
      'payments',
      'tickets',
      'monthly_customers',
      'rates',
      'vehicle_types'
    ];

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error && error.code !== 'PGRST116') { // Ignore "no rows found"
        console.warn(`Warning cleaning ${table}:`, error.message);
      }
    }

    res.json({ 
      success: true,
      message: 'Test data cleaned successfully' 
    });
  } catch (error) {
    console.error('Error cleaning test data:', error);
    res.status(500).json({ 
      error: 'Failed to clean test data',
      details: error.message 
    });
  }
};

/**
 * Initialize the system with company settings and admin user
 */
export const initialize = async (req, res) => {
  try {
    const {
      // Company info
      companyName,
      cnpj,
      address,
      city,
      state,
      zipCode,
      phone,
      email,
      
      // Admin user info
      adminName,
      adminEmail,
      adminLogin,
      adminPassword
    } = req.body;

    // Validation
    if (!companyName || !adminLogin || !adminPassword) {
      return res.status(400).json({ 
        error: 'Company name, admin login, and password are required' 
      });
    }

    if (adminPassword.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters' 
      });
    }

    // 1. Clean test data first
    await cleanupTestDataInternal();

    // 2. Create/Update company settings
    const { error: companyError } = await supabase
      .from('company_settings')
      .upsert({
        company_name: companyName,
        cnpj: cnpj || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zip_code: zipCode || null,
        phone: phone || null,
        email: email || null,
        setup_completed: true,
        setup_completed_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (companyError) {
      throw new Error(`Failed to save company settings: ${companyError.message}`);
    }

    // 3. Delete existing test admin user
    await supabase
      .from('users')
      .delete()
      .eq('login', 'admin');

    // 4. Create new admin user
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .insert({
        name: adminName || 'Administrador',
        email: adminEmail || `admin@${companyName.toLowerCase().replace(/\s/g, '')}.com`,
        login: adminLogin,
        password_hash: passwordHash,
        role: 'admin',
        permissions: JSON.stringify(['all'])
      })
      .select()
      .single();

    if (adminError) {
      throw new Error(`Failed to create admin user: ${adminError.message}`);
    }

    // 5. Create default vehicle types
    const vehicleTypes = [
      { name: 'Carro', icon: 'car', color: '#3b82f6' },
      { name: 'Moto', icon: 'motorcycle', color: '#10b981' },
      { name: 'Caminhão', icon: 'truck', color: '#f59e0b' },
      { name: 'Van', icon: 'van', color: '#8b5cf6' }
    ];

    for (const vType of vehicleTypes) {
      await supabase
        .from('vehicle_types')
        .insert(vType);
    }

    // Tarifas serão configuradas posteriormente pelo usuário

    res.json({
      success: true,
      message: 'Setup completed successfully',
      adminUser: {
        id: adminUser.id,
        name: adminUser.name,
        login: adminUser.login,
        email: adminUser.email
      }
    });

  } catch (error) {
    console.error('Error during initialization:', error);
    res.status(500).json({ 
      error: 'Failed to initialize system',
      details: error.message 
    });
  }
};

/**
 * Internal function to clean test data (used by initialize)
 */
async function cleanupTestDataInternal() {
  const tables = [
    'user_events',
    'monthly_reports', 
    'receipts',
    'payments',
    'tickets',
    'monthly_customers',
    'rates',
    'vehicle_types'
  ];

  for (const table of tables) {
    try {
      await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (error) {
      console.warn(`Warning cleaning ${table}:`, error.message);
    }
  }
}

/**
 * Get current company settings
 */
export const getCompanySettings = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .single();

    if (error) {
      return res.status(404).json({ error: 'Company settings not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching company settings:', error);
    res.status(500).json({ error: 'Failed to fetch company settings' });
  }
};

export default {
  checkFirstRun,
  cleanupTestData,
  initialize,
  getCompanySettings
};
