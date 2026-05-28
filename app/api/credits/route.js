import Razorpay from 'razorpay'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { CREDIT_PACKS } from '../../../lib/agents'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

export async function POST(req) {
  try {
    const { packId } = await req.json()
    const pack = CREDIT_PACKS.find(p => p.id === packId)
    if (!pack || pack.price === 0) return Response.json({ error: 'Invalid pack' }, { status: 400 })

    const sb = createRouteHandlerClient({ cookies })
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

    const order = await razorpay.orders.create({
      amount: pack.price,
      currency: 'INR',
      notes: { user_id: user.id, pack_id: packId, credits: pack.credits }
    })

    return Response.json({ orderId: order.id, amount: pack.price, currency: 'INR', pack })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
