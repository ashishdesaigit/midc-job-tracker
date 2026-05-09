import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { checkTrial } from '../lib/trialCheck'

const ROLE_REDIRECT = {
  owner: '/dashboard',
  supervisor: '/jobs',
  accounts: '/dispatch',
}

export default function AuthCallback() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [error, setError] = useState('')

  useEffect(() => {
    async function run() {
      const { data: { session }, error: err } = await supabase.auth.getSession()

      if (err || !session) {
        setError('Login failed. Please try again.')
        setTimeout(() => navigate('/login', { replace: true }), 2000)
        return
      }

      const authUser = session.user

      // Admin bypass (dev magic-link flow only)
      if (authUser.email === import.meta.env.VITE_ADMIN_EMAIL) {
        setAuth(
          { id: authUser.id, email: authUser.email, phone: null, role: 'admin', name: 'Admin', is_active: true },
          null,
          session,
        )
        navigate('/admin', { replace: true })
        return
      }

      // Look up user in whitelist
      const { data: row } = await supabase
        .from('users')
        .select('*, units(*)')
        .eq('id', authUser.id)
        .eq('is_active', true)
        .single()

      // Not in users table — check team invites first
      if (!row) {
        const { data: invite } = await supabase.rpc('redeem_team_invite', { p_email: authUser.email })
        if (invite) {
          const { user: userData, unit: unitData } = invite
          if (!unitData?.is_active) {
            setAuth(userData, unitData, session)
            navigate('/suspended', { replace: true })
            return
          }
          setAuth(userData, unitData, session)
          navigate(ROLE_REDIRECT[userData.role] ?? '/login', { replace: true })
          return
        }
        // No invite — new owner, go to setup
        setAuth(
          { id: authUser.id, email: authUser.email, role: null, name: null, is_active: true },
          null,
          session,
        )
        navigate('/setup', { replace: true })
        return
      }

      const { units: rawUnit, ...userData } = row
      const unit = await checkTrial(rawUnit)

      if (!unit?.is_active) {
        setAuth(userData, unit, session)
        navigate('/suspended', { replace: true })
        return
      }

      setAuth(userData, unit, session)
      navigate(ROLE_REDIRECT[userData.role] ?? '/login', { replace: true })
    }

    run()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-white gap-3">
      {error ? (
        <>
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-sm text-gray-400">Redirecting to login...</p>
        </>
      ) : (
        <>
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Logging in...</p>
        </>
      )}
    </div>
  )
}
