/**
 * Cloud Login Page
 * First gate in the app: user must authenticate before accessing any feature.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TitleBar } from '@/components/layout/TitleBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettingsStore } from '@/stores/settings';
import { hostApiFetch, type CloudSession } from '@/lib/host-api';
import { getXiaojiuOAuthConfig } from '@/lib/cloud-api';
import { subscribeHostEvent } from '@/lib/host-events';
import logoPng from '@/assets/logo.png';

export function Login() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const loginCloud = useSettingsStore((s) => s.loginCloud);
  const applyCloudSession = useSettingsStore((s) => s.applyCloudSession);
  const setupComplete = useSettingsStore((s) => s.setupComplete);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const offSuccess = subscribeHostEvent<CloudSession>('cloud:auth-success', (session) => {
      setOauthLoading(false);
      setErrorMsg('');
      applyCloudSession(session);
      navigate(setupComplete ? '/' : '/setup', { replace: true });
    });

    const offError = subscribeHostEvent<{ message?: string }>('cloud:auth-error', (payload) => {
      setOauthLoading(false);
      setErrorMsg(payload?.message || t('login.oauthError'));
    });

    return () => {
      offSuccess();
      offError();
    };
  }, [applyCloudSession, navigate, setupComplete, t]);

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

  const handleXiaojiuLogin = async () => {
    setOauthLoading(true);
    setErrorMsg('');

    try {
      const config = getXiaojiuOAuthConfig();
      const result = await hostApiFetch<{ authorizationUrl: string }>('/api/auth/xiaojiu/start', {
        method: 'POST',
        body: JSON.stringify(config),
      });
      await window.electron.openExternal(result.authorizationUrl);
    } catch (err) {
      setOauthLoading(false);
      setErrorMsg(err instanceof Error ? err.message : t('login.oauthError'));
    }
  };

  const busy = loading || oauthLoading;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TitleBar />
      <div className="relative flex flex-1 items-center justify-center overflow-auto px-6 py-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[10%] top-[12%] h-56 w-56 rounded-full bg-emerald-200/35 blur-3xl" />
          <div className="absolute right-[12%] top-[22%] h-64 w-64 rounded-full bg-amber-100 blur-3xl" />
          <div className="absolute bottom-[8%] left-[22%] h-72 w-72 rounded-full bg-sky-100/70 blur-3xl" />
        </div>

        <div className="relative w-full max-w-2xl">
          <section className="overflow-hidden rounded-[32px] border border-emerald-100/80 bg-[linear-gradient(145deg,rgba(244,251,247,0.96),rgba(255,252,244,0.94))] p-7 shadow-[0_24px_80px_rgba(39,87,61,0.12)] sm:p-9">
            <div className="flex flex-col items-center text-center">
              <img src={logoPng} alt="极智" className="h-16 w-16 rounded-3xl object-cover shadow-[0_10px_30px_rgba(76,134,97,0.18)]" />
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/85 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                {t('login.recommendedBadge')}
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                {t('login.title')}
              </h1>
              <p className="mt-4 max-w-xl text-base font-medium leading-8 text-slate-800">
                {t('login.heroTitle')}
              </p>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                {t('login.subtitle')}
              </p>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/72 p-4 shadow-sm backdrop-blur">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <p className="mt-3 text-sm font-medium text-slate-900">{t('login.featureSecure')}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/72 p-4 shadow-sm backdrop-blur">
                <ArrowRight className="h-5 w-5 text-amber-600" />
                <p className="mt-3 text-sm font-medium text-slate-900">{t('login.featureFast')}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/72 p-4 shadow-sm backdrop-blur">
                <KeyRound className="h-5 w-5 text-sky-600" />
                <p className="mt-3 text-sm font-medium text-slate-900">{t('login.featureNoPassword')}</p>
              </div>
            </div>

            <div className="mt-8 rounded-[28px] border border-emerald-200/80 bg-white/88 p-5 shadow-[0_18px_50px_rgba(31,73,54,0.08)] backdrop-blur sm:p-6">
              <div className="space-y-2 text-center">
                <p className="text-sm font-semibold text-slate-900">{t('login.oauthPrimaryTitle')}</p>
                <p className="text-sm leading-6 text-slate-600">{t('login.oauthHint')}</p>
              </div>

              <Button
                type="button"
                size="lg"
                className="mt-5 h-12 w-full rounded-2xl bg-[linear-gradient(135deg,#3f8d66,#255b42)] px-6 text-base font-semibold text-white shadow-[0_18px_36px_rgba(37,91,66,0.28)] hover:opacity-95"
                onClick={handleXiaojiuLogin}
                disabled={busy}
              >
                {oauthLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                {t('login.oauthSubmit')}
              </Button>

              {errorMsg ? (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMsg}
                </div>
              ) : null}

              <div className="mt-6 border-t border-emerald-100 pt-5">
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-3">
                  <button
                    type="button"
                    onClick={() => setShowPasswordLogin((v) => !v)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white"
                    disabled={busy}
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{t('login.passwordOptionTitle')}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{t('login.passwordOptionHint')}</p>
                    </div>
                    {showPasswordLogin ? (
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                  </button>

                  {showPasswordLogin ? (
                    <form onSubmit={handleSubmit} className="space-y-4 border-t border-slate-200 px-3 pb-3 pt-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="username">{t('login.username')}</Label>
                        <Input
                          id="username"
                          type="text"
                          autoComplete="username"
                          placeholder={t('login.usernamePlaceholder')}
                          value={username}
                          onChange={(e) => { setUsername(e.target.value); setErrorMsg(''); }}
                          disabled={busy}
                          className="h-11 rounded-xl border-slate-200 bg-white"
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
                            disabled={busy}
                            className="h-11 rounded-xl border-slate-200 bg-white pr-10"
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowPassword((v) => !v)}
                            disabled={busy}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        variant="outline"
                        className="h-11 w-full rounded-xl border-slate-300 bg-white"
                        disabled={busy || !username.trim() || !password.trim()}
                      >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('login.submit')}
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Login;
