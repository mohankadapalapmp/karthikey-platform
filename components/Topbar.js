'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'

export default function Topbar() {
  const [credits, setCredits] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user)
      if (data?.user) fetchCredits(data.user.id)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null)
      if (session?.user) fetchCredits(session.user.id)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function fetchCredits(uid) {
    const { data } = await supabase
      .from('accounts')
      .select('credits')
      .eq('id', uid)
      .single()
    if (data) setCredits(data.credits)
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav style={{ background: 'var(--navy)', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 12, height: 56, position: 'sticky', top: 0, zIndex: 100 }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: 'var(--gold)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 16, color: 'var(--navy)' }}>K</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', letterSpacing: '0.05em' }}>KARTHIKEY</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.03em' }}>AI Agent Platform</div>
        </div>
      </Link>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        {user && (
          <>
            <Link href="/agents" style={{ fontSize: 13, color: 'var(--muted)', padding: '4px 10px' }}>Agents</Link>
            <Link href="/dashboard" style={{ fontSize: 13, color: 'var(--muted)', padding: '4px 10px' }}>Dashboard</Link>
            <div style={{ background: 'var(--slate)', border: '0.5px solid var(--border)', borderRadius: 20, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--gold)' }}>
              ⚡ {credits ?? '…'} credits
            </div>
            <Link href="/credits" className="btn-gold" style={{ padding: '5px 12px', fontSize: 12, borderRadius: 6 }}>+ Buy credits</Link>
            <button onClick={signOut} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer' }}>Sign out</button>
          </>
        )}
        {!user && (
          <>
            <Link href="/login" style={{ fontSize: 13, color: 'var(--muted)' }}>Login</Link>
            <Link href="/login?signup=1" className="btn-gold" style={{ padding: '6px 14px', fontSize: 13, borderRadius: 6 }}>Get started free</Link>
          </>
        )}
      </div>
    </nav>
  )
}
