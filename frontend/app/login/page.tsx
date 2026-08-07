'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { useI18n } from '@/lib/i18n';
import toast from 'react-hot-toast';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Check,
  Copy,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSelector } from '@/components/language-selector';
import { cn } from '@/lib/utils';

const DEMO_EMAIL = 'admin@festivalmbois.com';
const DEMO_PASSWORD = 'admin123';
const REMEMBER_KEY = 'festival-mbois-remembered-email';

type FieldName = 'email' | 'password';
type FieldErrors = Partial<Record<FieldName, string>>;

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

const features = [
  {
    icon: TrendingUp,
    titleKey: 'auth.featureEngagement',
    descKey: 'auth.featureEngagementDesc',
  },
  {
    icon: Activity,
    titleKey: 'auth.featureSentiment',
    descKey: 'auth.featureSentimentDesc',
  },
  {
    icon: Globe,
    titleKey: 'auth.featureMultiPlatform',
    descKey: 'auth.featureMultiPlatformDesc',
  },
  {
    icon: Radio,
    titleKey: 'auth.featureWorkers',
    descKey: 'auth.featureWorkersDesc',
  },
];

const statusServiceKeys = ['auth.serviceAuthApi', 'auth.serviceWorkers', 'auth.serviceAnalytics'];

function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
  const ring = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
  return (
    <div className="relative flex shrink-0 items-center justify-center">
      <span className={cn('absolute inset-0 rounded-2xl bg-primary/40 animate-pulse-ring', ring)} />
      <span className={cn('absolute inset-0 rounded-2xl bg-primary/30 animate-pulse-ring [animation-delay:1.3s]', ring)} />
      <div className={cn('relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/30', box)}>
        <Sparkles className={cn('text-white', size === 'sm' ? 'h-4 w-4' : 'h-5 w-5')} />
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const { t } = useI18n();
  const reducedMotion = useReducedMotion();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [copied, setCopied] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';

  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: `${(i * 59 + 7) % 100}%`,
        top: `${(i * 41 + 13) % 100}%`,
        size: i % 4 === 0 ? 5 : 2 + (i % 3),
        duration: 11 + (i % 6) * 2.4,
        delay: (i % 8) * 1.1,
        opacity: 0.2 + (i % 4) * 0.12,
      })),
    []
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 450);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const validate = useCallback(
    (): { ok: boolean; errors: FieldErrors; focusField?: FieldName } => {
      const next: FieldErrors = {};
      const trimmed = email.trim();
      if (!trimmed) {
        next.email = t('auth.emailRequired');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        next.email = t('auth.emailInvalid');
      }
      if (!password) {
        next.password = t('auth.passwordRequired');
      } else if (password.length < 6) {
        next.password = t('auth.passwordTooShort');
      }
      const hasErrors = Object.keys(next).length > 0;
      return {
        ok: !hasErrors,
        errors: next,
        focusField: next.email ? 'email' : next.password ? 'password' : undefined,
      };
    },
    [email, password, t]
  );

  const handleDemoFill = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setErrors({});
    setAuthError(null);
    toast.success(t('auth.demoFilled'));
    passwordRef.current?.focus();
  };

  const handleCopyCredentials = async () => {
    const text = `Email: ${DEMO_EMAIL}\nPassword: ${DEMO_PASSWORD}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    toast.success(t('auth.demoCopied'));
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleForgotPassword = () => {
    toast(t('auth.forgotPasswordInfo'));
  };

  const handleRegisterInfo = () => {
    toast(t('auth.registerInfo'));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;

    const result = validate();
    if (!result.ok) {
      setErrors(result.errors);
      setAuthError(null);
      setShakeKey((k) => k + 1);
      if (result.focusField === 'email') {
        emailRef.current?.focus();
      } else {
        passwordRef.current?.focus();
      }
      return;
    }

    if (remember) {
      window.localStorage.setItem(REMEMBER_KEY, email.trim());
    } else {
      window.localStorage.removeItem(REMEMBER_KEY);
    }

    setIsLoading(true);
    setErrors({});
    setAuthError(null);

    try {
      await login(email.trim(), password);
      toast.success(t('auth.loginSuccessful'));
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : t('auth.loginFailed');
      setAuthError(message);
      setShakeKey((k) => k + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClasses = cn(
    'w-full rounded-xl border border-input bg-card py-3 pl-11 pr-4 text-sm text-card-foreground placeholder:text-muted-foreground/60 outline-none transition-all duration-300',
    'focus:border-primary/70 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.12)]'
  );

  const errorInputClasses = 'border-red-500/60 focus:border-red-400/70 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.12)]';

  const loginCard = ready ? (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 30, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      className="w-full max-w-md"
    >
      <div
        key={shakeKey}
        className={cn(
          'relative rounded-3xl border border-border bg-card p-px shadow-popover',
          shakeKey > 0 && 'animate-shake'
        )}
      >
        <div
          className={cn(
            'absolute inset-0 rounded-3xl animate-border-glow',
            isDark
              ? 'bg-gradient-to-br from-primary/40 via-primary/10 to-sky-400/30'
              : 'bg-gradient-to-br from-primary/30 via-primary/5 to-sky-400/25'
          )}
        />
        <div className="relative rounded-[calc(1.5rem-1px)] bg-card/95 p-8 backdrop-blur-2xl sm:p-10">
          <div className="flex items-center gap-3 sm:hidden">
            <Logo size="sm" />
            <div>
              <p className="text-base font-semibold tracking-tight text-card-foreground">{t('brand.name')}</p>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{t('brand.tagline')}</p>
            </div>
          </div>

          <div className="mt-4 sm:mt-0">
            <h2 className="text-2xl font-semibold tracking-tight text-card-foreground">{t('auth.welcomeBack')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('auth.signInSubtitle')}</p>
          </div>

          <AnimatePresence>
            {authError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div
                  role="alert"
                  className="mt-5 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
                >
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-card-foreground">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={emailRef}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                  }}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className={cn(inputClasses, errors.email ? errorInputClasses : 'border-border')}
                  placeholder="you@festivalmbois.com"
                />
              </div>
              <AnimatePresence>
                {errors.email && (
                  <motion.p
                    id="email-error"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-1.5 text-xs text-red-500 dark:text-red-400"
                  >
                    {errors.email}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-card-foreground">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className={cn(inputClasses, errors.password ? errorInputClasses : 'border-border', 'pr-11')}
                  placeholder={t('auth.passwordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <AnimatePresence>
                {errors.password && (
                  <motion.p
                    id="password-error"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-1.5 text-xs text-red-500 dark:text-red-400"
                  >
                    {errors.password}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-border bg-card accent-primary"
                />
                {t('auth.rememberMe')}
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm font-medium text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t('auth.forgotPassword')}
              </button>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={!isLoading ? { scale: 0.98 } : undefined}
              whileHover={!isLoading ? { scale: 1.01 } : undefined}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary to-blue-500 py-3.5 text-sm font-semibold text-white shadow-[0_10px_40px_-10px_rgba(59,130,246,0.7)] transition-all duration-300 hover:shadow-[0_16px_55px_-12px_rgba(59,130,246,0.95)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('auth.signingIn')}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {t('auth.signIn')}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              )}
            </motion.button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{t('auth.demoAccess')}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <KeyRound className="h-4 w-4" />
                {t('auth.explorerAccount')}
              </div>
              <span className="rounded-md border border-border bg-card px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                {t('auth.oneClickFill')}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 font-mono text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card/60 px-3 py-2">
                <span>{DEMO_EMAIL}</span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card/60 px-3 py-2">
                <span>{DEMO_PASSWORD}</span>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <motion.button
                type="button"
                onClick={handleDemoFill}
                whileTap={{ scale: 0.98 }}
                className="flex-1 rounded-lg border border-primary/30 bg-primary/10 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t('auth.useDemoCredentials')}
              </motion.button>
              <motion.button
                type="button"
                onClick={handleCopyCredentials}
                whileTap={{ scale: 0.98 }}
                aria-label={t('auth.copyCredentialsAria')}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? t('auth.copied') : t('auth.copy')}
              </motion.button>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              {t('auth.demoHint')}
            </p>
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <button
              type="button"
              onClick={handleRegisterInfo}
              aria-describedby="register-hint"
              className="flex w-full items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <UserPlus className="h-4 w-4" />
              {t('auth.register')}
              <span className="rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                {t('auth.adminOnly')}
              </span>
            </button>
            <p id="register-hint" className="mt-1.5 text-center text-[11px] text-muted-foreground">
              {t('auth.registerHint')}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {t('brand.legal')}
      </p>
    </motion.div>
  ) : (
    <div className="w-full max-w-md">
      <div className="rounded-3xl border border-border bg-card p-8 shadow-popover sm:p-10">
        <div className="h-7 w-3/4 rounded-lg bg-gradient-to-r from-muted via-muted/70 to-muted animate-shimmer-x" />
        <div className="mt-2 h-4 w-1/2 rounded-lg bg-gradient-to-r from-muted via-muted/70 to-muted animate-shimmer-x" />
        <div className="mt-8 space-y-5">
          <div>
            <div className="mb-2 h-3.5 w-24 rounded bg-gradient-to-r from-muted via-muted/70 to-muted animate-shimmer-x" />
            <div className="h-11 rounded-xl bg-gradient-to-r from-muted via-muted/70 to-muted animate-shimmer-x" />
          </div>
          <div>
            <div className="mb-2 h-3.5 w-20 rounded bg-gradient-to-r from-muted via-muted/70 to-muted animate-shimmer-x" />
            <div className="h-11 rounded-xl bg-gradient-to-r from-muted via-muted/70 to-muted animate-shimmer-x" />
          </div>
          <div className="h-12 rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 animate-shimmer-x" />
        </div>
      </div>
      <div className="mx-auto mt-6 h-3 w-2/3 rounded bg-gradient-to-r from-muted via-muted/70 to-muted animate-shimmer-x" />
    </div>
  );

  return (
    <div className={cn('relative min-h-screen overflow-hidden bg-background text-foreground')}>
      {/* Theme & Language Controls */}
      <div className="absolute right-4 top-4 z-30 flex items-center gap-1 rounded-xl border border-border bg-card/80 p-1 shadow-card backdrop-blur-md">
        <ThemeToggle />
        <div className="mx-0.5 h-5 w-px bg-border" />
        <LanguageSelector align="right" />
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {isDark ? (
          <>
            <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-primary/20 blur-[130px] animate-drift-a" />
            <div className="absolute -right-32 top-1/3 h-[30rem] w-[30rem] rounded-full bg-sky-500/15 blur-[130px] animate-drift-b" />
            <div className="absolute -bottom-40 left-1/3 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-[120px] animate-drift-c" />
            <div className="absolute inset-0 bg-grid-slate" />
            <div className="absolute inset-0 bg-noise opacity-[0.04]" />
          </>
        ) : (
          <>
            <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-primary/15 blur-[130px] animate-drift-a" />
            <div className="absolute -right-32 top-1/3 h-[30rem] w-[30rem] rounded-full bg-sky-400/15 blur-[130px] animate-drift-b" />
            <div className="absolute -bottom-40 left-1/3 h-[28rem] w-[28rem] rounded-full bg-blue-300/15 blur-[120px] animate-drift-c" />
            <div className="absolute inset-0 bg-grid-light" />
            <div className="absolute inset-0 bg-noise opacity-[0.03]" />
          </>
        )}
        {particles.map((p, i) => (
          <span
            key={i}
            className={cn('absolute rounded-full', isDark ? 'bg-white' : 'bg-primary/50')}
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col items-center gap-12 px-6 py-14 lg:flex-row lg:justify-between lg:gap-24 lg:px-12">
        <motion.div
          variants={containerVariants}
          initial={reducedMotion ? false : 'hidden'}
          animate="show"
          className="hidden w-full max-w-xl flex-col gap-8 lg:flex"
        >
          <motion.div variants={itemVariants} className="flex items-center gap-3">
            <Logo />
            <div>
              <p className="text-lg font-semibold tracking-tight text-card-foreground">{t('brand.name')}</p>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{t('brand.tagline')}</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <h1 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
              {t('auth.heroHeadline1')}
              <br />
              <span className="bg-gradient-to-r from-primary via-sky-400 to-primary bg-clip-text text-transparent">
                {t('auth.heroHeadline2')}
              </span>
            </h1>
            <p className="mt-5 max-w-lg leading-relaxed text-muted-foreground">
              {t('auth.heroDescription')}
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.titleKey}
                className="rounded-xl border border-border bg-card/60 p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <f.icon className="h-5 w-5 text-primary" />
                <p className="mt-2.5 text-sm font-semibold text-card-foreground">{t(f.titleKey)}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(f.descKey)}</p>
              </div>
            ))}
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="rounded-2xl border border-border bg-card/60 p-5 shadow-card backdrop-blur"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary/60 animate-pulse-ring" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
              <span className="text-sm font-medium text-card-foreground">{t('auth.allSystemsOperational')}</span>
              <span className="ml-auto text-xs text-muted-foreground">{t('brand.version')}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {statusServiceKeys.map((s) => (
                <span
                  key={s}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-card/60 px-2 py-1 text-[11px] text-muted-foreground"
                >
                  <ShieldCheck className="h-3 w-3 text-primary" />
                  {t(s)}
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>

        <div className="flex w-full flex-col items-center">
          <AnimatePresence mode="wait">{loginCard}</AnimatePresence>
        </div>
      </div>
    </div>
  );
}