// ── Posthog Analytics ─────────────────────────────────────────
// Setup: https://posthog.com → New Project → copy API key
// Add to Vercel env vars: NEXT_PUBLIC_POSTHOG_KEY=phc_xxx

let posthogLoaded = false

export function initAnalytics() {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  if (posthogLoaded) return
  posthogLoaded = true

  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]);t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(a!==void 0?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+" (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys getNextSurveyStep onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  window.posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: 'https://app.posthog.com',
    autocapture: true,
    capture_pageview: true,
    persistence: 'localStorage',
  })
}

export function identifyUser(user, traits = {}) {
  if (typeof window === 'undefined' || !window.posthog) return
  window.posthog.identify(user.id, {
    email: user.email,
    name: traits.full_name || '',
    company: traits.company || '',
    ...traits
  })
}

export function track(event, properties = {}) {
  if (typeof window === 'undefined' || !window.posthog) return
  window.posthog.capture(event, {
    platform: 'karthikey',
    url: window.location.pathname,
    ...properties
  })
}

export function resetAnalytics() {
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.reset()
  }
}

// ── Pre-defined events ────────────────────────────────────────
export const Events = {
  SIGNUP:           'user_signed_up',
  LOGIN:            'user_logged_in',
  AGENT_RUN:        'agent_run',
  BATCH_SCORE:      'batch_score_run',
  FILE_UPLOADED:    'file_uploaded',
  EXPORT_SCORES:    'export_scores',
  EXPORT_ENRICHED:  'export_enriched',
  CREDITS_PURCHASED:'credits_purchased',
  AGENT_VIEWED:     'agent_viewed',
  QUICK_ACTION:     'quick_action_clicked',
}
