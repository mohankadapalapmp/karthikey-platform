'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Topbar from '../../components/Topbar'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const DEPT_COLORS = { Sales:'#0D1B3E', Service:'#065F46', Marketing:'#4C1D95', Ops:'#7F1D1D', Finance:'#78350F', HR:'#0C4A6E' }
const DEPT_BG    = { Sales:'#EEF3FB', Service:'#ECFDF5', Marketing:'#F5F3FF', Ops:'#FEF2F2', Finance:'#FFFBEB', HR:'#F0F9FF' }

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser]     = useState(null)
  const [account, setAccount] = useState(null)
  const [usageLog, setUsageLog] = useState([])
  const [payments, setPayments] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data?.session) { router.push('/login'); return }
      setUser(data.session.user)
      const [{ data: acc }, { data: usage }, { data: pays }] = await Promise.all([
        supabase.from('accounts').select('*').eq('id', data.session.user.id).single(),
        supabase.from('usage_log').select('*').eq('user_id', data.session.user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('payments').select('*').eq('user_id', data.session.user.id).order('created_at', { ascending: false }).limit(5),
      ])
      if (acc) setAccount(acc)
      if (usage) setUsageLog(usage)
      if (pays) setPayments(pays)
    })
  }, [])

  const totalUsed  = usageLog.reduce((s, r) => s + (r.credits_used || 0), 0)
  const totalSpent = payments.reduce((s, p) => s + (p.amount_inr || 0), 0)
  const deptCounts = usageLog.reduce((acc, r) => { acc[r.dept] = (acc[r.dept] || 0) + 1; return acc }, {})
  const topDept    = Object.entries(deptCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || '—'

  const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <>
      <Topbar />
      <main style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 56px)' }}>
        {/* Page header */}
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--divider)', padding: '28px 28px 24px' }}>
          <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 3 }}>Dashboard</h1>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>{account?.full_name || user?.email} {account?.company ? `· ${account.company}` : ''}</p>
            </div>
            <Link href="/credits" className="btn-gold" style={{ fontSize: 13, padding: '8px 16px' }}>+ Buy credits</Link>
          </div>
        </div>

        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '28px 28px 48px' }}>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
            {[
              { label: 'Credits remaining', val: account?.credits ?? '…', sub: 'Never expire', color: '#C9A84C' },
              { label: 'Agent runs', val: usageLog.length, sub: 'Total all time', color: '#0D1B3E' },
              { label: 'Credits used', val: totalUsed, sub: 'Across all agents', color: '#374151' },
              { label: 'Total spent', val: totalSpent > 0 ? `₹${totalSpent}` : '₹0', sub: 'All payments', color: '#065F46' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <p className="stat-lbl">{s.label}</p>
                <p className="stat-val" style={{ color: s.color }}>{s.val}</p>
                <p style={{ fontSize: 12, color: 'var(--text-hint)', marginTop: 4 }}>{s.sub}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
            {/* Recent runs */}
            <div className="card-flat">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--divider)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p className="section-title">Recent agent runs</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>Last 20 runs across all agents</p>
                </div>
                {usageLog.length > 0 && <span style={{ fontSize: 12, color: 'var(--text-hint)', background: 'var(--surface2)', padding: '3px 9px', borderRadius: 20 }}>{usageLog.length} total</span>}
              </div>
              {usageLog.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: 15, marginBottom: 6 }}>No agent runs yet</p>
                  <Link href="/agents" className="btn-primary" style={{ fontSize: 13, display: 'inline-flex' }}>Run your first agent →</Link>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#FAFAFA' }}>
                      {['Agent', 'Department', 'Credits', 'Date'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '9px 20px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--divider)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {usageLog.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F9FAFB' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={{ padding: '10px 20px', fontWeight: 500 }}>{r.agent_name}</td>
                        <td style={{ padding: '10px 20px' }}>
                          <span style={{ fontSize: 11.5, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: DEPT_BG[r.dept] || '#F9FAFB', color: DEPT_COLORS[r.dept] || 'var(--text-muted)' }}>
                            {r.dept}
                          </span>
                        </td>
                        <td style={{ padding: '10px 20px', color: '#92400E', fontWeight: 500, fontSize: 13 }}>−{r.credits_used}</td>
                        <td style={{ padding: '10px 20px', color: 'var(--text-muted)', fontSize: 12 }}>{fmt(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Credit balance */}
              <div className="card-flat" style={{ padding: '20px' }}>
                <p className="section-title" style={{ marginBottom: 14 }}>Credit balance</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 40, fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.03em' }}>{account?.credits ?? '…'}</span>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>credits</span>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>Never expire · roll over indefinitely</p>
                <Link href="/credits" className="btn-primary" style={{ fontSize: 13, display: 'inline-flex', width: '100%', justifyContent: 'center' }}>+ Buy more credits</Link>
              </div>

              {/* Dept breakdown */}
              {Object.keys(deptCounts).length > 0 && (
                <div className="card-flat" style={{ padding: '20px' }}>
                  <p className="section-title" style={{ marginBottom: 14 }}>Usage by department</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Object.entries(deptCounts).sort((a,b) => b[1]-a[1]).map(([dept, count]) => (
                      <div key={dept} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 13, width: 80, color: 'var(--text-mid)', fontWeight: 500 }}>{dept}</span>
                        <div style={{ flex: 1, height: 6, background: 'var(--divider)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(count / usageLog.length) * 100}%`, background: DEPT_COLORS[dept] || 'var(--navy)', borderRadius: 3, transition: 'width 0.4s ease' }} />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 18, textAlign: 'right' }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payments */}
              <div className="card-flat" style={{ padding: '20px' }}>
                <p className="section-title" style={{ marginBottom: 14 }}>Payment history</p>
                {payments.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No payments yet</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {payments.map((p, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < payments.length-1 ? '1px solid #F9FAFB' : 'none' }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>+{p.credits_added} credits</p>
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#065F46' }}>₹{p.amount_inr}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
