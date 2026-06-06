'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isTeam = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('type') === 'team'

  useEffect(() => {
    if (params.get('signup') === '1') setIsSignup(true)
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) router.push(decodeURIComponent(params.get('redirect') || '') || (params.get('type') === 'team' ? '/org/create' : '/agents'))
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    try {
      if (isSignup) {
        const { data, error: err } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
        if (err) throw err
        if (data.user) {
          await supabase.from('accounts').upsert({ id: data.user.id, email, full_name: name, credits: 5 })
          setSuccess('Account created! Redirecting…')
          const dest = params.get('redirect') || (params.get('type') === 'team' ? '/org/create' : '/agents')
          setTimeout(() => router.push(dest), 1200)
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        const rawRedirect = params.get('redirect') || '/agents'
        router.push(decodeURIComponent(rawRedirect))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    const type = params.get('type')
    const dest = type === 'team' ? '/org/create' : '/agents'
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}${dest}` } })
  }

  const inp = {
    width: '100%', padding: '10px 13px',
    border: '1px solid #D1D5DB', borderRadius: 7,
    fontSize: 14, color: '#111827',
    background: '#fff', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F4F6F9',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>

      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28, textDecoration: 'none' }}>
        <div style={{ background: '#1565C0', borderRadius: 5, padding: '6px 14px', display: 'inline-flex', alignItems: 'center' }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#ffffff', letterSpacing: '0.06em', fontFamily: 'Arial Black, Arial, sans-serif' }}>KARTHI</span>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#90CAF9', letterSpacing: '0.06em', fontFamily: 'Arial Black, Arial, sans-serif' }}>KEY</span>
        </div>
      </Link>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 400,
        background: '#fff',
        borderRadius: 14,
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
        padding: '32px 32px 28px',
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
          {isSignup ? 'Create your account' : 'Welcome back'}
        </h1>
        <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>
          {isSignup
            ? (isTeam ? 'Create your account — then set up your team' : 'Get 5 free credits — no card needed')
            : 'Sign in to your Karthikey account'}
        </p>

        {/* Google button */}
        <button onClick={handleGoogle} style={{
          width: '100%', padding: '10px 16px',
          border: '1px solid #D1D5DB', borderRadius: 7,
          background: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          fontSize: 14, fontWeight: 500, color: '#374151',
          marginBottom: 20, fontFamily: 'inherit',
          transition: 'background 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
        >
          {/* Real Google G SVG */}
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: '#E2E8F0' }}/>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>or</span>
          <div style={{ flex: 1, height: 1, background: '#E2E8F0' }}/>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isSignup && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Full name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" required style={inp} />
            </div>
          )}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} style={inp} />
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 7, padding: '9px 13px', fontSize: 13, color: '#991B1B' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 7, padding: '9px 13px', fontSize: 13, color: '#166534' }}>
              {success}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '11px',
            background: loading ? '#93C5FD' : '#1565C0',
            color: '#fff', border: 'none', borderRadius: 7,
            fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', marginTop: 2, transition: 'background 0.15s',
          }}>
            {loading ? 'Please wait…' : isSignup ? 'Create account & get 5 free credits' : 'Sign in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#64748B' }}>
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <button onClick={() => { setIsSignup(!isSignup); setError('') }}
            style={{ background: 'none', border: 'none', color: '#1565C0', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: 0 }}>
            {isSignup ? 'Sign in' : 'Sign up free'}
          </button>
        </p>
      </div>

      <p style={{ marginTop: 20, fontSize: 12, color: '#94A3B8' }}>
        © 2026 Karthikey Intelligence Solutions
      </p>
    </div>
  )
}
