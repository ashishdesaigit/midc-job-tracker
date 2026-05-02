import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

const ROLE_LABELS = { supervisor: 'Supervisor', accounts: 'Accounts', owner: 'Owner' }

export default function SettingsTeam() {
  const navigate = useNavigate()
  const { unit, user } = useAuthStore()

  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', phone: '', password: '', role: 'supervisor' })
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function fetchMembers() {
    const { data } = await supabase.from('users').select('*').eq('unit_id', unit.id).order('created_at')
    setMembers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { if (unit?.id) fetchMembers() }, [unit?.id])

  async function toggleActive(memberId, current) {
    if (memberId === user.id) return
    await supabase.from('users').update({ is_active: !current }).eq('id', memberId)
    fetchMembers()
  }

  async function handleAddMember() {
    const cleaned = form.phone.replace(/\D/g, '')
    if (!form.name.trim())    { setError('Enter name'); return }
    if (cleaned.length !== 10) { setError('Enter 10 digit phone number'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }

    setAdding(true); setError('')

    const { data, error: fnErr } = await supabase.functions.invoke('create-user', {
      body: { phone: cleaned, password: form.password, name: form.name.trim(), role: form.role, unit_id: unit.id },
    })

    setAdding(false)

    if (fnErr || data?.error) { setError(data?.error ?? fnErr.message); return }

    setForm({ name: '', phone: '', password: '', role: 'supervisor' })
    setMessage(`${form.name.trim()} added! Login: +91 ${cleaned}, share the password.`)
    setTimeout(() => setMessage(''), 6000)
    fetchMembers()
  }

  return (
    <div className="min-h-svh bg-gray-50 pb-10">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 p-1 -ml-1">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Team</h1>
      </div>

      {message && (
        <div className="mx-4 mt-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">{message}</div>
      )}

      {/* Current members */}
      <div className="mx-4 mt-4 bg-white rounded-xl border border-gray-100">
        <p className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Current team</p>
        {loading ? (
          <p className="px-4 pb-4 text-sm text-gray-400">Loading...</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{ROLE_LABELS[m.role]}</span>
                    {m.phone && <span className="text-xs text-gray-400">· +91 {m.phone}</span>}
                  </div>
                </div>
                {m.id !== user.id ? (
                  <button onClick={() => toggleActive(m.id, m.is_active)}
                    className={`w-11 h-6 rounded-full relative transition-colors ${m.is_active ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${m.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                ) : (
                  <span className="text-xs text-gray-400 italic">You</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add member */}
      <div className="mx-4 mt-3 bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add member</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ramesh Patil"
            className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
          <div className="flex items-stretch border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
            <span className="flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-300 select-none">+91</span>
            <input type="tel" inputMode="numeric" maxLength={10}
              value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g,'') }))}
              placeholder="9876543210"
              className="flex-1 px-3 py-3 text-base outline-none bg-white" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
          <input type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="Supervisor@123"
            className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
          <p className="text-xs text-gray-400 mt-1">Share with them verbally.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
          <div className="flex gap-2">
            {['supervisor','accounts'].map(r => (
              <button key={r} onClick={() => setForm(f => ({ ...f, role: r }))}
                className={`flex-1 py-2.5 rounded-xl text-sm border font-medium transition-colors ${form.role === r ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600'}`}>
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button onClick={handleAddMember} disabled={adding}
          className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
          {adding ? 'Creating...' : 'Create member'}
        </button>
      </div>
    </div>
  )
}
