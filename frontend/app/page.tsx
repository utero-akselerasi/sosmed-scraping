'use client';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-4">
          Festival Mbois Intelligence Platform
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          Social Media Analytics Dashboard
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="/login"
            className="rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get Started
          </a>
          <a
            href="/dashboard"
            className="rounded-lg border border-border px-6 py-3 hover:bg-accent transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
