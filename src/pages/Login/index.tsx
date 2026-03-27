/**
 * Cloud Login Page
 * First gate in the app: user must authenticate before accessing any feature.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TitleBar } from '@/components/layout/TitleBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettingsStore } from '@/stores/settings';
import logoPng from '@/assets/logo.png';

export function Login() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const loginCloud = useSettingsStore((s) => s.loginCloud);
  const setupComplete = useSettingsStore((s) => s.setupComplete);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setErrorMsg('');
    try {
      await loginCloud(username.trim(), password.trim());
      // After login, go to setup if not done yet, else main app
      navigate(setupComplete ? '/' : '/setup', { replace: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('login.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TitleBar />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <img src={logoPng} alt="极智" className="h-14 w-14 rounded-2xl object-cover shadow-sm" />
            <h1 className="text-2xl font-bold">{t('login.title')}</h1>
            <p className="text-sm text-muted-foreground text-center">{t('login.subtitle')}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
            <div className="space-y-1.5">
              <Label htmlFor="username">{t('login.username')}</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                placeholder={t('login.usernamePlaceholder')}
                value={username}
                onChange={(e) => { setUsername(e.target.value); setErrorMsg(''); }}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">{t('login.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <p className="text-sm text-destructive">{errorMsg}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !username.trim() || !password.trim()}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('login.submit')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
