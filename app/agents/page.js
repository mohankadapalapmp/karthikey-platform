'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { AGENTS, DEPTS } from '../../lib/agents'
import Topbar from '../../components/Topbar'
import Link from 'next/link'

const DEPT_META = {
  Sales:     { color: '#0D1B3E', bg: '#EEF3FB', icon: '📈' },
  Service:   { color: '#065F46', bg: '#ECFDF5', icon: '🎧' },
  Marketing: { color: '#4C1D95', bg: '#F5F3FF', icon: '📣' },
  Ops:       { color: '#7F1D1D', bg: '#FEF2F2', icon: '⚙️' },
  Finance:   { color: '#78350F', bg: '#FFFBEB', icon: '💰' },
  HR:        { color: '#0C4A6E', bg: '#F0F9FF', icon: '👥' },
}

const BADGE_META = {
  Built: { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  Quick: { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  Adv:   { bg: '#F5F3FF', color: '#4C1D95', border: '#DDD6FE' },
}

export default function AgentsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [dept, setDept] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data?.session?.user || null))
  }, [])

  const unique = AGENTS.filter((a, i, arr) => arr.findIndex(x => x.id === a.id) === i)
  const filtered = unique
    .filter(a => dept === 'All' || a.dept === dept)
    .filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.desc.toLowerCase().includes(search.toLowerCase()))

  const counts = DEPTS.reduce((acc, d) => {
    acc[d] = d === 'All' ? unique.length : unique.filter(a => a.dept === d).length
    return acc
  }, {})

  function launch(agent) {
    if (!user) { router.push('/login'); return }
    router.push(`/agents/${agent.id}`)
  }

  return (
    <>
      <Topbar />
      <main style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 56px)' }}>
        {/* Page header */}
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--divider)', padding: '28px 28px 0' }}>
          <div style={{ maxWidth: 1120, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>AI agent marketplace</h1>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>52 agents across 6 departments — works with any industry, any CRM, any Excel file</p>
              </div>
              {/* Search */}
              <div style={{ position: 'relative', width: 260 }}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-hint)' }}>
                  <path d="M10 6.5C10 8.43 8.43 10 6.5 10C4.57 10 3 8.43 3 6.5C3 4.57 4.57 3 6.5 3C8.43 3 10 4.57 10 6.5ZM9.5 10.2C8.77 10.71 7.87 11 6.9 11C4.46 11 2.5 9.04 2.5 6.5C2.5 3.96 4.46 2 6.9 2C9.34 2 11.3 3.96 11.3 6.5C11.3 7.47 11 8.37 10.5 9.1L12.9 11.4L12.2 12.1L9.8 9.8Z" fill="#9CA3AF" fillRule="evenodd"/>
                </svg>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agents..."
                  className="input" style={{ paddingLeft: 32, fontSize: 13.5 }} />
              </div>
            </div>

            {/* Dept tabs */}
            <div style={{ display: 'flex', gap: 2 }}>
              {DEPTS.map(d => (
                <button key={d} onClick={() => setDept(d)} style={{
                  padding: '8px 14px',
                  fontSize: 13.5,
                  fontWeight: dept === d ? 600 : 400,
                  color: dept === d ? 'var(--navy)' : 'var(--text-muted)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: dept === d ? '2px solid var(--navy)' : '2px solid transparent',
                  borderRadius: 0,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  marginBottom: -1,
                }}>
                  {d} <span style={{ fontSize: 11, color: dept === d ? 'var(--navy)' : 'var(--text-hint)', marginLeft: 4, fontWeight: 400 }}>{counts[d]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data privacy notice */}
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '16px 28px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '9px 14px', fontSize: 13, color: '#92400E' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1C3.69 1 1 3.69 1 7C1 10.31 3.69 13 7 13C10.31 13 13 10.31 13 7C13 3.69 10.31 1 7 1ZM7 10C6.45 10 6 9.55 6 9V7C6 6.45 6.45 6 7 6C7.55 6 8 6.45 8 7V9C8 9.55 7.55 10 7 10ZM7 5C6.45 5 6 4.55 6 4C6 3.45 6.45 3 7 3C7.55 3 8 3.45 8 4C8 4.55 7.55 5 7 5Z" fill="#92400E"/></svg>
            <span>Your data never leaves your browser — we only handle credits, not your CRM data. Works for any industry.</span>
          </div>
        </div>

        {/* Agent grid */}
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '20px 28px 48px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: 15, marginBottom: 8 }}>No agents found for "{search}"</p>
              <button onClick={() => setSearch('')} className="btn-outline" style={{ fontSize: 13 }}>Clear search</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14 }}>
              {filtered.map(agent => {
                const dm = DEPT_META[agent.dept] || DEPT_META.Sales
                const bm = BADGE_META[agent.badge] || BADGE_META.Quick
                return (
                  <div key={agent.id} className="card-flat" style={{ padding: '16px 18px', cursor: 'pointer', transition: 'all 0.18s ease', position: 'relative' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.borderColor = '#D1D5DB' }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'var(--divider)' }}>

                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: dm.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                        {agent.icon}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-hint)', fontWeight: 500 }}>{agent.credits} cr</span>
                    </div>

                    <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 5, letterSpacing: '-0.01em', lineHeight: 1.3 }}>{agent.name}</p>
                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>{agent.desc}</p>

                    {/* Bottom row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: bm.bg, color: bm.color, border: `1px solid ${bm.border}` }}>{agent.badge}</span>
                      <button onClick={() => launch(agent)} style={{
                        background: 'var(--navy)', color: 'var(--gold)',
                        border: 'none', padding: '5px 12px',
                        borderRadius: 6, fontSize: 12, fontWeight: 500,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                        Run →
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
