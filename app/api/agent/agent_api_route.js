import { supabaseAdmin } from '../../../lib/supabase'
import { AGENTS } from '../../../lib/agents'
import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  try {
    const { agentId, question, data, history } = await req.json()
    const agent = AGENTS.find(a => a.id === agentId)
    if (!agent) return Response.json({ error: 'Agent not found' }, { status: 404 })

    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return Response.json({ error: 'Unauthorised' }, { status: 401 })

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data: { user }, error: authError } = await sb.auth.getUser(token)
    if (authError || !user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: acc } = await supabaseAdmin.from('accounts').select('credits').eq('id', user.id).single()
    if (!acc || acc.credits < agent.credits) return Response.json({ error: 'Insufficient credits' }, { status: 402 })

    const dataContext = data?.length
      ? `\n\nLoaded data (${data.length} records):\n${JSON.stringify(data.slice(0, 25), null, 2)}`
      : ''

    const systemPrompt = `You are Karthikey's ${agent.name} AI agent, part of India's leading CRM AI platform.
Department: ${agent.dept}
Purpose: ${agent.desc}
${dataContext}

Rules:
- Be concise and actionable (3-5 sentences or a short bullet list)
- Reference specific names, values, and numbers from the data
- For lead scoring: respond ONLY with this exact format — first the JSON object, then a plain text summary:
{"scores":[{"name":"...","score":"Hot/Warm/Cold","reason":"...","action":"..."},...]}
Then write your summary paragraph AFTER the JSON on a new line. Do NOT wrap the JSON in backticks or code blocks.
- For emails: write ready-to-send emails with subject line
- For analysis: give specific numbers, percentages, insights
- Always end with one clear recommended next action
- You work for Karthikey (karthikey.in) — be professional, warm, and concise`

    const messages = [...(history?.slice(-8) || [])]
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== question) {
      messages.push({ role: 'user', content: question })
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1200, system: systemPrompt, messages })
    })

    const json = await res.json()
    const rawReply = json.content?.[0]?.text || 'No response from agent.'

    // Extract scores JSON server-side — handle all patterns
    let scores = null
    let cleanReply = rawReply

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
          if (parsed.scores?.length) {
            scores = parsed.scores
            cleanReply = rawReply
              .replace(/```json[\s\S]*?```/g, '')
              .replace(/```[\s\S]*?```/g, '')
              .replace(/\{"scores"\s*:\s*\[[\s\S]*?\]\s*\}/g, '')
              .trim()
          }
        } catch (_) {}
        break
      }
    }

    // Deduct credits
    await supabaseAdmin.from('accounts').update({ credits: acc.credits - agent.credits }).eq('id', user.id)
    await supabaseAdmin.from('usage_log').insert({
      user_id: user.id, agent_id: agentId, agent_name: agent.name,
      credits_used: agent.credits, dept: agent.dept
    })

    return Response.json({ reply: cleanReply, scores })
  } catch (err) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
