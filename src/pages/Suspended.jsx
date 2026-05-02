import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export default function Suspended() {
  const navigate = useNavigate()
  const { clearAuth } = useAuthStore()
  const adminPhone = import.meta.env.VITE_ADMIN_PHONE

  async function handleSignOut() {
    await supabase.auth.signOut()
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-white px-6 text-center">
      <div className="text-5xl mb-6 select-none">🔒</div>
      <h2 className="text-xl font-bold text-gray-900 mb-3">Account Suspended</h2>
      <p className="text-gray-500 leading-relaxed mb-2">
        Your account has been suspended.
      </p>
      {adminPhone && (
        <p className="text-gray-500 mb-8">
          For support, contact:{' '}
          <a href={`tel:${adminPhone}`} className="text-blue-600 font-medium">
            {adminPhone}
          </a>
        </p>
      )}
      <button
        onClick={handleSignOut}
        className="text-sm text-gray-400 underline underline-offset-2"
      >
        Sign out
      </button>
    </div>
  )
}
