import { supabase } from '../config/supabase.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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
  },

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email é obrigatório' });
      }
      
      const { data: user, error } = await supabase
        .from(USERS_TABLE)
        .select('id, email, name')
        .eq('email', email)
        .maybeSingle();
      
      if (!user || error) {
        return res.json({ 
          message: 'Se o email existir, você receberá instruções para redefinir sua senha.',
          success: true 
        });
      }
      
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = await bcrypt.hash(resetToken, 10);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      
      const { error: updateError } = await supabase
        .from(USERS_TABLE)
        .update({
          reset_token: resetTokenHash,
          reset_token_expires_at: expiresAt.toISOString()
        })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('Erro ao salvar token:', updateError);
        return res.status(500).json({ error: 'Erro ao processar solicitação' });
      }
      
      const frontendUrl = process.env.FRONTEND_URL || 'https://appestacionamento-f1pr-a3mk2fpyq-cyberpeachezs-projects.vercel.app';
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
      
      const { error: emailError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetUrl,
      });
      
      if (emailError) {
        console.error('Erro ao enviar email:', emailError);
      }
      
      console.log(`📧 Token de recuperação gerado para: ${email}`);
      console.log(`🔗 Link: ${resetUrl}`);
      
      res.json({ 
        message: 'Se o email existir, você receberá instruções para redefinir sua senha.',
        success: true,
        // ⚠️ REMOVER DEPOIS DO TESTE
        _dev: { resetUrl, token: resetToken }
      });
      
    } catch (err) {
      console.error('Forgot password error:', err);
      res.status(500).json({ error: 'Erro ao processar solicitação' });
    }
  },

  async validateResetToken(req, res) {
    try {
      const { token } = req.params;
      const { email } = req.query;
      
      if (!token || !email) {
        return res.status(400).json({ 
          error: 'Token e email são obrigatórios',
          valid: false 
        });
      }
      
      const { data: user, error } = await supabase
        .from(USERS_TABLE)
        .select('id, email, reset_token, reset_token_expires_at')
        .eq('email', email)
        .maybeSingle();
      
      if (!user || error || !user.reset_token) {
        return res.status(400).json({ 
          error: 'Token inválido ou expirado',
          valid: false 
        });
      }
      
      if (new Date() > new Date(user.reset_token_expires_at)) {
        return res.status(400).json({ 
          error: 'Token expirado. Solicite um novo link de recuperação.',
          valid: false 
        });
      }
      
      const isValid = await bcrypt.compare(token, user.reset_token);
      
      if (!isValid) {
        return res.status(400).json({ 
          error: 'Token inválido',
          valid: false 
        });
      }
      
      res.json({ 
        valid: true,
        message: 'Token válido'
      });
      
    } catch (err) {
      console.error('Validate token error:', err);
      res.status(500).json({ 
        error: 'Erro ao validar token',
        valid: false 
      });
    }
  },

  async resetPassword(req, res) {
    try {
      const { email, token, newPassword } = req.body;
      
      if (!email || !token || !newPassword) {
        return res.status(400).json({ 
          error: 'Email, token e nova senha são obrigatórios' 
        });
      }
      
      const { data: user, error } = await supabase
        .from(USERS_TABLE)
        .select('*')
        .eq('email', email)
        .maybeSingle();
      
      if (!user || error || !user.reset_token) {
        return res.status(400).json({ 
          error: 'Token inválido ou expirado' 
        });
      }
      
      if (new Date() > new Date(user.reset_token_expires_at)) {
        return res.status(400).json({ 
          error: 'Token expirado. Solicite um novo link de recuperação.' 
        });
      }
      
      const isValid = await bcrypt.compare(token, user.reset_token);
      if (!isValid) {
        return res.status(400).json({ 
          error: 'Token inválido' 
        });
      }
      
      const validation = validatePassword(newPassword);
      if (!validation.valid) {
        return res.status(400).json({ 
          error: 'Senha não atende aos requisitos de segurança',
          errors: validation.errors
        });
      }
      
      const isReused = await isPasswordReused(user.id, newPassword);
      if (isReused) {
        return res.status(400).json({ 
          error: 'Esta senha foi usada recentemente. Escolha uma senha diferente.'
        });
      }
      
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);
      
      const { error: updateError } = await supabase
        .from(USERS_TABLE)
        .update({
          password_hash: passwordHash,
          password_changed_at: new Date().toISOString(),
          password_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          reset_token: null,
          reset_token_expires_at: null,
          must_change_password: false,
          is_first_login: false
        })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('Password update error:', updateError);
        return res.status(500).json({ error: 'Erro ao atualizar senha' });
      }
      
      await supabase
        .from('login_attempts')
        .delete()
        .eq('login', user.login);
      
      res.json({ 
        message: 'Senha redefinida com sucesso! Você já pode fazer login.',
        success: true
      });
      
    } catch (err) {
      console.error('Reset password error:', err);
      res.status(500).json({ error: 'Erro ao redefinir senha' });
    }
  }
};

