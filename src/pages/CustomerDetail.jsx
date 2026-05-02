import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SkeletonList } from '../components/ui/Skeleton'
import StagePill from '../components/ui/StagePill'
import EmptyState from '../components/ui/EmptyState'
import BottomSheet from '../components/ui/BottomSheet'

function dueDateLabel(due) {
  if (!due) return null
  const days = Math.ceil((new Date(due) - new Date().setHours(0,0,0,0)) / 86400000)
  if (days < 0)  return { text: `${Math.abs(days)}d late`, color: 'text-red-600' }
  if (days <= 3) return { text: `${days}d left`, color: 'text-amber-600' }
  return { text: `${days}d left`, color: 'text-green-600' }
}

function pillVariant(job) {
  if (job.status === 'dispatched') return 'done'
  if (job.stage_templates?.name === 'Inspection') return 'inspect'
  if (job.stage_templates?.is_subcontract) return 'vendor'
  return 'house'
}

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', phone: '', gstin: '', credit_days: '30' })
  const [saving, setSaving] = useState(false)

  async function fetchData() {
    const [{ data: c }, { data: j }] = await Promise.all([
      supabase.from('customers').select('*').eq('id', id).single(),
      supabase.from('jobs')
        .select('*, stage_templates(name, is_subcontract)')
        .eq('customer_id', id)
        .order('created_at', { ascending: false }),
    ])
    setCustomer(c)
    setJobs(j ?? [])
    setLoading(false)
    if (c) setEditForm({ name: c.name ?? '', phone: c.phone ?? '', gstin: c.gstin ?? '', credit_days: String(c.credit_days ?? 30) })
  }

  useEffect(() => { fetchData() }, [id])

  async function handleSave() {
    if (!editForm.name.trim()) return
    setSaving(true)
    await supabase.from('customers').update({
      name: editForm.name.trim(),
      phone: editForm.phone.trim() || null,
      gstin: editForm.gstin.trim() || null,
      credit_days: parseInt(editForm.credit_days) || 30,
    }).eq('id', id)
    setSaving(false)
    setEditOpen(false)
    fetchData()
  }

  if (loading) return (
    <div className="min-h-svh bg-gray-50">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-3" />
        <div className="h-6 w-44 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="px-4 py-4"><SkeletonList count={3} /></div>
    </div>
  )
  if (!customer) return null

  return (
    <div className="min-h-svh bg-gray-50">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 mb-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Customers
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
          <button onClick={() => setEditOpen(true)} className="text-sm text-blue-600 font-medium">Edit</button>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-white mx-4 mt-4 rounded-xl border border-gray-100 divide-y divide-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-gray-500">Phone</span>
          {customer.phone
            ? <a href={`tel:${customer.phone}`} className="text-sm text-blue-600 font-medium">+91 {customer.phone}</a>
            : <button onClick={() => setEditOpen(true)} className="text-sm text-gray-400 italic">Tap Edit to add</button>
          }
        </div>
        {customer.gstin && (
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-500">GSTIN</span>
            <span className="text-sm text-gray-900 font-mono">{customer.gstin}</span>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-gray-500">Credit days</span>
          <span className="text-sm text-gray-900">{customer.credit_days} days</span>
        </div>
      </div>

      {/* Job history */}
      <div className="px-4 mt-5 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Job history ({jobs.length})
        </p>
        {jobs.length === 0 ? (
          <EmptyState icon="📋" message={`No jobs for ${customer.name}.`} />
        ) : (
          <div className="space-y-2">
            {jobs.map(job => {
              const due = dueDateLabel(job.due_date)
              return (
                <button key={job.id} onClick={() => navigate(`/jobs/${job.id}`)}
                  className="w-full bg-white border border-gray-100 rounded-xl p-4 text-left active:bg-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400">{job.job_number}</p>
                      <p className="font-semibold text-gray-900 mt-0.5 truncate">{job.part_name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {job.material} · {job.qty_ordered} pcs
                        {job.rate ? ` · ₹${job.rate}/${job.rate_unit}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <StagePill
                        label={job.status === 'dispatched' ? 'Dispatched' : (job.stage_templates?.name ?? '—')}
                        variant={pillVariant(job)}
                      />
                      {due && <span className={`text-xs ${due.color}`}>{due.text}</span>}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit bottom sheet */}
      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit customer">
        <div className="space-y-3 pb-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <div className="flex items-stretch border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
              <span className="flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-300 select-none">+91</span>
              <input type="tel" inputMode="numeric" maxLength={10}
                value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value.replace(/\D/g,'') }))}
                placeholder="9876543210"
                className="flex-1 px-3 py-3 text-base outline-none bg-white" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
            <input value={editForm.gstin} onChange={e => setEditForm(f => ({ ...f, gstin: e.target.value.toUpperCase() }))}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Credit days</label>
            <input type="number" value={editForm.credit_days} onChange={e => setEditForm(f => ({ ...f, credit_days: e.target.value }))}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl text-base font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
