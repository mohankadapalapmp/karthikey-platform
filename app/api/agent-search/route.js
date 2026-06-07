import { AGENTS } from '../../../lib/agents'

export async function POST(req) {
  try {
    const { query } = await req.json()
    if (!query || query.trim().length < 3) {
      return Response.json({ results: [] })
    }

    const agentList = AGENTS.map(a =>
      `id:${a.id} | name:${a.name} | dept:${a.dept} | desc:${a.desc} | keywords:${(a.keywords||[]).join(',')}`
    ).join('\n')

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: 'You are an AI agent search assistant for Karthikey, a CRM & sales AI platform. Given a user query, return the most relevant agents. Respond ONLY with a valid JSON array, no markdown, no explanation. Each item: {"id":"agent-id","reason":"one short sentence why this matches"}. Return max 8 results ordered by relevance. If nothing matches, return [].',
        messages: [{ role: 'user', content: `Query: "${query.trim()}"\n\nAgents:\n${agentList}` }]
      })
    })

    const data = await res.json()
    const text = data?.content?.[0]?.text || '[]'
    const matches = JSON.parse(text.replace(/```json|```/g, '').trim())

    // Enrich with full agent data
    const results = matches
      .map(m => {
        const agent = AGENTS.find(a => a.id === m.id)
        if (!agent) return null
        return { ...agent, reason: m.reason }
      })
      .filter(Boolean)

    return Response.json({ results })
  } catch (err) {
    console.error('Agent search error:', err)
    return Response.json({ results: [], error: err.message }, { status: 500 })
  }
}
