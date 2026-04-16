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
import { Input } from '@/components/ui/input';
import { useSettingsStore } from '@/stores/settings';
import { hostApiFetch, type CloudSession } from '@/lib/host-api';
import { getXiaojiuOAuthConfig } from '@/lib/cloud-api';
import { subscribeHostEvent } from '@/lib/host-events';
import logoPng from '@/assets/logo.png';
import { AnimatedCharacters } from '@/components/ui/animated-characters';
import { useStyles } from './styles';

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
  const { styles } = useStyles();
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
    <div className={styles.root}>
      <TitleBar style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, background: 'transparent' }} hideSidebarToggle hideManagementMenu />

      {/* Left Content Section with Animated Characters */}
      <div className={styles.leftSection}>
        {/* Logo */}
        <div className={styles.logoWrap}>
          <img src={logoPng} alt="极智" className={styles.logoImg} />
          <span className={styles.logoText}>极智</span>
        </div>

        {/* Characters — centered in remaining space */}
        <div className={styles.charactersWrap}>
          <AnimatedCharacters
            isTyping={activeField === 'username'}
            showPassword={showPassword}
            passwordLength={password.length}
          />
        </div>

        {/* Decorative blurs */}
        <div className={styles.decorBlur1} />
        <div className={styles.decorBlur2} />
      </div>

      {/* Right Login Section */}
      <div className={styles.rightSection}>
        <div className={styles.formContainer}>
          {/* Mobile Logo */}
          <div className={styles.mobileLogoWrap}>
            <img src={logoPng} alt="极智" className={styles.logoImg} />
            <span className={styles.logoText}>极智</span>
          </div>

          {/* Header */}
          <div className={styles.header}>
            <h1 className={styles.headerTitle}>
              欢迎使用极智
            </h1>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              type="button"
              className={activeTab === 'xiaojiu' ? styles.tabBtnActive : styles.tabBtnInactive}
              onClick={() => {
                setActiveTab('xiaojiu');
                setActiveField(null);
                setErrorMsg('');
              }}
            >
              小九认证
              {activeTab === 'xiaojiu' && (
                <div className={styles.tabIndicator} />
              )}
            </button>
            <button
              type="button"
              className={activeTab === 'password' ? styles.tabBtnActive : styles.tabBtnInactive}
              onClick={() => {
                setActiveTab('password');
                setErrorMsg('');
              }}
            >
              账号密码
              {activeTab === 'password' && (
                <div className={styles.tabIndicator} />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className={styles.tabContent}>
            <AnimatePresence initial={false}>
              {activeTab === 'xiaojiu' && (
                <motion.div
                  key="xiaojiu"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className={styles.tabPane}
                >
                  <button
                    type="button"
                    className={styles.oauthBtn}
                    onClick={handleXiaojiuLogin}
                    disabled={busy}
                  >
                    {oauthLoading ? (
                      <Loader2 style={{ width: 20, height: 20 }} className="animate-spin" />
                    ) : (
                      <img src={logoPng} alt="小九" style={{ height: 20, width: 20, borderRadius: 6, objectFit: 'cover' }} />
                    )}
                    使用小九认证登录
                  </button>

                  {errorMsg ? (
                    <div className={styles.errorBox}>
                      {errorMsg}
                    </div>
                  ) : null}

                  {oauthNotice ? (
                    <div className={styles.noticeBox}>
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
                  className={styles.tabPane}
                >
                  <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
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
                        style={{ height: 48, borderRadius: 8, fontSize: 14, padding: '0 16px' }}
                      />

                      <div className={styles.inputWrap}>
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
                          style={{ height: 48, borderRadius: 8, fontSize: 14, padding: '0 48px 0 16px' }}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={busy}
                          className={styles.passwordToggle}
                        >
                          {showPassword ? <EyeOff style={{ width: 20, height: 20 }} /> : <Eye style={{ width: 20, height: 20 }} />}
                        </button>
                      </div>
                    </div>

                    {errorMsg ? (
                      <div className={styles.errorBox}>
                        {errorMsg}
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      className={styles.submitBtn}
                      disabled={busy || !username.trim() || !password.trim()}
                    >
                      {loading ? <Loader2 style={{ width: 20, height: 20, marginRight: 8 }} className="animate-spin" /> : null}
                      登录
                    </button>
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
