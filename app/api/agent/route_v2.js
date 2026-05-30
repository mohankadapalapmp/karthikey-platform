import { supabaseAdmin } from '../../../lib/supabase'
import { AGENTS } from '../../../lib/agents'
import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE = 25
const MAX_COLUMNS = 15
const MAX_TOKENS = 1800
const MAX_HISTORY = 6

const SKIP_COLUMNS = ['id','ID','Sr No','Serial','Timestamp','Created At','Updated At','created_at','updated_at','uuid','UUID']

function pruneData(rows) {
  if (!rows?.length) return rows
  const cols = Object.keys(rows[0]).filter(c => !SKIP_COLUMNS.some(s => c.toLowerCase().includes(s.toLowerCase()))).slice(0, MAX_COLUMNS)
  return rows.map(row => { const p = {}; cols.forEach(c => { p[c] = row[c] }); return p })
}

async function batchScore(agent, data, apiKey) {
  const pruned = pruneData(data)
  const batches = []
  for (let i = 0; i < pruned.length; i += BATCH_SIZE) batches.push(pruned.slice(i, i + BATCH_SIZE))
  const allScores = []
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    const batchContext = `\n\nBatch ${i+1} of ${batches.length} (records ${i*BATCH_SIZE+1}–${i*BATCH_SIZE+batch.length} of ${data.length} total):\n${JSON.stringify(batch, null, 2)}`
    const systemPrompt = buildSystemPrompt(agent, batchContext)
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: MAX_TOKENS, system: systemPrompt, messages: [{ role: 'user', content: `Score all ${batch.length} records in this batch.` }] })
    })
    const json = await res.json()
    const scores = extractScores(json.content?.[0]?.text || '')
    if (scores) allScores.push(...scores)
  }
  return allScores
}

function buildSystemPrompt(agent, dataContext) {
  return `You are Karthikey's ${agent.name} AI agent — India's leading CRM AI platform.
Works for ANY industry: real estate, SaaS, banking, healthcare, retail, education, logistics.
Department: ${agent.dept} | Purpose: ${agent.desc}
${dataContext}

Rules:
- Be concise and actionable
- For lead/record scoring: {"scores":[{"name":"...","score":"Hot/Warm/Cold","reason":"...","action":"..."},...]}
  Then plain text summary. Do NOT wrap JSON in backticks. Score EVERY record.
- For emails: subject line + full body
- Always end with one clear next action`
}

function extractScores(rawReply) {
  const patterns = [/```json\s*(\{"scores"\s*:\s*\[[\s\S]*?\]\s*\})\s*```/, /```\s*(\{"scores"\s*:\s*\[[\s\S]*?\]\s*\})\s*```/, /(\{"scores"\s*:\s*\[[\s\S]*?\]\s*\})/]
  for (const p of patterns) {
    const m = rawReply.match(p)
    if (m) { try { const d = JSON.parse(m[1]||m[0]); if (d.scores?.length) return d.scores } catch(_){} }
  }
  return null
}

function cleanReplyText(raw) {
  return raw.replace(/```json[\s\S]*?```/g,'').replace(/```[\s\S]*?```/g,'').replace(/\{"scores"\s*:\s*\[[\s\S]*?\]\s*\}/g,'').trim()
}

function calcCredits(agent, rowCount) {
  const batches = Math.ceil(rowCount / BATCH_SIZE)
  const isScoring = ['lead-qual','lead-score','case-class','sentiment','pipeline','crm-hygiene','data-qual','quote-rev','renewal'].includes(agent.id)
  return isScoring ? Math.max(agent.credits, batches) : agent.credits
}

