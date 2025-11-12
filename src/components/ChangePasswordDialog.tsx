import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFirstLogin?: boolean;
  onSuccess?: () => void;
}

interface PasswordValidation {
  valid: boolean;
  errors: string[];
  strength?: {
    score: number;
    feedback?: {
      warning?: string;
      suggestions?: string[];
    };
  };
  suggestions?: string[];
}

export const ChangePasswordDialog = ({
  open,
  onOpenChange,
  isFirstLogin = false,
  onSuccess,
}: ChangePasswordDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validation, setValidation] = useState<PasswordValidation | null>(null);
  // Professional: Define explicit type for password requirements
  interface PasswordRequirements {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireDigit: boolean;
    requireSpecialChar: boolean;
    passwordHistoryLimit: number;
  }
  const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirements | null>(
    null
  );

  useEffect(() => {
    if (open) {
      // Load password requirements
      fetchPasswordRequirements();
    } else {
      // Reset form when dialog closes
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setValidation(null);
    }
  }, [open]);

  // Validate password strength in real-time
  useEffect(() => {
    if (newPassword.length > 0) {
      const debounce = setTimeout(() => {
        validatePasswordStrength(newPassword);
      }, 300);
      return () => clearTimeout(debounce);
    } else {
      setValidation(null);
    }
  }, [newPassword]);

  const fetchPasswordRequirements = async () => {
    try {
      const data = await api.getPasswordRequirements();
      // Map API response to PasswordRequirements type
      setPasswordRequirements({
        minLength: data.minLength,
        requireUppercase: data.requireUppercase,
        requireLowercase: data.requireLowercase,
        requireDigit: data.requireNumbers ?? false,
        requireSpecialChar: data.requireSpecialChars ?? false,
        passwordHistoryLimit: 5, // Default value if not present in API response
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error fetching password requirements:', message);
    }
  };

  const validatePasswordStrength = async (password: string) => {
    try {
      const data = await api.validatePasswordStrength(password);
      setValidation(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error validating password:', message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'As senhas não coincidem',
      });
      return;
    }

    // Validate password strength
    if (validation && !validation.valid) {
      toast({
        variant: 'destructive',
        title: 'Senha fraca',
        description: 'A senha não atende aos requisitos de segurança',
      });
      return;
    }

    // Require current password if not first login
    if (!isFirstLogin && !currentPassword) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Informe a senha atual',
      });
      return;
    }

    setLoading(true);

    try {
      await api.changePassword({
        currentPassword: isFirstLogin ? undefined : currentPassword,
        newPassword,
      });

      toast({
        title: 'Sucesso',
        description: 'Senha alterada com sucesso',
      });
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error changing password:', message);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: message || 'Erro ao alterar senha',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = (score: number) => {
    if (score === 0) return 'bg-red-500';
    if (score === 1) return 'bg-orange-500';
    if (score === 2) return 'bg-yellow-500';
    if (score === 3) return 'bg-lime-500';
    return 'bg-green-500';
  };

  const getStrengthText = (score: number) => {
    if (score === 0) return 'Muito fraca';
    if (score === 1) return 'Fraca';
    if (score === 2) return 'Razoável';
    if (score === 3) return 'Boa';
    return 'Forte';
  };

  return (
    <Dialog open={open} onOpenChange={isFirstLogin ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isFirstLogin ? 'Primeiro Acesso - Altere sua Senha' : 'Alterar Senha'}
          </DialogTitle>
          <DialogDescription>
            {isFirstLogin
              ? 'Por segurança, você precisa alterar sua senha no primeiro acesso.'
              : 'Crie uma senha forte para proteger sua conta.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password - Only if not first login */}
          {!isFirstLogin && (
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha Atual *</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required={!isFirstLogin}
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova Senha *</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {validation && newPassword.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Força da senha:</span>
                  <span
                    className={`font-medium ${validation.valid ? 'text-green-600' : 'text-orange-600'}`}
                  >
                    {validation.strength && getStrengthText(validation.strength.score)}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${validation.strength && getStrengthColor(validation.strength.score)}`}
                    style={{
                      width: `${validation.strength ? (validation.strength.score + 1) * 20 : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Validation Errors */}
            {validation && validation.errors.length > 0 && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {validation.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Validation Success */}
            {validation && validation.valid && (
              <Alert className="py-2 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 text-sm">
                  Senha forte e segura!
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nova Senha *</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-red-600">As senhas não coincidem</p>
            )}
          </div>

          {/* Password Requirements */}
          {passwordRequirements && (
            <Alert className="py-2">
              <AlertDescription className="text-sm">
                <strong>Requisitos de Senha:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Mínimo {passwordRequirements.minLength} caracteres</li>
                  {passwordRequirements.requireUppercase && <li>Pelo menos 1 letra maiúscula</li>}
                  {passwordRequirements.requireLowercase && <li>Pelo menos 1 letra minúscula</li>}
                  {passwordRequirements.requireDigit && <li>Pelo menos 1 número</li>}
                  {passwordRequirements.requireSpecialChar && (
                    <li>Pelo menos 1 caractere especial</li>
                  )}
                  <li>
                    Não pode ser uma das últimas {passwordRequirements.passwordHistoryLimit} senhas
                  </li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            {!isFirstLogin && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
            )}
            <Button
              type="submit"
              disabled={
                loading || (validation && !validation.valid) || newPassword !== confirmPassword
              }
            >
              {loading ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
