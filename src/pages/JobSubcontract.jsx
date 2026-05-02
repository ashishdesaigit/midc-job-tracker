import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { nextChallanRef } from '../lib/numbering'
import { openWhatsApp } from '../lib/whatsapp'
import BottomSheet from '../components/ui/BottomSheet'

function twoWeeksFromNow() {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d.toISOString().split('T')[0]
}

function fmtDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function JobSubcontract() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, unit } = useAuthStore()

  const [job, setJob] = useState(null)
  const [allStages, setAllStages] = useState([])
  const [vendors, setVendors] = useState([])

  const [form, setForm] = useState({
    vendor_id: '', vendor_name: '',
    qty_sending: '',
    operation_desc: '',
    rate_per_piece: '',
    expected_return: twoWeeksFromNow(),
  })

  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickName, setQuickName] = useState('')
  const [quickPhone, setQuickPhone] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // After save: show challan preview
  const [challan, setChallan] = useState(null)

  useEffect(() => {
    if (!id || !unit?.id) return
    Promise.all([
      supabase.from('jobs').select('*, customers(name)').eq('id', id).single(),
      supabase.from('stage_templates').select('id,name,order_index,is_subcontract').eq('unit_id', unit.id).order('order_index'),
      supabase.from('vendors').select('id,name,phone').eq('unit_id', unit.id).eq('is_active', true).order('name'),
    ]).then(([{ data: j }, { data: s }, { data: v }]) => {
      setJob(j)
      setAllStages(s ?? [])
      setVendors(v ?? [])
      if (j) setForm(f => ({ ...f, qty_sending: String(j.qty_balance ?? j.qty_ordered) }))
    })
  }, [id, unit?.id])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); setError('') }

  const filtered = vendors.filter(v => v.name.toLowerCase().includes(search.toLowerCase()))

  function selectVendor(v) {
    setForm(f => ({ ...f, vendor_id: v.id, vendor_name: v.name }))
    setPickerOpen(false); setSearch('')
  }

  async function handleQuickAdd() {
    if (!quickName.trim() || !quickPhone.trim()) return
    const { data } = await supabase.from('vendors').insert({
      unit_id: unit.id, name: quickName.trim(), phone: quickPhone.trim(),
    }).select().single()
    if (data) {
      setVendors(vs => [...vs, data].sort((a, b) => a.name.localeCompare(b.name)))
      selectVendor(data)
      setQuickAddOpen(false); setQuickName(''); setQuickPhone('')
    }
  }

  async function handleSave() {
    if (!form.vendor_id)          { setError('Select a vendor'); return }
    if (!form.qty_sending)        { setError('Enter quantity'); return }
    if (!form.operation_desc.trim()) { setError('Enter operation description'); return }

    setLoading(true); setError('')

    const currentIdx = allStages.findIndex(s => s.id === job.current_stage_id)
    const subStage   = allStages[currentIdx + 1]

    if (!subStage?.is_subcontract) {
      setError('Next stage is not a subcontract stage'); setLoading(false); return
    }

    const challanRef = await nextChallanRef(unit.id)

    const { data: sub, error: subErr } = await supabase.from('subcontracts').insert({
      job_id: id,
      vendor_id: form.vendor_id,
      challan_ref: challanRef,
      qty_sent: parseInt(form.qty_sending),
      operation_desc: form.operation_desc.trim(),
      rate_per_piece: form.rate_per_piece ? parseFloat(form.rate_per_piece) : null,
      sent_date: new Date().toISOString().split('T')[0],
      expected_return: form.expected_return || null,
      status: 'pending',
    }).select().single()

    if (subErr) { setError(subErr.message); setLoading(false); return }

    // Move job to subcontract stage
    await supabase.from('jobs').update({ current_stage_id: subStage.id }).eq('id', id)
    await supabase.from('job_stage_log').insert({
      job_id: id,
      stage_id: subStage.id,
      stage_name: subStage.name,
      moved_by: user.id,
      notes: `Sent to ${form.vendor_name} — ${challanRef}`,
    })

    setChallan({
      ref: challanRef,
      vendor: form.vendor_name,
      vendorPhone: vendors.find(v => v.id === form.vendor_id)?.phone,
      qty: parseInt(form.qty_sending),
      operation: form.operation_desc.trim(),
      rate: form.rate_per_piece || null,
      expectedReturn: form.expected_return,
    })
    setLoading(false)
  }

  function sendWhatsApp() {
    if (!challan?.vendorPhone) return
    const msg = `${challan.vendor},\n\nSC Challan: ${challan.ref}\nJob: ${job.job_number} — ${job.part_name}\nQty sent: ${challan.qty} pcs\nOperation: ${challan.operation}${challan.rate ? `\nRate: ₹${challan.rate}/pc` : ''}\nExpected return: ${fmtDate(challan.expectedReturn)}\n\n— ${unit.name}`
    openWhatsApp(challan.vendorPhone, msg)
  }

  if (!job) return (
    <div className="min-h-svh flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // ── Challan preview ─────────────────────────────────────────────────────────
  if (challan) return (
    <div className="min-h-svh bg-white">
      <div className="px-4 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Challan ready</h1>
        <p className="text-sm text-gray-500 mt-0.5">{challan.ref}</p>
      </div>
      <div className="px-4 py-5">
        <div className="bg-gray-50 rounded-xl p-4 font-mono text-sm space-y-1">
          <p className="font-bold">SC Challan: {challan.ref}</p>
          <p>Job: {job.job_number} — {job.part_name}</p>
          <p>Vendor: {challan.vendor}</p>
          <p>Qty: {challan.qty} pcs</p>
          <p>Operation: {challan.operation}</p>
          {challan.rate && <p>Rate: ₹{challan.rate}/pc</p>}
          <p>Expected: {fmtDate(challan.expectedReturn)}</p>
          <p className="pt-1">— {unit.name}</p>
        </div>

        <div className="space-y-3 mt-5">
          {challan.vendorPhone ? (
            <button
              onClick={sendWhatsApp}
              className="w-full py-3.5 bg-green-600 text-white rounded-xl text-base font-semibold"
            >
              Send via WhatsApp
            </button>
          ) : (
            <p className="text-sm text-center text-gray-400">No vendor phone number — cannot send WhatsApp</p>
          )}
          <button
            onClick={() => navigate(`/jobs/${id}`, { replace: true })}
            className="w-full py-3 border border-gray-300 rounded-xl text-base text-gray-700"
          >
            Back to job
          </button>
        </div>
      </div>
    </div>
  )

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-svh bg-white">
      <div className="px-4 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 p-1 -ml-1">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Send to vendor</h1>
          <p className="text-xs text-gray-400">{job.job_number} · {job.part_name}</p>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 pb-10">
        {/* Vendor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Vendor *</label>
          <div className="flex gap-2">
            <button
              onClick={() => setPickerOpen(true)}
              className={`flex-1 px-4 py-3.5 text-base border border-gray-300 rounded-xl text-left ${form.vendor_name ? 'text-gray-900' : 'text-gray-400'}`}
            >
              {form.vendor_name || 'Select a vendor'}
            </button>
            <button
              onClick={() => setQuickAddOpen(true)}
              className="w-13.5 h-13.5 flex items-center justify-center border border-gray-300 rounded-xl text-gray-500 text-2xl"
            >+</button>
          </div>
        </div>

        {/* Qty */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity sending *</label>
          <input
            type="number" inputMode="numeric"
            value={form.qty_sending}
            onChange={e => set('qty_sending', e.target.value)}
            className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Operation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Operation description *</label>
          <input
            value={form.operation_desc}
            onChange={e => set('operation_desc', e.target.value)}
            placeholder="e.g. Boring 52mm dia, depth 75mm"
            className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Rate ₹/piece <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="number" inputMode="decimal"
            value={form.rate_per_piece}
            onChange={e => set('rate_per_piece', e.target.value)}
            placeholder="25"
            className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Expected return */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Expected return date</label>
          <input
            type="date"
            value={form.expected_return}
            onChange={e => set('expected_return', e.target.value)}
            className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full py-3.5 bg-blue-600 text-white rounded-xl text-base font-semibold disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Send & generate challan'}
        </button>
      </div>

      {/* Vendor picker */}
      <BottomSheet open={pickerOpen} onClose={() => { setPickerOpen(false); setSearch('') }} title="Select a vendor">
        <div className="space-y-3">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search..." autoFocus
            className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-base"
          />
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {filtered.length === 0
              ? <p className="text-sm text-gray-400 text-center py-6">No vendors found</p>
              : filtered.map(v => (
                <button key={v.id} onClick={() => selectVendor(v)}
                  className="w-full text-left px-4 py-3 rounded-xl active:bg-gray-100">
                  <p className="font-medium text-gray-900">{v.name}</p>
                  {v.phone && <p className="text-sm text-gray-500">+91 {v.phone}</p>}
                </button>
              ))}
          </div>
          <button onClick={() => { setPickerOpen(false); setQuickAddOpen(true) }}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500">
            + Add new vendor
          </button>
        </div>
      </BottomSheet>

      {/* Quick-add vendor */}
      <BottomSheet open={quickAddOpen} onClose={() => { setQuickAddOpen(false); setQuickName(''); setQuickPhone('') }} title="New vendor">
        <div className="space-y-3">
          <input value={quickName} onChange={e => setQuickName(e.target.value)} placeholder="Vendor name *" autoFocus
            className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex items-stretch border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
            <span className="flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-300 select-none">+91</span>
            <input type="tel" inputMode="numeric" maxLength={10} value={quickPhone}
              onChange={e => setQuickPhone(e.target.value.replace(/\D/g, ''))} placeholder="Phone *"
              className="flex-1 px-3 py-3.5 text-base outline-none bg-white" />
          </div>
          <button onClick={handleQuickAdd} disabled={!quickName.trim() || !quickPhone.trim()}
            className="w-full bg-blue-600 text-white py-3.5 rounded-xl text-base font-semibold disabled:opacity-50">
            Add
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