export async function POST(req) {
  try {
    const { agentId, question, data, history, isBatchScore } = await req.json()
    const agent = AGENTS.find(a => a.id === agentId)
    if (!agent) return Response.json({ error: 'Agent not found' }, { status: 404 })

    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return Response.json({ error: 'Unauthorised' }, { status: 401 })

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data: { user }, error: authError } = await sb.auth.getUser(token)
    if (authError || !user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

    const rowCount = data?.length || 0
    const creditCost = calcCredits(agent, rowCount)

    // ── Check if user belongs to an org ──────────────────────
    const { data: orgMember } = await supabaseAdmin
      .from('org_members')
      .select('org_id, role, organisations(id, name, credits)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    const useOrgCredits = !!orgMember?.org_id
    const orgId = orgMember?.org_id || null
    const orgCredits = orgMember?.organisations?.credits || 0

    // ── Credit check ──────────────────────────────────────────
    if (useOrgCredits) {
      if (orgCredits < creditCost) {
        return Response.json({ error: `Insufficient org credits. Need ${creditCost}, org has ${orgCredits}. Ask your admin to top up.` }, { status: 402 })
      }
    } else {
      const { data: acc } = await supabaseAdmin.from('accounts').select('credits').eq('id', user.id).single()
      if (!acc || acc.credits < creditCost) {
        return Response.json({ error: `Insufficient credits. Need ${creditCost}, you have ${acc?.credits || 0}.` }, { status: 402 })
      }
    }

    let scores = null
    let cleanReply = ''

    // ── Execute ───────────────────────────────────────────────
    if (isBatchScore && data?.length > BATCH_SIZE) {
      scores = await batchScore(agent, data, process.env.ANTHROPIC_API_KEY)
      const hot = scores.filter(s => s.score?.toLowerCase()==='hot').length
      const warm = scores.filter(s => s.score?.toLowerCase()==='warm').length
      const cold = scores.filter(s => s.score?.toLowerCase()==='cold').length
      cleanReply = `Scored all ${scores.length} records across ${Math.ceil(data.length/BATCH_SIZE)} batches.\n\n🔥 ${hot} Hot  ·  🌡️ ${warm} Warm  ·  ❄️ ${cold} Cold\n\nFocus immediately on the ${hot} Hot records — see the full scored table on the left.`
    } else {
      const pruned = pruneData(data)
      const dataContext = pruned?.length ? `\n\nLoaded data (${pruned.length} records):\n${JSON.stringify(pruned.slice(0, BATCH_SIZE), null, 2)}` : ''
      if (rowCount > BATCH_SIZE && !isBatchScore) {
        cleanReply = `⚠️ Large file detected (${rowCount} records). This analysis used the first ${BATCH_SIZE}. Click "Score all ${rowCount} records" to process all.\n\n`
      }
      const systemPrompt = buildSystemPrompt(agent, dataContext)
      const messages = [...(history?.slice(-MAX_HISTORY) || [])]
      const lastMsg = messages[messages.length-1]
      if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== question) messages.push({ role: 'user', content: question })
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: MAX_TOKENS, system: systemPrompt, messages })
      })
      const json = await res.json()
      const rawReply = json.content?.[0]?.text || 'No response from agent.'
      scores = extractScores(rawReply)
      cleanReply += cleanReplyText(rawReply)
    }

    // ── Deduct credits ────────────────────────────────────────
    if (useOrgCredits) {
      await supabaseAdmin.from('organisations').update({ credits: orgCredits - creditCost }).eq('id', orgId)
    } else {
      const { data: acc } = await supabaseAdmin.from('accounts').select('credits').eq('id', user.id).single()
      await supabaseAdmin.from('accounts').update({ credits: acc.credits - creditCost }).eq('id', user.id)
    }

    // ── Log usage ─────────────────────────────────────────────
    await supabaseAdmin.from('usage_log').insert({
      user_id: user.id, agent_id: agentId, agent_name: agent.name,
      credits_used: creditCost, dept: agent.dept,
      org_id: orgId
    })

    return Response.json({ reply: cleanReply, scores, creditCost, totalRows: rowCount, orgCredits: useOrgCredits ? orgCredits - creditCost : null })
  } catch (err) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
