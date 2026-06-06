import Link from 'next/link'
import Topbar from '../../components/Topbar'

export const metadata = {
  title: 'Pricing — Credits-Based AI Agent Plans | No Subscription',
  description: 'Karthikey AI pricing: 5 free credits on signup. Starter ₹499 (25 credits), Growth ₹1,499 (100 credits), Team ₹3,499 (300 shared credits). No subscription. Credits never expire.',
  keywords: ['Karthikey AI pricing', 'AI agent credits India', 'CRM automation pricing', 'AI platform cost India'],
  alternates: { canonical: 'https://agents.karthikey.in/pricing' },
  openGraph: {
    title: 'Karthikey AI Pricing — Pay Only for What You Run',
    description: 'No subscriptions. Credits never expire. Start free with 5 credits. Paid packs from ₹499. Team plan ₹3,499 for 300 shared credits.',
    url: 'https://agents.karthikey.in/pricing',
  },
}

const pricingJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Karthikey AI Agent Platform',
  description: '52 pre-built AI agents for CRM and sales teams. Credits-based pricing, no subscription.',
  url: 'https://agents.karthikey.in',
  brand: { '@type': 'Brand', name: 'Karthikey AI' },
  offers: [
    { '@type': 'Offer', name: 'Free Trial', price: '0', priceCurrency: 'INR', description: '5 credits on signup, no card needed' },
    { '@type': 'Offer', name: 'Starter Pack', price: '499', priceCurrency: 'INR', description: '25 credits, never expire' },
    { '@type': 'Offer', name: 'Growth Pack', price: '1499', priceCurrency: 'INR', description: '100 credits, never expire' },
    { '@type': 'Offer', name: 'Business Team Pack', price: '3499', priceCurrency: 'INR', description: '300 shared credits for up to 20 team members' },
    { '@type': 'Offer', name: 'Enterprise Pack', price: '9999', priceCurrency: 'INR', description: '1,000 shared credits for large teams' },
  ],
}

