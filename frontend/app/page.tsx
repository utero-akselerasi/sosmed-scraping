'use client';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-24 text-foreground">
      <div className="z-10 w-full max-w-5xl items-center justify-center text-center font-sans text-sm">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-card-foreground">
          Festival Mbois Intelligence Platform
        </h1>
        <p className="mb-8 text-muted-foreground">
          Social Media Analytics Dashboard
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="/login"
            className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Get Started
          </a>
          <a
            href="/dashboard"
            className="rounded-lg border border-border px-6 py-3 font-medium text-card-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
