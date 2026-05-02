import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

const ROLE_REDIRECT = { owner: '/dashboard', supervisor: '/jobs', accounts: '/dispatch' }

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length !== 10) { setError('Enter 10 digit number'); return }
    if (!password)              { setError('Enter password'); return }

    setLoading(true); setError('')

    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: `${cleaned}@jobtrack.app`,
      password,
    })

    if (authErr) {
      setError('Incorrect number or password')
      setLoading(false)
      return
    }

    // Admin bypass
    if (cleaned === import.meta.env.VITE_ADMIN_PHONE) {
      setAuth(
        { id: data.user.id, phone: cleaned, role: 'admin', name: 'Admin', is_active: true },
        null,
        data.session,
      )
      navigate('/admin', { replace: true })
      return
    }

    // Whitelist check
    const { data: row } = await supabase
      .from('users')
      .select('*, units(*)')
      .eq('id', data.user.id)
      .eq('is_active', true)
      .single()

    setLoading(false)

    if (!row) {
      await supabase.auth.signOut()
      setError('Access denied. Contact your owner.')
      return
    }

    const { units: unit, ...userData } = row

    if (!unit?.is_active) {
      setAuth(userData, unit, data.session)
      navigate('/suspended', { replace: true })
      return
    }

    setAuth(userData, unit, data.session)
    navigate(ROLE_REDIRECT[userData.role] ?? '/login', { replace: true })
  }

  return (
    <div className="min-h-svh flex flex-col bg-white px-6 pt-16 pb-10">
      {/* Brand */}
      <div className="mb-10">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-white text-2xl font-bold select-none">J</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">JobTrack</h1>
        <p className="text-sm text-gray-500 mt-1">Manufacturing job tracking</p>
      </div>

      <div className="space-y-4">
        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile number</label>
          <div className="flex items-stretch border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
            <span className="flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-300 select-none">+91</span>
            <input
              type="tel" inputMode="numeric" maxLength={10}
              value={phone}
              onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="9876543210"
              autoFocus
              className="flex-1 px-3 py-3.5 text-base outline-none bg-white"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
          <div className="flex items-stretch border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              className="flex-1 px-4 py-3.5 text-base outline-none bg-white"
            />
            <button
              type="button"
              onClick={() => setShowPass(v => !v)}
              className="px-3 text-gray-400 text-xs select-none"
            >
              {showPass ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleLogin}
          disabled={loading || phone.length < 10 || !password}
          className="w-full bg-blue-600 text-white py-3.5 rounded-xl text-base font-semibold disabled:opacity-50 active:bg-blue-700 transition-colors"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </div>

      {/* DEV ONLY — remove before deploy */}
      {import.meta.env.DEV && (
        <div className="mt-10 pt-6 border-t border-dashed border-gray-200">
          <p className="text-xs text-gray-400 text-center mb-3">Dev only</p>
          <button
            onClick={async () => {
              setLoading(true)
              const { data, error: e } = await supabase.auth.signInWithPassword({
                email: 'test@jobtrack.dev', password: 'TestOwner1!',
              })
              if (e) { setError(e.message); setLoading(false); return }
              const { data: row } = await supabase
                .from('users').select('*, units(*)').eq('id', data.user.id).eq('is_active', true).single()
              if (row) {
                const { units: unit, ...userData } = row
                setAuth(userData, unit, data.session)
                navigate(unit?.is_active ? (ROLE_REDIRECT[userData.role] ?? '/login') : '/suspended', { replace: true })
              } else {
                setAuth({ id: data.user.id, email: data.user.email, role: null, name: null, is_active: true }, null, data.session)
                navigate('/setup', { replace: true })
              }
              setLoading(false)
            }}
            disabled={loading}
            className="w-full py-3 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 disabled:opacity-50"
          >
            Dev login → test@jobtrack.dev
          </button>
        </div>
      )}
    </div>
  )
}
