'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { AGENTS, DEPTS } from '../../lib/agents'
import Link from 'next/link'

const DEPT_META = {
  All:       { icon: '▦',  label: 'All Agents',  count_key: 'all' },
  Sales:     { icon: '◎',  label: 'Sales' },
  Service:   { icon: '◈',  label: 'Service' },
  Marketing: { icon: '◉',  label: 'Marketing' },
  Ops:       { icon: '◧',  label: 'Operations' },
  Finance:   { icon: '◐',  label: 'Finance' },
  HR:        { icon: '◑',  label: 'HR' },
}

const S = {
  wrap: { display:'flex', height:'100vh', fontFamily:'"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background:'#F4F6F9' },

  // Sidebar
  sidebar: { width:220, minWidth:220, background:'#0D1B3E', display:'flex', flexDirection:'column', height:'100vh', position:'sticky', top:0 },
  sidebarTop: { padding:'20px 16px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)' },
  logoWrap: { display:'flex', alignItems:'center', gap:8 },
  logoBox: { background:'#1565C0', borderRadius:6, padding:'4px 8px', fontSize:13, fontWeight:800, color:'#fff', letterSpacing:'0.02em' },
  logoText: { fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.4)', letterSpacing:'0.12em', marginTop:2 },
  sidebarSection: { padding:'16px 10px 4px', fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.25)', letterSpacing:'0.12em', textTransform:'uppercase' },
  deptItem: { display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:6, cursor:'pointer', margin:'1px 8px', transition:'all 0.12s', color:'rgba(255,255,255,0.55)', fontSize:13 },
  deptItemActive: { background:'#1565C0', color:'#fff', fontWeight:500 },
  deptCount: { marginLeft:'auto', fontSize:10, fontWeight:700, background:'rgba(255,255,255,0.1)', borderRadius:10, padding:'1px 7px', color:'rgba(255,255,255,0.4)' },
  deptCountActive: { background:'rgba(21,101,192,0.5)', color:'#90CAF9' },
  sidebarBottom: { marginTop:'auto', padding:'14px 16px', borderTop:'1px solid rgba(255,255,255,0.08)' },
  privacyBadge: { display:'flex', alignItems:'center', gap:7, fontSize:11, color:'rgba(255,255,255,0.35)' },

  // Topbar
  topbar: { height:52, background:'#fff', borderBottom:'1px solid #E2E8F0', display:'flex', alignItems:'center', padding:'0 24px', gap:0, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' },
  breadcrumb: { fontSize:13, color:'#94A3B8', display:'flex', alignItems:'center', gap:8 },
  breadcrumbActive: { color:'#1E293B', fontWeight:600 },
  topbarRight: { marginLeft:'auto', display:'flex', alignItems:'center', gap:10 },
  searchBar: { display:'flex', alignItems:'center', gap:8, background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:8, padding:'7px 14px', width:260 },
  addBtn: { display:'flex', alignItems:'center', gap:6, background:'#1565C0', color:'#fff', border:'none', borderRadius:7, padding:'7px 16px', fontSize:13, fontWeight:600, cursor:'pointer' },
  creditPill: { display:'flex', alignItems:'center', gap:6, background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:20, padding:'5px 12px', fontSize:12, fontWeight:600, color:'#1D4ED8' },
  avatar: { width:32, height:32, borderRadius:'50%', background:'#1565C0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer', textDecoration:'none' },

  // Content
  content: { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
  contentBody: { flex:1, overflowY:'auto', padding:'24px 28px' },
  pageHeader: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 },
  pageTitle: { fontSize:22, fontWeight:700, color:'#0F172A', letterSpacing:'-0.02em', margin:0 },
  pageSubtitle: { fontSize:13, color:'#64748B', marginTop:4 },

  // Filter tabs
  filterBar: { display:'flex', alignItems:'center', gap:8, marginBottom:20 },
  filterTab: { padding:'5px 14px', borderRadius:20, border:'1px solid #E2E8F0', background:'#fff', fontSize:12, fontWeight:500, color:'#64748B', cursor:'pointer', transition:'all 0.12s' },
  filterTabActive: { background:'#EFF6FF', borderColor:'#BFDBFE', color:'#1D4ED8', fontWeight:600 },

  // Privacy notice
  notice: { display:'flex', alignItems:'center', gap:10, background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:8, padding:'10px 16px', fontSize:12, color:'#1D4ED8', marginBottom:20 },

  // Grid
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(210px, 1fr))', gap:12 },

  // Card
  card: { background:'#fff', border:'1px solid #E2E8F0', borderRadius:10, padding:'16px', cursor:'pointer', transition:'all 0.15s', position:'relative', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' },
  cardIcon: { width:34, height:34, borderRadius:8, background:'#F0F7FF', border:'1px solid #E0EDFF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, marginBottom:10 },
  cardName: { fontSize:13, fontWeight:700, color:'#0F172A', marginBottom:3, lineHeight:1.3 },
  cardDesc: { fontSize:11, color:'#94A3B8', lineHeight:1.55, marginBottom:12, minHeight:30 },
  cardFooter: { display:'flex', alignItems:'center', justifyContent:'space-between' },
  tagQuick: { fontSize:10, padding:'2px 8px', borderRadius:4, background:'#F0FDF4', color:'#15803D', border:'1px solid #BBF7D0', fontWeight:600 },
  tagAdv: { fontSize:10, padding:'2px 8px', borderRadius:4, background:'#FFF7ED', color:'#C2410C', border:'1px solid #FED7AA', fontWeight:600 },
  tagBuilt: { fontSize:10, padding:'2px 8px', borderRadius:4, background:'#EFF6FF', color:'#1D4ED8', border:'1px solid #BFDBFE', fontWeight:600 },

  creditBadge: { position:'absolute', top:12, right:12, fontSize:10, color:'#94A3B8', fontWeight:600 },
}

export default function AgentsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [dept, setDept] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data?.session?.user
      setUser(u)
      if (u) supabase.from('accounts').select('full_name,credits').eq('id', u.id).single().then(({ data: acc }) => setProfile(acc))
    })
  }, [])

  const unique = AGENTS.filter((a, i, arr) => arr.findIndex(x => x.id === a.id) === i)
  const filtered = unique
    .filter(a => dept === 'All' || a.dept === dept)
    .filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.desc||'').toLowerCase().includes(search.toLowerCase()))

  const counts = Object.keys(DEPT_META).reduce((acc, d) => {
    acc[d] = d === 'All' ? unique.length : unique.filter(a => a.dept === d).length
    return acc
  }, {})

  const initials = profile?.full_name ? profile.full_name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) : user?.email?.[0]?.toUpperCase() || 'K'

  function launch(agent) {
    if (!user) { router.push('/login'); return }
    router.push(`/agents/${agent.id}`)
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div style={S.wrap}>

      {/* Sidebar */}
      <aside style={S.sidebar}>
        <div style={S.sidebarTop}>
          <div style={S.logoWrap}>
            <div style={S.logoBox}>KARTHI<span style={{color:'#90CAF9'}}>KEY</span></div>
          </div>
          <div style={{...S.logoText, marginTop:6}}>AI AGENT PLATFORM</div>
        </div>

        <div style={S.sidebarSection}>Agents</div>

        {Object.keys(DEPT_META).map(d => {
          const isActive = dept === d
          return (
            <div
              key={d}
              onClick={() => setDept(d)}
              style={{
                ...S.deptItem,
                ...(isActive ? S.deptItemActive : {}),
                marginLeft: isActive ? 5 : 8,
              }}
            >
              <span style={{opacity:0.7,display:'flex',alignItems:'center',flexShrink:0}}>
                {d==='All'&&<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>}
                {d==='Sales'&&<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>}
                {d==='Service'&&<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>}
                {d==='Marketing'&&<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>}
                {d==='Ops'&&<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>}
                {d==='Finance'&&<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
                {d==='HR'&&<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>}
              </span>
              <span style={{flex:1}}>{DEPT_META[d].label || d}</span>
              <span style={{...S.deptCount, ...(isActive ? S.deptCountActive : {})}}>{counts[d]}</span>
            </div>
          )
        })}

        <div style={S.sidebarSection}>Settings</div>
        <Link href="/profile" style={{...S.deptItem, textDecoration:'none'}} >
          <span style={{fontSize:11, opacity:0.6}}>◎</span>
          <span style={{flex:1}}>Profile & Theme</span>
        </Link>
        <Link href="/credits" style={{...S.deptItem, textDecoration:'none'}}>
          <span style={{fontSize:11, opacity:0.6}}>◈</span>
          <span style={{flex:1}}>Credits & Billing</span>
        </Link>
        {user && (
          <button onClick={signOut} style={{...S.deptItem, background:'none', border:'none', cursor:'pointer', width:'100%', textAlign:'left'}}>
            <span style={{fontSize:11, opacity:0.6}}>↪</span>
            <span style={{flex:1}}>Sign out</span>
          </button>
        )}

        <div style={S.sidebarBottom}>
          <div style={S.privacyBadge}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Browser-only data processing
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={S.content}>

        {/* Topbar */}
        <header style={S.topbar}>
          <div style={S.breadcrumb}>
            <span>Karthikey AI</span>
            <span style={{color:'#CBD5E1'}}>›</span>
            <span style={S.breadcrumbActive}>Agent Marketplace</span>
          </div>
          <div style={S.topbarRight}>
            <div style={S.searchBar}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search agents..."
                style={{border:'none', outline:'none', background:'transparent', fontSize:13, color:'#1E293B', width:'100%', fontFamily:'inherit'}}
              />
            </div>
            {user ? (
              <>
                <div style={S.creditPill}>
                  ★ {profile?.credits ?? '…'} credits
                </div>
                <Link href="/credits" style={{...S.addBtn, textDecoration:'none'}}>+ Buy credits</Link>
                <Link href="/profile" style={{...S.avatar, textDecoration:'none'}}>{initials}</Link>
              </>
            ) : (
              <>
                <Link href="/login" style={{...S.addBtn, background:'#F8FAFC', color:'#1E293B', border:'1px solid #E2E8F0', textDecoration:'none'}}>Login</Link>
                <Link href="/login?signup=1" style={{...S.addBtn, textDecoration:'none'}}>Get started free</Link>
              </>
            )}
          </div>
        </header>

        {/* Body */}
        <div style={S.contentBody}>

          {/* Page header */}
          <div style={S.pageHeader}>
            <div>
              <h1 style={S.pageTitle}>
                {dept === 'All' ? 'AI Agent Marketplace' : `${DEPT_META[dept]?.label || dept} Agents`}
              </h1>
              <p style={S.pageSubtitle}>
                {dept === 'All'
                  ? '52 agents across 6 departments — works with any industry, any CRM, any Excel file'
                  : `${filtered.length} agents · upload your CRM or Excel file to get started`}
              </p>
            </div>
          </div>

          {/* Filter tabs */}
          <div style={S.filterBar}>
            {Object.keys(DEPT_META).map(d => (
              <button
                key={d}
                onClick={() => setDept(d)}
                style={{...S.filterTab, ...(dept===d ? S.filterTabActive : {})}}
              >
                {DEPT_META[d].label || d} {counts[d] > 0 && <span style={{opacity:0.6}}>({counts[d]})</span>}
              </button>
            ))}
          </div>

          {/* Privacy notice */}
          <div style={S.notice}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Your data never leaves your browser — we only handle credits, not your CRM data. Works for any industry.
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div style={{textAlign:'center', padding:'60px 20px', color:'#94A3B8'}}>No agents found for "{search}"</div>
          ) : (
            <div style={S.grid}>
              {filtered.map((agent, i) => (
                <div
                  key={agent.id + i}
                  onClick={() => launch(agent)}
                  style={S.card}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='#93C5FD'; e.currentTarget.style.boxShadow='0 4px 16px rgba(21,101,192,0.1)'; e.currentTarget.style.transform='translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform='translateY(0)' }}
                >
                  <div style={S.creditBadge}>{agent.credits} cr</div>
                  <div style={S.cardIcon}>{agent.icon}</div>
                  <div style={S.cardName}>{agent.name}</div>
                  <div style={S.cardDesc}>{agent.desc}</div>
                  <div style={S.cardFooter}>
                    <span style={agent.tier === 'Built' ? S.tagBuilt : agent.credits > 1 ? S.tagAdv : S.tagQuick}>
                      {agent.tier === 'Built' ? 'Built-in' : agent.credits > 1 ? 'Advanced' : 'Quick'}
                    </span>
                    <div style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'#94A3B8'}}>
                      Open <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
