'use client';

import { useI18n } from '@/lib/i18n';

export default function Home() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-24 text-foreground">
      <div className="z-10 w-full max-w-5xl items-center justify-center text-center font-sans text-sm">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-card-foreground">
          {t('landing.title')}
        </h1>
        <p className="mb-8 text-muted-foreground">
          {t('landing.subtitle')}
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="/login"
            className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t('landing.getStarted')}
          </a>
          <a
            href="/dashboard"
            className="rounded-lg border border-border px-6 py-3 font-medium text-card-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t('landing.goToDashboard')}
          </a>
        </div>
      </div>
    </div>
  )
}
