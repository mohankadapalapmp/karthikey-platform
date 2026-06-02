import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/agents', request.url))
  }

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: invite, error: invErr } = await supabaseAdmin
      .from('org_invites')
      .select('*, organisations(*)')
      .eq('token', token)
      .single()

    if (invErr || !invite) {
      return NextResponse.redirect(new URL('/agents?invite=invalid', request.url))
    }

    if (invite.status !== 'pending') {
      const slug = invite.organisations?.slug || ''
      return NextResponse.redirect(new URL(`/org/${slug}`, request.url))
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.redirect(new URL('/agents?invite=expired', request.url))
    }

    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      const redirectUrl = encodeURIComponent(`/api/accept-invite?token=${token}`)
      return NextResponse.redirect(new URL(`/login?redirect=${redirectUrl}`, request.url))
    }

    const user = session.user
    const orgSlug = invite.organisations?.slug || invite.org_id

    const { error: memberErr } = await supabaseAdmin
      .from('org_members')
      .insert({
        org_id: invite.org_id,
        user_id: user.id,
        role: invite.role,
        status: 'active',
        invited_email: invite.email
      })

    if (memberErr && memberErr.code !== '23505' && !memberErr.message?.includes('duplicate')) {
      console.error('Member insert error:', memberErr)
      return NextResponse.redirect(new URL('/agents?invite=error', request.url))
    }

    await supabaseAdmin
      .from('org_invites')
      .update({ status: 'accepted' })
      .eq('token', token)

    return NextResponse.redirect(new URL(`/org/${orgSlug}`, request.url))

  } catch (err) {
    console.error('Accept invite error:', err)
    return NextResponse.redirect(new URL('/agents?invite=error', request.url))
  }
}
