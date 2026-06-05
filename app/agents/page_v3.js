'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { AGENTS, DEPTS } from '../../lib/agents'
import Topbar from '../../components/Topbar'

const DEPT_META = {
  All:       { icon: '✦', label: 'All Agents' },
  Sales:     { icon: '🎯', label: 'Sales' },
  Service:   { icon: '🤝', label: 'Service' },
  Marketing: { icon: '📣', label: 'Marketing' },
  Ops:       { icon: '⚙️', label: 'Operations' },
  Finance:   { icon: '💰', label: 'Finance' },
  HR:        { icon: '👥', label: 'HR' },
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

  const counts = ['All', ...Object.keys(DEPT_META).filter(d => d !== 'All')].reduce((acc, d) => {
    acc[d] = d === 'All' ? unique.length : unique.filter(a => a.dept === d).length
    return acc
  }, {})

  const deptList = Object.keys(DEPT_META)

  function launch(agent) {
    if (!user) { router.push('/login'); return }
    router.push(`/agents/${agent.id}`)
  }

  const currentDept = DEPT_META[dept]

  return (
    <>
      <Topbar />
      <div style={{ display: 'flex', height: 'calc(100vh - 52px)', background: 'var(--bg)', overflow: 'hidden' }}>

        {/* Sidebar */}
        <aside style={{
          width: 210,
          minWidth: 210,
          borderRight: '1px solid var(--border)',
          background: 'var(--bg2)',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 10px',
          gap: 2,
          overflowY: 'auto',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text4)', textTransform: 'uppercase', padding: '4px 8px 8px' }}>
            Departments
          </div>

          {deptList.map(d => {
            const isActive = dept === d
            return (
              <div
                key={d}
                onClick={() => setDept(d)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: isActive ? 'var(--surface2)' : 'transparent',
                  border: isActive ? '1px solid var(--border2)' : '1px solid transparent',
                  position: 'relative',
                  transition: 'all 0.15s',
                }}
              >
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    left: 0, top: '20%', height: '60%',
                    width: 3, borderRadius: '0 2px 2px 0',
                    background: 'var(--accent)',
                  }} />
                )}
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: isActive ? 'var(--surface3)' : 'var(--bg3)',
                  border: `1px solid ${isActive ? 'var(--border2)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14,
                }}>
                  {DEPT_META[d]?.icon}
                </div>
                <div style={{ flex: 1, fontSize: 12.5, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--text)' : 'var(--text2)' }}>
                  {DEPT_META[d]?.label || d}
                </div>
                <div style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 10,
                  background: isActive ? 'var(--surface3)' : 'var(--bg)',
                  border: `1px solid ${isActive ? 'var(--border2)' : 'var(--border)'}`,
                  color: isActive ? 'var(--accent)' : 'var(--text4)',
                  fontWeight: 600,
                }}>
                  {counts[d] || 0}
                </div>
              </div>
            )
          })}

          <div style={{ flex: 1 }} />

          {/* Privacy badge */}
          <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border)', marginTop: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text4)', marginBottom: 5, textTransform: 'uppercase' }}>Data privacy</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.4 }}>Browser-only processing</span>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display, Syne, sans-serif)', margin: 0 }}>
                {currentDept?.label || dept} Agents
              </h1>
              <p style={{ fontSize: 12, color: 'var(--text3)', margin: '3px 0 0' }}>
                {filtered.length} agents · upload your CRM or Excel file to get started
              </p>
            </div>

            {/* Search */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: 8, padding: '7px 13px',
              width: 220,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text4)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search agents..."
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--text)', width: '100%', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          {/* Privacy notice */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--accent-bg)', border: '1px solid var(--border2)',
            borderRadius: 8, padding: '9px 14px', fontSize: 12, color: 'var(--accent2)',
            marginBottom: 20,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Your data never leaves your browser — we only handle credits, not your CRM data. Works for any industry.
          </div>

          {/* Agent grid */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
              No agents found for "{search}"
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 12,
            }}>
              {filtered.map((agent, i) => (
                <div
                  key={agent.id + i}
                  onClick={() => launch(agent)}
                  style={{
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.18s',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--card-hover-border)'
                    e.currentTarget.style.boxShadow = 'var(--card-hover-shadow, 0 4px 20px rgba(201,168,76,0.1))'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  {/* Credit badge */}
                  <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 10, color: 'var(--text4)', fontWeight: 600 }}>
                    {agent.credits} cr
                  </div>

                  {/* Icon */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, marginBottom: 11,
                  }}>
                    {agent.icon}
                  </div>

                  {/* Name */}
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4, paddingRight: 24, lineHeight: 1.3, fontFamily: 'var(--font-display, Syne, sans-serif)' }}>
                    {agent.name}
                  </div>

                  {/* Desc */}
                  <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.55, marginBottom: 12, minHeight: 32 }}>
                    {agent.desc}
                  </div>

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                      background: agent.tier === 'Built'
                        ? 'var(--tag-accent-bg)'
                        : agent.credits > 1
                        ? 'var(--bg2)'
                        : '#F0FDF4',
                      color: agent.tier === 'Built'
                        ? 'var(--tag-accent-text)'
                        : agent.credits > 1
                        ? 'var(--text3)'
                        : '#166534',
                      border: `1px solid ${agent.tier === 'Built' ? 'var(--tag-accent-border)' : agent.credits > 1 ? 'var(--border)' : '#BBF7D0'}`,
                    }}>
                      {agent.tier === 'Built' ? 'Built-in' : agent.credits > 1 ? 'Advanced' : 'Quick'}
                    </span>

                    <button
                      onClick={e => { e.stopPropagation(); launch(agent) }}
                      style={{
                        padding: '4px 12px',
                        background: 'var(--run-btn-bg, var(--accent))',
                        border: 'none',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--btn-primary-text, #fff)',
                        cursor: 'pointer',
                        letterSpacing: '0.01em',
                      }}
                    >
                      Run →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  )
}
