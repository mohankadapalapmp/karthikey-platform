'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { AGENTS, DEPTS } from '../../lib/agents'
import Topbar from '../../components/Topbar'
import Link from 'next/link'

const DEPT_COLORS = {
  Sales: '#1A6BB5', Service: '#107C41', Marketing: '#8B5CF6',
  Ops: '#DC2626', Finance: '#B45309', HR: '#0891B2'
}

export default function AgentsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [dept, setDept] = useState('All')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user))
  }, [])

  const filtered = dept === 'All' ? AGENTS : AGENTS.filter(a => a.dept === dept)
  const unique = filtered.filter((a, i, arr) => arr.findIndex(x => x.id === a.id) === i)

  function launch(agent) {
    if (!user) { router.push('/login'); return }
    router.push(`/agents/${agent.id}`)
  }

  return (
    <>
      <Topbar />
      <main className="page-container" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 600, marginBottom: 6 }}>AI agent marketplace</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>52 agents across sales, service, marketing, ops, finance, and HR. Upload any Excel or connect your CRM.</p>
        </div>

        <div style={{ background: '#FFFBEB', border: '0.5px solid #FDE68A', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#92400E', marginBottom: 20 }}>
          🔒 Your data never leaves your browser — we only handle credits, not your data.
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {DEPTS.map(d => (
            <button key={d} onClick={() => setDept(d)} style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
              background: dept === d ? 'var(--navy)' : 'transparent',
              color: dept === d ? 'var(--gold)' : 'var(--text-muted)',
              border: dept === d ? 'none' : '0.5px solid #D1D5DB',
              fontWeight: dept === d ? 500 : 400
            }}>{d}</button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {unique.map(agent => (
            <div key={agent.id} className="card" style={{ padding: '14px 16px', cursor: 'pointer', transition: 'border-color 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#E5E7EB'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 7, background: `${DEPT_COLORS[agent.dept]}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{agent.icon}</div>
                <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{agent.name}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>{agent.desc}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className={`badge badge-${agent.badge.toLowerCase()}`}>{agent.badge}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{agent.credits} credit{agent.credits > 1 ? 's' : ''}</span>
              </div>
              <button onClick={() => launch(agent)} className="btn-primary" style={{ width: '100%', marginTop: 10, padding: '7px', fontSize: 12, borderRadius: 6 }}>
                Run agent →
              </button>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
