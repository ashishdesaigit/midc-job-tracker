// Adds a team member (supervisor / accounts) to an existing unit.
// Called from /settings/team by the unit owner.
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { phone, password, name, role, unit_id } = await req.json()

    if (!phone || !password || !name || !role || !unit_id) {
      return json({ error: 'Missing required fields' }, 400)
    }

    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length !== 10) return json({ error: 'Invalid phone — 10 digits required' }, 400)

    if (!['supervisor', 'accounts'].includes(role)) {
      return json({ error: 'Invalid role' }, 400)
    }

    const email = `${cleaned}@jobtrack.app`

    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { phone: cleaned, name: name.trim() },
    })
    if (authErr) return json({ error: authErr.message }, 400)

    const { error: userErr } = await admin.from('users').insert({
      id: authData.user.id,
      unit_id,
      name: name.trim(),
      role,
      phone: cleaned,
      is_active: true,
    })
    if (userErr) {
      await admin.auth.admin.deleteUser(authData.user.id)
      return json({ error: userErr.message }, 400)
    }

    return json({ success: true })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
