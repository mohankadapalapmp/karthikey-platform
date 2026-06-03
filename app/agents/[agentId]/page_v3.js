'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { AGENTS } from '../../../lib/agents'
import Topbar from '../../../components/Topbar'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { track, Events } from '../../../lib/analytics'
import { captureError } from '../../../lib/monitoring'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import jsPDF from 'jspdf'

const BATCH_SIZE = 25
const SCORE_AGENT_IDS = ['lead-qual','lead-score','case-class','sentiment',
  'pipeline','crm-hygiene','data-qual','quote-rev','renewal','mgr-dash']

const SCORE_COLORS = {
  hot:  { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' },
  warm: { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' },
  cold: { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' },
}

function ScoreBadge({ score }) {
  const c = SCORE_COLORS[(score||'').toLowerCase()] || SCORE_COLORS.cold
  return <span style={{ background: c.bg, color: c.color, border: `0.5px solid ${c.border}`, padding: '2px 9px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{score}</span>
}

function ResultsTable({ results }) {
  if (!results?.length) return null
  return (
    <div style={{ overflowX: 'auto', maxHeight: 300, overflowY: 'auto', borderRadius: 8, border: '0.5px solid #E5E7EB' }}>
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
  const cleaned = text.replace(/```json[\s\S]*?```/g, '').replace(/\{"scores":\s*\[[\s\S]*?\]\s*\}/g, '').trim()
  if (!cleaned) return null
  return (
    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
      {cleaned.split('\n').map((line, i) => <p key={i} style={{ marginBottom: line ? 4 : 2 }}>{line}</p>)}
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
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchProgress, setBatchProgress] = useState(null)
  const [results, setResults] = useState(null)
  const [step, setStep] = useState('upload')
  const [dragOver, setDragOver] = useState(false)
  const chatRef = useRef(null)
  const fileRef = useRef(null)
  const historyRef = useRef([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: d }) => {
      if (!d?.session) { router.push('/login'); return }
      setUser(d.session.user); setSession(d.session)
      fetchCredits(d.session.user.id)
    })
  }, [])

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight }, [messages])

  if (!agent) return <div style={{ padding: 40, textAlign: 'center' }}>Agent not found. <Link href="/agents">Back</Link></div>

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
        setColumns(Object.keys(rows[0])); setData(rows); setStep('ready')
        track(Events.FILE_UPLOADED, { rows: rows.length, cols: Object.keys(rows[0]).length })
        addMsg('agent', `✅ Loaded **${rows.length} records** with ${Object.keys(rows[0]).length} columns.\n\n${rows.length > BATCH_SIZE ? `📦 Large dataset detected — use "Score all ${rows.length} records" to process in batches of ${BATCH_SIZE}. This ensures every record gets scored.` : `Ready to analyse. Try a quick action or ask me anything.`}`)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function loadSample() {
    const sample = [
      { Name:'Priya Sharma', Company:'TechCorp', Budget:'₹50L', Source:'Meta Ads', City:'Bengaluru', Stage:'New' },
      { Name:'Rahul Mehta', Company:'StartupXYZ', Budget:'₹12L', Source:'Google', City:'Mumbai', Stage:'Contacted' },
      { Name:'Ananya Iyer', Company:'Infosys', Budget:'₹1.5Cr', Source:'Referral', City:'Chennai', Stage:'New' },
      { Name:'Vikram Nair', Company:'Wipro', Budget:'₹80L', Source:'LinkedIn', City:'Hyderabad', Stage:'Proposal' },
      { Name:'Sneha Gupta', Company:'HDFC Bank', Budget:'₹2.2Cr', Source:'Website', City:'Delhi', Stage:'New' },
      { Name:'Arjun Patel', Company:'TCS', Budget:'₹45L', Source:'Meta Ads', City:'Pune', Stage:'Contacted' },
      { Name:'Kavitha Rao', Company:'Zomato', Budget:'₹90L', Source:'Referral', City:'Bengaluru', Stage:'New' },
    ]
    setColumns(Object.keys(sample[0])); setData(sample); setStep('ready')
    addMsg('agent', `✅ Loaded ${sample.length} sample records. Try "Score all leads" to see the agent in action!`)
  }

  function addMsg(role, text, scores) {
    setMessages(prev => [...prev, { role, text, scores, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
  }

  // ── BATCH SCORE: score all records in batches ────────────────
  async function runBatchScore() {
    if (!data?.length || batchLoading) return
    const totalBatches = Math.ceil(data.length / BATCH_SIZE)
    const creditCost = Math.max(agent.credits, totalBatches)
    if (credits < creditCost) {
      addMsg('agent', `⚠️ This run needs **${creditCost} credits** (${totalBatches} batches × ${agent.credits} credit) to score all ${data.length} records. You have ${credits} credits. Please top up.`)
      return
    }
    setBatchLoading(true)
    setBatchProgress({ current: 0, total: totalBatches })
    track(Events.BATCH_SCORE, { agentId, rows: data.length, batches: totalBatches, credits: creditCost })
    addMsg('user', `Score all ${data.length} records`)
    addMsg('agent', `🔄 Starting batch processing — ${totalBatches} batch${totalBatches > 1 ? 'es' : ''} of up to ${BATCH_SIZE} records each. This will cost ${creditCost} credit${creditCost > 1 ? 's' : ''}...`)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ agentId, question: `Score all ${data.length} records`, data, history: [], isBatchScore: true })
      })
      const json = await res.json()
      setBatchLoading(false); setBatchProgress(null)
      if (json.error) { addMsg('agent', `⚠️ ${json.error}`); return }
      if (json.scores?.length) setResults(json.scores)
      addMsg('agent', json.reply, json.scores)
      setCredits(c => c - (json.creditCost || agent.credits))
    } catch (e) {
      setBatchLoading(false); setBatchProgress(null)
      addMsg('agent', '⚠️ Connection error. Please try again.')
    }
  }

  // ── CHAT: conversational questions ──────────────────────────
  async function sendChat(msgText) {
    const text = msgText || input.trim()
    if (!text || loading) return
    setInput('')
    if (credits < agent.credits) { addMsg('agent', `⚠️ Not enough credits. Please top up.`); return }
    addMsg('user', text)
    historyRef.current.push({ role: 'user', content: text })
    track(Events.AGENT_RUN, { agentId, agent: agent.name, dept: agent.dept })
    setLoading(true)
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ agentId, question: text, data: data?.slice(0, BATCH_SIZE), history: historyRef.current, isBatchScore: false })
      })
      const json = await res.json()
      setLoading(false)
      if (json.error) { addMsg('agent', `⚠️ ${json.error}`); return }
      const reply = json.reply; const scores = json.scores
      historyRef.current.push({ role: 'assistant', content: reply })
      if (scores?.length) setResults(scores)
      addMsg('agent', reply, scores)
      setCredits(c => c - (json.creditCost || agent.credits))
    } catch (e) {
      setLoading(false)
      addMsg('agent', '⚠️ Connection error. Please try again.')
    }
  }

  function exportExcel() {
    track(Events.EXPORT_SCORES, { agentId, rows: results?.length })
    if (!results) return
    const ws = XLSX.utils.json_to_sheet(results)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'AI Scores')
    XLSX.writeFile(wb, `karthikey_${agentId}_scores.xlsx`)
  }

  function exportEnriched() {
    if (!results || !data) return
    const scoreMap = {}
    results.forEach(r => { scoreMap[r.name] = r })
    const nameCol = columns[0]
    const merged = data.map(row => {
      const match = scoreMap[String(row[nameCol] || '')]
      return { ...row, AI_Score: match?.score || '', AI_Reason: match?.reason || '', AI_Action: match?.action || '' }
    })
    const ws = XLSX.utils.json_to_sheet(merged)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Enriched Data')
    XLSX.writeFile(wb, `karthikey_enriched_${agentId}.xlsx`)
  }

  function getAgentTextOutput() {
    return messages
      .filter(m => m.role === 'agent')
      .map(m => m.text)
      .join('\n\n')
  }

  function exportPDF() {
    const text = getAgentTextOutput()
    if (!text) return
    track(Events.EXPORT_PDF || 'export_pdf', { agentId })
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const margin = 40
    const pageWidth = doc.internal.pageSize.getWidth() - margin * 2
    const lineHeight = 14
    let y = 60

    // Header
    doc.setFillColor(13, 27, 62)
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 45, 'F')
    doc.setTextColor(201, 168, 76)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('KARTHIKEY AI', margin, 28)
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.text(agent?.name || agentId, margin, 40)

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    const lines = doc.splitTextToSize(text, pageWidth)
    lines.forEach(line => {
      if (y > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage()
        y = 40
      }
      doc.text(line, margin, y)
      y += lineHeight
    })

    // If results table, add it
    if (results?.length) {
      if (y > doc.internal.pageSize.getHeight() - 80) { doc.addPage(); y = 40 }
      y += 10
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('AI Scored Results', margin, y)
      y += 16
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      results.forEach((r, i) => {
        if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 40 }
        doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 250)
        doc.rect(margin, y - 10, pageWidth, 14, 'F')
        doc.setTextColor(0,0,0)
        doc.text(`${r.name || ''} | ${r.score || ''} | ${(r.reason || '').substring(0, 60)} | ${(r.action || '').substring(0, 40)}`, margin + 4, y)
        y += 14
      })
    }

    doc.save(`karthikey_${agentId}_${new Date().toISOString().slice(0,10)}.pdf`)
  }

  async function exportWord() {
    const text = getAgentTextOutput()
    if (!text) return
    track(Events.EXPORT_WORD || 'export_word', { agentId })

    const paragraphs = [
      new Paragraph({
        text: `Karthikey AI — ${agent?.name || agentId}`,
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        text: `Generated: ${new Date().toLocaleDateString('en-IN')}`,
        children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString('en-IN')}`, color: '6B7280', size: 18 })]
      }),
      new Paragraph({ text: '' }),
      ...text.split('\n').map(line =>
        new Paragraph({
          children: [new TextRun({ text: line, size: 22 })]
        })
      )
    ]

    if (results?.length) {
      paragraphs.push(new Paragraph({ text: '' }))
      paragraphs.push(new Paragraph({ text: 'AI Scored Results', heading: HeadingLevel.HEADING_2 }))
      results.forEach(r => {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({ text: `${r.name || ''} `, bold: true, size: 20 }),
            new TextRun({ text: `[${r.score?.toUpperCase() || ''}] `, color: r.score === 'hot' ? 'DC2626' : r.score === 'warm' ? '2563EB' : '6B7280', size: 20 }),
            new TextRun({ text: `${r.reason || ''} — ${r.action || ''}`, size: 20 }),
          ]
        }))
      })
    }

    const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] })
    const blob = await Packer.toBlob(doc)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `karthikey_${agentId}_${new Date().toISOString().slice(0,10)}.docx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  async function sendEmail() {
    const text = getAgentTextOutput()
    if (!emailTo || !text) return
    setEmailSending(true)
    try {
      const { error } = await supabase.functions.invoke('send-agent-output', {
        body: {
          to: emailTo,
          agentName: agent?.name || agentId,
          output: text,
          results: results || [],
          appUrl: window.location.origin
        }
      })
      if (error) throw error
      setEmailSent(true)
      setTimeout(() => { setShowEmailModal(false); setEmailSent(false); setEmailTo('') }, 2000)
    } catch (err) {
      alert('Email send failed. Please try again.')
    } finally {
      setEmailSending(false)
    }
  }

  const isScoringAgent = SCORE_AGENT_IDS.includes(agentId)
  const totalBatches = data ? Math.ceil(data.length / BATCH_SIZE) : 0
  const batchCreditCost = data ? Math.max(agent.credits, totalBatches) : agent.credits

  return (
    <>
      {showEmailModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>✉️ Email agent output</div>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Send the AI analysis to any email address.</p>
            {emailSent ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#16A34A', fontWeight: 500 }}>✅ Email sent successfully!</div>
            ) : (
              <>
                <input
                  type="email"
                  value={emailTo}
                  onChange={e => setEmailTo(e.target.value)}
                  placeholder="recipient@company.com"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowEmailModal(false)} style={{ flex: 1, padding: '9px', border: '1px solid #D1D5DB', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={sendEmail} disabled={emailSending || !emailTo} style={{ flex: 1, padding: '9px', border: 'none', borderRadius: 8, background: '#0D1B3E', color: '#C9A84C', fontSize: 13, fontWeight: 600, cursor: emailSending ? 'not-allowed' : 'pointer' }}>
                    {emailSending ? 'Sending…' : 'Send email →'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
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
          {/* Left panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                {step === 'upload' ? 'Step 1 — load your data' : `✅ ${data?.length} records loaded · ${columns.length} columns`}
              </div>

              {/* Data volume info bar */}
              {data && data.length > BATCH_SIZE && (
                <div style={{ background: '#EFF6FF', border: '0.5px solid #BFDBFE', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📦</span>
                  <span><strong>{data.length} records</strong> · {totalBatches} batches of {BATCH_SIZE} · <strong>{batchCreditCost} credit{batchCreditCost > 1 ? 's' : ''}</strong> to score all</span>
                </div>
              )}

              {step === 'upload' ? (
                <div onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) parseFile(f) }}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)}
                  onClick={() => fileRef.current?.click()}
                  style={{ border: `1.5px dashed ${dragOver ? 'var(--gold)' : '#D1D5DB'}`, borderRadius: 12, padding: '32px 20px', textAlign: 'center', cursor: 'pointer', background: dragOver ? '#FFFBEB' : 'white', transition: 'all 0.12s' }}>
                  <input ref={fileRef} type="file" accept=".xlsx,.csv,.xls" onChange={e => { if (e.target.files[0]) parseFile(e.target.files[0]) }} style={{ display: 'none' }} />
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📂</div>
                  <div style={{ fontWeight: 500, marginBottom: 5 }}>Drop your Excel or CSV file here</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>Any industry · Any CRM export · .xlsx, .xls, .csv</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Parsed in your browser — data never leaves your device</div>
                  <button onClick={e => { e.stopPropagation(); loadSample() }} className="btn-outline" style={{ fontSize: 13 }}>Or load sample data →</button>
                </div>
              ) : (
                <div className="card" style={{ padding: 14 }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
                      <thead><tr>{columns.slice(0, 5).map(c => <th key={c} style={{ textAlign: 'left', padding: '5px 8px', background: '#F9FAFB', fontSize: 11, color: '#6B7280', borderBottom: '0.5px solid #E5E7EB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c}</th>)}</tr></thead>
                      <tbody>{data.slice(0, 5).map((row, i) => <tr key={i}>{columns.slice(0, 5).map(c => <td key={c} style={{ padding: '5px 8px', borderBottom: '0.5px solid #F3F4F6', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(row[c] ?? '')}</td>)}</tr>)}</tbody>
                    </table>
                    {data.length > 5 && <div style={{ textAlign: 'center', padding: '5px', fontSize: 12, color: 'var(--text-muted)' }}>+ {data.length - 5} more records</div>}
                  </div>
                  <button onClick={() => { setData(null); setColumns([]); setStep('upload'); setMessages([]); setResults(null); historyRef.current = [] }} className="btn-outline" style={{ marginTop: 10, fontSize: 12 }}>Load different file</button>
                </div>
              )}
            </div>

            {/* Batch score button for large datasets */}
            {isScoringAgent && data && data.length > 0 && step === 'ready' && (
              <button onClick={runBatchScore} disabled={batchLoading}
                style={{ width: '100%', padding: '11px', fontSize: 13, fontWeight: 600, background: batchLoading ? '#9CA3AF' : 'var(--navy)', color: 'var(--gold)', border: 'none', borderRadius: 8, cursor: batchLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {batchLoading
                  ? `⏳ Scoring batch ${batchProgress?.current || '...'} of ${batchProgress?.total || totalBatches}...`
                  : `🎯 Score all ${data.length} records ${data.length > BATCH_SIZE ? `· ${batchCreditCost} credit${batchCreditCost > 1 ? 's' : ''}` : `· ${agent.credits} credit`}`
                }
              </button>
            )}

            {/* Results table */}
            {results && results.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    AI Scored Results — {results.length} records
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[['hot','🔥','#92400E','#FEF3C7'],['warm','🌡️','#1E40AF','#EFF6FF'],['cold','❄️','#475569','#F1F5F9']].map(([s,e,c,bg]) => (
                      <span key={s} style={{ fontSize: 11, padding: '2px 8px', background: bg, color: c, borderRadius: 10 }}>
                        {e} {results.filter(r => r.score?.toLowerCase() === s).length} {s.charAt(0).toUpperCase()+s.slice(1)}
                      </span>
                    ))}
                  </div>
                </div>
                <ResultsTable results={results} />
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <button onClick={exportExcel} className="btn-outline" style={{ fontSize: 12 }}>📊 Excel scores</button>
                  <button onClick={exportEnriched} className="btn-primary" style={{ fontSize: 12, padding: '7px 14px' }}>📥 Excel enriched</button>
                  <button onClick={exportPDF} className="btn-outline" style={{ fontSize: 12 }}>📄 PDF</button>
                  <button onClick={exportWord} className="btn-outline" style={{ fontSize: 12 }}>📝 Word</button>
                  <button onClick={() => setShowEmailModal(true)} className="btn-outline" style={{ fontSize: 12 }}>✉️ Email</button>
                </div>
              </div>
            )}
          </div>

          {/* Right panel — chat */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {agent.icon} Agent — {agent.name}
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ background: 'var(--navy)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{agent.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{agent.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>Works for any industry · Claude AI</span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '8px 12px', borderBottom: '0.5px solid #E5E7EB', background: '#FAFAFA' }}>
                {(agent.quickActions || []).filter(q => !q.toLowerCase().includes('score all')).map(q => (
                  <button key={q} onClick={() => sendChat(q)} disabled={step === 'upload' || loading || batchLoading}
                    style={{ fontSize: 11, padding: '3px 9px', border: '0.5px solid #D1D5DB', borderRadius: 20, cursor: step === 'upload' ? 'not-allowed' : 'pointer', background: 'white', color: step === 'upload' ? '#9CA3AF' : 'var(--text-muted)', opacity: step === 'upload' ? 0.6 : 1 }}>
                    {q}
                  </button>
                ))}
              </div>

              <div ref={chatRef} style={{ height: 320, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                    {step === 'upload' ? '👆 Load your data first — works with any industry or CRM format.' : '👋 Data loaded! Use the score button on the left or ask me anything.'}
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ padding: '9px 13px', borderRadius: 12, fontSize: 12, lineHeight: 1.6, background: m.role === 'user' ? 'var(--navy)' : '#F9FAFB', color: m.role === 'user' ? '#fff' : 'var(--text)', border: m.role === 'agent' ? '0.5px solid #E5E7EB' : 'none', borderBottomRightRadius: m.role === 'user' ? 4 : 12, borderBottomLeftRadius: m.role === 'agent' ? 4 : 12 }}>
                      {m.role === 'agent' ? <AgentMessage text={m.text} /> : m.text}
                    </div>
                    {m.role === 'agent' && m.scores?.length > 0 && (
                      <div style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>📊 {m.scores.length} records scored — full table on the left</div>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {m.scores.slice(0, 3).map((sc, j) => (
                            <div key={j} style={{ background: 'white', border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '4px 8px', fontSize: 11 }}>
                              <span style={{ fontWeight: 500 }}>{sc.name}</span>{' · '}<ScoreBadge score={sc.score} />
                            </div>
                          ))}
                          {m.scores.length > 3 && <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 0' }}>+{m.scores.length - 3} more →</div>}
                        </div>
                      </div>
                    )}
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{m.time}</span>
                  </div>
                ))}
                {(loading || batchLoading) && (
                  <div style={{ alignSelf: 'flex-start', padding: '10px 14px', background: '#F9FAFB', border: '0.5px solid #E5E7EB', borderRadius: 12, borderBottomLeftRadius: 4 }}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {[0,200,400].map(d => <div key={d} style={{ width: 5, height: 5, borderRadius: '50%', background: '#9CA3AF', animation: `bounce 1.2s ${d}ms infinite` }} />)}
                      <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 4 }}>
                        {batchLoading ? `Processing batch ${batchProgress?.current || '...'} of ${batchProgress?.total || totalBatches}...` : 'Analysing...'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 6, padding: '8px 10px', borderTop: '0.5px solid #E5E7EB' }}>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()}
                  placeholder={step === 'upload' ? 'Load your data first…' : 'Ask the agent anything about your data…'}
                  disabled={step === 'upload'} style={{ flex: 1, padding: '7px 10px', border: '0.5px solid #D1D5DB', borderRadius: 6, fontSize: 12, background: step === 'upload' ? '#F9FAFB' : 'white', color: 'var(--text)' }} />
                <button onClick={() => sendChat()} disabled={loading || batchLoading || step === 'upload'} className="btn-primary" style={{ padding: '7px 14px', fontSize: 12, borderRadius: 6, opacity: step === 'upload' ? 0.5 : 1 }}>Ask ↗</button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <style>{`@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-4px)} }`}</style>
    </>
  )
}
