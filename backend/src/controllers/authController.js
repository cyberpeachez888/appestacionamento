import { supabase } from '../config/supabase.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  logLoginAttempt,
  getFailedAttempts,
  checkAccountLock,
  lockAccount,
  updateLastLogin,
  isPasswordExpired,
  validatePassword,
  isPasswordReused
} from '../services/securityService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const USERS_TABLE = 'users';
const MAX_LOGIN_ATTEMPTS = 5;

function toFrontendUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    login: u.login,
    role: u.role,
    permissions: u.permissions || {},
  };
}

export default {
  async login(req, res) {
    try {
      const { login, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];
      
      // Get user
      const { data: user, error } = await supabase
        .from(USERS_TABLE)
        .select('*')
        .eq('login', login)
        .maybeSingle();
      
      if (error) {
        await logLoginAttempt({ 
          login, 
          ipAddress, 
          userAgent, 
          success: false, 
          failureReason: 'Database error' 
        });
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      // Check if user exists
      if (!user) {
        await logLoginAttempt({ 
          login, 
          ipAddress, 
          userAgent, 
          success: false, 
          failureReason: 'User not found' 
        });
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }
      
      // Check if account is locked
      const lockStatus = await checkAccountLock(user.id);
      if (lockStatus.isLocked) {
        const minutesLeft = Math.ceil((lockStatus.lockedUntil - new Date()) / 60000);
        await logLoginAttempt({ 
          login, 
          ipAddress, 
          userAgent, 
          success: false, 
          failureReason: 'Account locked' 
        });
        return res.status(423).json({ 
          error: `Conta bloqueada. Tente novamente em ${minutesLeft} minutos.`,
          lockedUntil: lockStatus.lockedUntil
        });
      }
      
      // Verify password
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        // Log failed attempt
        await logLoginAttempt({ 
          login, 
          ipAddress, 
          userAgent, 
          success: false, 
          failureReason: 'Invalid password' 
        });
        
        // Check failed attempts and lock if necessary
        const failedAttempts = await getFailedAttempts(login);
        if (failedAttempts >= MAX_LOGIN_ATTEMPTS - 1) {
          await lockAccount(user.id, failedAttempts + 1);
          return res.status(423).json({ 
            error: `Muitas tentativas falhadas. Conta bloqueada por 30 minutos.`
          });
        }
        
        const remaining = MAX_LOGIN_ATTEMPTS - failedAttempts - 1;
        return res.status(401).json({ 
          error: `Credenciais inválidas. ${remaining} tentativa(s) restante(s).`
        });
      }
      
      // Check if password is expired
      if (isPasswordExpired(user)) {
        const frontendUser = toFrontendUser(user);
        return res.status(403).json({ 
          error: 'Senha expirada. Por favor, altere sua senha.',
          user: frontendUser,
          mustChangePassword: true
        });
      }
      
      // Successful login
      await logLoginAttempt({ 
        login, 
        ipAddress, 
        userAgent, 
        success: true 
      });
      
      // Update last login
      await updateLastLogin(user.id, ipAddress);
      
      const frontendUser = toFrontendUser(user);
      const token = jwt.sign(frontendUser, JWT_SECRET, { expiresIn: '12h' });
      
      // Check if user must change password
      const mustChangePassword = user.must_change_password || user.is_first_login;
      
      res.json({ 
        token, 
        user: frontendUser,
        mustChangePassword,
        isFirstLogin: user.is_first_login
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: err.message || err });
    }
  },

  async me(req, res) {
    // req.user set by middleware
    return res.json({ user: req.user });
  },

  async validatePasswordStrength(req, res) {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ 
          error: 'Senha é obrigatória',
          valid: false
        });
      }
      
      const validation = validatePassword(password);
      
      res.json({
        valid: validation.valid,
        errors: validation.errors,
        strength: {
          score: validation.strength,
          feedback: validation.feedback
        },
        suggestions: validation.suggestions
      });
    } catch (err) {
      console.error('Password validation error:', err);
      res.status(500).json({ error: err.message || err });
    }
  },

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id; // From auth middleware
      
      // Get user
      const { data: user, error } = await supabase
        .from(USERS_TABLE)
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error || !user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      
      // Verify current password (unless first login)
      if (!user.is_first_login) {
        const ok = await bcrypt.compare(currentPassword, user.password_hash);
        if (!ok) {
          return res.status(401).json({ error: 'Senha atual incorreta' });
        }
      }
      
      // Validate new password strength
      const validation = validatePassword(newPassword);
      if (!validation.valid) {
        return res.status(400).json({ 
          error: 'Senha não atende aos requisitos de segurança',
          errors: validation.errors
        });
      }
      
      // Check password reuse
      const isReused = await isPasswordReused(userId, newPassword);
      if (isReused) {
        return res.status(400).json({ 
          error: 'Esta senha foi usada recentemente. Escolha uma senha diferente.'
        });
      }
      
      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);
      
      // Update password
      const { error: updateError } = await supabase
        .from(USERS_TABLE)
        .update({
          password_hash: passwordHash,
          password_changed_at: new Date().toISOString(),
          password_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
          must_change_password: false,
          is_first_login: false
        })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Password update error:', updateError);
        return res.status(500).json({ error: 'Erro ao atualizar senha' });
      }
      
      res.json({ 
        message: 'Senha alterada com sucesso',
        success: true
      });
    } catch (err) {
      console.error('Change password error:', err);
      res.status(500).json({ error: err.message || err });
    }
  },

  async getPasswordRequirements(req, res) {
    res.json({
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireDigit: true,
      requireSpecialChar: true,
      passwordExpirationDays: 90,
      passwordHistoryLimit: 3,
      maxLoginAttempts: 5,
      lockoutDurationMinutes: 30
    });
  }
};
