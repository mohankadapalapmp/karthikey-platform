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

  const [org, setOrg] = useState(null)

  async function fetchProfile(uid) {
    const [{ data: acc }, { data: orgMembers }] = await Promise.all([
      supabase.from('accounts').select('credits, full_name, company').eq('id', uid).single(),
      supabase.from('org_members').select('role, invited_email, organisations(id, name, slug, credits, owner_id)').eq('user_id', uid).eq('status', 'active')
    ])
    if (acc) { setCredits(acc.credits); setProfile(acc) }
    if (orgMembers?.length) {
      // Same priority logic as API: invited org > own org
      const invitedOrg = orgMembers.find(m => m.invited_email && m.organisations?.owner_id !== uid)
      const ownOrg = orgMembers.find(m => m.organisations?.owner_id === uid)
      const primary = invitedOrg || ownOrg
      if (primary?.organisations) setOrg(primary.organisations)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const orgCredits = org?.credits ?? null

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || 'K'

  const isActive = (href) => pathname === href || pathname?.startsWith(href + '/')

  return (
    <nav style={{
      background: '#0D1B3E',
      borderBottom: '1px solid #1E2F5A',
      height: 56,
      display: 'flex',
      alignItems: 'center',
      padding: '0 28px',
      gap: 0,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 32 }}>
        <div style={{ width: 30, height: 30, background: '#C9A84C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#0D1B3E', letterSpacing: '-0.02em' }}>K</div>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#C9A84C', letterSpacing: '0.04em' }}>KARTHIKEY</span>
      </Link>

      {/* Nav links */}
      {user && (
        <div style={{ display: 'flex', gap: 2 }}>
          {[['/', 'Home'], ['/agents', 'Agents'], ['/dashboard', 'Dashboard'], ['/pricing', 'Pricing']].map(([href, label]) => (
            <Link key={href} href={href} style={{
              fontSize: 13.5,
              fontWeight: 500,
              color: isActive(href) ? '#fff' : '#8FA3C8',
              padding: '6px 12px',
              borderRadius: 6,
              background: isActive(href) ? 'rgba(255,255,255,0.08)' : 'transparent',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!isActive(href)) e.target.style.color = '#C8D8EF' }}
            onMouseLeave={e => { if (!isActive(href)) e.target.style.color = '#8FA3C8' }}>
              {label}
            </Link>
          ))}
        </div>
      )}

      {/* Right side */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        {user ? (
          <>
            {/* Org badge */}
            {org && (
              <Link href={`/org/${org.slug}`} style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 6, padding: '3px 10px', fontSize: 11.5, fontWeight: 500, color: '#C9A84C', textDecoration: 'none' }}>
                {org.name}
              </Link>
            )}
            {!org && (
              <Link href="/org/create" style={{ fontSize: 12, color: '#8FA3C8', padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }}>
                + Create team
              </Link>
            )}

            {/* Credits pill */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(201,168,76,0.12)',
              border: '1px solid rgba(201,168,76,0.25)',
              borderRadius: 20,
              padding: '4px 12px',
              fontSize: 13,
              fontWeight: 500,
              color: '#C9A84C',
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9.5L3 11L3.5 7.5L1 5L4.5 4.5L6 1Z" fill="#C9A84C"/>
              </svg>
              {org
                ? (orgCredits >= 0 ? orgCredits : '…')
                : (credits ?? '…')
              } {org
                ? (orgCredits > 0 ? 'team credits' : 'team credits')
                : 'credits'
              }
            </div>

            <Link href="/credits" style={{
              background: '#C9A84C',
              color: '#0D1B3E',
              padding: '5px 12px',
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              transition: 'background 0.15s',
            }}>
              + Buy
            </Link>

            {/* Avatar */}
            <Link href="/profile" title={profile?.full_name || user.email} style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: pathname === '/profile' ? '#C9A84C' : 'rgba(201,168,76,0.2)',
              border: pathname === '/profile' ? '2px solid #C9A84C' : '1.5px solid rgba(201,168,76,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: pathname === '/profile' ? '#0D1B3E' : '#C9A84C',
              textDecoration: 'none',
              transition: 'all 0.15s',
            }}>
              {initials}
            </Link>

            <button onClick={signOut} style={{
              background: 'transparent', border: 'none',
              color: '#8FA3C8', fontSize: 12.5, cursor: 'pointer',
              padding: '4px 8px', borderRadius: 4,
              transition: 'color 0.15s',
            }}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link href="/pricing" style={{ fontSize: 13.5, color: '#8FA3C8', padding: '6px 12px', fontWeight: 500 }}>Pricing</Link>
            <Link href="/login?signup=1&type=team" style={{ fontSize: 13.5, color: '#8FA3C8', padding: '6px 12px', fontWeight: 500 }}>For teams</Link>
            <Link href="/login" style={{ fontSize: 13.5, color: '#8FA3C8', padding: '6px 12px', fontWeight: 500 }}>Login</Link>
            <Link href="/login?signup=1" style={{ background: '#C9A84C', color: '#0D1B3E', padding: '6px 16px', borderRadius: 6, fontSize: 13.5, fontWeight: 600 }}>Get started free</Link>
          </>
        )}
      </div>
    </nav>
  )
}
