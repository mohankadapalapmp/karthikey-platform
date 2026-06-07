'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Topbar from '../../components/Topbar'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const INDUSTRIES = ['Real Estate', 'Technology', 'Finance & Banking', 'Healthcare', 'Retail & FMCG', 'Manufacturing', 'Education', 'Logistics', 'Hospitality', 'Other']
const CRM_TOOLS = ['Zoho CRM', 'Salesforce', 'Microsoft Dynamics 365', 'HubSpot', 'Freshsales', 'Excel / Spreadsheets', 'No CRM yet', 'Other']
const TEAM_SIZES = ['Just me', '2–10', '11–50', '51–200', '200+']

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [credits, setCredits] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [usageLog, setUsageLog] = useState([])
  const [payments, setPayments] = useState([])

  const [form, setForm] = useState({
    full_name: '', phone: '', company: '', designation: '',
    industry: '', crm_tool: '', team_size: '', city: '', website: ''
  })

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data?.session) { router.push('/login'); return }
      setUser(data.session.user)
      const [{ data: acc }, { data: usage }, { data: pays }] = await Promise.all([
        supabase.from('accounts').select('*').eq('id', data.session.user.id).single(),
        supabase.from('usage_log').select('*').eq('user_id', data.session.user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('payments').select('*').eq('user_id', data.session.user.id).order('created_at', { ascending: false }).limit(5),
      ])
      if (acc) {
        setCredits(acc.credits)
        setForm({
          full_name: acc.full_name || '',
          phone: acc.phone || '',
          company: acc.company || '',
          designation: acc.designation || '',
          industry: acc.industry || '',
          crm_tool: acc.crm_tool || '',
          team_size: acc.team_size || '',
          city: acc.city || '',
          website: acc.website || '',
        })
      }
      if (usage) setUsageLog(usage)
      if (pays) setPayments(pays)
    })
  }, [])

  function update(field, val) {
    setForm(prev => ({ ...prev, [field]: val }))
    setSaved(false)
  }

  async function saveProfile() {
    setLoading(true)
    const { error } = await supabase.from('accounts').update({
      full_name: form.full_name,
      phone: form.phone,
      company: form.company,
      designation: form.designation,
      industry: form.industry,
      crm_tool: form.crm_tool,
      team_size: form.team_size,
      city: form.city,
      website: form.website,
      updated_at: new Date().toISOString()
    }).eq('id', user.id)
    setLoading(false)
    if (!error) setSaved(true)
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', border: '0.5px solid #D1D5DB',
    borderRadius: 6, fontSize: 14, color: 'var(--text)',
    background: 'white', outline: 'none', fontFamily: 'inherit'
  }
  const labelStyle = { fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5, color: 'var(--text)' }
  const groupStyle = { marginBottom: 18 }

  const totalCreditsUsed = usageLog.reduce((s, r) => s + (r.credits_used || 0), 0)
  const totalSpent = payments.reduce((s, p) => s + (p.amount_inr || 0), 0)
  const initials = form.full_name ? form.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'

  return (
    <>
      <Topbar />
      <main className="page-container" style={{ paddingTop: 28, paddingBottom: 48 }}>

        {/* Profile header */}
        <div style={{ background: 'var(--navy)', borderRadius: 16, padding: '28px 32px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: 'var(--navy)', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
              {form.full_name || 'Your Name'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>
              {form.designation && form.company ? `${form.designation} · ${form.company}` : user?.email}
            </div>
            {form.city && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>📍 {form.city}</div>}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { val: credits, label: 'Credits' },
              { val: usageLog.length, label: 'Agent runs' },
              { val: totalSpent > 0 ? `₹${totalSpent}` : '₹0', label: 'Spent' },
            ].map(st => (
              <div key={st.label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 18px', textAlign: 'center', minWidth: 80 }}>
                <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--gold)' }}>{st.val}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{st.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F3F4F6', borderRadius: 10, padding: 4, width: 'fit-content' }}>
          {[['profile', '👤 Profile'], ['activity', '📊 Activity'], ['billing', '💳 Billing']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              padding: '7px 18px', borderRadius: 7, fontSize: 13, border: 'none', cursor: 'pointer',
              background: activeTab === id ? 'white' : 'transparent',
              color: activeTab === id ? 'var(--navy)' : 'var(--text-muted)',
              fontWeight: activeTab === id ? 600 : 400,
              boxShadow: activeTab === id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}>{label}</button>
          ))}
        </div>

        {/* Profile tab */}
        {activeTab === 'profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Personal details */}
            <div className="card">
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, paddingBottom: 12, borderBottom: '0.5px solid #E5E7EB' }}>
                Personal details
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>Full name *</label>
                <input value={form.full_name} onChange={e => update('full_name', e.target.value)} placeholder="Mohan Reddy" style={inputStyle} />
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>Phone number</label>
                <input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+91 98861 38977" style={inputStyle} />
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>City</label>
                <input value={form.city} onChange={e => update('city', e.target.value)} placeholder="Bengaluru" style={inputStyle} />
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>Email</label>
                <input value={user?.email || ''} disabled style={{ ...inputStyle, background: '#F9FAFB', color: '#9CA3AF' }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Email cannot be changed</span>
              </div>
            </div>

            {/* Business details */}
            <div className="card">
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, paddingBottom: 12, borderBottom: '0.5px solid #E5E7EB' }}>
                Business details
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>Company name</label>
                <input value={form.company} onChange={e => update('company', e.target.value)} placeholder="Karthikey Intelligence Solutions" style={inputStyle} />
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>Your designation</label>
                <input value={form.designation} onChange={e => update('designation', e.target.value)} placeholder="Founder & CEO" style={inputStyle} />
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>Industry</label>
                <select value={form.industry} onChange={e => update('industry', e.target.value)} style={inputStyle}>
                  <option value="">Select industry</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>Website</label>
                <input value={form.website} onChange={e => update('website', e.target.value)} placeholder="https://karthikey.in" style={inputStyle} />
              </div>
            </div>

            {/* CRM & Team */}
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, paddingBottom: 12, borderBottom: '0.5px solid #E5E7EB' }}>
                CRM & Team setup
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div style={groupStyle}>
                  <label style={labelStyle}>CRM tool you use</label>
                  <select value={form.crm_tool} onChange={e => update('crm_tool', e.target.value)} style={inputStyle}>
                    <option value="">Select CRM</option>
                    {CRM_TOOLS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={groupStyle}>
                  <label style={labelStyle}>Team size</label>
                  <select value={form.team_size} onChange={e => update('team_size', e.target.value)} style={inputStyle}>
                    <option value="">Select team size</option>
                    {TEAM_SIZES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Save button */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={saveProfile} disabled={loading} className="btn-primary" style={{ padding: '10px 28px', fontSize: 14, borderRadius: 8 }}>
                {loading ? 'Saving…' : 'Save profile'}
              </button>
              {saved && <span style={{ fontSize: 13, color: '#166534', background: '#F0FDF4', padding: '6px 14px', borderRadius: 20, border: '0.5px solid #BBF7D0' }}>✅ Profile saved successfully</span>}
            </div>
          </div>
        )}

        {/* Activity tab */}
        {activeTab === 'activity' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #E5E7EB', fontWeight: 600, fontSize: 15 }}>Recent agent runs</div>
            {usageLog.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No agent runs yet. <Link href="/agents" style={{ color: 'var(--navy)', fontWeight: 500 }}>Run your first agent →</Link>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>{['Agent', 'Department', 'Credits used', 'Date'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 20px', background: '#F9FAFB', fontSize: 12, color: 'var(--text-muted)', borderBottom: '0.5px solid #E5E7EB' }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {usageLog.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '0.5px solid #F3F4F6' }}>
                      <td style={{ padding: '10px 20px', fontWeight: 500 }}>{r.agent_name}</td>
                      <td style={{ padding: '10px 20px', color: 'var(--text-muted)' }}>{r.dept}</td>
                      <td style={{ padding: '10px 20px' }}><span style={{ color: '#B45309', fontWeight: 500 }}>−{r.credits_used}</span></td>
                      <td style={{ padding: '10px 20px', color: 'var(--text-muted)', fontSize: 12 }}>
                        {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Billing tab */}
        {activeTab === 'billing' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card">
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, paddingBottom: 12, borderBottom: '0.5px solid #E5E7EB' }}>Credit balance</div>
              <div style={{ fontSize: 48, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>⚡ {credits}</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>credits remaining · never expire</div>
              <Link href="/credits" className="btn-primary" style={{ display: 'inline-block', padding: '9px 20px', fontSize: 13, borderRadius: 6 }}>+ Buy more credits</Link>
            </div>
            <div className="card">
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, paddingBottom: 12, borderBottom: '0.5px solid #E5E7EB' }}>Payment history</div>
              {payments.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No payments yet</div>
              ) : payments.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < payments.length - 1 ? '0.5px solid #F3F4F6' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>+{p.credits_added} credits</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#166534' }}>₹{p.amount_inr}</span>
                </div>
              ))}
            </div>
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, paddingBottom: 12, borderBottom: '0.5px solid #E5E7EB' }}>Usage summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { val: usageLog.length, label: 'Total agent runs' },
                  { val: totalCreditsUsed, label: 'Credits used' },
                  { val: totalSpent > 0 ? `₹${totalSpent}` : '₹0', label: 'Total spent' },
                ].map(st => (
                  <div key={st.label} style={{ background: '#F9FAFB', borderRadius: 10, padding: '16px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--navy)' }}>{st.val}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{st.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
