import { supabaseAdmin } from '../../../lib/supabase'
import { AGENTS } from '../../../lib/agents'
import { createClient } from '@supabase/supabase-js'

// ── Constants ─────────────────────────────────────────────────
const BATCH_SIZE = 25          // Records per Claude call (optimal for context window)
const MAX_COLUMNS = 15         // Max columns sent to Claude (trim noise)
const MAX_TOKENS = 1800        // Increased for batch responses
const MAX_HISTORY = 6          // Conversation turns to keep

// ── Column pruning — remove low-value columns ──────────────────
const SKIP_COLUMNS = ['id', 'ID', 'Sr No', 'Serial', 'Timestamp', 'Created At',
  'Updated At', 'created_at', 'updated_at', 'uuid', 'UUID', 'Row Number']

function pruneData(rows) {
  if (!rows?.length) return rows
  const allCols = Object.keys(rows[0])
  // Remove skip columns and keep MAX_COLUMNS most relevant
  const cols = allCols
    .filter(c => !SKIP_COLUMNS.some(s => c.toLowerCase().includes(s.toLowerCase())))
    .slice(0, MAX_COLUMNS)
  return rows.map(row => {
    const pruned = {}
    cols.forEach(c => { pruned[c] = row[c] })
    return pruned
  })
}

// ── Batch a scoring question into multiple Claude calls ────────
async function batchScore(agent, data, apiKey) {
  const pruned = pruneData(data)
  const batches = []
  for (let i = 0; i < pruned.length; i += BATCH_SIZE) {
    batches.push(pruned.slice(i, i + BATCH_SIZE))
  }

  const allScores = []
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    const batchContext = `\n\nBatch ${i + 1} of ${batches.length} (records ${i * BATCH_SIZE + 1}–${i * BATCH_SIZE + batch.length} of ${data.length} total):\n${JSON.stringify(batch, null, 2)}`

    const systemPrompt = buildSystemPrompt(agent, batchContext)
    const messages = [{ role: 'user', content: `Score all ${batch.length} records in this batch. Return the JSON scores array for every record.` }]

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: MAX_TOKENS, system: systemPrompt, messages })
    })
    const json = await res.json()
    const rawReply = json.content?.[0]?.text || ''
    const scores = extractScores(rawReply)
    if (scores) allScores.push(...scores)
  }
  return allScores
}

// ── Build system prompt ────────────────────────────────────────
function buildSystemPrompt(agent, dataContext) {
  return `You are Karthikey's ${agent.name} AI agent, part of India's leading CRM AI platform.
Works for ANY industry — real estate, SaaS, banking, healthcare, retail, education, logistics, and more.
Department: ${agent.dept}
Purpose: ${agent.desc}
${dataContext}

Rules:
- Be concise and actionable
- Reference specific names and values from the data
- For lead/record scoring: respond ONLY with this exact format:
{"scores":[{"name":"...","score":"Hot/Warm/Cold","reason":"...","action":"..."},...]}
Then write a brief summary paragraph. Do NOT wrap JSON in backticks.
- Score EVERY record in the data — do not skip any
- For emails: write ready-to-send email with subject line
- For analysis: give specific numbers and percentages
- Always end with one clear recommended next action
- You work for Karthikey (karthikey.in) — professional, warm, concise`
}

// ── Extract JSON scores from Claude response ───────────────────
function extractScores(rawReply) {
  const patterns = [
    /```json\s*(\{"scores"\s*:\s*\[[\s\S]*?\]\s*\})\s*```/,
    /```\s*(\{"scores"\s*:\s*\[[\s\S]*?\]\s*\})\s*```/,
    /(\{"scores"\s*:\s*\[[\s\S]*?\]\s*\})/,
  ]
  for (const pattern of patterns) {
    const match = rawReply.match(pattern)
    if (match) {
      try {
        const parsed = JSON.parse(match[1] || match[0])
        if (parsed.scores?.length) return parsed.scores
      } catch (_) {}
    }
  }
  return null
}

