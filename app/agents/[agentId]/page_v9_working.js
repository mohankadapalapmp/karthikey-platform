'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { AGENTS } from '../../../lib/agents'
import Topbar from '../../../components/Topbar'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { track, Events } from '../../../lib/analytics'
import { captureError } from '../../../lib/monitoring'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType, BorderStyle } from 'docx'
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
    <div style={{ overflowX: 'auto', borderRadius: 8, border: '0.5px solid #E5E7EB' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#F9FAFB' }}>
            {['Name','Score','Reason','Next Action'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '7px 10px', fontSize: 11, color: '#6B7280', fontWeight: 600, borderBottom: '0.5px solid #E5E7EB', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
              <td style={{ padding: '7px 10px', borderBottom: '0.5px solid #F3F4F6', fontWeight: 500 }}>{r.name}</td>
              <td style={{ padding: '7px 10px', borderBottom: '0.5px solid #F3F4F6', whiteSpace: 'nowrap' }}><ScoreBadge score={r.score} /></td>
              <td style={{ padding: '7px 10px', borderBottom: '0.5px solid #F3F4F6', color: '#374151', lineHeight: 1.4 }}>{r.reason}</td>
              <td style={{ padding: '7px 10px', borderBottom: '0.5px solid #F3F4F6', color: '#1565C0', lineHeight: 1.4 }}>{r.action}</td>
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
  const [prefillLoading, setPrefillLoading] = useState(false)
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

  async function smartPrefill(cols, rows) {
    setPrefillLoading(true)
    try {
      const res = await fetch('/api/prefill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName: agent.name, agentDesc: agent.desc, agentKeywords: agent.keywords || [], inputType: agent.inputType || 'excel', columns: cols, rowCount: rows })
      })
      const data = await res.json()
      if (data.message) addMsg('agent', `✅ Loaded **${rows} records** with ${cols.length} columns.\n\n${data.message}`)
      if (data.suggestedPrompt) setInput(data.suggestedPrompt)
    } catch (e) {
      const fallbackPrompt = agent.quickActions?.[0] || ''
      addMsg('agent', `✅ Loaded **${rows} records** with ${cols.length} columns (${cols.slice(0,4).join(', ')}${cols.length > 4 ? '…' : ''}).\n\nReady to analyse — try asking me anything about your data.`)
      if (fallbackPrompt) setInput(fallbackPrompt)
    } finally {
      setPrefillLoading(false)
    }
  }

  function parseFile(file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
      if (rows.length) {
        const detectedCols = Object.keys(rows[0])
        setColumns(detectedCols); setData(rows); setStep('ready')
        track(Events.FILE_UPLOADED, { rows: rows.length, cols: detectedCols.length })
        if (rows.length > BATCH_SIZE) {
          addMsg('agent', `✅ Loaded **${rows.length} records** with ${detectedCols.length} columns.\n\n📦 Large dataset — I'll process in batches of ${BATCH_SIZE}.`)
          setInput(`Score all ${rows.length} records`)
        } else {
          smartPrefill(detectedCols, rows.length)
        }
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
    const sampleCols = Object.keys(sample[0])
    setColumns(sampleCols); setData(sample); setStep('ready')
    smartPrefill(sampleCols, sample.length)
  }

  function addMsg(role, text, scores, summary) {
    setMessages(prev => [...prev, { role, text, scores, summary, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
  }

  async function runBatchScore() {
    if (!data?.length || batchLoading) return
    const totalBatches = Math.ceil(data.length / BATCH_SIZE)
    const creditCost = Math.max(agent.credits, totalBatches)
    if (credits < creditCost) { addMsg('agent', `⚠️ Need **${creditCost} credits**. You have ${credits}. Please top up.`); return }
    setBatchLoading(true); setBatchProgress({ current: 0, total: totalBatches })
    track(Events.BATCH_SCORE, { agentId, rows: data.length, batches: totalBatches, credits: creditCost })
    addMsg('user', `Score all ${data.length} records`)
    addMsg('agent', `🔄 Processing ${totalBatches} batch${totalBatches > 1 ? 'es' : ''} of up to ${BATCH_SIZE} records — ${creditCost} credit${creditCost > 1 ? 's' : ''}…`)
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
      addMsg('agent', json.reply, json.scores, json.summary)
      setCredits(c => c - (json.creditCost || agent.credits))
    } catch (e) {
      setBatchLoading(false); setBatchProgress(null)
      addMsg('agent', '⚠️ Connection error. Please try again.')
    }
  }

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
      historyRef.current.push({ role: 'assistant', content: json.reply })
      if (json.scores?.length) setResults(json.scores)
      addMsg('agent', json.reply, json.scores, json.summary)
      setCredits(c => c - (json.creditCost || agent.credits))
    } catch (e) {
      setLoading(false)
      addMsg('agent', '⚠️ Connection error. Please try again.')
    }
  }

  // ── EXPORTS ─────────────────────────────────────────────────

  function getLastSummary() {
    const msgs = messages.filter(m => m.role === 'agent' && m.summary)
    return msgs.length ? msgs[msgs.length - 1].summary : null
  }

  function getAgentTextOutput() {
    return messages
      .filter(m => m.role === 'agent')
      .filter(m => !m.text?.startsWith('✅ Loaded') && !m.text?.includes('Ready to analyse') && !m.text?.startsWith('🔄'))
      .map(m => {
        let text = m.text || ''
        text = text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
          .replace(/^#{1,3}\s+/gm, '').replace(/^-\s+/gm, '• ').replace(/`(.+?)`/g, '$1')
        return text.trim()
      })
      .filter(t => t.length > 0)
      .join('\n\n')
  }

  // ── Excel enriched with branding sheet ─────────────────────
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
    results.forEach(r => { if (r.name) scoreMap[r.name.trim().toLowerCase()] = r })
    const merged = data.map((row, idx) => {
      let match = null
      for (const val of Object.values(row)) {
        const key = String(val || '').trim().toLowerCase()
        if (key && scoreMap[key]) { match = scoreMap[key]; break }
      }
      if (!match && results[idx]) match = results[idx]
      return {
        ...row,
        AI_Score: match?.score ? match.score.charAt(0).toUpperCase() + match.score.slice(1) : '',
        AI_Reason: match?.reason || '',
        AI_Action: match?.action || '',
      }
    })

    const wb = XLSX.utils.book_new()

    // ── Sheet 1: Enriched data ──────────────────────────────
    const ws = XLSX.utils.json_to_sheet(merged)
    // Column widths
    const colWidths = Object.keys(merged[0] || {}).map(k =>
      ({ wch: Math.max(k.length, ...merged.slice(0,20).map(r => String(r[k]||'').length), 10) + 2 })
    )
    ws['!cols'] = colWidths
    XLSX.utils.book_append_sheet(wb, ws, 'Enriched Data')

    // ── Sheet 2: Summary ────────────────────────────────────
    const hot = results.filter(r => r.score?.toLowerCase() === 'hot').length
    const warm = results.filter(r => r.score?.toLowerCase() === 'warm').length
    const cold = results.filter(r => r.score?.toLowerCase() === 'cold').length
    const summary = getLastSummary()
    const summaryRows = [
      ['Karthikey AI — ' + agent.name, '', '', ''],
      ['Generated', new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }), '', ''],
      ['', '', '', ''],
      ['SCORE SUMMARY', '', '', ''],
      ['Hot', hot, '', ''],
      ['Warm', warm, '', ''],
      ['Cold', cold, '', ''],
      ['Total', results.length, '', ''],
      ['', '', '', ''],
      ...(summary ? [['What this means for you', summary, '', ''], ['', '', '', '']] : []),
      ['TOP HOT RECORDS', '', '', ''],
      ['Name', 'Score', 'Reason', 'Next Action'],
      ...results
        .filter(r => r.score?.toLowerCase() === 'hot')
        .slice(0, 10)
        .map(r => [r.name, r.score, r.reason, r.action]),
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(summaryRows)
    ws2['!cols'] = [{ wch: 30 }, { wch: 60 }, { wch: 60 }, { wch: 40 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary')

    XLSX.writeFile(wb, `karthikey_enriched_${agentId}_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  // ── PDF ─────────────────────────────────────────────────────
  function exportPDF() {
    const text = getAgentTextOutput()
    const summary = getLastSummary()
    if (!text && !results?.length) return
    track(Events.EXPORT_PDF || 'export_pdf', { agentId })

    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const PW = doc.internal.pageSize.getWidth()
    const PH = doc.internal.pageSize.getHeight()
    const ML = 40, CW = PW - ML * 2
    let y = 0

    const checkY = (need = 20) => { if (y + need > PH - 36) { doc.addPage(); y = 48 } }

    // ── Header ──────────────────────────────────────────────
    doc.setFillColor(13, 27, 62)
    doc.rect(0, 0, PW, 54, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
    doc.setTextColor(255, 255, 255); doc.text('KARTHI', ML, 32)
    const kw = doc.getTextWidth('KARTHI')
    doc.setTextColor(144, 202, 249); doc.text('KEY', ML + kw, 32)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
    doc.setTextColor(200, 220, 255); doc.text(agent.name, ML, 46)
    const dateStr = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
    doc.setFontSize(8); doc.setTextColor(150, 180, 220)
    doc.text(dateStr, PW - ML - doc.getTextWidth(dateStr), 46)
    doc.setDrawColor(21, 101, 192); doc.setLineWidth(1.5); doc.line(0, 54, PW, 54)
    y = 74

    // ── Score summary boxes ─────────────────────────────────
    if (results?.length) {
      const hot = results.filter(r => r.score?.toLowerCase() === 'hot').length
      const warm = results.filter(r => r.score?.toLowerCase() === 'warm').length
      const cold = results.filter(r => r.score?.toLowerCase() === 'cold').length
      const boxW = (CW - 16) / 3
      const boxes = [
        { label: 'HOT', count: hot, bg: [254,243,199], text: [146,64,14] },
        { label: 'WARM', count: warm, bg: [239,246,255], text: [30,64,175] },
        { label: 'COLD', count: cold, bg: [241,245,249], text: [71,85,105] },
      ]
      boxes.forEach((b, i) => {
        const bx = ML + i * (boxW + 8)
        doc.setFillColor(...b.bg); doc.roundedRect(bx, y, boxW, 36, 4, 4, 'F')
        doc.setTextColor(...b.text); doc.setFont('helvetica', 'bold'); doc.setFontSize(20)
        doc.text(String(b.count), bx + boxW/2 - doc.getTextWidth(String(b.count))/2, y + 22)
        doc.setFontSize(7); doc.text(b.label, bx + boxW/2 - doc.getTextWidth(b.label)/2, y + 32)
      })
      y += 50
    }

    // ── What this means for you ─────────────────────────────
    if (summary) {
      checkY(50)
      doc.setFillColor(239, 246, 255)
      doc.roundedRect(ML, y, CW, 44, 4, 4, 'F')
      doc.setDrawColor(191, 219, 254); doc.setLineWidth(0.5)
      doc.roundedRect(ML, y, CW, 44, 4, 4, 'S')
      // Star icon replacement — small filled diamond
      doc.setFillColor(21, 101, 192)
      doc.circle(ML + 10, y + 10, 3, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5)
      doc.setTextColor(29, 78, 216)
      doc.text('WHAT THIS MEANS FOR YOU', ML + 17, y + 13)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      doc.setTextColor(15, 23, 42)
      const sumLines = doc.splitTextToSize(summary.replace(/₹/g, 'Rs.'), CW - 20)
      sumLines.slice(0, 3).forEach((l, li) => doc.text(l, ML + 10, y + 25 + li * 12))
      y += 54
    }

    // ── Main text ────────────────────────────────────────────
    if (text) {
      checkY(20); y += 8
      const cleanText = text.replace(/₹/g, 'Rs.').replace(/•/g, '-')
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42)
      doc.splitTextToSize(cleanText, CW).forEach(line => {
        checkY(13)
        const isBold = /^(Pipeline|Immediate|Next Action|Hot Deals|Warm Deals|Cold Deals|Summary)/.test(line)
        doc.setFont('helvetica', isBold ? 'bold' : 'normal')
        doc.setTextColor(isBold ? 13 : 15, isBold ? 27 : 23, isBold ? 62 : 42)
        doc.text(line, ML, y); y += 13
      })
    }

    // ── Results table ────────────────────────────────────────
    if (results?.length) {
      checkY(40); y += 12
      // Table header
      doc.setFillColor(13, 27, 62); doc.rect(ML, y - 2, CW, 18, 'F')
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
      const cols = [
        { label: 'Record',      x: ML + 4,            pct: 0.28 },
        { label: 'Score',       x: ML + CW * 0.28 + 4, pct: 0.09 },
        { label: 'Reason',      x: ML + CW * 0.37 + 4, pct: 0.35 },
        { label: 'Next Action', x: ML + CW * 0.72 + 4, pct: 0.28 },
      ]
      cols.forEach(c => doc.text(c.label, c.x, y + 11))
      y += 20

      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
      results.forEach((r, i) => {
        checkY(18)
        if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(ML, y - 2, CW, 17, 'F') }
        const score = (r.score || '').toLowerCase()
        const sc = SCORE_COLORS[score] || SCORE_COLORS.cold
        const [br, bg, bb] = score === 'hot' ? [146,64,14] : score === 'warm' ? [30,64,175] : [71,85,105]
        const [fr, fg, fb] = score === 'hot' ? [254,243,199] : score === 'warm' ? [239,246,255] : [241,245,249]
        // name
        doc.setTextColor(15, 23, 42)
        doc.text((r.name || '').replace(/₹/g, 'Rs.').substring(0, 36), cols[0].x, y + 10)
        // score badge
        doc.setFillColor(fr, fg, fb); doc.roundedRect(cols[1].x - 2, y, cols[1].pct * CW - 2, 12, 2, 2, 'F')
        doc.setTextColor(br, bg, bb); doc.setFont('helvetica', 'bold'); doc.setFontSize(7)
        const sl = (r.score || '').toUpperCase()
        doc.text(sl, cols[1].x + (cols[1].pct * CW - 4) / 2 - doc.getTextWidth(sl) / 2, y + 9)
        // reason
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(55, 65, 81)
        doc.text((r.reason || '').replace(/₹/g, 'Rs.').substring(0, 58), cols[2].x, y + 10)
        // action
        doc.setTextColor(21, 101, 192)
        doc.text((r.action || '').substring(0, 40), cols[3].x, y + 10)
        y += 17
      })
    }

    // ── Footer on every page ─────────────────────────────────
    const total = doc.internal.getNumberOfPages()
    for (let p = 1; p <= total; p++) {
      doc.setPage(p)
      doc.setFillColor(248, 250, 252); doc.rect(0, PH - 22, PW, 22, 'F')
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.5); doc.line(0, PH - 22, PW, PH - 22)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 116, 139)
      doc.text('Karthikey AI  ·  agents.karthikey.in  ·  Confidential', ML, PH - 8)
      doc.text(`Page ${p} of ${total}`, PW - ML - 36, PH - 8)
    }

    doc.save(`karthikey_${agent.name.replace(/\s+/g,'-').toLowerCase()}_${new Date().toISOString().slice(0,10)}.pdf`)
  }

  // ── Word doc ─────────────────────────────────────────────────
  async function exportWord() {
    const text = getAgentTextOutput()
    const summary = getLastSummary()
    if (!text && !results?.length) return
    track(Events.EXPORT_WORD || 'export_word', { agentId })

    const NAVY = '0D1B3E', BLUE = '1565C0', LTBLUE = 'EFF6FF', GRAY = '64748B'
    const date = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
    const hot = results?.filter(r => r.score?.toLowerCase() === 'hot').length || 0
    const warm = results?.filter(r => r.score?.toLowerCase() === 'warm').length || 0
    const cold = results?.filter(r => r.score?.toLowerCase() === 'cold').length || 0

    const ps = []

    // Brand header
    ps.push(new Paragraph({
      children: [
        new TextRun({ text: 'KARTHI', bold: true, size: 34, color: NAVY }),
        new TextRun({ text: 'KEY', bold: true, size: 34, color: BLUE }),
        new TextRun({ text: '  AI Agent Platform', size: 22, color: GRAY }),
      ],
      spacing: { after: 80 },
    }))

    ps.push(new Paragraph({
      text: agent.name,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 60 },
    }))

    ps.push(new Paragraph({
      children: [
        new TextRun({ text: `Generated: ${date}`, size: 18, color: GRAY }),
        ...(results?.length ? [new TextRun({ text: `   ·   ${results.length} records — ${hot} Hot · ${warm} Warm · ${cold} Cold`, size: 18, color: BLUE, bold: true })] : []),
      ],
      spacing: { after: 280 },
    }))

    // What this means for you
    if (summary) {
      ps.push(new Paragraph({
        children: [new TextRun({ text: '★  WHAT THIS MEANS FOR YOU', bold: true, size: 18, color: BLUE })],
        spacing: { before: 120, after: 80 },
        shading: { type: ShadingType.SOLID, fill: LTBLUE },
      }))
      ps.push(new Paragraph({
        children: [new TextRun({ text: summary, size: 20, color: '0F172A' })],
        spacing: { after: 280 },
        shading: { type: ShadingType.SOLID, fill: LTBLUE },
        indent: { left: 200 },
      }))
    }

    // Main narrative text
    if (text) {
      text.split('\n').forEach(line => {
        if (!line.trim()) { ps.push(new Paragraph({ text: '', spacing: { after: 60 } })); return }
        const isBullet = line.startsWith('•') || line.startsWith('-')
        const isHead = /^(Pipeline|Immediate|Next Action|Hot Deals|Warm Deals|Cold Deals|Summary)/.test(line)
        if (isHead) {
          ps.push(new Paragraph({
            children: [new TextRun({ text: line.replace(/^[•\-]\s*/, ''), bold: true, size: 20, color: NAVY })],
            spacing: { before: 180, after: 60 },
          }))
        } else if (isBullet) {
          ps.push(new Paragraph({
            children: [new TextRun({ text: line.replace(/^[•\-]\s*/, ''), size: 20 })],
            bullet: { level: 0 },
            spacing: { after: 60 },
          }))
        } else {
          ps.push(new Paragraph({
            children: [new TextRun({ text: line, size: 20 })],
            spacing: { after: 60 },
          }))
        }
      })
    }

    // Results table
    if (results?.length) {
      ps.push(new Paragraph({ text: '', spacing: { before: 280 } }))
      ps.push(new Paragraph({ text: 'AI Scored Results', heading: HeadingLevel.HEADING_2, spacing: { after: 120 } }))

      const hCell = (label) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18, color: 'FFFFFF' })] })],
        shading: { fill: NAVY, type: ShadingType.SOLID },
        width: { size: 25, type: WidthType.PERCENTAGE },
      })
      const dCell = (t, opts = {}) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: String(t || ''), size: 17, ...opts })] })],
        width: { size: 25, type: WidthType.PERCENTAGE },
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
      })
      const scoreColor = s => s === 'hot' ? 'DC2626' : s === 'warm' ? '2563EB' : '64748B'

      ps.push(new Table({
        rows: [
          new TableRow({ children: ['Record','Score','Reason','Next Action'].map(hCell), tableHeader: true }),
          ...results.map((r, i) => new TableRow({
            children: [
              dCell(r.name || ''),
              dCell((r.score || '').toUpperCase(), { bold: true, color: scoreColor(r.score?.toLowerCase()) }),
              dCell(r.reason || ''),
              dCell(r.action || '', { color: BLUE }),
            ],
          }))
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }))
    }

    // Footer
    ps.push(new Paragraph({ text: '', spacing: { before: 560 } }))
    ps.push(new Paragraph({
      children: [new TextRun({ text: 'Karthikey AI  ·  agents.karthikey.in  ·  Confidential', size: 16, color: '94A3B8' })],
      alignment: AlignmentType.CENTER,
    }))

    const blob = await Packer.toBlob(new Document({ sections: [{ properties: {}, children: ps }] }))
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `karthikey_${agent.name.replace(/\s+/g,'-').toLowerCase()}_${new Date().toISOString().slice(0,10)}.docx`
    a.click(); URL.revokeObjectURL(url)
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
        body: { to: emailTo, agentName: agent?.name || agentId, output: text, results: results || [], appUrl: window.location.origin }
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

  // ── RENDER ───────────────────────────────────────────────────
  return (
    <>
      {/* Email modal */}
      {showEmailModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Email agent output</div>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Send the AI analysis to any email address.</p>
            {emailSent ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#16A34A', fontWeight: 500 }}>Email sent successfully!</div>
            ) : (
              <>
                <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)}
                  placeholder="recipient@company.com"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowEmailModal(false)} style={{ flex: 1, padding: 9, border: '1px solid #D1D5DB', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={sendEmail} disabled={emailSending || !emailTo}
                    style={{ flex: 1, padding: 9, border: 'none', borderRadius: 8, background: '#1565C0', color: '#fff', fontSize: 13, fontWeight: 600, cursor: emailSending ? 'not-allowed' : 'pointer' }}>
                    {emailSending ? 'Sending…' : 'Send email →'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Topbar />
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '24px 24px 60px' }}>

        {/* Breadcrumb + credits */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <Link href="/agents" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none' }}>← Marketplace</Link>
          <span style={{ color: '#D1D5DB' }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{agent.name}</span>
          <span style={{ background: '#EFF6FF', color: '#1565C0', border: '0.5px solid #BFDBFE', borderRadius: 10, padding: '1px 9px', fontSize: 11, fontWeight: 600 }}>{agent.badge}</span>
          <div style={{ marginLeft: 'auto', background: '#FFFBEB', border: '0.5px solid #FDE68A', borderRadius: 20, padding: '3px 12px', fontSize: 12, color: '#92400E' }}>
            ⚡ {credits} credits remaining
          </div>
        </div>

        {/* ── STEP 1: Upload zone ─────────────────────────────── */}
        <section style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            {step === 'upload' ? 'Step 1 — load your data' : `✅ ${data?.length} records loaded · ${columns.length} columns`}
          </div>

          {data && data.length > BATCH_SIZE && (
            <div style={{ background: '#EFF6FF', border: '0.5px solid #BFDBFE', borderRadius: 8, padding: '8px 14px', marginBottom: 10, fontSize: 12, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📦</span>
              <span><strong>{data.length} records</strong> · {totalBatches} batches of {BATCH_SIZE} · <strong>{batchCreditCost} credit{batchCreditCost > 1 ? 's' : ''}</strong> to score all</span>
            </div>
          )}

          {step === 'upload' ? (
            <div
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) parseFile(f) }}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              style={{ border: `1.5px dashed ${dragOver ? '#1565C0' : '#D1D5DB'}`, borderRadius: 12, padding: '36px 20px', textAlign: 'center', cursor: 'pointer', background: dragOver ? '#EFF6FF' : '#FAFAFA', transition: 'all 0.12s' }}>
              <input ref={fileRef} type="file" accept=".xlsx,.csv,.xls" onChange={e => { if (e.target.files[0]) parseFile(e.target.files[0]) }} style={{ display: 'none' }} />
              <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 5, color: '#0F172A' }}>Drop your Excel or CSV file here</div>
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 6 }}>Any industry · Any CRM export · .xlsx, .xls, .csv</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>Parsed in your browser — data never leaves your device</div>
              <button onClick={e => { e.stopPropagation(); loadSample() }}
                style={{ border: '1px solid #D1D5DB', borderRadius: 7, padding: '7px 16px', fontSize: 13, background: '#fff', cursor: 'pointer', color: '#374151' }}>
                Or load sample data →
              </button>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '0.5px solid #E2E8F0', borderRadius: 10, padding: 14 }}>
              <div style={{ overflowX: 'auto', marginBottom: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
                  <thead>
                    <tr>{columns.slice(0,6).map(c => <th key={c} style={{ textAlign: 'left', padding: '5px 8px', background: '#F9FAFB', fontSize: 11, color: '#6B7280', borderBottom: '0.5px solid #E5E7EB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {data.slice(0,5).map((row, i) => (
                      <tr key={i}>{columns.slice(0,6).map(c => <td key={c} style={{ padding: '5px 8px', borderBottom: '0.5px solid #F3F4F6', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(row[c] ?? '')}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
                {data.length > 5 && <div style={{ textAlign: 'center', padding: 5, fontSize: 12, color: '#94A3B8' }}>+ {data.length - 5} more records</div>}
              </div>
              <button onClick={() => { setData(null); setColumns([]); setStep('upload'); setMessages([]); setResults(null); historyRef.current = [] }}
                style={{ border: '0.5px solid #D1D5DB', borderRadius: 6, padding: '5px 12px', fontSize: 12, background: '#fff', cursor: 'pointer', color: '#64748B' }}>
                Load different file
              </button>
            </div>
          )}
        </section>

        {/* ── Score all button ────────────────────────────────── */}
        {isScoringAgent && data && data.length > 0 && step === 'ready' && (
          <section style={{ marginBottom: 20 }}>
            <button onClick={runBatchScore} disabled={batchLoading}
              style={{ width: '100%', padding: '12px', fontSize: 14, fontWeight: 600, background: batchLoading ? '#93C5FD' : '#1565C0', color: '#fff', border: 'none', borderRadius: 9, cursor: batchLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s' }}>
              {batchLoading
                ? `⏳ Scoring batch ${batchProgress?.current || '…'} of ${batchProgress?.total || totalBatches}…`
                : `🎯 Score all ${data.length} records · ${batchCreditCost} credit${batchCreditCost > 1 ? 's' : ''}`}
            </button>
          </section>
        )}

        {/* ── STEP 2: Chat panel ──────────────────────────────── */}
        <section style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            {agent.icon} Agent — {agent.name}
          </div>
          <div style={{ background: '#fff', border: '0.5px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
            {/* Agent header */}
            <div style={{ background: '#0D1B3E', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>{agent.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{agent.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{agent.desc}</div>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 10 }}>Claude AI</span>
            </div>

            {/* Quick actions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '8px 14px', borderBottom: '0.5px solid #F3F4F6', background: '#FAFAFA' }}>
              {(agent.quickActions || []).filter(q => !q.toLowerCase().includes('score all')).map(q => (
                <button key={q} onClick={() => sendChat(q)} disabled={step === 'upload' || loading || batchLoading}
                  style={{ fontSize: 11, padding: '3px 10px', border: '0.5px solid #D1D5DB', borderRadius: 20, cursor: step === 'upload' ? 'not-allowed' : 'pointer', background: 'white', color: step === 'upload' ? '#9CA3AF' : '#374151', opacity: step === 'upload' ? 0.5 : 1, transition: 'all 0.12s' }}>
                  {q}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div ref={chatRef} style={{ minHeight: 220, maxHeight: 400, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8', fontSize: 13 }}>
                  {step === 'upload' ? '👆 Load your data above — works with any CRM or Excel file.' : '👋 Data loaded. Use the score button above or ask me anything.'}
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {/* What this means for you */}
                  {m.role === 'agent' && m.summary && (
                    <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 14px', marginBottom: 6, width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="#1565C0"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#1565C0', letterSpacing: '0.06em', textTransform: 'uppercase' }}>What this means for you</span>
                      </div>
                      <p style={{ fontSize: 12, color: '#0F172A', lineHeight: 1.65, margin: 0 }}>{m.summary}</p>
                    </div>
                  )}
                  {/* Message bubble */}
                  <div style={{ padding: '9px 13px', borderRadius: 12, fontSize: 12, lineHeight: 1.65, background: m.role === 'user' ? '#1565C0' : '#F8FAFC', color: m.role === 'user' ? '#fff' : '#1E293B', border: m.role === 'agent' ? '0.5px solid #E5E7EB' : 'none', borderBottomRightRadius: m.role === 'user' ? 3 : 12, borderBottomLeftRadius: m.role === 'agent' ? 3 : 12, width: '100%' }}>
                    {m.role === 'agent' ? <AgentMessage text={m.text} /> : m.text}
                  </div>
                  {/* Score preview */}
                  {m.role === 'agent' && m.scores?.length > 0 && (
                    <div style={{ marginTop: 6, alignSelf: 'flex-start', width: '100%' }}>
                      <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>📊 {m.scores.length} records scored — full table below</div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {m.scores.slice(0,3).map((sc, j) => (
                          <div key={j} style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '4px 8px', fontSize: 11 }}>
                            <span style={{ fontWeight: 500 }}>{sc.name}</span>{' · '}<ScoreBadge score={sc.score} />
                          </div>
                        ))}
                        {m.scores.length > 3 && <div style={{ fontSize: 11, color: '#64748B', padding: '4px 0' }}>+{m.scores.length - 3} more</div>}
                      </div>
                    </div>
                  )}
                  <span style={{ fontSize: 10, color: '#94A3B8', marginTop: 3 }}>{m.time}</span>
                </div>
              ))}

              {/* Loaders */}
              {prefillLoading && (
                <div style={{ alignSelf: 'flex-start', padding: '10px 14px', background: '#EFF6FF', border: '0.5px solid #BFDBFE', borderRadius: 12, borderBottomLeftRadius: 3, fontSize: 12, color: '#1D4ED8', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, border: '2px solid #BFDBFE', borderTopColor: '#1565C0', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }}/>
                  Analysing your data columns…
                </div>
              )}
              {(loading || batchLoading) && (
                <div style={{ alignSelf: 'flex-start', padding: '10px 14px', background: '#F9FAFB', border: '0.5px solid #E5E7EB', borderRadius: 12, borderBottomLeftRadius: 3 }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[0,200,400].map(d => <div key={d} style={{ width: 5, height: 5, borderRadius: '50%', background: '#9CA3AF', animation: `bounce 1.2s ${d}ms infinite` }} />)}
                    <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 4 }}>
                      {batchLoading ? `Processing batch ${batchProgress?.current || '…'} of ${batchProgress?.total || totalBatches}…` : 'Analysing…'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Input row */}
            <div style={{ borderTop: '0.5px solid #E5E7EB', padding: '10px 12px', display: 'flex', gap: 8, background: '#fff' }}>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
                placeholder={step === 'upload' ? 'Load your data first…' : 'Ask the agent anything about your data…'}
                disabled={step === 'upload' || loading || batchLoading}
                style={{ flex: 1, border: '1px solid #E2E8F0', borderRadius: 8, padding: '9px 13px', fontSize: 13, color: '#1E293B', background: step === 'upload' ? '#F9FAFB' : '#fff', outline: 'none', fontFamily: 'inherit' }} />
              <button onClick={() => sendChat()} disabled={!input.trim() || loading || batchLoading || step === 'upload'}
                style={{ background: (!input.trim() || loading || step === 'upload') ? '#93C5FD' : '#1565C0', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: (!input.trim() || loading || step === 'upload') ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                Ask ↗
              </button>
            </div>
          </div>
        </section>

        {/* ── STEP 3: Results table ────────────────────────────── */}
        {results && results.length > 0 && (
          <section style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                AI scored results — {results.length} records
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                {[['hot','🔥','#92400E','#FEF3C7'],['warm','🌡️','#1E40AF','#EFF6FF'],['cold','❄️','#475569','#F1F5F9']].map(([s,e,c,bg]) => (
                  <span key={s} style={{ fontSize: 11, padding: '2px 9px', background: bg, color: c, borderRadius: 10 }}>
                    {e} {results.filter(r => r.score?.toLowerCase() === s).length} {s.charAt(0).toUpperCase()+s.slice(1)}
                  </span>
                ))}
              </div>
            </div>
            <ResultsTable results={results} />
          </section>
        )}

        {/* ── STEP 4: Export bar ───────────────────────────────── */}
        {results && results.length > 0 && (
          <section>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Export</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={exportExcel} style={{ border: '0.5px solid #D1D5DB', borderRadius: 7, padding: '7px 14px', fontSize: 12, background: '#fff', cursor: 'pointer', color: '#374151' }}>📊 Excel scores</button>
              <button onClick={exportEnriched} style={{ border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, background: '#1565C0', cursor: 'pointer', color: '#fff', fontWeight: 600 }}>📥 Excel enriched</button>
              <button onClick={exportPDF} style={{ border: '0.5px solid #D1D5DB', borderRadius: 7, padding: '7px 14px', fontSize: 12, background: '#fff', cursor: 'pointer', color: '#374151' }}>📄 PDF report</button>
              <button onClick={exportWord} style={{ border: '0.5px solid #D1D5DB', borderRadius: 7, padding: '7px 14px', fontSize: 12, background: '#fff', cursor: 'pointer', color: '#374151' }}>📝 Word doc</button>
              <button onClick={() => setShowEmailModal(true)} style={{ border: '0.5px solid #D1D5DB', borderRadius: 7, padding: '7px 14px', fontSize: 12, background: '#fff', cursor: 'pointer', color: '#374151' }}>✉️ Email</button>
            </div>
          </section>
        )}

      </main>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes bounce { 0%,80%,100% { transform: scale(0.6) } 40% { transform: scale(1) } }
      `}</style>
    </>
  )
}
