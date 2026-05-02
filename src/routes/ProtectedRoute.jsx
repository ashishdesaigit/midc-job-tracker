import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const ROLE_PATHS = {
  owner: '/dashboard',
  supervisor: '/jobs',
  accounts: '/dispatch',
}

export function ProtectedRoute({ children, allowedRoles }) {
  const { user, unit } = useAuthStore()
  const location = useLocation()

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  // Admin belongs only at /admin
  if (user.role === 'admin') return <Navigate to="/admin" replace />

  if (!unit?.is_active) return <Navigate to="/suspended" replace />

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_PATHS[user.role] ?? '/login'} replace />
  }

  return children
}

// Allows authenticated users who haven't completed setup yet (role === null).
export function SetupRoute({ children }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (user.role) {
    const paths = { owner: '/dashboard', supervisor: '/jobs', accounts: '/dispatch', admin: '/admin' }
    return <Navigate to={paths[user.role] ?? '/login'} replace />
  }
  return children
}

export function AdminRoute({ children }) {
  const { user } = useAuthStore()
  return user?.role === 'admin' ? children : <Navigate to="/login" replace />
}
