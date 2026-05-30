// ── Sentry Error Monitoring ───────────────────────────────────
// Setup: https://sentry.io → New Project → Next.js → copy DSN
// Add to Vercel env vars: NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx

export function initSentry() {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return

  const script = document.createElement('script')
  script.src = 'https://browser.sentry-cdn.com/7.99.0/bundle.min.js'
  script.crossOrigin = 'anonymous'
  script.onload = () => {
    window.Sentry?.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV || 'production',
      tracesSampleRate: 0.1,
      beforeSend(event) {
        // Don't send errors from localhost
        if (window.location.hostname === 'localhost') return null
        return event
      }
    })
  }
  document.head.appendChild(script)
}

export function captureError(error, context = {}) {
  if (typeof window !== 'undefined' && window.Sentry) {
    window.Sentry.captureException(error, { extra: context })
  }
  console.error('[Karthikey Error]', error, context)
}

export function captureMessage(message, level = 'info') {
  if (typeof window !== 'undefined' && window.Sentry) {
    window.Sentry.captureMessage(message, level)
  }
}

export function setUser(user) {
  if (typeof window !== 'undefined' && window.Sentry) {
    window.Sentry.setUser(user ? { id: user.id, email: user.email } : null)
  }
}
