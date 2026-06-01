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
      if (data?.user) router.push(params.get('redirect') || (params.get('type') === 'team' ? '/org/create' : '/agents'))
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
        const redirectTo = params.get('redirect') || '/agents'
        router.push(redirectTo)
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
        <div style={{ width: 40, height: 40, background: 'var(--gold)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20, color: 'var(--navy)' }}>K</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gold)', letterSpacing: '0.05em' }}>KARTHIKEY</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>AI Agent Platform</div>
        </div>
      </Link>

      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>{isSignup ? 'Create your account' : 'Welcome back'}</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
          {isSignup ? (isTeam ? 'Create your account — then set up your team' : 'Get 5 free credits — no card needed') : 'Sign in to your Karthikey account'}
        </p>

        <button onClick={handleGoogle} className="btn-outline" style={{ width: '100%', padding: '10px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span>🔵</span> Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 0.5, background: '#E5E7EB' }}/>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or</span>
          <div style={{ flex: 1, height: 0.5, background: '#E5E7EB' }}/>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isSignup && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Full name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Karthikey Kumar" required
                style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #D1D5DB', borderRadius: 6, fontSize: 14 }} />
            </div>
          )}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required
              style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #D1D5DB', borderRadius: 6, fontSize: 14 }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6}
              style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #D1D5DB', borderRadius: 6, fontSize: 14 }} />
          </div>

          {error && <div style={{ background: '#FEF2F2', border: '0.5px solid #FECACA', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#991B1B' }}>{error}</div>}
          {success && <div style={{ background: '#F0FDF4', border: '0.5px solid #BBF7D0', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#166534' }}>{success}</div>}

          <button type="submit" className="btn-primary" style={{ padding: '11px', fontSize: 14, borderRadius: 6, marginTop: 4 }} disabled={loading}>
            {loading ? 'Please wait…' : isSignup ? 'Create account & get 5 free credits' : 'Sign in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--text-muted)' }}>
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <button onClick={() => { setIsSignup(!isSignup); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--navy)', fontWeight: 500, cursor: 'pointer', fontSize: 13 }}>
            {isSignup ? 'Sign in' : 'Sign up free'}
          </button>
        </p>
      </div>
    </div>
  )
}
