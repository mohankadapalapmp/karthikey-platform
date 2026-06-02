'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function AcceptInvitePage() {
  const router = useRouter()
  const { token } = useParams()
  const [invite, setInvite] = useState(null)
  const [org, setOrg] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    loadInvite()
  }, [token])



  async function loadInvite() {
    const { data: inv } = await supabase.from('org_invites').select('*, organisations(*)').eq('token', token).single()
    if (!inv) { setError('This invite link is invalid or has expired.'); setLoading(false); return }
    if (inv.status !== 'pending') { setError('This invite has already been used.'); setLoading(false); return }
    if (new Date(inv.expires_at) < new Date()) { setError('This invite link has expired.'); setLoading(false); return }
    setInvite(inv)

    // If org didn't load via join (RLS blocks unauthenticated), fetch org name directly
    if (inv.organisations) {
      setOrg(inv.organisations)
    } else {
      const { data: orgData } = await supabase
        .from('organisations')
        .select('id, name, slug')
        .eq('id', inv.org_id)
        .single()
      setOrg(orgData || { name: 'your team', slug: '' })
    }

    const { data: session } = await supabase.auth.getSession()
    const currentUser = session?.session?.user || null
    setUser(currentUser)
    setLoading(false)

    // If user is already logged in when page loads, auto-accept
    if (currentUser && inv.status === 'pending') {
      // Small delay to ensure state is set
      setTimeout(async () => {
        try {
          const { error: memberErr } = await supabase.from('org_members').insert({
            org_id: inv.org_id,
            user_id: currentUser.id,
            role: inv.role,
            status: 'active',
            invited_email: inv.email
          })
          if (memberErr && !memberErr.code?.includes('23505') && !memberErr.message?.includes('duplicate')) {
            console.error('Member insert error:', memberErr)
            return
          }
          await supabase.from('org_invites').update({ status: 'accepted' }).eq('token', token)
          setDone(true)
          const orgSlug = inv.organisations?.slug || inv.org_id
          setTimeout(() => router.push(`/org/${orgSlug}`), 1500)
        } catch (err) {
          console.error('Auto-accept error:', err)
        }
      }, 500)
    }
  }

  async function acceptInvite() {
    if (!user) { const redirectPath = encodeURIComponent(`/org/invite/${token}`); router.push(`/login?redirect=${redirectPath}`); return }
    setAccepting(true); setError('')
    try {
      // Re-fetch session to ensure it's fresh
      const { data: sessionData } = await supabase.auth.getSession()
      const freshUser = sessionData?.session?.user
      if (!freshUser) throw new Error('Session expired — please sign in again.')

      // Add to org_members
      const { error: memberErr } = await supabase.from('org_members').insert({
        org_id: invite.org_id,
        user_id: freshUser.id,
        role: invite.role,
        status: 'active',
        invited_email: invite.email
      })

      if (memberErr) {
        // If duplicate, they're already a member — treat as success
        if (memberErr.message.includes('duplicate') || memberErr.code === '23505') {
          await supabase.from('org_invites').update({ status: 'accepted' }).eq('token', token)
          setDone(true)
          setTimeout(() => router.push(`/org/${org.slug}`), 2000)
          return
        }
        throw memberErr
      }

      // Mark invite as accepted
      const { error: invErr } = await supabase.from('org_invites').update({ status: 'accepted' }).eq('token', token)
      if (invErr) console.error('Failed to mark invite accepted:', invErr)

      setDone(true)
      setTimeout(() => router.push(`/org/${org.slug}`), 2000)
    } catch (err) {
      console.error('Accept invite error:', err)
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ color: '#6B7280', fontSize: 14 }}>Loading invite…</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, background: '#0D1B3E', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22, fontWeight: 700, color: '#C9A84C' }}>K</div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#C9A84C', letterSpacing: '0.04em' }}>KARTHIKEY</p>
        </div>

        {error ? (
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 15, fontWeight: 500, color: '#111827', marginBottom: 8 }}>Invalid invite</p>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>{error}</p>
            <Link href="/" style={{ display: 'inline-block', background: '#0D1B3E', color: '#C9A84C', padding: '9px 20px', borderRadius: 6, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>Go to homepage</Link>
          </div>
        ) : done ? (
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 6 }}>You've joined {org?.name}!</p>
            <p style={{ fontSize: 14, color: '#6B7280' }}>Redirecting to your team dashboard…</p>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 52, height: 52, background: '#EEF3FB', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22, fontWeight: 700, color: '#0D1B3E' }}>
                {org?.name?.[0]?.toUpperCase()}
              </div>
              <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 6 }}>You're invited to join</h1>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#0D1B3E' }}>{org?.name}</p>
              <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>
                You'll join as a <strong>{invite?.role}</strong> and get access to the team's shared AI agent credits.
              </p>
            </div>

            <div style={{ background: '#F7F8FA', borderRadius: 8, padding: '12px 14px', marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: '#6B7280' }}>Organisation</span>
                <span style={{ fontWeight: 500 }}>{org?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: '#6B7280' }}>Your role</span>
                <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{invite?.role}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#6B7280' }}>Invited email</span>
                <span style={{ fontWeight: 500 }}>{invite?.email}</span>
              </div>
            </div>

            {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#991B1B', marginBottom: 14 }}>{error}</div>}

            {user ? (
              <button onClick={acceptInvite} disabled={accepting}
                style={{ width: '100%', padding: '11px', background: '#0D1B3E', color: '#C9A84C', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: accepting ? 'not-allowed' : 'pointer' }}>
                {accepting ? 'Joining…' : `Join ${org?.name} →`}
              </button>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 12 }}>Sign in to accept this invite</p>
                <button onClick={acceptInvite}
                  style={{ width: '100%', padding: '11px', background: '#0D1B3E', color: '#C9A84C', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                  Sign in & join {org?.name} →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
