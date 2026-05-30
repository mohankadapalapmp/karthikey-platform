'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import Topbar from '../../../components/Topbar'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function OrgDashboardPage() {
  const router = useRouter()
  const { slug } = useParams()
  const [user, setUser] = useState(null)
  const [org, setOrg] = useState(null)
  const [members, setMembers] = useState([])
  const [usage, setUsage] = useState([])
  const [invites, setInvites] = useState([])
  const [myRole, setMyRole] = useState(null)
  const [tab, setTab] = useState('members')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data?.session) { router.push('/login'); return }
      setUser(data.session.user)
      await loadOrgData(data.session.user.id)
    })
  }, [slug])

  async function loadOrgData(uid) {
    setLoading(true)
    try {
      const { data: orgData } = await supabase
        .from('organisations').select('*').eq('slug', slug).single()
      if (!orgData) { router.push('/dashboard'); return }
      setOrg(orgData)

      const { data: memberData } = await supabase
        .from('org_members')
        .select('*, accounts(full_name, email, credits)')
        .eq('org_id', orgData.id)
        .eq('status', 'active')
        .order('joined_at')
      setMembers(memberData || [])

      const me = memberData?.find(m => m.user_id === uid)
      setMyRole(me?.role || (orgData.owner_id === uid ? 'admin' : null))

      const { data: usageData } = await supabase
        .from('usage_log')
        .select('*, accounts(full_name, email)')
        .eq('org_id', orgData.id)
        .order('created_at', { ascending: false })
        .limit(30)
      setUsage(usageData || [])

      const { data: inviteData } = await supabase
        .from('org_invites')
        .select('*')
        .eq('org_id', orgData.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      setInvites(inviteData || [])
    } finally {
      setLoading(false)
    }
  }

  async function sendInvite(e) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true); setError(''); setInviteLink('')
    try {
      const { data: invite, error: invErr } = await supabase
        .from('org_invites')
        .insert({ org_id: org.id, email: inviteEmail.trim(), role: inviteRole, invited_by: user.id })
        .select().single()
      if (invErr) throw invErr
      const link = `${window.location.origin}/org/invite/${invite.token}`
      setInviteLink(link)
      setInviteEmail('')
      await loadOrgData(user.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setInviting(false)
    }
  }

  async function removeMember(memberId) {
    if (!confirm('Remove this member from the organisation?')) return
    await supabase.from('org_members').update({ status: 'removed' }).eq('id', memberId)
    await loadOrgData(user.id)
  }

  const totalUsed = usage.reduce((s, r) => s + (r.credits_used || 0), 0)
  const memberUsage = members.map(m => ({
    ...m,
    used: usage.filter(u => u.user_id === m.user_id).reduce((s, r) => s + (r.credits_used || 0), 0)
  })).sort((a, b) => b.used - a.used)

  const isAdmin = myRole === 'admin'
  const inputStyle = { padding: '9px 12px', border: '1px solid var(--divider)', borderRadius: 6, fontSize: 13, color: 'var(--text)', background: 'var(--surface)', fontFamily: 'inherit', outline: 'none' }

  if (loading) return (
    <>
      <Topbar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 56px)', color: 'var(--text-muted)', fontSize: 14 }}>
        Loading organisation…
      </div>
    </>
  )

  return (
    <>
      <Topbar />
      <main style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 56px)' }}>
        {/* Header */}
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--divider)', padding: '24px 28px' }}>
          <div style={{ maxWidth: 1120, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, background: '#0D1B3E', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#C9A84C' }}>
                  {org?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>{org?.name}</h1>
                    {isAdmin && <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: '#0D1B3E', color: '#C9A84C' }}>Admin</span>}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>agents.karthikey.in/org/{slug} · {members.length} member{members.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              {isAdmin && (
                <Link href="/credits" className="btn-gold" style={{ fontSize: 13, padding: '8px 16px' }}>+ Buy credits for team</Link>
              )}
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 20 }}>
              {[
                { label: 'Org credits', val: org?.credits ?? 0, color: '#C9A84C' },
                { label: 'Members', val: members.length, color: 'var(--text)' },
                { label: 'Credits used', val: totalUsed, color: 'var(--text)' },
                { label: 'Agent runs', val: usage.length, color: 'var(--text)' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <p className="stat-lbl">{s.label}</p>
                  <p className="stat-val" style={{ color: s.color }}>{s.val}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 2, marginTop: 20, marginBottom: -25 }}>
              {[['members', 'Members'], ['usage', 'Usage'], ...(isAdmin ? [['invite', 'Invite']] : [])].map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)} style={{
                  padding: '8px 14px', fontSize: 13.5, fontWeight: tab === id ? 600 : 400,
                  color: tab === id ? 'var(--navy)' : 'var(--text-muted)',
                  background: 'transparent', border: 'none',
                  borderBottom: tab === id ? '2px solid var(--navy)' : '2px solid transparent',
                  borderRadius: 0, cursor: 'pointer',
                }}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '28px 28px 48px' }}>
          {/* Members tab */}
          {tab === 'members' && (
            <div className="card-flat">
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p className="section-title">Team members</p>
                {isAdmin && <button onClick={() => setTab('invite')} className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}>+ Invite member</button>}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#FAFAFA' }}>
                    {['Member', 'Role', 'Credits used', 'Joined', ...(isAdmin ? [''] : [])].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '9px 20px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--divider)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {memberUsage.map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F9FAFB' }}>
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EEF3FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#0D1B3E', flexShrink: 0 }}>
                            {(m.accounts?.full_name || m.accounts?.email || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontWeight: 500 }}>{m.accounts?.full_name || '—'}</p>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.accounts?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ fontSize: 11.5, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: m.role === 'admin' ? '#0D1B3E' : '#F3F4F7', color: m.role === 'admin' ? '#C9A84C' : 'var(--text-muted)' }}>
                          {m.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px', fontWeight: 500, color: m.used > 0 ? '#92400E' : 'var(--text-muted)' }}>
                        {m.used > 0 ? `−${m.used}` : '0'}
                      </td>
                      <td style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: 12 }}>
                        {new Date(m.joined_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      {isAdmin && (
                        <td style={{ padding: '12px 20px' }}>
                          {m.user_id !== user?.id && (
                            <button onClick={() => removeMember(m.id)} style={{ fontSize: 12, color: '#DC2626', background: 'transparent', border: 'none', cursor: 'pointer' }}>Remove</button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Usage tab */}
          {tab === 'usage' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
              <div className="card-flat">
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--divider)' }}>
                  <p className="section-title">Recent agent runs</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Last 30 runs across all team members</p>
                </div>
                {usage.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No agent runs yet</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#FAFAFA' }}>
                        {['Member', 'Agent', 'Credits', 'Date'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '9px 20px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--divider)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {usage.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #F9FAFB' }}>
                          <td style={{ padding: '10px 20px', fontWeight: 500 }}>{r.accounts?.full_name || r.accounts?.email || '—'}</td>
                          <td style={{ padding: '10px 20px', color: 'var(--text-muted)' }}>{r.agent_name}</td>
                          <td style={{ padding: '10px 20px', color: '#92400E', fontWeight: 500 }}>−{r.credits_used}</td>
                          <td style={{ padding: '10px 20px', color: 'var(--text-muted)', fontSize: 12 }}>
                            {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Usage by member */}
              <div className="card-flat" style={{ padding: '20px', alignSelf: 'flex-start' }}>
                <p className="section-title" style={{ marginBottom: 14 }}>Credits by member</p>
                {memberUsage.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EEF3FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#0D1B3E', flexShrink: 0 }}>
                      {(m.accounts?.full_name || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}>
                        <span style={{ fontWeight: 500 }}>{m.accounts?.full_name?.split(' ')[0] || 'User'}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{m.used}</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--divider)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: totalUsed > 0 ? `${(m.used / totalUsed) * 100}%` : '0%', background: '#0D1B3E', borderRadius: 3 }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invite tab */}
          {tab === 'invite' && isAdmin && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Invite form */}
              <div className="card">
                <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Invite a team member</h2>
                <form onSubmit={sendInvite} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Email address</label>
                    <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                      type="email" placeholder="colleague@company.com" required
                      style={{ ...inputStyle, width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>Role</label>
                    <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
                      <option value="member">Member — can run agents, use org credits</option>
                      <option value="admin">Admin — can also invite members and manage org</option>
                    </select>
                  </div>
                  {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#991B1B' }}>{error}</div>}
                  {inviteLink && (
                    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6, padding: '10px 12px' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#166534', marginBottom: 4 }}>✅ Invite link created — share this with your team member:</p>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <code style={{ fontSize: 11, color: '#166534', background: '#DCFCE7', padding: '4px 8px', borderRadius: 4, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inviteLink}</code>
                        <button type="button" onClick={() => navigator.clipboard.writeText(inviteLink)}
                          style={{ fontSize: 11, padding: '4px 8px', background: '#166534', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                  <button type="submit" disabled={inviting} className="btn-primary" style={{ padding: '10px', fontSize: 13, justifyContent: 'center' }}>
                    {inviting ? 'Creating invite…' : 'Generate invite link →'}
                  </button>
                </form>
              </div>

              {/* Pending invites */}
              <div className="card-flat">
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--divider)' }}>
                  <p className="section-title">Pending invites</p>
                </div>
                {invites.length === 0 ? (
                  <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No pending invites</div>
                ) : invites.map((inv, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #F9FAFB' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500 }}>{inv.email}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                        {inv.role} · expires {new Date(inv.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <span style={{ fontSize: 11.5, padding: '2px 8px', borderRadius: 20, background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}>Pending</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
