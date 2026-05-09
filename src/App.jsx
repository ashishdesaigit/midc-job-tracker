import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, SetupRoute, AdminRoute } from './routes/ProtectedRoute'
import Layout from './components/Layout'

import Login from './pages/Login'
import Info from './pages/Info'
import AuthCallback from './pages/AuthCallback'
import Setup from './pages/Setup'
import Dashboard from './pages/Dashboard'
import Jobs from './pages/Jobs'
import JobNew from './pages/JobNew'
import JobDetail from './pages/JobDetail'
import JobSubcontract from './pages/JobSubcontract'
import JobDispatch from './pages/JobDispatch'
import Outside from './pages/Outside'
import Insights from './pages/Insights'
import Dispatch from './pages/Dispatch'
import Vendors from './pages/Vendors'
import VendorNew from './pages/VendorNew'
import VendorDetail from './pages/VendorDetail'
import Customers from './pages/Customers'
import CustomerNew from './pages/CustomerNew'
import CustomerDetail from './pages/CustomerDetail'
import Settings from './pages/Settings'
import SettingsTeam from './pages/SettingsTeam'
import Admin from './pages/Admin'
import Suspended from './pages/Suspended'

// Wraps ProtectedRoute + Layout for all authenticated pages
function AuthPage({ children, allowedRoles }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/info" element={<Info />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/suspended" element={<Suspended />} />

        {/* Setup — new users who haven't completed onboarding */}
        <Route path="/setup" element={<SetupRoute><Setup /></SetupRoute>} />

        {/* Owner */}
        <Route path="/dashboard" element={
          <AuthPage allowedRoles={['owner']}><Dashboard /></AuthPage>
        } />
        <Route path="/settings" element={
          <AuthPage allowedRoles={['owner']}><Settings /></AuthPage>
        } />
        <Route path="/settings/team" element={
          <AuthPage allowedRoles={['owner']}><SettingsTeam /></AuthPage>
        } />

        {/* Supervisor + Owner + Accounts */}
        <Route path="/jobs" element={
          <AuthPage allowedRoles={['owner', 'supervisor', 'accounts']}><Jobs /></AuthPage>
        } />
        <Route path="/jobs/new" element={
          <AuthPage allowedRoles={['owner', 'supervisor']}><JobNew /></AuthPage>
        } />
        <Route path="/jobs/:id" element={
          <AuthPage allowedRoles={['owner', 'supervisor', 'accounts']}><JobDetail /></AuthPage>
        } />
        <Route path="/jobs/:id/subcontract" element={
          <AuthPage allowedRoles={['owner', 'supervisor']}><JobSubcontract /></AuthPage>
        } />
        <Route path="/jobs/:id/dispatch" element={
          <AuthPage allowedRoles={['owner', 'supervisor', 'accounts']}><JobDispatch /></AuthPage>
        } />

        {/* Outside — owner + supervisor */}
        <Route path="/insights" element={
          <AuthPage allowedRoles={['owner']}><Insights /></AuthPage>
        } />
        <Route path="/outside" element={
          <AuthPage allowedRoles={['owner', 'supervisor']}><Outside /></AuthPage>
        } />

        {/* Dispatch — all roles */}
        <Route path="/dispatch" element={
          <AuthPage allowedRoles={['owner', 'supervisor', 'accounts']}><Dispatch /></AuthPage>
        } />

        {/* Vendors + Customers */}
        <Route path="/vendors" element={
          <AuthPage allowedRoles={['owner', 'supervisor']}><Vendors /></AuthPage>
        } />
        <Route path="/vendors/new" element={
          <AuthPage allowedRoles={['owner', 'supervisor']}><VendorNew /></AuthPage>
        } />
        <Route path="/vendors/:id" element={
          <AuthPage allowedRoles={['owner', 'supervisor']}><VendorDetail /></AuthPage>
        } />
        <Route path="/customers" element={
          <AuthPage allowedRoles={['owner', 'supervisor']}><Customers /></AuthPage>
        } />
        <Route path="/customers/new" element={
          <AuthPage allowedRoles={['owner', 'supervisor']}><CustomerNew /></AuthPage>
        } />
        <Route path="/customers/:id" element={
          <AuthPage allowedRoles={['owner', 'supervisor']}><CustomerDetail /></AuthPage>
        } />

        {/* Admin */}
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />

        {/* Fallback */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
