import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';
import { Car, Lock, Shield } from 'lucide-react';

const Login: React.FC = () => {
  const {
    login,
    loading,
    isAuthenticated,
    mustChangePassword,
    isFirstLogin,
    clearPasswordChangeFlags,
  } = useAuth();
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
      {/* Background com gradiente e elementos visuais */}
      <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        {/* Animated parking elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Parking lines animation */}
          <div className="absolute top-1/4 left-0 w-full h-1 bg-yellow-400/20 animate-pulse"></div>
          <div className="absolute top-1/2 left-0 w-full h-1 bg-yellow-400/20 animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-3/4 left-0 w-full h-1 bg-yellow-400/20 animate-pulse" style={{ animationDelay: '2s' }}></div>
          
          {/* Floating car icons */}
          <div className="absolute top-20 left-10 text-white/10 animate-float">
            <Car size={80} />
          </div>
          <div className="absolute bottom-20 right-10 text-white/10 animate-float" style={{ animationDelay: '2s' }}>
            <Car size={100} />
          </div>
          <div className="absolute top-1/2 right-20 text-white/10 animate-float" style={{ animationDelay: '4s' }}>
            <Car size={60} />
          </div>
          
          {/* Glowing orbs */}
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex min-h-screen w-full items-center justify-center p-4">
          <div className="w-full max-w-md">
            {/* Logo/Brand Section */}
            <div className="mb-8 text-center">
              <div className="mb-4 flex items-center justify-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-lg">
                  <Car className="h-8 w-8 text-white" />
                </div>
                <div className="text-left">
                  <h1 className="text-3xl font-bold tracking-tight text-white">
                    PROPARKING
                  </h1>
                  <p className="text-sm font-medium text-blue-300">APP</p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-lg font-semibold text-white/90">2025</p>
                <p className="mt-1 text-sm text-white/60">
                  Sistema de Gestão de Estacionamento
                </p>
              </div>
            </div>

            {/* Login Card */}
            <Card className="backdrop-blur-md bg-white/95 shadow-2xl border-white/20">
              <CardHeader className="space-y-1 pb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle className="text-2xl font-bold">Acesso Seguro</CardTitle>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Entre com suas credenciais para continuar
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login" className="text-sm font-medium">
                      Usuário
                    </Label>
                    <div className="relative">
                      <Input
                        id="login"
                        value={userLogin}
                        onChange={(e) => setUserLogin(e.target.value)}
                        autoComplete="username"
                        required
                        className="pl-10 h-11"
                        placeholder="Digite seu usuário"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                        className="pl-10 h-11"
                        placeholder="Digite sua senha"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Lock className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember"
                        checked={remember}
                        onCheckedChange={(v) => setRemember(Boolean(v))}
                      />
                      <Label htmlFor="remember" className="cursor-pointer select-none text-sm">
                        Lembrar-me
                      </Label>
                    </div>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-primary hover:underline"
                    >
                      Esqueceu a senha?
                    </Link>
                  </div>
                  {error && (
                    <div className="rounded-md bg-destructive/10 p-3">
                      <p className="text-sm text-destructive font-medium">{error}</p>
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                    disabled={submitting || loading}
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Entrando...
                      </span>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-xs text-white/60">
                © 2025 ProParking App. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
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
