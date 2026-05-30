'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import Topbar from '../../../components/Topbar'
import { useRouter } from 'next/navigation'

export default function CreateOrgPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data?.session) { router.push('/login'); return }
      setUser(data.session.user)
    })
  }, [])

  function handleNameChange(val) {
    setName(val)
    if (!slugEdited) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return
    setLoading(true); setError('')
    try {
      // Create org
      const { data: org, error: orgErr } = await supabase
        .from('organisations')
        .insert({ name: name.trim(), slug: slug.trim(), owner_id: user.id, credits: 0 })
        .select()
        .single()
      if (orgErr) throw orgErr

      // Add creator as admin member
      const { error: memberErr } = await supabase
        .from('org_members')
        .insert({ org_id: org.id, user_id: user.id, role: 'admin', status: 'active' })
      if (memberErr) throw memberErr

      router.push(`/org/${org.slug}`)
    } catch (err) {
      setError(err.message.includes('duplicate') ? 'That organisation URL is already taken. Try another.' : err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid var(--divider)', borderRadius: 'var(--radius-sm)', fontSize: 14, color: 'var(--text)', background: 'var(--surface)', fontFamily: 'inherit', outline: 'none' }

  return (
    <>
      <Topbar />
      <main style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 56px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          {/* Header */}
          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, background: '#0D1B3E', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 22, fontWeight: 700, color: '#C9A84C' }}>K</div>
            <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 6 }}>Create your organisation</h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Set up a shared workspace for your team. Buy credits once, everyone uses them.</p>
          </div>

          <div className="card">
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Organisation name</label>
                <input value={name} onChange={e => handleNameChange(e.target.value)}
                  placeholder="Karthikey Intelligence Solutions"
                  required style={inputStyle} />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Organisation URL</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--divider)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--surface)' }}>
                  <span style={{ padding: '10px 12px', background: 'var(--surface2)', borderRight: '1px solid var(--divider)', fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    agents.karthikey.in/org/
                  </span>
                  <input value={slug} onChange={e => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSlugEdited(true) }}
                    placeholder="my-company" required
                    style={{ ...inputStyle, border: 'none', borderRadius: 0, flex: 1 }} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5 }}>Only lowercase letters, numbers, and hyphens</p>
              </div>

              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#991B1B' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary"
                style={{ padding: '11px', fontSize: 14, borderRadius: 8, justifyContent: 'center', width: '100%' }}>
                {loading ? 'Creating…' : 'Create organisation →'}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
            You'll be the admin. Invite your team after setup.
          </p>
        </div>
      </main>
    </>
  )
}
