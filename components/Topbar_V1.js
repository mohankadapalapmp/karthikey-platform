'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Topbar() {
  const [credits, setCredits] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const pathname = usePathname()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user || null)
      if (data?.session?.user) fetchProfile(data.session.user.id)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null)
      if (session?.user) fetchProfile(session.user.id)
      else { setCredits(null); setProfile(null) }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function fetchProfile(uid) {
    const { data } = await supabase.from('accounts').select('credits, full_name, company').eq('id', uid).single()
    if (data) { setCredits(data.credits); setProfile(data) }
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || 'K'

  const navLink = (href, label) => (
    <Link href={href} style={{
      fontSize: 13, color: pathname === href ? '#C9A84C' : '#8FA3C8',
      padding: '4px 10px', fontWeight: pathname === href ? 500 : 400,
      borderBottom: pathname === href ? '2px solid #C9A84C' : '2px solid transparent',
      paddingBottom: 6
    }}>{label}</Link>
  )

  return (
    <nav style={{ background: 'var(--navy)', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 12, height: 56, position: 'sticky', top: 0, zIndex: 100, borderBottom: '0.5px solid #2E4070' }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 8 }}>
        <div style={{ width: 32, height: 32, background: '#C9A84C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 16, color: '#0D1B3E' }}>K</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#C9A84C', letterSpacing: '0.05em' }}>KARTHIKEY</div>
          <div style={{ fontSize: 10, color: '#8FA3C8', letterSpacing: '0.03em' }}>AI Agent Platform</div>
        </div>
      </Link>

      {user && (
        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {navLink('/agents', 'Agents')}
          {navLink('/dashboard', 'Dashboard')}
        </div>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        {user ? (
          <>
            <div style={{ background: '#1A2848', border: '0.5px solid #2E4070', borderRadius: 20, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#C9A84C' }}>
              ⚡ {credits ?? '…'} credits
            </div>
            <Link href="/credits" style={{ background: '#C9A84C', color: '#0D1B3E', padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>+ Buy</Link>

            {/* Profile avatar with dropdown */}
            <div style={{ position: 'relative' }} className="profile-menu">
              <Link href="/profile" title={profile?.full_name || user.email} style={{
                width: 34, height: 34, borderRadius: '50%', background: '#C9A84C',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#0D1B3E', textDecoration: 'none',
                border: pathname === '/profile' ? '2px solid white' : '2px solid transparent'
              }}>
                {initials}
              </Link>
            </div>

            <button onClick={signOut} style={{ background: 'transparent', border: 'none', color: '#8FA3C8', fontSize: 12, cursor: 'pointer', padding: '4px 6px' }}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link href="/login" style={{ fontSize: 13, color: '#8FA3C8', padding: '4px 10px' }}>Login</Link>
            <Link href="/login?signup=1" style={{ background: '#C9A84C', color: '#0D1B3E', padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>Get started free</Link>
          </>
        )}
      </div>
    </nav>
  )
}
