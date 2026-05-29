'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { CREDIT_PACKS } from '../../lib/agents'
import Topbar from '../../components/Topbar'
import { useRouter } from 'next/navigation'

export default function CreditsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [credits, setCredits] = useState(0)
  const [loading, setLoading] = useState(null)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data?.session) { router.push('/login'); return }
      setUser(data.session.user)
      setSession(data.session)
      supabase.from('accounts').select('credits').eq('id', data.session.user.id).single()
        .then(({ data: acc }) => { if (acc) setCredits(acc.credits) })
    })
  }, [])

  async function buyCredits(pack) {
    if (pack.price === 0) return
    setLoading(pack.id)
    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ packId: pack.id })
      })
      const json = await res.json()
      if (json.error) { alert('Error: ' + json.error); return }

      const { orderId, amount, currency } = json

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,      // in paise — ₹499 = 49900
        currency,
        order_id: orderId,
        name: 'Karthikey AI Platform',
        description: `${pack.credits} credits — ${pack.name} pack`,
        prefill: { email: user?.email }, // only email, no phone
        theme: { color: '#0D1B3E' },
        handler: () => {
          setSuccess(`✅ Payment successful! ${pack.credits} credits will appear in your account shortly.`)
          setTimeout(() => router.push('/agents'), 3000)
        },
        modal: {
          ondismiss: () => setLoading(null)
        }
      })
      rzp.open()
    } catch (err) {
      alert('Payment failed: ' + err.message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      <Topbar />
      <main className="page-container" style={{ paddingTop: 32, paddingBottom: 48 }}>
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <h1 style={{ fontSize: 26, fontWeight: 600, marginBottom: 8 }}>Buy credits</h1>
          <p style={{ color: 'var(--text-muted)' }}>Credits never expire. Each agent run uses 1–3 credits depending on complexity.</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F0FDF4', border: '0.5px solid #BBF7D0', borderRadius: 20, padding: '5px 14px', marginTop: 10, fontSize: 13, color: '#166534' }}>
            ⚡ Your balance: <strong>{credits} credits</strong>
          </div>
        </div>

        {success && (
          <div style={{ background: '#F0FDF4', border: '0.5px solid #BBF7D0', borderRadius: 8, padding: '12px 16px', marginBottom: 20, textAlign: 'center', fontSize: 14, color: '#166534' }}>
            {success}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          {CREDIT_PACKS.map(pack => (
            <div key={pack.id} className="card" style={{ textAlign: 'center', padding: '22px 18px', border: pack.id === 'growth' ? '2px solid var(--gold)' : '0.5px solid #E5E7EB', position: 'relative' }}>
              {pack.id === 'growth' && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--gold)', color: 'var(--navy)', fontSize: 11, fontWeight: 600, padding: '2px 12px', borderRadius: 20 }}>
                  Most popular
                </div>
              )}
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>{pack.priceInr}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: pack.id === 'trial' ? 'var(--text-muted)' : 'var(--navy)', marginBottom: 2 }}>{pack.credits}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>credits</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>{pack.description}</div>
              {pack.price === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px', background: '#F9FAFB', borderRadius: 6 }}>
                  Included on signup
                </div>
              ) : (
                <button onClick={() => buyCredits(pack)} disabled={loading === pack.id}
                  className={pack.id === 'growth' ? 'btn-gold' : 'btn-primary'}
                  style={{ width: '100%', padding: '9px', fontSize: 13, borderRadius: 6 }}>
                  {loading === pack.id ? 'Opening…' : 'Buy now'}
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32, background: '#F9FAFB', border: '0.5px solid #E5E7EB', borderRadius: 10, padding: '16px 20px', fontSize: 13, color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text)' }}>Credit usage guide:</strong> 1 credit = Quick build agents (Lead Qualifier, Email Drafter, etc.) · 2 credits = Advanced agents (Account Researcher, Churn Risk, etc.) · 3 credits = Complex agents (Proposal Generator). Credits are deducted per run. Failed runs are never charged.
        </div>
      </main>
    </>
  )
}
