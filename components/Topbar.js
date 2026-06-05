'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Topbar() {
  const [credits, setCredits] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [org, setOrg] = useState(null)
  const pathname = usePathname()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user || null)
      if (data?.session?.user) fetchProfile(data.session.user.id)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null)
      if (session?.user) fetchProfile(session.user.id)
      else { setCredits(null); setProfile(null); setOrg(null) }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function fetchProfile(uid) {
    const [{ data: acc }, { data: orgMembers }] = await Promise.all([
      supabase.from('accounts').select('credits, full_name, company').eq('id', uid).single(),
      supabase.from('org_members').select('role, invited_email, organisations(id, name, slug, credits, owner_id)').eq('user_id', uid).eq('status', 'active')
    ])
    if (acc) { setCredits(acc.credits); setProfile(acc) }
    if (orgMembers?.length) {
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

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/agents', label: 'Agents' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/pricing', label: 'Pricing' },
  ]

  const isActive = (href) => href === '/' ? pathname === '/' : pathname?.startsWith(href)

  const S = {
    nav: {
      height: 52,
      background: '#0D1B3E',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 0,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      textDecoration: 'none',
      marginRight: 28,
    },
    logoBox: {
      background: '#1565C0',
      borderRadius: 5,
      padding: '4px 8px',
      fontSize: 13,
      fontWeight: 800,
      letterSpacing: '-0.01em',
    },
    logoKey: { color: '#90CAF9' },
    logoKarthi: { color: '#fff' },
    logoSub: {
      fontSize: 10,
      fontWeight: 600,
      color: 'rgba(255,255,255,0.3)',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      lineHeight: 1,
    },
    navItem: {
      fontSize: 13,
      fontWeight: 400,
      color: 'rgba(255,255,255,0.5)',
      padding: '5px 12px',
      borderRadius: 6,
      textDecoration: 'none',
      transition: 'all 0.12s',
    },
    navItemActive: {
      background: '#1565C0',
      color: '#fff',
      fontWeight: 500,
    },
    right: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 },
    orgBadge: {
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 6,
      padding: '4px 10px',
      fontSize: 11,
      fontWeight: 500,
      color: 'rgba(255,255,255,0.6)',
      textDecoration: 'none',
    },
    createTeam: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.4)',
      padding: '4px 8px',
      borderRadius: 4,
      border: '1px solid rgba(255,255,255,0.1)',
      textDecoration: 'none',
    },
    creditPill: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      background: 'rgba(21,101,192,0.3)',
      border: '1px solid rgba(144,202,249,0.3)',
      borderRadius: 20,
      padding: '4px 12px',
      fontSize: 12,
      fontWeight: 600,
      color: '#90CAF9',
    },
    buyBtn: {
      background: '#1565C0',
      color: '#fff',
      border: 'none',
      borderRadius: 6,
      padding: '5px 14px',
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer',
      textDecoration: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
    },
    avatar: {
      width: 30,
      height: 30,
      borderRadius: '50%',
      background: '#1565C0',
      border: '1.5px solid rgba(144,202,249,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontWeight: 700,
      color: '#fff',
      textDecoration: 'none',
      cursor: 'pointer',
    },
    signout: {
      background: 'transparent',
      border: 'none',
      color: 'rgba(255,255,255,0.35)',
      fontSize: 12,
      cursor: 'pointer',
      padding: '4px 6px',
    },
  }

  return (
    <nav style={S.nav}>
      <Link href="/" style={S.logo}>
        <div style={S.logoBox}>
          <span style={S.logoKarthi}>KARTHI</span><span style={S.logoKey}>KEY</span>
        </div>
      </Link>

      {user && (
        <div style={{ display: 'flex', gap: 2 }}>
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{ ...S.navItem, ...(isActive(href) ? S.navItemActive : {}) }}
            >
              {label}
            </Link>
          ))}
        </div>
      )}

      <div style={S.right}>
        {user ? (
          <>
            {org ? (
              <Link href={`/org/${org.slug}`} style={S.orgBadge}>{org.name}</Link>
            ) : (
              <Link href="/org/create" style={S.createTeam}>+ Create team</Link>
            )}
            <div style={S.creditPill}>
              ★ {org ? (orgCredits >= 0 ? orgCredits : '…') : (credits ?? '…')} {org ? 'team' : ''} credits
            </div>
            <Link href="/credits" style={S.buyBtn}>+ Buy</Link>
            <Link href="/profile" style={{ ...S.avatar, ...(pathname === '/profile' ? { background: '#0D47A1' } : {}) }}>
              {initials}
            </Link>
            <button onClick={signOut} style={S.signout}>Sign out</button>
          </>
        ) : (
          <>
            <Link href="/pricing" style={S.navItem}>Pricing</Link>
            <Link href="/login?signup=1&type=team" style={S.navItem}>For teams</Link>
            <Link href="/login" style={S.navItem}>Login</Link>
            <Link href="/login?signup=1" style={S.buyBtn}>Get started free</Link>
          </>
        )}
      </div>
    </nav>
  )
}
