export async function POST(req) {
  try {
    const { agentName, agentDesc, agentKeywords, inputType, columns, rowCount } = await req.json()

    const columnsStr = columns?.length ? columns.join(', ') : 'no columns detected'

    const prompt = inputType === 'excel'
      ? `You are an AI assistant inside the Karthikey CRM platform. A user just uploaded data to the "${agentName}" agent (${agentDesc}).

Uploaded data has ${rowCount} records with these columns: ${columnsStr}

Agent purpose keywords: ${(agentKeywords||[]).join(', ')}

Write a short, helpful welcome message (2-3 sentences max) that:
1. Confirms which columns you'll use for analysis (pick the most relevant ones)
2. Gives ONE specific suggested action they should try first, phrased as a question they can ask

Also suggest the single best first prompt they should type. 

Respond ONLY as JSON: {"message": "...", "suggestedPrompt": "..."}`
      : `You are an AI assistant inside the Karthikey CRM platform. A user opened the "${agentName}" agent (${agentDesc}).

Agent purpose: ${(agentKeywords||[]).join(', ')}

Write a short welcome message (1-2 sentences) that tells them what to describe or paste to get started.
Also give the single best starter prompt.

Respond ONLY as JSON: {"message": "...", "suggestedPrompt": "..."}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await res.json()
    const text = data?.content?.[0]?.text || '{}'
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    return Response.json(parsed)
  } catch (err) {
    console.error('Prefill error:', err)
    return Response.json({ message: null, suggestedPrompt: null }, { status: 500 })
  }
}
