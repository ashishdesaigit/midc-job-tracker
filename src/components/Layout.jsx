import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

// ── Icons ─────────────────────────────────────────────────────────────────────
const GridIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
)
const FileIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
  </svg>
)
const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 8 16 12 12 16" /><line x1="8" y1="12" x2="16" y2="12" />
  </svg>
)
const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
)
const UsersIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
)
const UserIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
)
const CheckSquareIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
)

// ── Nav config ────────────────────────────────────────────────────────────────
const NAV = {
  owner: [
    { to: '/dashboard', Icon: GridIcon,       label: 'Dashboard' },
    { to: '/jobs',      Icon: FileIcon,        label: 'Jobs' },
    { to: '/outside',   Icon: ArrowRightIcon,  label: 'Outside' },
    { to: '/customers', Icon: UserIcon,        label: 'Customers' },
    { to: '/settings',  Icon: SettingsIcon,    label: 'Settings' },
  ],
  supervisor: [
    { to: '/jobs',      Icon: FileIcon,        label: 'Jobs' },
    { to: '/outside',   Icon: ArrowRightIcon,  label: 'Outside' },
    { to: '/vendors',   Icon: UsersIcon,       label: 'Vendors' },
    { to: '/customers', Icon: UserIcon,        label: 'Customers' },
  ],
  accounts: [
    { to: '/dispatch',  Icon: CheckSquareIcon, label: 'Dispatch' },
    { to: '/jobs',      Icon: FileIcon,        label: 'Jobs' },
  ],
}

// ── Profile sheet ─────────────────────────────────────────────────────────────
function ProfileSheet({ open, onClose }) {
  const navigate = useNavigate()
  const { user, unit, clearAuth } = useAuthStore()

  async function signOut() {
    await supabase.auth.signOut()
    clearAuth()
    navigate('/login', { replace: true })
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <span className="text-blue-600 font-semibold text-sm">
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user?.name ?? '—'}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role} · {unit?.name}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full py-3 border border-red-200 text-red-600 rounded-xl text-sm font-medium"
        >
          Sign out
        </button>
        <button onClick={onClose} className="w-full py-2.5 text-sm text-gray-400 mt-1">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function Layout({ children }) {
  const { user } = useAuthStore()
  const nav = NAV[user?.role] ?? []
  const [profileOpen, setProfileOpen] = useState(false)

  const initials = user?.name?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="min-h-svh bg-white">
      <main className={nav.length ? 'pb-[calc(56px+env(safe-area-inset-bottom))]' : ''}>
        {children}
      </main>

      {nav.length > 0 && (
        <nav
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {nav.map(({ to, Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`
              }
            >
              <Icon />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}

          {/* Profile / sign-out button */}
          <button
            onClick={() => setProfileOpen(true)}
            className="flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] w-12 shrink-0 text-gray-400"
          >
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
              {initials}
            </div>
          </button>
        </nav>
      )}

      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  )
}
