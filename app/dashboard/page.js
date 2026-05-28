'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Topbar from '../../components/Topbar'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [account, setAccount] = useState(null)
  const [usageLog, setUsageLog] = useState([])
  const [payments, setPayments] = useState([])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data?.user) { router.push('/login'); return }
      setUser(data.user)
      const [{ data: acc }, { data: usage }, { data: pays }] = await Promise.all([
        supabase.from('accounts').select('*').eq('id', data.user.id).single(),
        supabase.from('usage_log').select('*').eq('user_id', data.user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('payments').select('*').eq('user_id', data.user.id).order('created_at', { ascending: false }).limit(10),
      ])
      if (acc) setAccount(acc)
      if (usage) setUsageLog(usage)
      if (pays) setPayments(pays)
    })
  }, [])

  const totalCreditsUsed = usageLog.reduce((s, r) => s + (r.credits_used || 0), 0)
  const totalSpent = payments.reduce((s, p) => s + (p.amount_inr || 0), 0)

  const deptCounts = usageLog.reduce((acc, r) => { acc[r.dept] = (acc[r.dept] || 0) + 1; return acc }, {})

  return (
    <>
      <Topbar />
      <main className="page-container" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Dashboard</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{account?.full_name || user?.email}</p>
          </div>
          <Link href="/credits" className="btn-gold" style={{ padding: '8px 18px', fontSize: 13, borderRadius: 6 }}>+ Buy credits</Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Credits remaining', val: account?.credits ?? '…' },
            { label: 'Agent runs total', val: usageLog.length },
            { label: 'Credits used', val: totalCreditsUsed },
            { label: 'Total spent', val: totalSpent > 0 ? `₹${totalSpent}` : '₹0' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--white)', border: '0.5px solid #E5E7EB', borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 600, color: 'var(--navy)' }}>{s.val}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          <div>
            <div className="section-label">Recent agent runs</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {usageLog.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                  No agent runs yet. <Link href="/agents" style={{ color: 'var(--navy)', fontWeight: 500 }}>Run your first agent →</Link>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>{['Agent','Dept','Credits','When'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 14px', background: '#F9FAFB', fontSize: 11, color: 'var(--text-muted)', borderBottom: '0.5px solid #E5E7EB' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {usageLog.map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: '8px 14px', borderBottom: '0.5px solid #F3F4F6', fontWeight: 500 }}>{r.agent_name}</td>
                        <td style={{ padding: '8px 14px', borderBottom: '0.5px solid #F3F4F6', color: 'var(--text-muted)' }}>{r.dept}</td>
                        <td style={{ padding: '8px 14px', borderBottom: '0.5px solid #F3F4F6' }}>
                          <span style={{ color: 'var(--warning)', fontWeight: 500 }}>−{r.credits_used}</span>
                        </td>
                        <td style={{ padding: '8px 14px', borderBottom: '0.5px solid #F3F4F6', color: 'var(--text-muted)', fontSize: 12 }}>
                          {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div>
            <div className="section-label">Usage by department</div>
            <div className="card">
              {Object.keys(deptCounts).length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data yet</div>
              ) : (
                Object.entries(deptCounts).sort((a, b) => b[1] - a[1]).map(([dept, count]) => (
                  <div key={dept} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13 }}>{dept}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ height: 6, width: Math.round((count / usageLog.length) * 120), background: 'var(--navy)', borderRadius: 3 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 16 }}>{count}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="section-label" style={{ marginTop: 20 }}>Payment history</div>
            <div className="card" style={{ padding: '12px 14px' }}>
              {payments.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No payments yet</div>
              ) : payments.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < payments.length - 1 ? '0.5px solid #F3F4F6' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>+{p.credits_added} credits</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(p.created_at).toLocaleDateString('en-IN')}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--success)' }}>₹{p.amount_inr}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
