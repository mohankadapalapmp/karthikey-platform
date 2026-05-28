'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { AGENTS } from '../../../lib/agents'
import Topbar from '../../../components/Topbar'
import Link from 'next/link'
import * as XLSX from 'xlsx'

export default function AgentRunnerPage() {
  const router = useRouter()
  const { agentId } = useParams()
  const agent = AGENTS.find(a => a.id === agentId)
  const [user, setUser] = useState(null)
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
    supabase.auth.getUser().then(({ data: d }) => {
      if (!d?.user) { router.push('/login'); return }
      setUser(d.user)
      fetchCredits(d.user.id)
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
        addMsg('agent', `✅ Loaded ${rows.length} rows with ${Object.keys(rows[0]).length} columns. Ready to analyse. Try a quick action below or ask me anything.`)
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

  function addMsg(role, text) {
    setMessages(prev => [...prev, { role, text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
  }

  async function sendChat(msgText) {
    const text = msgText || input.trim()
    if (!text || loading) return
    setInput('')
    if (credits < agent.credits) { addMsg('agent', '⚠️ Not enough credits. Please top up to continue.'); return }
    addMsg('user', text)
    historyRef.current.push({ role: 'user', content: text })
    setLoading(true)

    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, question: text, data: data?.slice(0, 30), history: historyRef.current })
    })
    const json = await res.json()
    setLoading(false)

    if (json.error) { addMsg('agent', `Error: ${json.error}`); return }

    const reply = json.reply
    historyRef.current.push({ role: 'assistant', content: reply })

    const jsonMatch = reply.match(/\{"scores":\s*\[[\s\S]*?\]\s*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        setResults(parsed.scores)
      } catch (_) {}
    }
    addMsg('agent', reply.replace(jsonMatch?.[0] || '', '').trim() || reply)

    await supabase.from('accounts').update({ credits: credits - agent.credits }).eq('id', user.id)
    await supabase.from('usage_log').insert({ user_id: user.id, agent_id: agentId, credits_used: agent.credits })
    setCredits(c => c - agent.credits)
  }

  function exportExcel() {
    if (!results) return
    const ws = XLSX.utils.json_to_sheet(results)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Results')
    XLSX.writeFile(wb, `karthikey_${agentId}_results.xlsx`)
  }

  function exportOriginalWithScores() {
    if (!results || !data) return
    const merged = data.map((row, i) => ({
      ...row,
      AI_Score: results[i]?.score || '',
      AI_Reason: results[i]?.reason || '',
      AI_Action: results[i]?.action || ''
    }))
    const ws = XLSX.utils.json_to_sheet(merged)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Enriched')
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
          <div style={{ marginLeft: 'auto', background: '#FFFBEB', border: '0.5px solid #FDE68A', borderRadius: 20, padding: '3px 10px', fontSize: 12, color: '#92400E' }}>
            ⚡ {credits} credits remaining
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={{ marginBottom: 12 }}>
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
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>Supports .xlsx, .xls, .csv — parsed in your browser, never uploaded</div>
                  <button onClick={e => { e.stopPropagation(); loadSample() }} className="btn-outline" style={{ fontSize: 13 }}>
                    Or load sample data →
                  </button>
                </div>
              ) : (
                <div className="card" style={{ padding: 14 }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
                      <thead>
                        <tr>{columns.slice(0, 5).map(c => <th key={c} style={{ textAlign: 'left', padding: '5px 8px', background: '#F9FAFB', fontSize: 11, color: 'var(--text-muted)', borderBottom: '0.5px solid #E5E7EB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c}</th>)}</tr>
                      </thead>
                      <tbody>
                        {data.slice(0, 6).map((row, i) => (
                          <tr key={i}>{columns.slice(0, 5).map(c => <td key={c} style={{ padding: '5px 8px', borderBottom: '0.5px solid #F3F4F6', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(row[c] ?? '')}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                    {data.length > 6 && <div style={{ textAlign: 'center', padding: '6px', fontSize: 12, color: 'var(--text-muted)' }}>+ {data.length - 6} more rows</div>}
                  </div>
                  <button onClick={() => { setData(null); setColumns([]); setStep('upload'); setMessages([]); setResults(null); historyRef.current = [] }} className="btn-outline" style={{ marginTop: 10, fontSize: 12 }}>
                    Load different file
                  </button>
                </div>
              )}
            </div>

            {results && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Scored results
                </div>
                <div className="card" style={{ padding: 14 }}>
                  <div style={{ overflowX: 'auto', maxHeight: 260, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
                      <thead>
                        <tr>
                          {['Name','Score','Reason','Action'].map(h => <th key={h} style={{ textAlign: 'left', padding: '5px 8px', background: '#F9FAFB', fontSize: 11, color: 'var(--text-muted)', borderBottom: '0.5px solid #E5E7EB' }}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r, i) => (
                          <tr key={i}>
                            <td style={{ padding: '5px 8px', borderBottom: '0.5px solid #F3F4F6', fontWeight: 500 }}>{r.name}</td>
                            <td style={{ padding: '5px 8px', borderBottom: '0.5px solid #F3F4F6' }}>
                              <span className={`badge badge-${(r.score||'cold').toLowerCase()}`}>{r.score}</span>
                            </td>
                            <td style={{ padding: '5px 8px', borderBottom: '0.5px solid #F3F4F6', fontSize: 11 }}>{r.reason}</td>
                            <td style={{ padding: '5px 8px', borderBottom: '0.5px solid #F3F4F6', fontSize: 11 }}>{r.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button onClick={exportExcel} className="btn-outline" style={{ fontSize: 12 }}>📥 Export scores</button>
                    <button onClick={exportOriginalWithScores} className="btn-primary" style={{ fontSize: 12, padding: '7px 14px' }}>📥 Export enriched file</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Agent — {agent.name}
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ background: 'var(--navy)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{agent.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{agent.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>{agent.credits} credit per run · powered by Claude</span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '8px 12px', borderBottom: '0.5px solid #E5E7EB' }}>
                {(agent.quickActions || []).map(q => (
                  <button key={q} onClick={() => sendChat(q)} style={{ fontSize: 11, padding: '3px 9px', border: '0.5px solid #D1D5DB', borderRadius: 20, cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)' }}>
                    {q}
                  </button>
                ))}
              </div>

              <div ref={chatRef} style={{ height: 280, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                    {step === 'upload' ? '👆 Load your data first, then ask the agent anything.' : `👋 Data loaded! Try "${(agent.quickActions || [])[0]}" above.`}
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ padding: '8px 12px', borderRadius: 12, fontSize: 12, lineHeight: 1.5, background: m.role === 'user' ? 'var(--navy)' : '#F9FAFB', color: m.role === 'user' ? '#fff' : 'var(--text)', border: m.role === 'agent' ? '0.5px solid #E5E7EB' : 'none', borderBottomRightRadius: m.role === 'user' ? 4 : 12, borderBottomLeftRadius: m.role === 'agent' ? 4 : 12, whiteSpace: 'pre-wrap' }}>
                      {m.text}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{m.time}</span>
                  </div>
                ))}
                {loading && (
                  <div style={{ alignSelf: 'flex-start', padding: '8px 12px', background: '#F9FAFB', border: '0.5px solid #E5E7EB', borderRadius: 12, borderBottomLeftRadius: 4 }}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {[0, 200, 400].map(d => <div key={d} style={{ width: 5, height: 5, borderRadius: '50%', background: '#9CA3AF', animation: `bounce 1.2s ${d}ms infinite` }} />)}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 6, padding: '8px 10px', borderTop: '0.5px solid #E5E7EB' }}>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()}
                  placeholder={step === 'upload' ? 'Load data first…' : 'Ask the agent anything…'}
                  disabled={step === 'upload'}
                  style={{ flex: 1, padding: '7px 10px', border: '0.5px solid #D1D5DB', borderRadius: 6, fontSize: 12, background: step === 'upload' ? '#F9FAFB' : 'white', color: 'var(--text)' }} />
                <button onClick={() => sendChat()} disabled={loading || step === 'upload'} className="btn-primary" style={{ padding: '7px 14px', fontSize: 12, borderRadius: 6, opacity: step === 'upload' ? 0.5 : 1 }}>
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
