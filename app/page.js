import Link from 'next/link'
import Topbar from '../components/Topbar'

export default function Home() {
  const stats = [
    { val: '52', label: 'AI agents' },
    { val: '6', label: 'Departments' },
    { val: '₹0', label: 'Free to try' },
    { val: '100%', label: 'Data private' },
  ]

  const features = [
    { icon: '🔒', title: 'Your data stays with you', desc: 'All processing happens in your browser. We never store or see your customer data.' },
    { icon: '📊', title: 'Any CRM or Excel file', desc: 'Upload Excel, CSV, or connect Zoho, Salesforce, or Dynamics 365 directly.' },
    { icon: '⚡', title: 'Pay only for what you run', desc: 'Credits-based model. No subscription. Buy 25 credits for ₹499, use them whenever.' },
    { icon: '🤖', title: 'Powered by Claude AI', desc: 'Every agent is built on Claude by Anthropic — one of the world\'s most capable AI models.' },
  ]

  return (
    <>
      <Topbar />
      <main>
        <section style={{ background: 'var(--navy)', padding: '72px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{ display: 'inline-block', background: 'rgba(201,168,76,0.15)', border: '0.5px solid var(--gold)', borderRadius: 20, padding: '4px 14px', fontSize: 12, color: 'var(--gold)', marginBottom: 20 }}>
              India's first AI agent marketplace for CRM teams
            </div>
            <h1 style={{ fontSize: 46, fontWeight: 700, color: '#fff', lineHeight: 1.2, marginBottom: 16 }}>
              52 AI agents for your<br /><span style={{ color: 'var(--gold)' }}>sales & CRM team</span>
            </h1>
            <p style={{ fontSize: 17, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.7 }}>
              Upload your Excel or connect your CRM. Get AI-powered lead scoring, email drafts, forecasts, pipeline analysis, and more — in seconds. Your data never leaves your browser.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/login?signup=1" className="btn-gold" style={{ padding: '13px 28px', fontSize: 15, borderRadius: 8 }}>
                Start free — 5 credits included
              </Link>
              <Link href="/agents" className="btn-outline" style={{ padding: '13px 28px', fontSize: 15, borderRadius: 8, color: 'var(--muted)', borderColor: 'var(--border)' }}>
                Browse all agents →
              </Link>
            </div>
          </div>
        </section>

        <section style={{ padding: '0 24px', marginTop: -24 }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: 'var(--white)', border: '0.5px solid #E5E7EB', borderRadius: 12, padding: '18px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--navy)' }}>{s.val}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ padding: '56px 24px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 600, marginBottom: 8 }}>Why Karthikey?</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 40 }}>Built for Indian SMBs and enterprise CRM teams alike</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              {features.map(f => (
                <div key={f.title} className="card">
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>{f.title}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ background: 'var(--navy)', padding: '56px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <h2 style={{ fontSize: 28, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Ready to see it in action?</h2>
            <p style={{ color: 'var(--muted)', marginBottom: 28 }}>Sign up in 30 seconds. Get 5 free credits. No credit card needed.</p>
            <Link href="/login?signup=1" className="btn-gold" style={{ padding: '13px 32px', fontSize: 15, borderRadius: 8 }}>
              Get started free →
            </Link>
          </div>
        </section>

        <footer style={{ textAlign: 'center', padding: '24px', fontSize: 13, color: 'var(--text-muted)' }}>
          © 2025 Karthikey Intelligence Solutions · Bengaluru · marketing@karthikey.in
        </footer>
      </main>
    </>
  )
}
