import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export default function CustomerNew() {
  const navigate = useNavigate()
  const { unit } = useAuthStore()
  const [form, setForm] = useState({ name: '', phone: '', gstin: '', credit_days: '30' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); setError('') }

  async function handleSave() {
    if (!form.name.trim()) { setError('Enter customer name'); return }
    setLoading(true)
    const { error: err } = await supabase.from('customers').insert({
      unit_id: unit.id,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      gstin: form.gstin.trim() || null,
      credit_days: parseInt(form.credit_days) || 30,
    })
    if (err) { setError(err.message); setLoading(false); return }
    navigate('/customers', { replace: true })
  }

  return (
    <div className="min-h-svh bg-white">
      <div className="px-4 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 p-1 -ml-1">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">New customer</h1>
      </div>

      <div className="px-4 py-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Kirloskar Brothers"
            autoFocus
            className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Phone <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="flex items-stretch border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
            <span className="flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-300 select-none">+91</span>
            <input
              type="tel" inputMode="numeric" maxLength={10}
              value={form.phone}
              onChange={e => set('phone', e.target.value.replace(/\D/g, ''))}
              placeholder="9876543210"
              className="flex-1 px-3 py-3.5 text-base outline-none bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            GSTIN <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            value={form.gstin}
            onChange={e => set('gstin', e.target.value.toUpperCase())}
            placeholder="27XXXXX"
            className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Credit days</label>
          <input
            type="number" inputMode="numeric" min={0}
            value={form.credit_days}
            onChange={e => set('credit_days', e.target.value)}
            className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3.5 rounded-xl text-base font-semibold disabled:opacity-50 active:bg-blue-700 transition-colors"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
