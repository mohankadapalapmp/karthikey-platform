import Razorpay from 'razorpay'
import { supabaseAdmin } from '../../../lib/supabase'
import { createClient } from '@supabase/supabase-js'
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

    // Auth via bearer token
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return Response.json({ error: 'Unauthorised' }, { status: 401 })

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data: { user }, error } = await sb.auth.getUser(token)
    if (error || !user) return Response.json({ error: 'Unauthorised' }, { status: 401 })

    const order = await razorpay.orders.create({
      amount: pack.price, // already in paise e.g. 49900 = ₹499
      currency: 'INR',
      notes: { user_id: user.id, pack_id: packId, credits: String(pack.credits) }
    })

    return Response.json({ orderId: order.id, amount: pack.price, currency: 'INR', pack })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
