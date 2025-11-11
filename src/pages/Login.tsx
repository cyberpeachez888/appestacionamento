import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';

const Login: React.FC = () => {
  const { login, loading, isAuthenticated, mustChangePassword, isFirstLogin, clearPasswordChangeFlags } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userLogin, setUserLogin] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  // Redirect if already authenticated and no password change required
  React.useEffect(() => {
    if (isAuthenticated && !loading && !mustChangePassword) {
      const redirectTo = (location.state as any)?.from?.pathname || '/';
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, loading, mustChangePassword, navigate, location.state]);

  // Show password change dialog if required
  React.useEffect(() => {
    if (isAuthenticated && mustChangePassword) {
      setShowPasswordDialog(true);
    }
  }, [isAuthenticated, mustChangePassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(userLogin, password, remember);
      // If password change required, dialog will open automatically
      // Otherwise, navigation happens via useEffect
    } catch (err: any) {
      setError(err.message || 'Falha no login');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordChangeSuccess = () => {
    clearPasswordChangeFlags();
    setShowPasswordDialog(false);
    const redirectTo = (location.state as any)?.from?.pathname || '/';
    navigate(redirectTo, { replace: true });
  };

  return (
    <>
      <div className="flex w-full items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Acesso</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login">Usuário</Label>
                <Input id="login" value={userLogin} onChange={e => setUserLogin(e.target.value)} autoComplete="username" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" checked={remember} onCheckedChange={v => setRemember(Boolean(v))} />
                <Label htmlFor="remember" className="cursor-pointer select-none">Lembrar</Label>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting || loading}>
                {submitting ? 'Entrando...' : 'Entrar'}
              </Button>
              <div className="text-xs text-center text-muted-foreground">
                <Link to="/forgot-password" className="underline decoration-dotted hover:text-foreground">
                  Esqueceu a senha?
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <ChangePasswordDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        isFirstLogin={isFirstLogin}
        onSuccess={handlePasswordChangeSuccess}
      />
    </>
  );
};

export default Login;
