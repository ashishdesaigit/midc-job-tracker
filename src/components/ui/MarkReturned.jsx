import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { uploadPhoto, photoPath } from '../../lib/photoUpload'
import BottomSheet from './BottomSheet'

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function MarkReturned({ open, onClose, subcontract, onComplete }) {
  const { user, unit } = useAuthStore()

  const [form, setForm] = useState({
    qty_received: '',
    qty_rejected: '0',
    notes: '',
    return_date: today(),
  })
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); setError('') }

  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    const recv = parseInt(form.qty_received) || 0
    const rej  = parseInt(form.qty_rejected) || 0
    const sent = subcontract.qty_sent

    if (recv <= 0)         { setError('Enter qty received'); return }
    if (recv + rej > sent) { setError(`Received + rejected cannot exceed ${sent} pcs`); return }
    if (rej > 0 && !form.notes.trim()) { setError('Enter rejection reason'); return }

    setLoading(true); setError('')

    let photoUrl = null
    if (photo) {
      try {
        photoUrl = await uploadPhoto(
          photo,
          photoPath(unit.id, subcontract.job_id, 'rejection', subcontract.id)
        )
      } catch { /* silent */ }
    }

    const newStatus = recv >= sent ? 'returned' : 'partial'

    const { error: subErr } = await supabase
      .from('subcontracts')
      .update({
        qty_received: recv,
        qty_rejected: rej,
        rejection_note: form.notes.trim() || null,
        rejection_photo_url: photoUrl,
        actual_return_date: form.return_date,
        status: newStatus,
      })
      .eq('id', subcontract.id)

    if (subErr) { setError(subErr.message); setLoading(false); return }

    // Auto-advance job to next stage
    const { data: allStages } = await supabase
      .from('stage_templates')
      .select('id, name, order_index, is_subcontract')
      .eq('unit_id', unit.id)
      .order('order_index')

    const { data: job } = await supabase
      .from('jobs')
      .select('id, current_stage_id')
      .eq('id', subcontract.job_id)
      .single()

    if (allStages && job) {
      const currentIdx = allStages.findIndex(s => s.id === job.current_stage_id)
      const nextStage  = allStages[currentIdx + 1]
      if (nextStage) {
        await supabase.from('jobs').update({ current_stage_id: nextStage.id }).eq('id', job.id)
        await supabase.from('job_stage_log').insert({
          job_id: job.id,
          stage_id: nextStage.id,
          stage_name: nextStage.name,
          moved_by: user.id,
          notes: form.notes.trim() || null,
        })
      }
    }

    setLoading(false)
    setForm({ qty_received: '', qty_rejected: '0', notes: '', return_date: today() })
    setPhoto(null); setPreview('')
    onComplete?.()
    onClose()
  }

  if (!subcontract) return null

  const hasRejection = parseInt(form.qty_rejected) > 0

  return (
    <BottomSheet open={open} onClose={onClose} title={`Mark returned — ${subcontract.challan_ref}`}>
      <div className="space-y-4 pb-2">

        {/* Summary */}
        <div className="bg-gray-50 rounded-xl p-3 text-sm">
          <p className="text-gray-600">
            <span className="font-medium">{subcontract.vendors?.name}</span>
            {' · '}{subcontract.qty_sent} pcs sent
          </p>
        </div>

        {/* Qty received */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Qty received *</label>
          <input
            type="number" inputMode="numeric" min={0} max={subcontract.qty_sent}
            value={form.qty_received}
            onChange={e => set('qty_received', e.target.value)}
            placeholder={String(subcontract.qty_sent)}
            autoFocus
            className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Qty rejected */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Qty rejected</label>
          <input
            type="number" inputMode="numeric" min={0}
            value={form.qty_rejected}
            onChange={e => set('qty_rejected', e.target.value)}
            className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {hasRejection && (
            <p className="text-xs text-amber-600 mt-1">Rejection reason required below</p>
          )}
        </div>

        {/* Notes — always visible */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {hasRejection ? 'Rejection reason *' : 'Notes'}
            {!hasRejection && <span className="text-gray-400 font-normal"> (optional)</span>}
          </label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder={hasRejection ? 'e.g. Dimension out of tolerance' : 'Some notes...'}
            rows={2}
            className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Photo — always visible */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Photo <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          {preview ? (
            <div className="relative">
              <img src={preview} alt="return" className="w-full h-32 object-cover rounded-xl" />
              <button
                onClick={() => { setPhoto(null); setPreview('') }}
                className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center text-sm"
              >×</button>
            </div>
          ) : (
            <label className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500">
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              📷 Take photo
            </label>
          )}
        </div>

        {/* Return date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Return date</label>
          <input
            type="date"
            value={form.return_date}
            onChange={e => set('return_date', e.target.value)}
            className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full py-3.5 bg-blue-600 text-white rounded-xl text-base font-semibold disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Confirm return'}
        </button>
      </div>
    </BottomSheet>
  )
}