const plans = [
  {
    name: 'Individual',
    desc: 'For solo sales reps, freelancers, and individuals exploring AI agents.',
    price: null,
    cta: 'Start free',
    ctaHref: '/login?signup=1',
    highlight: false,
    credits: [
      { label: 'Free trial', val: '5 credits on signup' },
      { label: 'Starter', val: '25 credits · ₹499' },
      { label: 'Growth', val: '100 credits · ₹1,499' },
    ],
    features: [
      'All 52 AI agents',
      'Excel / CSV upload',
      'Any industry, any CRM',
      'Export enriched files',
      'Individual dashboard',
      'Credits never expire',
    ],
    notIncluded: ['Shared credit pool', 'Team usage visibility', 'Member management'],
  },
  {
    name: 'Team',
    desc: 'For sales teams, CRM admins, and business units that want shared AI access.',
    price: '₹3,499',
    priceNote: '300 shared credits · up to 20 members',
    cta: 'Start team trial',
    ctaHref: '/login?signup=1&type=team',
    highlight: true,
    badge: 'Most popular for B2B',
    credits: [
      { label: 'Business pack', val: '300 credits · ₹3,499' },
      { label: 'Enterprise pack', val: '1,000 credits · ₹9,999' },
      { label: 'Custom', val: 'Contact us' },
    ],
    features: [
      'Everything in Individual',
      'Shared org credit pool',
      'Admin dashboard',
      'Invite team by email',
      'Per-member usage tracking',
      'Credits never expire',
      'Centralised billing',
      'Up to 20 members',
    ],
    notIncluded: [],
  },
  {
    name: 'Enterprise',
    desc: 'For large organisations needing custom limits, SSO, and dedicated support.',
    price: 'Custom',
    priceNote: 'Tailored to your team size',
    cta: 'Contact us',
    ctaHref: 'mailto:marketing@karthikey.in?subject=Enterprise enquiry',
    highlight: false,
    credits: [
      { label: 'Unlimited credits', val: 'Custom pricing' },
      { label: 'Unlimited members', val: 'Per seat or pool' },
      { label: 'SLA', val: 'Dedicated support' },
    ],
    features: [
      'Everything in Team',
      'Unlimited members',
      'Custom credit limits',
      'SSO / SAML login',
      'Dedicated account manager',
      'Priority support',
      'Custom agent prompts',
      'Zoho / Salesforce connector',
    ],
    notIncluded: [],
  },
]

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />
      <Topbar />
      <main style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 56px)' }}>
        {/* Header */}
        <div style={{ background: 'var(--navy)', padding: '56px 28px 48px', textAlign: 'center' }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <div style={{ display: 'inline-block', background: 'rgba(21,101,192,0.15)', border: '1px solid rgba(144,202,249,0.4)', borderRadius: 20, padding: '4px 14px', fontSize: 12, color: '#90CAF9', marginBottom: 16, fontWeight: 500 }}>
              Simple, transparent pricing
            </div>
            <h1 style={{ fontSize: 38, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 12, lineHeight: 1.2 }}>
              Pay only for what you run
            </h1>
            <p style={{ fontSize: 16, color: '#8FA3C8', lineHeight: 1.6 }}>
              No subscriptions. No lock-in. Credits never expire. Start free — upgrade when your team is ready.
            </p>
          </div>
        </div>

        {/* Plans */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'start' }}>
            {plans.map(plan => (
              <div key={plan.name} style={{
                background: 'var(--surface)',
                border: plan.highlight ? '2px solid var(--gold)' : '1px solid var(--divider)',
                borderRadius: 16,
                overflow: 'hidden',
                position: 'relative',
                boxShadow: plan.highlight ? '0 8px 24px rgba(21,101,192,0.12)' : '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                {plan.badge && (
                  <div style={{ background: 'var(--gold)', color: 'var(--navy)', fontSize: 11, fontWeight: 700, padding: '5px 0', textAlign: 'center', letterSpacing: '0.04em' }}>
                    {plan.badge}
                  </div>
                )}

                <div style={{ padding: '24px 24px 20px' }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>{plan.name}</h2>
                  <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 20, minHeight: 52 }}>{plan.desc}</p>

                  {/* Price */}
                  {plan.price ? (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.02em' }}>{plan.price}</div>
                      {plan.priceNote && <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>{plan.priceNote}</p>}
                    </div>
                  ) : (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)' }}>Free to start</div>
                      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>5 free credits on signup</p>
                    </div>
                  )}

                  {/* CTA */}
                  <Link href={plan.ctaHref} style={{
                    display: 'block', textAlign: 'center', padding: '11px',
                    background: plan.highlight ? 'var(--gold)' : 'var(--navy)',
                    color: plan.highlight ? 'var(--navy)' : 'var(--gold)',
                    borderRadius: 8, fontSize: 14, fontWeight: 600,
                    textDecoration: 'none', transition: 'opacity 0.15s',
                    marginBottom: 24,
                  }}>
                    {plan.cta} →
                  </Link>

                  {/* Credit packs */}
                  <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '12px 14px', marginBottom: 20 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Credit packs</p>
                    {plan.credits.map(c => (
                      <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5, color: 'var(--text-mid)' }}>
                        <span>{c.label}</span>
                        <span style={{ fontWeight: 500 }}>{c.val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Features */}
                  <div>
                    {plan.features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, fontSize: 13 }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="7" fill="#ECFDF5"/><path d="M4 7L6.5 9.5L10 5" stroke="#065F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <span style={{ color: 'var(--text-mid)' }}>{f}</span>
                      </div>
                    ))}
                    {plan.notIncluded.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, fontSize: 13 }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="7" fill="#F9FAFB"/><path d="M5 5L9 9M9 5L5 9" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        <span style={{ color: 'var(--text-hint)' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* FAQ row */}
          <div style={{ marginTop: 56, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              ['Do credits expire?', 'Never. Credits roll over indefinitely whether you\'re on Individual or Team plan.'],
              ['Can I switch plans?', 'Yes. Start Individual and upgrade to Team anytime. Your credits carry over.'],
              ['How does team billing work?', 'Admin buys credits into a shared pool. All members draw from it. One invoice, one payment.'],
              ['What industries work?', 'All of them. Real estate, SaaS, banking, healthcare, retail, education — any Excel or CRM data works.'],
              ['Is my data safe?', 'Yes. Your CRM data is parsed in your browser and never stored on Karthikey servers.'],
              ['Need a custom plan?', 'Email us at marketing@karthikey.in for enterprise pricing, SSO, and custom credit limits.'],
            ].map(([q, a]) => (
              <div key={q}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{q}</p>
                <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>{a}</p>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div style={{ marginTop: 56, background: 'var(--navy)', borderRadius: 16, padding: '40px', textAlign: 'center' }}>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 10, letterSpacing: '-0.02em' }}>
              Ready to bring AI agents to your team?
            </h2>
            <p style={{ fontSize: 15, color: '#8FA3C8', marginBottom: 24 }}>
              Start with 5 free credits. No card needed. Upgrade to Team when ready.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/login?signup=1" style={{ background: '#90CAF9', color: '#0D1B3E', padding: '12px 28px', borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                Start free →
              </Link>
              <Link href="/login?signup=1&type=team" style={{ background: 'transparent', color: '#90CAF9', border: '1px solid rgba(144,202,249,0.4)', padding: '12px 28px', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Start team trial →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
