import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { SkeletonList } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import BottomSheet from '../components/ui/BottomSheet'

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
  return { onTimePct: done.length > 0 ? Math.round((onTime / done.length) * 100) : null, avgDelay, rejRate }
}

export default function VendorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { unit, user } = useAuthStore()

  const [vendor, setVendor] = useState(null)
  const [subs, setSubs] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  // Payment recording
  const [payOpen, setPayOpen] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payNote, setPayNote] = useState('')
  const [recording, setRecording] = useState(false)
  const [payError, setPayError] = useState('')

  async function fetchData() {
    const [{ data: v }, { data: s }, { data: p }] = await Promise.all([
      supabase.from('vendors').select('*').eq('id', id).single(),
      supabase.from('subcontracts').select('*, jobs(id, job_number, part_name)').eq('vendor_id', id).order('created_at', { ascending: false }),
      supabase.from('vendor_payments').select('*, users!paid_by(name)').eq('vendor_id', id).order('paid_at', { ascending: false }),
    ])
    setVendor(v)
    setSubs(s ?? [])
    setPayments(p ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  async function recordPayment() {
    const amt = parseFloat(payAmount)
    if (!amt || amt <= 0) { setPayError('Enter a valid amount'); return }
    setRecording(true); setPayError('')
    const { error } = await supabase.from('vendor_payments').insert({
      vendor_id: id,
      unit_id: unit.id,
      amount: amt,
      note: payNote.trim() || null,
      paid_by: user.id,
    })
    if (error) { setPayError(error.message); setRecording(false); return }
    setPayAmount(''); setPayNote(''); setPayOpen(false)
    setRecording(false)
    fetchData()
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

  const metrics = calcMetrics(subs)

  // Total earned = completed jobs (returned/partial)
  const totalEarned = subs
    .filter(s => ['returned', 'partial'].includes(s.status))
    .reduce((sum, s) => sum + ((s.qty_received ?? s.qty_sent) * (s.rate_per_piece ?? 0)), 0)

  // Total paid = sum of vendor_payments
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const outstanding = totalEarned - totalPaid

  return (
    <div className="min-h-svh bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 mb-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Vendors
        </button>
        <h1 className="text-xl font-bold text-gray-900">{vendor.name}</h1>
        {vendor.phone && (
          <a href={`tel:${vendor.phone}`} className="text-sm text-blue-600 mt-0.5 block">+91 {vendor.phone}</a>
        )}
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

      {/* Payment summary */}
      <div className="bg-white mx-4 mt-4 rounded-xl border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Payment summary</p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Total earned (completed jobs)</span>
            <span className="text-sm font-semibold text-gray-900">₹{totalEarned.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Total paid</span>
            <span className="text-sm font-semibold text-gray-900">₹{totalPaid.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-2">
            <span className="text-sm font-semibold text-gray-700">Outstanding</span>
            <span className={`text-base font-bold ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₹{outstanding.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {outstanding > 0 && (
          <button onClick={() => { setPayAmount(String(outstanding)); setPayOpen(true) }}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium">
            Record payment
          </button>
        )}
        {outstanding <= 0 && totalEarned > 0 && (
          <p className="text-xs text-center text-green-600">All payments up to date ✓</p>
        )}
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="mx-4 mt-3 bg-white rounded-xl border border-gray-100">
          <p className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment history</p>
          <div className="divide-y divide-gray-50">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">₹{p.amount.toLocaleString('en-IN')}</p>
                  {p.note && <p className="text-xs text-gray-500 mt-0.5">{p.note}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{p.users?.name ?? 'User'} · {fmt(p.paid_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance */}
      {subs.length > 0 && (
        <div className="bg-white mx-4 mt-3 rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Performance</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 rounded-xl py-3">
              <p className="text-xl font-bold text-gray-900">{metrics.onTimePct !== null ? `${metrics.onTimePct}%` : '—'}</p>
              <p className="text-xs text-gray-500 mt-0.5">On time</p>
            </div>
            <div className="bg-gray-50 rounded-xl py-3">
              <p className="text-xl font-bold text-gray-900">{metrics.avgDelay > 0 ? `${metrics.avgDelay}d` : '—'}</p>
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
      <div className="px-4 mt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
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
                    <p className="text-sm text-gray-500 mt-0.5">{s.qty_sent} pcs · {fmt(s.sent_date)}</p>
                    {s.qty_received != null && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Received: {s.qty_received} pcs
                        {s.qty_rejected > 0 && <span className="text-red-500"> · Rejected: {s.qty_rejected} pcs</span>}
                      </p>
                    )}
                    {s.rejection_note && <p className="text-xs text-gray-600 mt-1 italic">"{s.rejection_note}"</p>}
                    {s.rejection_photo_url && (
                      <img src={s.rejection_photo_url} alt="return" className="mt-1.5 w-full h-20 object-cover rounded-lg" />
                    )}
                    {/* Rate/dimension — greyed out, kept for reference */}
                    {s.rate_per_piece && (
                      <p className="text-xs text-gray-300 mt-1.5">
                        ₹{s.rate_per_piece}/pc · ₹{((s.qty_received ?? s.qty_sent) * s.rate_per_piece).toLocaleString('en-IN')} total
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                    s.status === 'returned' ? 'bg-green-100 text-green-700' :
                    s.status === 'partial'  ? 'bg-amber-100 text-amber-700' :
                                              'bg-blue-100 text-blue-700'
                  }`}>
                    {s.status === 'returned' ? 'Returned' : s.status === 'partial' ? 'Partial' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record payment sheet */}
      <BottomSheet open={payOpen} onClose={() => { setPayOpen(false); setPayError('') }} title="Record payment">
        <div className="space-y-4 pb-2">
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <span className="text-sm text-gray-600">Outstanding</span>
            <span className="text-sm font-bold text-red-600">₹{outstanding.toLocaleString('en-IN')}</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount paid (₹) *</label>
            <input
              type="number" inputMode="decimal"
              value={payAmount}
              onChange={e => { setPayAmount(e.target.value); setPayError('') }}
              placeholder={String(outstanding)}
              className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Note <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              value={payNote}
              onChange={e => setPayNote(e.target.value)}
              placeholder="e.g. May payment, Advance"
              className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {payError && <p className="text-sm text-red-600">{payError}</p>}
          <button onClick={recordPayment} disabled={recording}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl text-base font-semibold disabled:opacity-50">
            {recording ? 'Recording...' : 'Record payment'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
