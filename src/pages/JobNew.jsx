import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { nextJobNumber } from '../lib/numbering'
import { uploadPhoto, photoPath } from '../lib/photoUpload'
import BottomSheet from '../components/ui/BottomSheet'

const MATERIALS = ['Grey Iron', 'SG Iron', 'Steel', 'Aluminium', 'Brass', 'Other']

function twoWeeksFromNow() {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d.toISOString().split('T')[0]
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

export default function JobNew() {
  const navigate = useNavigate()
  const { unit, user } = useAuthStore()

  const [form, setForm] = useState({
    customer_id: '', customer_name: '',
    part_name: '', material: '',
    qty_ordered: '', rate: '', rate_unit: 'piece',
    free_issue: false, free_issue_qty: '',
    due_date: twoWeeksFromNow(),
    remarks: '',
  })

  const [customers, setCustomers] = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickName, setQuickName] = useState('')

  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!unit?.id) return
    supabase
      .from('customers')
      .select('id, name, phone')
      .eq('unit_id', unit.id)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setCustomers(data ?? []))
  }, [unit?.id])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); setError('') }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  function selectCustomer(c) {
    setForm(f => ({ ...f, customer_id: c.id, customer_name: c.name }))
    setPickerOpen(false)
    setSearch('')
    setError('')
  }

  async function handleQuickAdd() {
    if (!quickName.trim()) return
    const { data } = await supabase
      .from('customers')
      .insert({ unit_id: unit.id, name: quickName.trim() })
      .select()
      .single()
    if (data) {
      setCustomers(cs => [...cs, data].sort((a, b) => a.name.localeCompare(b.name)))
      selectCustomer(data)
      setQuickAddOpen(false)
      setQuickName('')
    }
  }

  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!form.customer_id)       { setError('Select a customer'); return }
    if (!form.part_name.trim())  { setError('Enter part name'); return }
    if (!form.material)          { setError('Select material'); return }
    if (!form.qty_ordered)       { setError('Enter quantity'); return }

    setLoading(true); setError('')

    try {
      const jobNumber = await nextJobNumber(unit.id)

      const { data: firstStage } = await supabase
        .from('stage_templates')
        .select('id, name')
        .eq('unit_id', unit.id)
        .order('order_index')
        .limit(1)
        .single()

      if (!firstStage) { setError('Stages not configured. Check settings.'); setLoading(false); return }

      const { data: job, error: jobErr } = await supabase
        .from('jobs')
        .insert({
          unit_id: unit.id,
          job_number: jobNumber,
          customer_id: form.customer_id,
          part_name: form.part_name.trim(),
          material: form.material,
          qty_ordered: parseInt(form.qty_ordered),
          qty_balance: parseInt(form.qty_ordered),
          rate: form.rate ? parseFloat(form.rate) : null,
          rate_unit: form.rate_unit,
          free_issue: form.free_issue,
          free_issue_qty: form.free_issue && form.free_issue_qty ? parseInt(form.free_issue_qty) : null,
          due_date: form.due_date || null,
          current_stage_id: firstStage.id,
          remarks: form.remarks.trim() || null,
          created_by: user.id,
        })
        .select()
        .single()

      if (jobErr) throw jobErr

      // Upload photo (non-blocking — job already saved)
      if (photoFile) {
        try {
          const url = await uploadPhoto(photoFile, photoPath(unit.id, job.id, 'sample'))
          await supabase.from('jobs').update({ photo_url: url }).eq('id', job.id)
        } catch {
          // Photo upload failed silently — job saved without photo
        }
      }

      // Stage log entry
      await supabase.from('job_stage_log').insert({
        job_id: job.id,
        stage_id: firstStage.id,
        stage_name: firstStage.name,
        moved_by: user.id,
      })

      navigate(`/jobs/${job.id}`, { replace: true })
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-svh bg-white">
      <div className="px-4 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 p-1 -ml-1">
          <ChevronLeft />
        </button>
        <h1 className="text-xl font-bold text-gray-900">New job</h1>
      </div>

      <div className="px-4 py-5 space-y-5 pb-10">

        {/* Customer */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer *</label>
          <div className="flex gap-2">
            <button
              onClick={() => setPickerOpen(true)}
              className={`flex-1 px-4 py-3.5 text-base border border-gray-300 rounded-xl text-left transition-colors ${
                form.customer_name ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {form.customer_name || 'Select a customer'}
            </button>
            <button
              onClick={() => setQuickAddOpen(true)}
              className="w-13.5 h-13.5 flex items-center justify-center border border-gray-300 rounded-xl text-gray-500 text-2xl"
            >
              +
            </button>
          </div>
        </div>

        {/* Part name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Part name *</label>
          <input
            value={form.part_name}
            onChange={e => set('part_name', e.target.value)}
            placeholder="Pump Body"
            className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Material */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Material *</label>
          <div className="grid grid-cols-3 gap-2">
            {MATERIALS.map(m => (
              <button
                key={m}
                onClick={() => set('material', m)}
                className={`py-2.5 px-2 text-sm rounded-xl border text-center transition-colors ${
                  form.material === m
                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-200 text-gray-700'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity ordered *</label>
          <input
            type="number" inputMode="numeric" min={1}
            value={form.qty_ordered}
            onChange={e => set('qty_ordered', e.target.value)}
            placeholder="50"
            className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Rate + unit toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Rate <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number" inputMode="decimal"
              value={form.rate}
              onChange={e => set('rate', e.target.value)}
              placeholder="185"
              className="flex-1 px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex border border-gray-300 rounded-xl overflow-hidden">
              {['piece', 'kg'].map(u => (
                <button
                  key={u}
                  onClick={() => set('rate_unit', u)}
                  className={`px-4 text-sm font-medium transition-colors ${
                    form.rate_unit === u ? 'bg-blue-600 text-white' : 'text-gray-600 bg-white'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Free issue */}
        <div>
          <div className="flex items-center justify-between py-1">
            <label className="text-sm font-medium text-gray-700">Free issue material?</label>
            <button
              onClick={() => set('free_issue', !form.free_issue)}
              className={`w-12 h-6 rounded-full relative transition-colors ${
                form.free_issue ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                form.free_issue ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          {form.free_issue && (
            <div className="mt-3">
              <label className="block text-sm text-gray-600 mb-1.5">How many pcs will customer send?</label>
              <input
                type="number" inputMode="numeric"
                value={form.free_issue_qty}
                onChange={e => set('free_issue_qty', e.target.value)}
                placeholder="50"
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
        </div>

        {/* Due date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Delivery due date</label>
          <input
            type="date"
            value={form.due_date}
            onChange={e => set('due_date', e.target.value)}
            className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Photo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Photo <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          {photoPreview ? (
            <div className="relative">
              <img src={photoPreview} alt="preview" className="w-full h-40 object-cover rounded-xl" />
              <button
                onClick={() => { setPhotoFile(null); setPhotoPreview('') }}
                className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center text-sm"
              >
                ×
              </button>
            </div>
          ) : (
            <label className="w-full py-3.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 flex items-center justify-center gap-2">
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              📷 Take photo
            </label>
          )}
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Remarks <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={form.remarks}
            onChange={e => set('remarks', e.target.value)}
            placeholder="Some notes..."
            rows={2}
            className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3.5 rounded-xl text-base font-semibold disabled:opacity-50 active:bg-blue-700 transition-colors"
        >
          {loading ? 'Saving...' : 'Save job'}
        </button>
      </div>

      {/* Customer picker */}
      <BottomSheet
        open={pickerOpen}
        onClose={() => { setPickerOpen(false); setSearch('') }}
        title="Select a customer"
      >
        <div className="space-y-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            autoFocus
            className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-base"
          />
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No customers found</p>
            ) : filtered.map(c => (
              <button
                key={c.id}
                onClick={() => selectCustomer(c)}
                className="w-full text-left px-4 py-3 rounded-xl active:bg-gray-100 transition-colors"
              >
                <p className="font-medium text-gray-900">{c.name}</p>
                {c.phone && <p className="text-sm text-gray-500">+91 {c.phone}</p>}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setPickerOpen(false); setQuickAddOpen(true) }}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500"
          >
            + Add new customer
          </button>
        </div>
      </BottomSheet>

      {/* Quick-add customer */}
      <BottomSheet
        open={quickAddOpen}
        onClose={() => { setQuickAddOpen(false); setQuickName('') }}
        title="New customer"
      >
        <div className="space-y-4">
          <input
            value={quickName}
            onChange={e => setQuickName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
            placeholder="Customer name *"
            autoFocus
            className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleQuickAdd}
            disabled={!quickName.trim()}
            className="w-full bg-blue-600 text-white py-3.5 rounded-xl text-base font-semibold disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
