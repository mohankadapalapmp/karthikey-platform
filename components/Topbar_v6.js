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
    <nav className="k-topbar">
      {/* Logo */}
      <Link href="/" className="k-logo">
        <div className="k-logo-mark">K</div>
        <span className="k-logo-text">KARTHIKEY</span>
      </Link>

      {/* Nav links */}
      {user && (
        <div className="k-nav">
          {[['/', 'Home'], ['/agents', 'Agents'], ['/dashboard', 'Dashboard'], ['/pricing', 'Pricing']].map(([href, label]) => (
            <Link key={href} href={href} className={`k-nav-item${isActive(href) ? ' active' : ''}`}>
              {label}
            </Link>
          ))}
        </div>
      )}

      {/* Right side */}
      <div className="k-topbar-right">
        {user ? (
          <>
            {org && (
              <Link href={`/org/${org.slug}`} className="k-org-badge">
                {org.name}
              </Link>
            )}
            {!org && (
              <Link href="/org/create" className="k-create-team">
                + Create team
              </Link>
            )}

            <div className="k-credit-pill">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9.5L3 11L3.5 7.5L1 5L4.5 4.5L6 1Z" fill="currentColor"/>
              </svg>
              {org ? (orgCredits >= 0 ? orgCredits : '…') : (credits ?? '…')} {org ? 'team credits' : 'credits'}
            </div>

            <Link href="/credits" className="k-buy-btn">+ Buy</Link>

            <Link href="/profile" title={profile?.full_name || user.email} className={`k-avatar${pathname === '/profile' ? ' active' : ''}`}>
              {initials}
            </Link>

            <button onClick={signOut} className="k-signout">Sign out</button>
          </>
        ) : (
          <>
            <Link href="/pricing" className="k-nav-item">Pricing</Link>
            <Link href="/login?signup=1&type=team" className="k-nav-item">For teams</Link>
            <Link href="/login" className="k-nav-item">Login</Link>
            <Link href="/login?signup=1" className="k-buy-btn">Get started free</Link>
          </>
        )}
      </div>
    </nav>
  )
}
