import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { to, agentName, output, results, appUrl } = await req.json()
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    const resultsHtml = results?.length ? `
      <h2 style="font-size:15px;font-weight:600;color:#111827;margin:24px 0 12px;">AI Scored Results (${results.length} records)</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px;">
        <tr style="background:#F9FAFB;">
          <th style="text-align:left;padding:7px 10px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Name</th>
          <th style="text-align:left;padding:7px 10px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Score</th>
          <th style="text-align:left;padding:7px 10px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Reason</th>
          <th style="text-align:left;padding:7px 10px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Next Action</th>
        </tr>
        ${results.map((r, i) => `
          <tr style="background:${i % 2 === 0 ? '#fff' : '#FAFAFA'};">
            <td style="padding:7px 10px;border-bottom:1px solid #F3F4F6;font-weight:500;">${r.name || ''}</td>
            <td style="padding:7px 10px;border-bottom:1px solid #F3F4F6;color:${r.score === 'hot' ? '#DC2626' : r.score === 'warm' ? '#2563EB' : '#475569'};font-weight:600;text-transform:uppercase;">${r.score || ''}</td>
            <td style="padding:7px 10px;border-bottom:1px solid #F3F4F6;color:#374151;">${r.reason || ''}</td>
            <td style="padding:7px 10px;border-bottom:1px solid #F3F4F6;color:#374151;">${r.action || ''}</td>
          </tr>
        `).join('')}
      </table>` : ''

    const outputHtml = output
      .split('\n')
      .map(line => line ? `<p style="margin:0 0 8px;font-size:13px;color:#374151;line-height:1.6;">${line}</p>` : '<br>')
      .join('')

    const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F7F8FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB;">
        <tr>
          <td style="background:#0D1B3E;padding:20px 32px;">
            <span style="font-size:13px;font-weight:700;color:#C9A84C;letter-spacing:0.08em;">KARTHIKEY AI</span>
            <span style="font-size:13px;color:#9CA3AF;margin-left:12px;">— ${agentName}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <h1 style="margin:0 0 4px;font-size:18px;font-weight:600;color:#111827;">${agentName} Results</h1>
            <p style="margin:0 0 20px;font-size:12px;color:#9CA3AF;">Generated ${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</p>
            ${outputHtml}
            ${resultsHtml}
            <div style="margin-top:24px;padding-top:16px;border-top:1px solid #F3F4F6;text-align:center;">
              <a href="${appUrl}/agents" style="display:inline-block;background:#0D1B3E;color:#C9A84C;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600;">Run more agents →</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 32px;border-top:1px solid #F3F4F6;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9CA3AF;">Karthikey AI · <a href="${appUrl}" style="color:#6B7280;">${appUrl}</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Karthikey AI <noreply@karthikey.in>',
        to: [to],
        subject: `${agentName} — AI Analysis from Karthikey AI`,
        html
      })
    })

    const data = await res.json()
    if (!res.ok) throw new Error(JSON.stringify(data))

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
    })
  }
})
