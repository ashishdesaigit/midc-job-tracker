import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { uploadPhoto, photoPath } from '../../lib/photoUpload'
import BottomSheet from './BottomSheet'

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function MarkReturned({ open, onClose, subcontract, onComplete }) {
  const { unit } = useAuthStore()

  const [notes, setNotes] = useState('')
  const [returnDate, setReturnDate] = useState(today())
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    setLoading(true); setError('')

    let photoUrl = null
    if (photo) {
      try {
        photoUrl = await uploadPhoto(
          photo, photoPath(unit.id, subcontract.job_id, 'rejection', subcontract.id)
        )
      } catch { /* silent */ }
    }

    const { error: subErr } = await supabase
      .from('subcontracts')
      .update({
        qty_received: subcontract.qty_sent,
        qty_rejected: 0,
        rejection_note: notes.trim() || null,
        rejection_photo_url: photoUrl,
        actual_return_date: returnDate,
        status: 'returned',
      })
      .eq('id', subcontract.id)

    if (subErr) { setError(subErr.message); setLoading(false); return }

    setLoading(false)
    setNotes(''); setReturnDate(today())
    setPhoto(null); setPreview('')
    onComplete?.()
    onClose()
  }

  if (!subcontract) return null

  return (
    <BottomSheet open={open} onClose={onClose} title={`Mark returned — ${subcontract.challan_ref}`}>
      <div className="space-y-4 pb-2">
        <div className="bg-gray-50 rounded-xl p-3 text-sm">
          <p className="text-gray-600">
            <span className="font-medium">{subcontract.vendors?.name}</span>
            {' · '}{subcontract.qty_sent} pcs sent
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={e => { setNotes(e.target.value); setError('') }}
            placeholder="Quantity received, quality observations, any issues..."
            rows={3}
            className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Photo <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          {preview ? (
            <div className="relative">
              <img src={preview} alt="return" className="w-full h-32 object-cover rounded-xl" />
              <button onClick={() => { setPhoto(null); setPreview('') }}
                className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center text-sm">×</button>
            </div>
          ) : (
            <label className="block w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 text-center cursor-pointer">
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              📷 Take photo
            </label>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Return date</label>
          <input
            type="date"
            value={returnDate}
            onChange={e => setReturnDate(e.target.value)}
            className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button onClick={handleSave} disabled={loading}
          className="w-full py-3.5 bg-blue-600 text-white rounded-xl text-base font-semibold disabled:opacity-50">
          {loading ? 'Saving...' : 'Confirm return'}
        </button>
      </div>
    </BottomSheet>
  )
}
