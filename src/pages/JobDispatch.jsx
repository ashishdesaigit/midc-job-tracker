import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { nextDcNumber } from '../lib/numbering'
import { uploadPhoto } from '../lib/photoUpload'
import { openWhatsApp } from '../lib/whatsapp'

function today() {
  return new Date().toISOString().split('T')[0]
}
function fmtDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}
function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

export default function JobDispatch() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, unit } = useAuthStore()

  const [job, setJob] = useState(null)
  const [dcNumber, setDcNumber] = useState('')
  const [form, setForm] = useState({ qty: '', date: today(), vehicle: '', remarks: '' })
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [savedDispatch, setSavedDispatch] = useState(null)

  useEffect(() => {
    if (!id || !unit?.id) return
    Promise.all([
      supabase.from('jobs').select('*, customers(id, name, phone)').eq('id', id).single(),
      nextDcNumber(unit.id),
    ]).then(([{ data: j }, dc]) => {
      setJob(j)
      setDcNumber(dc)
      if (j) setForm(f => ({ ...f, qty: String(j.qty_balance ?? j.qty_ordered) }))
      setLoading(false)
    })
  }, [id, unit?.id])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); setError('') }

  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const qty    = parseInt(form.qty) || 0
  const amount = job?.rate && qty ? qty * job.rate : null

  async function handleSave() {
    if (!qty || qty <= 0)               { setError('Enter quantity'); return }
    if (qty > (job.qty_balance ?? job.qty_ordered)) {
      setError(`Balance is ${job.qty_balance ?? job.qty_ordered} pcs`); return
    }
    setSaving(true); setError('')

    let photoUrl = null
    if (photo) {
      try {
        photoUrl = await uploadPhoto(photo, `${unit.id}/${id}/dispatch_${Date.now()}.jpg`)
      } catch { /* silent */ }
    }

    const { data: dispatch, error: dispErr } = await supabase
      .from('dispatches')
      .insert({
        job_id: id,
        dc_number: dcNumber,
        qty_dispatched: qty,
        dispatch_date: form.date,
        vehicle_info: form.vehicle.trim() || null,
        photo_url: photoUrl,
        remarks: form.remarks.trim() || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (dispErr) { setError(dispErr.message); setSaving(false); return }

    const newBalance = (job.qty_balance ?? job.qty_ordered) - qty
    await supabase.from('jobs').update({
      qty_balance: Math.max(0, newBalance),
      status: newBalance <= 0 ? 'dispatched' : 'active',
    }).eq('id', id)

    setSavedDispatch(dispatch)
    setConfirmed(true)
    setSaving(false)
  }

  function dcTextForWhatsApp() {
    return [
      `${unit.name}: Tumcha order dispatch zala!`,
      '',
      `DC: ${dcNumber} | ${fmtDate(form.date)}`,
      `Part: ${job.part_name}`,
      `Qty: ${qty} pcs${amount ? ` | ₹${amount.toLocaleString('en-IN')}` : ''}`,
      form.vehicle.trim() ? `\nVehicle: ${form.vehicle.trim()}` : null,
      form.remarks.trim() ? `Remarks: ${form.remarks.trim()}` : null,
      `\n— ${unit.name}`,
    ].filter(l => l !== null).join('\n')
  }

  if (loading) return (
    <div className="min-h-svh flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!job) return null

  return (
    <div className="min-h-svh bg-gray-50">
      {/* Header */}
      <div className="no-print bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 p-1 -ml-1">
          <ChevronLeft />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dispatch</h1>
          <p className="text-xs text-gray-400">{job.job_number} · {job.part_name}</p>
        </div>
      </div>

      {/* Job summary */}
      <div className="no-print bg-white mx-4 mt-4 rounded-xl border border-gray-100 p-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div><p className="text-xs text-gray-400">Part</p><p className="font-medium">{job.part_name}</p></div>
          <div><p className="text-xs text-gray-400">Customer</p><p className="font-medium">{job.customers?.name}</p></div>
          <div><p className="text-xs text-gray-400">Qty ordered</p><p className="font-medium">{job.qty_ordered} pcs</p></div>
          <div>
            <p className="text-xs text-gray-400">Balance</p>
            <p className="font-medium text-blue-600">{job.qty_balance ?? job.qty_ordered} pcs</p>
          </div>
        </div>
      </div>

      {/* Form */}
      {!confirmed && (
        <div className="no-print px-4 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Qty dispatching today *</label>
            <input
              type="number" inputMode="numeric"
              value={form.qty}
              onChange={e => set('qty', e.target.value)}
              className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Dispatch date</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
              className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Vehicle / transporter <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input value={form.vehicle} onChange={e => set('vehicle', e.target.value)} placeholder="MH09 AK 1234"
              className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Remarks <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea value={form.remarks} onChange={e => set('remarks', e.target.value)}
              placeholder="e.g. Balance 5 pcs next week" rows={2}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Photo <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            {preview ? (
              <div className="relative">
                <img src={preview} className="w-full h-36 object-cover rounded-xl" />
                <button onClick={() => { setPhoto(null); setPreview('') }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center text-sm">×</button>
              </div>
            ) : (
              <label className="w-full py-3.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500">
                <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                📷 Take photo
              </label>
            )}
          </div>
        </div>
      )}

      {/* DC Preview — always visible, printable */}
      <div className="mx-4 mt-2 mb-4 bg-white border border-gray-200 rounded-xl p-5 font-mono text-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-base font-bold text-gray-900 not-italic">DELIVERY CHALLAN</p>
            <p className="text-xs text-gray-500 mt-0.5">Date: {fmtDate(form.date)}</p>
          </div>
          <p className="text-base font-bold text-gray-900">{dcNumber}</p>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-100 pt-4 mb-4">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">From</p>
            <p className="font-semibold text-gray-900 not-italic">{unit?.name}</p>
            {unit?.address && <p className="text-gray-600 text-xs mt-0.5 not-italic">{unit.address}</p>}
            {unit?.gstin   && <p className="text-gray-500 text-xs not-italic">GSTIN: {unit.gstin}</p>}
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">To</p>
            <p className="font-semibold text-gray-900 not-italic">{job.customers?.name}</p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-1.5">
          <div className="flex justify-between">
            <span className="text-gray-500">Part</span>
            <span className="text-gray-900 text-right max-w-[55%]">{job.part_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Qty</span>
            <span className="text-gray-900">{qty > 0 ? `${qty} pcs` : '—'}</span>
          </div>
          {job.rate && (
            <div className="flex justify-between">
              <span className="text-gray-500">Rate</span>
              <span className="text-gray-900">₹{job.rate}/{job.rate_unit}</span>
            </div>
          )}
          {amount && (
            <div className="flex justify-between font-semibold border-t border-gray-100 pt-1.5 mt-1.5">
              <span className="text-gray-700">Amount</span>
              <span className="text-gray-900">₹{amount.toLocaleString('en-IN')}</span>
            </div>
          )}
          {form.vehicle.trim() && (
            <div className="flex justify-between">
              <span className="text-gray-500">Vehicle</span>
              <span className="text-gray-900">{form.vehicle.trim()}</span>
            </div>
          )}
          {form.remarks.trim() && (
            <div className="flex justify-between">
              <span className="text-gray-500">Remarks</span>
              <span className="text-gray-900 text-right max-w-[60%]">{form.remarks.trim()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="no-print px-4 pb-10 space-y-3">
        {!confirmed ? (
          <>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button onClick={handleSave} disabled={saving}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl text-base font-semibold disabled:opacity-50">
              {saving ? 'Saving...' : 'Confirm dispatch'}
            </button>
          </>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center mb-3">
            <p className="text-green-700 font-semibold">Dispatch confirmed!</p>
            <p className="text-sm text-green-600 mt-0.5">{dcNumber} · {qty} pcs</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => openWhatsApp(job.customers.phone, dcTextForWhatsApp())}
            disabled={!job.customers?.phone}
            title={!job.customers?.phone ? 'Customer phone number not saved' : ''}
            className="flex-1 py-3 border border-gray-300 rounded-xl text-sm text-gray-700 font-medium disabled:opacity-40"
          >
            WhatsApp DC
          </button>
          <button onClick={() => window.print()}
            className="flex-1 py-3 border border-gray-300 rounded-xl text-sm text-gray-700 font-medium">
            Print / PDF
          </button>
        </div>
        {!job.customers?.phone && (
          <p className="text-xs text-center text-gray-400">
            Save customer's phone number for WhatsApp
          </p>
        )}

        {confirmed && (
          <button onClick={() => navigate(`/jobs/${id}`, { replace: true })}
            className="w-full py-3 bg-gray-900 text-white rounded-xl text-base font-medium">
            Done
          </button>
        )}
      </div>
    </div>
  )
}
