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

        <section style={{ background: 'var(--bg)', padding: '32px 24px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '20px 20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.02em' }}>{s.val}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 5 }}>{s.label}</div>
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

        {/* For Teams section */}
        <section style={{ background: 'var(--surface)', padding: '56px 24px', borderTop: '1px solid var(--divider)' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
              <div>
                <div style={{ display: 'inline-block', background: '#EEF3FB', border: '1px solid #BFDBFE', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#1E40AF', marginBottom: 16, fontWeight: 500 }}>
                  Built for teams
                </div>
                <h2 style={{ fontSize: 30, fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.02em', marginBottom: 14, lineHeight: 1.25 }}>
                  One plan for your<br />whole sales team
                </h2>
                <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24 }}>
                  Admin buys credits once. Every rep on your team draws from the shared pool. You see exactly who ran which agent and how many credits they used.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                  {[
                    'Shared credit pool — buy once, team uses together',
                    'Admin dashboard — full visibility on team usage',
                    'Invite by email — members join in one click',
                    'Centralised billing — one invoice for the whole team',
                  ].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-mid)' }}>
                      <div style={{ width: 18, height: 18, background: '#ECFDF5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4.5 7.5L8 3" stroke="#065F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      {f}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <a href="/login?signup=1&type=team" style={{ background: 'var(--navy)', color: 'var(--gold)', padding: '11px 22px', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                    Start team trial →
                  </a>
                  <a href="/pricing" style={{ background: 'transparent', color: 'var(--navy)', border: '1px solid var(--divider)', padding: '11px 22px', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
                    See pricing
                  </a>
                </div>
              </div>
              <div style={{ background: 'var(--navy)', borderRadius: 14, padding: '24px', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 36, height: 36, background: '#C9A84C', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#0D1B3E', fontSize: 14 }}>K</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#C9A84C' }}>Karthikey Org</p>
                    <p style={{ fontSize: 11, color: '#8FA3C8' }}>agents.karthikey.in/org/karthikey</p>
                  </div>
                  <div style={{ marginLeft: 'auto', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#C9A84C' }}>250 org credits</div>
                </div>
                {[
                  { name: 'Priya Sharma', role: 'Admin', used: 34, color: '#C9A84C' },
                  { name: 'Rahul Mehta', role: 'Member', used: 28, color: '#8FA3C8' },
                  { name: 'Ananya Iyer', role: 'Member', used: 18, color: '#8FA3C8' },
                  { name: 'Vikram Nair', role: 'Member', used: 12, color: '#8FA3C8' },
                ].map(m => (
                  <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff' }}>
                      {m.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12.5, fontWeight: 500, color: '#fff' }}>{m.name}</p>
                      <p style={{ fontSize: 11, color: '#8FA3C8' }}>{m.role}</p>
                    </div>
                    <span style={{ fontSize: 12, color: m.color, fontWeight: 500 }}>{m.used} credits</span>
                  </div>
                ))}
                <div style={{ marginTop: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8FA3C8', marginBottom: 6 }}>
                    <span>Pool used</span><span>92 / 342 credits</span>
                  </div>
                  <div style={{ height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
                    <div style={{ width: '27%', height: '100%', background: '#C9A84C', borderRadius: 3 }} />
                  </div>
                </div>
              </div>
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
          © 2026 Karthikey Intelligence Solutions · Bengaluru · marketing@karthikey.in
        </footer>
      </main>
    </>
  )
}
