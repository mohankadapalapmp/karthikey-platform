import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { inviteToken, orgName, invitedEmail, inviterName, role, appUrl } = await req.json()

    const inviteUrl = `${appUrl}/org/invite/${inviteToken}`
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    console.log('Attempting to send to:', invitedEmail)
    console.log('API key present:', !!RESEND_API_KEY)

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F8FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB;">
        <tr>
          <td style="background:#0D1B3E;padding:28px 32px;text-align:center;">
            <div style="width:44px;height:44px;background:#C9A84C;border-radius:10px;display:inline-block;font-size:22px;font-weight:700;color:#0D1B3E;line-height:44px;text-align:center;">K</div>
            <p style="margin:10px 0 0;font-size:13px;font-weight:600;color:#C9A84C;letter-spacing:0.08em;">KARTHIKEY AI</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 32px 24px;">
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">You're invited to join ${orgName}</h1>
            <p style="margin:0 0 24px;font-size:14px;color:#6B7280;line-height:1.6;">
              <strong style="color:#111827;">${inviterName}</strong> has invited you to join <strong style="color:#0D1B3E;">${orgName}</strong> on Karthikey AI as a <strong style="color:#111827;">${role}</strong>.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;border-radius:10px;margin-bottom:24px;">
              <tr><td style="padding:16px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:13px;color:#6B7280;padding:4px 0;">Organisation</td>
                    <td style="font-size:13px;font-weight:500;color:#111827;text-align:right;padding:4px 0;">${orgName}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#6B7280;padding:4px 0;">Your role</td>
                    <td style="font-size:13px;font-weight:500;color:#111827;text-align:right;padding:4px 0;text-transform:capitalize;">${role}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#6B7280;padding:4px 0;">Access</td>
                    <td style="font-size:13px;font-weight:500;color:#111827;text-align:right;padding:4px 0;">Shared team AI credits</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${inviteUrl}" style="display:inline-block;background:#0D1B3E;color:#C9A84C;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:600;">
                  Accept invitation →
                </a>
              </td></tr>
            </table>
            <p style="margin:20px 0 0;font-size:12px;color:#9CA3AF;text-align:center;">
              This invite expires in 48 hours. If you didn't expect this, you can ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #F3F4F6;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9CA3AF;">
              Karthikey AI · AI Agents for Sales & CRM Teams · <a href="https://agents.karthikey.in" style="color:#6B7280;">agents.karthikey.in</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Karthikey AI <noreply@karthikey.in>',
        to: [invitedEmail],
        subject: `${inviterName} invited you to join ${orgName} on Karthikey AI`,
        html: emailHtml,
      }),
    })

    const data = await res.json()
    console.log('Resend response status:', res.status)
    console.log('Resend response body:', JSON.stringify(data))

    if (!res.ok) throw new Error(JSON.stringify(data))

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.log('Error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
