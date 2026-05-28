import crypto from 'crypto'
import { supabaseAdmin } from '../../../../lib/supabase'
import { CREDIT_PACKS } from '../../../../lib/agents'

export async function POST(req) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-razorpay-signature')

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex')

    if (signature !== expected) return new Response('Invalid signature', { status: 400 })

    const event = JSON.parse(body)
    if (event.event !== 'payment.captured') return Response.json({ ok: true })

    const payment = event.payload.payment.entity
    const { user_id, pack_id, credits } = payment.notes

    if (!user_id || !credits) return Response.json({ ok: true })

    const creditsToAdd = parseInt(credits)
    const { data: acc } = await supabaseAdmin.from('accounts').select('credits').eq('id', user_id).single()
    const newBalance = (acc?.credits || 0) + creditsToAdd

    await supabaseAdmin.from('accounts').update({ credits: newBalance }).eq('id', user_id)
    await supabaseAdmin.from('payments').insert({
      user_id,
      razorpay_payment_id: payment.id,
      razorpay_order_id: payment.order_id,
      pack_id,
      credits_added: creditsToAdd,
      amount_inr: payment.amount / 100,
    })

    return Response.json({ ok: true, credits_added: creditsToAdd, new_balance: newBalance })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response('Error', { status: 500 })
  }
}
