/**
 * Cloud Login Page
 * First gate in the app: user must authenticate before accessing any feature.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { TitleBar } from '@/components/layout/TitleBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSettingsStore } from '@/stores/settings';
import { hostApiFetch, type CloudSession } from '@/lib/host-api';
import { getXiaojiuOAuthConfig } from '@/lib/cloud-api';
import { subscribeHostEvent } from '@/lib/host-events';
import logoPng from '@/assets/logo.png';
import { AnimatedCharacters } from '@/components/ui/animated-characters';

type ActiveField = 'username' | 'password' | null;
type LoginTab = 'xiaojiu' | 'password';

const LOGIN_REQUEST_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

export function Login() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const loginCloud = useSettingsStore((s) => s.loginCloud);
  const applyCloudSession = useSettingsStore((s) => s.applyCloudSession);
  const setupComplete = useSettingsStore((s) => s.setupComplete);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [oauthNotice, setOauthNotice] = useState('');
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [activeTab, setActiveTab] = useState<LoginTab>('xiaojiu');

  useEffect(() => {
    const offSuccess = subscribeHostEvent<CloudSession>('cloud:auth-success', (session) => {
      setOauthLoading(false);
      setErrorMsg('');
      setOauthNotice('');
      applyCloudSession(session);
      navigate(setupComplete ? '/' : '/setup', { replace: true });
    });

    const offError = subscribeHostEvent<{ message?: string }>('cloud:auth-error', (payload) => {
      setOauthLoading(false);
      setOauthNotice('');
      setErrorMsg(payload?.message || t('login.oauthError'));
    });

    return () => {
      offSuccess();
      offError();
    };
  }, [applyCloudSession, navigate, setupComplete, t]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setErrorMsg('');
    setOauthNotice('');

    try {
      await withTimeout(
        loginCloud(username.trim(), password.trim()),
        LOGIN_REQUEST_TIMEOUT_MS,
        t('login.timeout'),
      );
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
    setOauthNotice('');

    try {
      await hostApiFetch('/api/auth/xiaojiu/cancel', { method: 'POST' }).catch(() => undefined);
      const config = getXiaojiuOAuthConfig();
      const result = await withTimeout(
        hostApiFetch<{ authorizationUrl: string }>('/api/auth/xiaojiu/start', {
          method: 'POST',
          body: JSON.stringify(config),
        }),
        LOGIN_REQUEST_TIMEOUT_MS,
        t('login.oauthStartTimeout'),
      );
      await withTimeout(
        window.electron.openExternal(result.authorizationUrl),
        LOGIN_REQUEST_TIMEOUT_MS,
        t('login.oauthStartTimeout'),
      );
      setOauthNotice(t('login.oauthBrowserOpened'));
    } catch (err) {
      setOauthNotice('');
      setErrorMsg(err instanceof Error ? err.message : t('login.oauthError'));
    } finally {
      setOauthLoading(false);
    }
  };

  const busy = loading || oauthLoading;

  return (
    <div className="min-h-screen max-h-screen overflow-hidden grid lg:grid-cols-[55%_45%] bg-white text-slate-900">
      <TitleBar className="absolute top-0 left-0 right-0 z-50 bg-transparent" hideSidebarToggle hideManagementMenu />

      {/* Left Content Section with Animated Characters */}
      <div className="relative hidden lg:flex flex-col bg-[linear-gradient(180deg,#f7f1e7_0%,#f4efe5_34%,#eef6f1_100%)] p-12 pt-20">
        {/* Logo */}
        <div className="relative z-20 flex items-center gap-3.5">
          <img src={logoPng} alt="极智" className="h-12 w-12 object-contain" />
          <span className="text-sm font-bold tracking-tight text-slate-900">极智</span>
        </div>

        {/* Characters — centered in remaining space */}
        <div className="relative z-20 flex flex-1 items-center justify-center">
          <AnimatedCharacters
            isTyping={activeField === 'username'}
            showPassword={showPassword}
            passwordLength={password.length}
          />
        </div>

        {/* Decorative blurs */}
        <div className="absolute left-[-10%] top-[-10%] h-[30rem] w-[30rem] rounded-full bg-[#f7d8bf]/40 blur-3xl pointer-events-none" />
        <div className="absolute right-[-5%] top-[20%] h-[25rem] w-[25rem] rounded-full bg-[#d3eadc]/50 blur-3xl pointer-events-none" />
      </div>

      {/* Right Login Section */}
      <div className="flex items-center justify-center p-8 bg-white relative pt-20">
        <div className="w-full max-w-[400px]">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3.5 mb-10">
            <img src={logoPng} alt="极智" className="h-12 w-12 object-contain" />
            <span className="text-sm font-bold tracking-tight text-slate-900">极智</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-[14px] font-bold tracking-tight text-slate-900 mb-2">
              欢迎使用极智
            </h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 border-b border-slate-200 mb-8">
            <button
              type="button"
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeTab === 'xiaojiu' ? 'text-[#3478f6]' : 'text-slate-500 hover:text-slate-800'
              }`}
              onClick={() => {
                setActiveTab('xiaojiu');
                setActiveField(null);
                setErrorMsg('');
              }}
            >
              小九认证
              {activeTab === 'xiaojiu' && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#3478f6] rounded-t-full" />
              )}
            </button>
            <button
              type="button"
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeTab === 'password' ? 'text-[#3478f6]' : 'text-slate-500 hover:text-slate-800'
              }`}
              onClick={() => {
                setActiveTab('password');
                setErrorMsg('');
              }}
            >
              账号密码
              {activeTab === 'password' && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#3478f6] rounded-t-full" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="relative min-h-[240px]">
            <AnimatePresence initial={false}>
              {activeTab === 'xiaojiu' && (
                <motion.div
                  key="xiaojiu"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="absolute inset-0 py-2"
                >
                  <Button
                    type="button"
                    className="w-full h-12 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[14px] font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
                    onClick={handleXiaojiuLogin}
                    disabled={busy}
                  >
                    {oauthLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <img src={logoPng} alt="小九" className="h-5 w-5 rounded-md object-cover" />
                    )}
                    使用小九认证登录
                  </Button>

                  {errorMsg ? (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {errorMsg}
                    </div>
                  ) : null}

                  {oauthNotice ? (
                    <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                      {oauthNotice}
                    </div>
                  ) : null}
                </motion.div>
              )}

              {activeTab === 'password' && (
                <motion.div
                  key="password"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="absolute inset-0 py-2"
                >
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <Input
                        id="username"
                        type="text"
                        placeholder="请输入账号"
                        value={username}
                        onChange={(event) => {
                          setUsername(event.target.value);
                          setErrorMsg('');
                          setOauthNotice('');
                        }}
                        onFocus={() => setActiveField('username')}
                        onBlur={() => setActiveField(null)}
                        disabled={busy}
                        className="h-12 rounded-lg border-slate-300 text-[14px] px-4 focus-visible:ring-[#3478f6] focus-visible:border-[#3478f6]"
                      />

                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="请输入密码"
                          value={password}
                          onChange={(event) => {
                            setPassword(event.target.value);
                            setErrorMsg('');
                            setOauthNotice('');
                          }}
                          onFocus={() => setActiveField('password')}
                          onBlur={() => setActiveField(null)}
                          disabled={busy}
                          className="h-12 rounded-lg border-slate-300 text-[14px] px-4 pr-12 focus-visible:ring-[#3478f6] focus-visible:border-[#3478f6]"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={busy}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    {errorMsg ? (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                        {errorMsg}
                      </div>
                    ) : null}

                    <Button
                      type="submit"
                      className="w-full h-12 bg-[#3478f6] hover:bg-[#2b66d3] text-white text-[14px] font-medium rounded-lg shadow-sm transition-all"
                      disabled={busy || !username.trim() || !password.trim()}
                    >
                      {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                      登录
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
