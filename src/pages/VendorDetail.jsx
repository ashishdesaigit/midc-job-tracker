import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SkeletonList } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'

const WORK_LABELS = {
  boring: 'Boring', heat_treatment: 'Heat Treatment', grinding: 'Grinding',
  turning: 'Turning', milling: 'Milling', welding: 'Welding',
  plating: 'Plating', painting: 'Painting', other: 'Other',
}

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function calcMetrics(subs) {
  const done = subs.filter(s => s.status === 'returned' && s.actual_return_date && s.expected_return)
  const onTime = done.filter(s => new Date(s.actual_return_date) <= new Date(s.expected_return)).length
  const late = done.filter(s => new Date(s.actual_return_date) > new Date(s.expected_return))
  const avgDelay = late.length
    ? Math.round(late.reduce((sum, s) => sum + Math.ceil((new Date(s.actual_return_date) - new Date(s.expected_return)) / 86400000), 0) / late.length)
    : 0
  const totalRecv = subs.reduce((s, r) => s + (r.qty_received ?? 0), 0)
  const totalRej  = subs.reduce((s, r) => s + (r.qty_rejected ?? 0), 0)
  const rejRate   = totalRecv > 0 ? Math.round((totalRej / totalRecv) * 100) : 0
  return {
    onTimePct: done.length > 0 ? Math.round((onTime / done.length) * 100) : null,
    avgDelay,
    rejRate,
  }
}

function thisMonth(subs) {
  const now = new Date()
  return subs.filter(s => {
    const d = new Date(s.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
}

export default function VendorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [vendor, setVendor] = useState(null)
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)

  async function fetchData() {
    const [{ data: v }, { data: s }] = await Promise.all([
      supabase.from('vendors').select('*').eq('id', id).single(),
      supabase
        .from('subcontracts')
        .select('*, jobs(id, job_number, part_name)')
        .eq('vendor_id', id)
        .order('created_at', { ascending: false }),
    ])
    setVendor(v)
    setSubs(s ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  async function markAllPaid() {
    setPaying(true)
    await supabase
      .from('subcontracts')
      .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
      .eq('vendor_id', id)
      .eq('payment_status', 'pending')
      .in('status', ['returned', 'partial'])
    await fetchData()
    setPaying(false)
  }

  if (loading) return (
    <div className="min-h-svh bg-gray-50">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <div className="h-6 w-44 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="px-4 py-4"><SkeletonList count={3} /></div>
    </div>
  )
  if (!vendor) return null

  const metrics   = calcMetrics(subs)
  const monthly   = thisMonth(subs)
  const pendingPaySubs = subs.filter(s => ['returned','partial'].includes(s.status) && s.payment_status === 'pending')
  const pendingAmt = pendingPaySubs.reduce((sum, s) => sum + ((s.qty_received ?? s.qty_sent) * (s.rate_per_piece ?? 0)), 0)
  const monthAmt   = monthly.reduce((sum, s) => sum + (s.qty_sent * (s.rate_per_piece ?? 0)), 0)

  return (
    <div className="min-h-svh bg-gray-50">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 mb-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Vendors
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{vendor.name}</h1>
            {vendor.phone && (
              <a href={`tel:${vendor.phone}`} className="text-sm text-blue-600 mt-0.5 block">
                +91 {vendor.phone}
              </a>
            )}
          </div>
        </div>
        {vendor.work_types?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {vendor.work_types.map(wt => (
              <span key={wt} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {WORK_LABELS[wt] ?? wt}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* This month summary */}
      <div className="bg-white mx-4 mt-4 rounded-xl border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">This month</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Jobs given</p>
            <p className="font-semibold text-gray-900">{monthly.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Total amount</p>
            <p className="font-semibold text-gray-900">₹{monthAmt.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Pending payment</p>
            <p className={`font-semibold ${pendingAmt > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              ₹{pendingAmt.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
        {pendingAmt > 0 && (
          <button
            onClick={markAllPaid}
            disabled={paying}
            className="w-full mt-3 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {paying ? 'Updating...' : 'Mark all paid'}
          </button>
        )}
      </div>

      {/* Performance */}
      {subs.length > 0 && (
        <div className="bg-white mx-4 mt-3 rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Performance</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 rounded-xl py-3">
              <p className="text-xl font-bold text-gray-900">
                {metrics.onTimePct !== null ? `${metrics.onTimePct}%` : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">On time</p>
            </div>
            <div className="bg-gray-50 rounded-xl py-3">
              <p className="text-xl font-bold text-gray-900">
                {metrics.avgDelay > 0 ? `${metrics.avgDelay}d` : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Avg delay</p>
            </div>
            <div className="bg-gray-50 rounded-xl py-3">
              <p className="text-xl font-bold text-gray-900">{metrics.rejRate}%</p>
              <p className="text-xs text-gray-500 mt-0.5">Rejection</p>
            </div>
          </div>
        </div>
      )}

      {/* Work history */}
      <div className="px-4 mt-4 mb-6">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Work history ({subs.length})
        </p>
        {subs.length === 0 ? (
          <EmptyState icon="📦" message={`No subcontracts yet for ${vendor.name}.`} />
        ) : (
          <div className="space-y-2">
            {subs.map(s => (
              <div key={s.id} className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 font-mono">{s.challan_ref}</p>
                    <p className="font-medium text-gray-900 mt-0.5 truncate">
                      {s.jobs?.part_name ?? '—'} · {s.jobs?.job_number}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {s.qty_sent} pcs sent · {fmt(s.sent_date)}
                    </p>
                    {s.qty_received != null && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Received: {s.qty_received} pcs
                        {s.qty_rejected > 0 && <span className="text-red-500"> · Rejected: {s.qty_rejected} pcs</span>}
                      </p>
                    )}
                    {s.rejection_note && (
                      <p className="text-xs text-gray-600 mt-1 italic">"{s.rejection_note}"</p>
                    )}
                    {s.rejection_photo_url && (
                      <img src={s.rejection_photo_url} alt="return"
                        className="mt-1.5 w-full h-20 object-cover rounded-lg" />
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.status === 'returned' ? 'bg-green-100 text-green-700' :
                      s.status === 'partial'  ? 'bg-amber-100 text-amber-700' :
                                                'bg-blue-100 text-blue-700'
                    }`}>
                      {s.status === 'returned' ? 'Returned' : s.status === 'partial' ? 'Partial' : 'Pending'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      s.payment_status === 'paid' ? 'bg-gray-100 text-gray-500' : 'bg-red-50 text-red-600'
                    }`}>
                      {s.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                </div>
                {s.rate_per_piece && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    ₹{s.rate_per_piece}/pc · Total ₹{(s.qty_sent * s.rate_per_piece).toLocaleString('en-IN')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
