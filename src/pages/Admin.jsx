import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import BottomSheet from '../components/ui/BottomSheet'

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const UNIT_TYPES = [
  { value: 'foundry',      label: 'Foundry / Casting' },
  { value: 'machine_shop', label: 'Machine Shop' },
  { value: 'combined',     label: 'Casting + Machine' },
]

const EMPTY_FORM = { name: '', type: 'foundry', ownerName: '', ownerPhone: '', ownerPassword: '', address: '' }

export default function Admin() {
  const navigate = useNavigate()
  const { clearAuth } = useAuthStore()

  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [unitUsers, setUnitUsers] = useState([])

  // New unit form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  async function fetchUnits() {
    const { data } = await supabase.rpc('admin_get_units')
    setUnits(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchUnits() }, [])

  async function toggleActive(u) {
    await supabase.rpc('admin_set_unit_active', { p_unit_id: u.id, p_active: !u.is_active })
    fetchUnits()
  }

  async function togglePlan(u) {
    await supabase.rpc('admin_set_unit_plan', { p_unit_id: u.id, p_plan: u.plan === 'trial' ? 'paid' : 'trial' })
    fetchUnits()
  }

  async function loadUnitUsers(u) {
    setSelectedUnit(u)
    const { data } = await supabase.rpc('admin_get_unit_users', { p_unit_id: u.id })
    setUnitUsers(data ?? [])
  }

  async function handleCreateUnit() {
    if (!form.name.trim())                    { setFormError('Enter unit name'); return }
    if (!form.ownerName.trim())               { setFormError('Enter owner name'); return }
    if (form.ownerPhone.replace(/\D/g,'').length !== 10) { setFormError('Owner phone — enter 10 digits'); return }
    if (form.ownerPassword.length < 6)        { setFormError('Password must be at least 6 characters'); return }

    setCreating(true); setFormError('')

    const { data, error } = await supabase.functions.invoke('provision-unit', {
      body: {
        unit_name:       form.name.trim(),
        unit_type:       form.type,
        owner_name:      form.ownerName.trim(),
        owner_phone:     form.ownerPhone.trim(),
        owner_password:  form.ownerPassword,
        address:         form.address.trim() || null,
      },
    })

    setCreating(false)

    if (error || data?.error) { setFormError(data?.error ?? error.message); return }

    setShowForm(false)
    setForm(EMPTY_FORM)
    setSuccessMsg(`Unit created! Share with owner: number ${form.ownerPhone.trim()}, share the password.`)
    setTimeout(() => setSuccessMsg(''), 8000)
    fetchUnits()
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-svh bg-gray-50 pb-10">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin</h1>
          <p className="text-xs text-gray-400 mt-0.5">Platform management</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded-xl">
            + New unit
          </button>
          <button onClick={handleSignOut}
            className="text-sm text-gray-500 border border-gray-300 px-3 py-1.5 rounded-xl">
            Sign out
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="mx-4 mt-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
          {successMsg}
        </div>
      )}

      <div className="px-4 pt-4">
        {loading ? (
          <div className="space-y-2">
            {[0,1,2].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : units.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm mb-4">No units yet.</p>
            <button onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-medium">
              Create first unit
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-2">{units.length} unit{units.length !== 1 ? 's' : ''}</p>
            <div className="space-y-2">
              {units.map(u => (
                <div key={u.id} className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{u.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {u.type?.replace('_', ' ')} · {u.user_count ?? 0} users · {fmt(u.created_at)}
                      </p>
                    </div>
                    <button onClick={() => loadUnitUsers(u)}
                      className="text-xs text-blue-600 font-medium shrink-0">
                      Users
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleActive(u)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                        u.is_active ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
                      }`}>
                      {u.is_active ? 'Active' : 'Suspended'}
                    </button>
                    <button onClick={() => togglePlan(u)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                        u.plan === 'paid' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600'
                      }`}>
                      {u.plan === 'paid' ? 'Paid ✓' : 'Trial'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* New unit bottom sheet */}
      <BottomSheet open={showForm} onClose={() => { setShowForm(false); setFormError(''); setForm(EMPTY_FORM) }} title="New unit">
        <div className="space-y-4 pb-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Kulkarni Foundry, Kolhapur" autoFocus
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Unit type *</label>
            <div className="grid grid-cols-3 gap-2">
              {UNIT_TYPES.map(({ value, label }) => (
                <button key={value} onClick={() => setForm(f => ({ ...f, type: value }))}
                  className={`py-2.5 px-2 text-xs rounded-xl border text-center transition-colors leading-tight ${
                    form.type === value ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-700'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Owner name *</label>
            <input value={form.ownerName} onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))}
              placeholder="Suresh Kulkarni"
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Owner phone *</label>
            <div className="flex items-stretch border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
              <span className="flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-300 select-none">+91</span>
              <input type="tel" inputMode="numeric" maxLength={10}
                value={form.ownerPhone} onChange={e => setForm(f => ({ ...f, ownerPhone: e.target.value.replace(/\D/g,'') }))}
                placeholder="9876543210"
                className="flex-1 px-3 py-3 text-base outline-none bg-white" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Initial password *</label>
            <input type="text" value={form.ownerPassword} onChange={e => setForm(f => ({ ...f, ownerPassword: e.target.value }))}
              placeholder="Foundry@123"
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-400 mt-1">Share with owner verbally — they can change it later.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Address <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="Shiroli MIDC, Kolhapur"
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <button onClick={handleCreateUnit} disabled={creating}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl text-base font-semibold disabled:opacity-50">
            {creating ? 'Creating...' : 'Create unit'}
          </button>
        </div>
      </BottomSheet>

      {/* Unit users sheet */}
      {selectedUnit && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedUnit(null)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70svh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-4 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{selectedUnit.name}</p>
                <p className="text-xs text-gray-400">{unitUsers.length} members</p>
              </div>
              <button onClick={() => setSelectedUnit(null)} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">×</button>
            </div>
            <div className="divide-y divide-gray-50">
              {unitUsers.length === 0
                ? <p className="px-4 py-6 text-sm text-gray-400 text-center">No users yet — owner invite pending.</p>
                : unitUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.role}{u.phone ? ` · +91 ${u.phone}` : ''}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
