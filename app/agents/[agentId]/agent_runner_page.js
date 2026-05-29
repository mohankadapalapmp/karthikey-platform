'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { AGENTS } from '../../../lib/agents'
import Topbar from '../../../components/Topbar'
import Link from 'next/link'
import * as XLSX from 'xlsx'

const SCORE_COLORS = {
  hot:  { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' },
  warm: { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' },
  cold: { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' },
}

function ScoreBadge({ score }) {
  const key = (score || '').toLowerCase()
  const c = SCORE_COLORS[key] || SCORE_COLORS.cold
  return (
    <span style={{ background: c.bg, color: c.color, border: `0.5px solid ${c.border}`, padding: '2px 9px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
      {score}
    </span>
  )
}

function ResultsTable({ results }) {
  if (!results?.length) return null
  return (
    <div style={{ overflowX: 'auto', maxHeight: 280, overflowY: 'auto', borderRadius: 8, border: '0.5px solid #E5E7EB' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#F9FAFB', position: 'sticky', top: 0 }}>
            {['Name', 'Score', 'Reason', 'Next Action'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '7px 10px', fontSize: 11, color: '#6B7280', fontWeight: 600, borderBottom: '0.5px solid #E5E7EB', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
              <td style={{ padding: '7px 10px', borderBottom: '0.5px solid #F3F4F6', fontWeight: 500, whiteSpace: 'nowrap' }}>{r.name}</td>
              <td style={{ padding: '7px 10px', borderBottom: '0.5px solid #F3F4F6', whiteSpace: 'nowrap' }}><ScoreBadge score={r.score} /></td>
              <td style={{ padding: '7px 10px', borderBottom: '0.5px solid #F3F4F6', color: '#374151', lineHeight: 1.4 }}>{r.reason}</td>
              <td style={{ padding: '7px 10px', borderBottom: '0.5px solid #F3F4F6', color: '#374151', lineHeight: 1.4 }}>{r.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AgentMessage({ text }) {
  // Clean up any raw JSON blocks from display
  const cleaned = text
    .replace(/```json[\s\S]*?```/g, '')
    .replace(/\{"scores":\s*\[[\s\S]*?\]\s*\}/g, '')
    .trim()
  if (!cleaned) return null
  return (
    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
      {cleaned.split('\n').map((line, i) => (
        <p key={i} style={{ marginBottom: line ? 4 : 2 }}>{line}</p>
      ))}
    </div>
  )
}

export default function AgentRunnerPage() {
  const router = useRouter()
  const { agentId } = useParams()
  const agent = AGENTS.find(a => a.id === agentId)
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [credits, setCredits] = useState(0)
  const [data, setData] = useState(null)
  const [columns, setColumns] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [step, setStep] = useState('upload')
  const [dragOver, setDragOver] = useState(false)
  const chatRef = useRef(null)
  const fileRef = useRef(null)
  const historyRef = useRef([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: d }) => {
      if (!d?.session) { router.push('/login'); return }
      setUser(d.session.user)
      setSession(d.session)
      fetchCredits(d.session.user.id)
    })
  }, [])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  if (!agent) return <div style={{ padding: 40, textAlign: 'center' }}>Agent not found. <Link href="/agents">Back to marketplace</Link></div>

  async function fetchCredits(uid) {
    const { data: acc } = await supabase.from('accounts').select('credits').eq('id', uid).single()
    if (acc) setCredits(acc.credits)
  }

  function parseFile(file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
      if (rows.length) {
        setColumns(Object.keys(rows[0]))
        setData(rows)
        setStep('ready')
        addMsg('agent', `✅ Loaded ${rows.length} rows with ${Object.keys(rows[0]).length} columns. Ready to analyse — try a quick action above or ask me anything.`)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  function handleFileInput(e) {
    const file = e.target.files[0]
    if (file) parseFile(file)
  }

  function loadSample() {
    const sample = [
      { Name: 'Priya Sharma', Company: 'TechCorp', Phone: '9876543210', Budget: '₹50L', Source: 'Meta Ads', City: 'Bengaluru', Stage: 'New' },
      { Name: 'Rahul Mehta', Company: 'StartupXYZ', Phone: '9845012345', Budget: '₹12L', Source: 'Google', City: 'Mumbai', Stage: 'Contacted' },
      { Name: 'Ananya Iyer', Company: 'Infosys', Phone: '9900112233', Budget: '₹1.5Cr', Source: 'Referral', City: 'Chennai', Stage: 'New' },
      { Name: 'Vikram Nair', Company: 'Wipro', Phone: '9871234567', Budget: '₹80L', Source: 'LinkedIn', City: 'Hyderabad', Stage: 'Proposal' },
      { Name: 'Sneha Gupta', Company: 'HDFC Bank', Phone: '9823456789', Budget: '₹2.2Cr', Source: 'Website', City: 'Delhi', Stage: 'New' },
      { Name: 'Arjun Patel', Company: 'TCS', Phone: '9812345678', Budget: '₹45L', Source: 'Meta Ads', City: 'Pune', Stage: 'Contacted' },
      { Name: 'Kavitha Rao', Company: 'Zomato', Phone: '9867001122', Budget: '₹90L', Source: 'Referral', City: 'Bengaluru', Stage: 'New' },
    ]
    setColumns(Object.keys(sample[0])); setData(sample); setStep('ready')
    addMsg('agent', `✅ Loaded ${sample.length} sample leads. Try "Score all leads" to see the agent in action!`)
  }

  function addMsg(role, text, scores) {
    setMessages(prev => [...prev, {
      role, text, scores,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }])
  }

  async function sendChat(msgText) {
    const text = msgText || input.trim()
    if (!text || loading) return
    setInput('')
    if (credits < agent.credits) {
      addMsg('agent', '⚠️ Not enough credits. Please top up to continue.')
      return
    }
    addMsg('user', text)
    historyRef.current.push({ role: 'user', content: text })
    setLoading(true)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          agentId,
          question: text,
          data: data?.slice(0, 30),
          history: historyRef.current
        })
      })
      const json = await res.json()
      setLoading(false)

      if (json.error) {
        addMsg('agent', `⚠️ ${json.error}`)
        return
      }

      const reply = json.reply
      const scores = json.scores || null
      historyRef.current.push({ role: 'assistant', content: reply })

      // Scores come pre-parsed from the API
      if (scores?.length) setResults(scores)

      addMsg('agent', reply, scores)
      setCredits(c => c - agent.credits)
    } catch (e) {
      setLoading(false)
      addMsg('agent', '⚠️ Connection error. Please try again.')
    }
  }

  function exportExcel() {
    if (!results) return
    const ws = XLSX.utils.json_to_sheet(results)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'AI Scores')
    XLSX.writeFile(wb, `karthikey_${agentId}_scores.xlsx`)
  }

  function exportEnriched() {
    if (!results || !data) return
    const merged = data.map((row, i) => ({
      ...row,
      AI_Score: results[i]?.score || '',
      AI_Reason: results[i]?.reason || '',
      AI_Action: results[i]?.action || ''
    }))
    const ws = XLSX.utils.json_to_sheet(merged)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Enriched Data')
    XLSX.writeFile(wb, `karthikey_enriched_${agentId}.xlsx`)
  }

  return (
    <>
      <Topbar />
      <main className="page-container" style={{ paddingTop: 24, paddingBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Link href="/agents" style={{ fontSize: 13, color: 'var(--text-muted)' }}>← Marketplace</Link>
          <span style={{ color: '#D1D5DB' }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{agent.name}</span>
          <span className={`badge badge-${agent.badge.toLowerCase()}`} style={{ marginLeft: 4 }}>{agent.badge}</span>
          <div style={{ marginLeft: 'auto', background: '#FFFBEB', border: '0.5px solid #FDE68A', borderRadius: 20, padding: '3px 12px', fontSize: 12, color: '#92400E' }}>
            ⚡ {credits} credits remaining
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Left panel — data + results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                {step === 'upload' ? 'Step 1 — load your data' : `✅ ${data?.length} rows loaded`}
              </div>
              {step === 'upload' ? (
                <div onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)}
                  onClick={() => fileRef.current?.click()}
                  style={{ border: `1.5px dashed ${dragOver ? 'var(--gold)' : '#D1D5DB'}`, borderRadius: 12, padding: '32px 20px', textAlign: 'center', cursor: 'pointer', background: dragOver ? '#FFFBEB' : 'white', transition: 'all 0.12s' }}>
                  <input ref={fileRef} type="file" accept=".xlsx,.csv,.xls" onChange={handleFileInput} style={{ display: 'none' }} />
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📂</div>
                  <div style={{ fontWeight: 500, marginBottom: 5 }}>Drop your Excel or CSV file here</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>Parsed in your browser — never uploaded to our servers</div>
                  <button onClick={e => { e.stopPropagation(); loadSample() }} className="btn-outline" style={{ fontSize: 13 }}>
                    Or load sample data →
                  </button>
                </div>
              ) : (
                <div className="card" style={{ padding: 14 }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
                      <thead>
                        <tr>{columns.slice(0, 5).map(c => (
                          <th key={c} style={{ textAlign: 'left', padding: '5px 8px', background: '#F9FAFB', fontSize: 11, color: '#6B7280', borderBottom: '0.5px solid #E5E7EB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c}</th>
                        ))}</tr>
                      </thead>
                      <tbody>
                        {data.slice(0, 5).map((row, i) => (
                          <tr key={i}>{columns.slice(0, 5).map(c => (
                            <td key={c} style={{ padding: '5px 8px', borderBottom: '0.5px solid #F3F4F6', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(row[c] ?? '')}</td>
                          ))}</tr>
                        ))}
                      </tbody>
                    </table>
                    {data.length > 5 && <div style={{ textAlign: 'center', padding: '5px', fontSize: 12, color: 'var(--text-muted)' }}>+ {data.length - 5} more rows</div>}
                  </div>
                  <button onClick={() => { setData(null); setColumns([]); setStep('upload'); setMessages([]); setResults(null); historyRef.current = [] }} className="btn-outline" style={{ marginTop: 10, fontSize: 12 }}>
                    Load different file
                  </button>
                </div>
              )}
            </div>

            {/* Results table */}
            {results && results.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    AI Scored Results — {results.length} records
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', background: '#FEF3C7', color: '#92400E', borderRadius: 10 }}>
                      🔥 {results.filter(r => r.score?.toLowerCase() === 'hot').length} Hot
                    </span>
                    <span style={{ fontSize: 11, padding: '2px 8px', background: '#EFF6FF', color: '#1E40AF', borderRadius: 10 }}>
                      🌡️ {results.filter(r => r.score?.toLowerCase() === 'warm').length} Warm
                    </span>
                    <span style={{ fontSize: 11, padding: '2px 8px', background: '#F1F5F9', color: '#475569', borderRadius: 10 }}>
                      ❄️ {results.filter(r => r.score?.toLowerCase() === 'cold').length} Cold
                    </span>
                  </div>
                </div>
                <ResultsTable results={results} />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={exportExcel} className="btn-outline" style={{ fontSize: 12 }}>📥 Export scores</button>
                  <button onClick={exportEnriched} className="btn-primary" style={{ fontSize: 12, padding: '7px 14px' }}>📥 Export enriched file</button>
                </div>
              </div>
            )}
          </div>

          {/* Right panel — agent chat */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {agent.icon} Agent — {agent.name}
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ background: 'var(--navy)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{agent.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{agent.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>{agent.credits} credit · Claude AI</span>
              </div>

              {/* Quick actions */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '8px 12px', borderBottom: '0.5px solid #E5E7EB', background: '#FAFAFA' }}>
                {(agent.quickActions || []).map(q => (
                  <button key={q} onClick={() => sendChat(q)} disabled={step === 'upload' || loading}
                    style={{ fontSize: 11, padding: '3px 9px', border: '0.5px solid #D1D5DB', borderRadius: 20, cursor: step === 'upload' ? 'not-allowed' : 'pointer', background: 'white', color: step === 'upload' ? '#9CA3AF' : 'var(--text-muted)', opacity: step === 'upload' ? 0.6 : 1 }}>
                    {q}
                  </button>
                ))}
              </div>

              {/* Chat messages */}
              <div ref={chatRef} style={{ height: 320, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                    {step === 'upload' ? '👆 Load your data first, then the agent will analyse it.' : `👋 Data loaded! Try a quick action above.`}
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      padding: '9px 13px', borderRadius: 12, fontSize: 12, lineHeight: 1.6,
                      background: m.role === 'user' ? 'var(--navy)' : '#F9FAFB',
                      color: m.role === 'user' ? '#fff' : 'var(--text)',
                      border: m.role === 'agent' ? '0.5px solid #E5E7EB' : 'none',
                      borderBottomRightRadius: m.role === 'user' ? 4 : 12,
                      borderBottomLeftRadius: m.role === 'agent' ? 4 : 12,
                    }}>
                      {m.role === 'agent' ? <AgentMessage text={m.text} /> : m.text}
                    </div>

                    {/* Inline score summary if scores returned */}
                    {m.role === 'agent' && m.scores?.length > 0 && (
                      <div style={{ marginTop: 6, alignSelf: 'flex-start', width: '100%' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>📊 Scored {m.scores.length} records — see full table on the left</div>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {m.scores.slice(0, 3).map((sc, j) => (
                            <div key={j} style={{ background: 'white', border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '4px 8px', fontSize: 11 }}>
                              <span style={{ fontWeight: 500 }}>{sc.name}</span>
                              {' · '}
                              <ScoreBadge score={sc.score} />
                            </div>
                          ))}
                          {m.scores.length > 3 && <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 0' }}>+{m.scores.length - 3} more →</div>}
                        </div>
                      </div>
                    )}
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{m.time}</span>
                  </div>
                ))}
                {loading && (
                  <div style={{ alignSelf: 'flex-start', padding: '10px 14px', background: '#F9FAFB', border: '0.5px solid #E5E7EB', borderRadius: 12, borderBottomLeftRadius: 4 }}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {[0, 200, 400].map(d => (
                        <div key={d} style={{ width: 5, height: 5, borderRadius: '50%', background: '#9CA3AF', animation: `bounce 1.2s ${d}ms infinite` }} />
                      ))}
                      <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 4 }}>Analysing your data…</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div style={{ display: 'flex', gap: 6, padding: '8px 10px', borderTop: '0.5px solid #E5E7EB' }}>
                <input value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChat()}
                  placeholder={step === 'upload' ? 'Load your data first…' : 'Ask the agent anything about your data…'}
                  disabled={step === 'upload'}
                  style={{ flex: 1, padding: '7px 10px', border: '0.5px solid #D1D5DB', borderRadius: 6, fontSize: 12, background: step === 'upload' ? '#F9FAFB' : 'white', color: 'var(--text)' }} />
                <button onClick={() => sendChat()} disabled={loading || step === 'upload'}
                  className="btn-primary" style={{ padding: '7px 14px', fontSize: 12, borderRadius: 6, opacity: step === 'upload' ? 0.5 : 1 }}>
                  Ask ↗
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <style>{`@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-4px)} }`}</style>
    </>
  )
}
