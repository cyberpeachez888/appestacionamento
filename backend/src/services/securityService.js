/**
 * Security Service
 * Handles login attempt tracking, account locking, and password validation
 */

import { supabase } from '../config/supabase.js';
import bcrypt from 'bcryptjs';
import PasswordValidator from 'password-validator';
import zxcvbn from 'zxcvbn';

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;
const PASSWORD_HISTORY_LIMIT = 3;
const PASSWORD_MIN_STRENGTH = 2; // 0-4 scale from zxcvbn

/**
 * Password validation schema
 */
const passwordSchema = new PasswordValidator();
passwordSchema
  .is().min(8)                                    // Minimum length 8
  .is().max(100)                                  // Maximum length 100
  .has().uppercase()                              // Must have uppercase letters
  .has().lowercase()                              // Must have lowercase letters
  .has().digits()                                 // Must have digits
  .has().symbols()                                // Must have symbols
  .has().not().spaces();                          // Should not have spaces

/**
 * Common weak passwords to reject
 */
const WEAK_PASSWORDS = new Set([
  'password', 'password123', '123456', '12345678', 'qwerty', 
  'abc123', 'monkey', '1234567', 'letmein', 'trustno1',
  'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
  'ashley', 'bailey', 'passw0rd', 'shadow', '123123',
  'admin', 'admin123', 'root', 'toor', 'test', 'test123'
]);

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {{valid: boolean, errors: string[], strength: number}}
 */
export function validatePassword(password) {
  const errors = [];
  
  // Check basic requirements
  const schemaErrors = passwordSchema.validate(password, { list: true });
  if (schemaErrors.length > 0) {
    const errorMessages = {
      min: 'Senha deve ter no mínimo 8 caracteres',
      max: 'Senha deve ter no máximo 100 caracteres',
      uppercase: 'Senha deve conter pelo menos uma letra maiúscula',
      lowercase: 'Senha deve conter pelo menos uma letra minúscula',
      digits: 'Senha deve conter pelo menos um número',
      symbols: 'Senha deve conter pelo menos um caractere especial (!@#$%^&*)',
      spaces: 'Senha não pode conter espaços'
    };
    schemaErrors.forEach(err => {
      if (errorMessages[err]) errors.push(errorMessages[err]);
    });
  }
  
  // Check if it's a commonly weak password
  if (WEAK_PASSWORDS.has(password.toLowerCase())) {
    errors.push('Esta senha é muito comum e insegura');
  }
  
  // Check password strength using zxcvbn
  const strengthCheck = zxcvbn(password);
  const strength = strengthCheck.score; // 0-4
  
  if (strength < PASSWORD_MIN_STRENGTH) {
    errors.push('Senha muito fraca. Use uma combinação mais complexa');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    strength,
    feedback: strengthCheck.feedback
  };
}

/**
 * Check if password was used before
 * @param {string} userId - User ID
 * @param {string} password - New password to check
 * @returns {Promise<boolean>}
 */
export async function isPasswordReused(userId, password) {
  const { data: history, error } = await supabase
    .from('password_history')
    .select('password_hash')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(PASSWORD_HISTORY_LIMIT);
  
  if (error || !history) return false;
  
  for (const record of history) {
    const match = await bcrypt.compare(password, record.password_hash);
    if (match) return true;
  }
  
  return false;
}

/**
 * Log login attempt
 * @param {Object} params - Login attempt details
 */
export async function logLoginAttempt({ login, ipAddress, userAgent, success, failureReason }) {
  try {
    await supabase.from('login_attempts').insert([{
      login,
      ip_address: ipAddress,
      user_agent: userAgent,
      success,
      failure_reason: failureReason || null
    }]);
  } catch (error) {
    console.error('Error logging login attempt:', error);
  }
}

/**
 * Get recent failed login attempts for a user
 * @param {string} login - User login
 * @param {number} minutes - Time window in minutes
 * @returns {Promise<number>}
 */
export async function getFailedAttempts(login, minutes = 15) {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('login_attempts')
    .select('id')
    .eq('login', login)
    .eq('success', false)
    .gte('created_at', cutoff);
  
  if (error) {
    console.error('Error getting failed attempts:', error);
    return 0;
  }
  
  return data?.length || 0;
}

/**
 * Check if account is locked
 * @param {string} userId - User ID
 * @returns {Promise<{isLocked: boolean, lockedUntil: Date|null, reason: string|null}>}
 */
export async function checkAccountLock(userId) {
  const { data, error } = await supabase
    .from('account_locks')
    .select('*')
    .eq('user_id', userId)
    .gte('locked_until', new Date().toISOString())
    .maybeSingle();
  
  if (error || !data) {
    return { isLocked: false, lockedUntil: null, reason: null };
  }
  
  return {
    isLocked: true,
    lockedUntil: new Date(data.locked_until),
    reason: data.lock_reason
  };
}

/**
 * Lock account due to failed login attempts
 * @param {string} userId - User ID
 * @param {number} failedAttempts - Number of failed attempts
 */
export async function lockAccount(userId, failedAttempts) {
  const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
  const reason = `Account locked due to ${failedAttempts} failed login attempts`;
  
  await supabase
    .from('account_locks')
    .upsert([{
      user_id: userId,
      locked_until: lockedUntil.toISOString(),
      lock_reason: reason,
      failed_attempts: failedAttempts
    }], { onConflict: 'user_id' });
}

/**
 * Unlock account
 * @param {string} userId - User ID
 */
export async function unlockAccount(userId) {
  await supabase
    .from('account_locks')
    .delete()
    .eq('user_id', userId);
}

/**
 * Update last login timestamp and IP
 * @param {string} userId - User ID
 * @param {string} ipAddress - IP address
 */
export async function updateLastLogin(userId, ipAddress) {
  await supabase
    .from('users')
    .update({
      last_login_at: new Date().toISOString(),
      last_login_ip: ipAddress,
      is_first_login: false
    })
    .eq('id', userId);
}

/**
 * Check if password is expired
 * @param {Object} user - User object with password_expires_at
 * @returns {boolean}
 */
export function isPasswordExpired(user) {
  if (!user.password_expires_at) return false;
  return new Date(user.password_expires_at) < new Date();
}

/**
 * Cleanup old login attempts (keep last 30 days)
 */
export async function cleanupOldLoginAttempts() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  
  await supabase
    .from('login_attempts')
    .delete()
    .lt('created_at', cutoff);
}