// ── Clean reply text ───────────────────────────────────────────
function cleanReplyText(rawReply) {
  return rawReply
    .replace(/```json[\s\S]*?```/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\{"scores"\s*:\s*\[[\s\S]*?\]\s*\}/g, '')
    .trim()
}

// ── Credit cost for large datasets ────────────────────────────
function calcCredits(agent, rowCount) {
  const batches = Math.ceil(rowCount / BATCH_SIZE)
  // 1 credit per batch for scoring agents, base credits for others
  const isScoring = ['lead-qual', 'lead-score', 'case-class', 'sentiment',
    'pipeline', 'crm-hygiene', 'data-qual', 'quote-rev', 'renewal'].includes(agent.id)
  return isScoring ? Math.max(agent.credits, batches) : agent.credits
}

// ── Main handler ───────────────────────────────────────────────
export async function POST(req) {
  try {
    const { agentId, question, data, history, isBatchScore } = await req.json()
    const agent = AGENTS.find(a => a.id === agentId)
    if (!agent) return Response.json({ error: 'Agent not found' }, { status: 404 })

    // Auth
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return Response.json({ error: 'Unauthorised' }, { status: 401 })
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data: { user }, error: authError } = await sb.auth.getUser(token)
    if (authError || !user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

    // Credits check — calculate cost for data volume
    const rowCount = data?.length || 0
    const creditCost = calcCredits(agent, rowCount)
    const { data: acc } = await supabaseAdmin.from('accounts').select('credits').eq('id', user.id).single()
    if (!acc || acc.credits < creditCost) {
      return Response.json({
        error: `Insufficient credits. This run requires ${creditCost} credits (${Math.ceil(rowCount / BATCH_SIZE)} batches × ${agent.credits} credit). You have ${acc?.credits || 0}.`
      }, { status: 402 })
    }

    let scores = null
    let cleanReply = ''

    // ── BATCH SCORING: run multiple Claude calls for large datasets
    if (isBatchScore && data?.length > BATCH_SIZE) {
      scores = await batchScore(agent, data, process.env.ANTHROPIC_API_KEY)
      const hotCount = scores.filter(s => s.score?.toLowerCase() === 'hot').length
      const warmCount = scores.filter(s => s.score?.toLowerCase() === 'warm').length
      const coldCount = scores.filter(s => s.score?.toLowerCase() === 'cold').length
      cleanReply = `Scored all ${scores.length} records across ${Math.ceil(data.length / BATCH_SIZE)} batches.\n\n🔥 ${hotCount} Hot  ·  🌡️ ${warmCount} Warm  ·  ❄️ ${coldCount} Cold\n\nRecommended action: Focus immediately on the ${hotCount} Hot records — see the full scored table on the left.`
    }
    // ── SINGLE CALL: conversational questions or small datasets
    else {
      const pruned = pruneData(data)
      const dataContext = pruned?.length
        ? `\n\nLoaded data (${pruned.length} of ${rowCount} total records shown):\n${JSON.stringify(pruned.slice(0, BATCH_SIZE), null, 2)}`
        : ''

      if (rowCount > BATCH_SIZE && !isBatchScore) {
        cleanReply = `⚠️ Note: Your file has ${rowCount} records. This analysis used the first ${BATCH_SIZE} records. To score ALL records, click the "Score all ${rowCount} records" button above.\n\n`
      }

      const systemPrompt = buildSystemPrompt(agent, dataContext)
      const messages = [...(history?.slice(-MAX_HISTORY) || [])]
      const lastMsg = messages[messages.length - 1]
      if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== question) {
        messages.push({ role: 'user', content: question })
      }

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

    // Deduct credits + log
    await supabaseAdmin.from('accounts').update({ credits: acc.credits - creditCost }).eq('id', user.id)
    await supabaseAdmin.from('usage_log').insert({
      user_id: user.id, agent_id: agentId, agent_name: agent.name,
      credits_used: creditCost, dept: agent.dept
    })

    return Response.json({ reply: cleanReply, scores, creditCost, totalRows: rowCount })
  } catch (err) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
