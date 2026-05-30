import { NextResponse } from 'next/server'

// ── Simple in-memory rate limiter ─────────────────────────────
// For production scale: replace with Upstash Redis
// https://upstash.com → create Redis DB → npm install @upstash/ratelimit

const rateLimitMap = new Map()
const WINDOW_MS = 60 * 1000  // 1 minute window
const MAX_REQUESTS = 20       // 20 agent calls per minute per user

function getRateLimitKey(req) {
  // Use IP address as key
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
  return `ratelimit:${ip}`
}

function isRateLimited(key) {
  const now = Date.now()
  const record = rateLimitMap.get(key) || { count: 0, resetAt: now + WINDOW_MS }

  // Reset window if expired
  if (now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }

  // Increment and check
  record.count++
  rateLimitMap.set(key, record)

  if (record.count > MAX_REQUESTS) {
    return { limited: true, resetAt: record.resetAt, count: record.count }
  }
  return false
}

// Clean up old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetAt) rateLimitMap.delete(key)
    }
  }, 5 * 60 * 1000)
}

export function middleware(req) {
  const { pathname } = req.nextUrl

  // Only rate limit the agent API route
  if (pathname === '/api/agent') {
    const key = getRateLimitKey(req)
    const limited = isRateLimited(key)

    if (limited) {
      const resetIn = Math.ceil((limited.resetAt - Date.now()) / 1000)
      return NextResponse.json({
        error: `Rate limit exceeded. You've made ${limited.count} requests in the last minute. Please wait ${resetIn} seconds.`
      }, {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(MAX_REQUESTS),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(limited.resetAt / 1000)),
          'Retry-After': String(resetIn),
        }
      })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/agent']
}
