import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { openWhatsApp } from '../lib/whatsapp'
import { SkeletonList } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import MarkReturned from '../components/ui/MarkReturned'

const TABS = [
  { key: 'all',       label: 'All' },
  { key: 'overdue',   label: 'Overdue' },
  { key: 'today',     label: 'Today' },
  { key: 'this_week', label: 'This week' },
]

function daysDiff(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date().setHours(0,0,0,0)) / 86400000)
}

function fmt(d, opts = { day: 'numeric', month: 'short' }) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', opts)
}

function buildWhatsApp(sub) {
  const days = daysDiff(sub.expected_return)
  const base = `${sub.vendors?.name}, ${sub.challan_ref} — ${sub.jobs?.part_name} ${sub.qty_sent} pcs`
  if (days === null) return base
  if (days > 0)  return `${base} — expected in ${days} days. Please confirm.`
  if (days === 0) return `${base} was expected today. When can we expect it? Please confirm.`
  return `${base} — ${Math.abs(days)} days overdue. When will it be returned?`
}

export default function Outside() {
  const navigate = useNavigate()
  const { unit } = useAuthStore()
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [returnSub, setReturnSub] = useState(null)

  const fetchSubs = useCallback(async () => {
    if (!unit?.id) return
    const { data } = await supabase
      .from('subcontracts')
      .select('*, vendors(id, name, phone), jobs(id, job_number, part_name)')
      .eq('status', 'pending')
      .order('expected_return', { ascending: true, nullsFirst: false })
    setSubs(data ?? [])
    setLoading(false)
  }, [unit?.id])

  useEffect(() => { fetchSubs() }, [fetchSubs])

  function filterSubs(list) {
    const now = new Date().setHours(0,0,0,0)
    if (tab === 'overdue')   return list.filter(s => s.expected_return && new Date(s.expected_return) < now)
    if (tab === 'today')     return list.filter(s => daysDiff(s.expected_return) === 0)
    if (tab === 'this_week') return list.filter(s => {
      const d = daysDiff(s.expected_return)
      return d !== null && d >= 0 && d <= 7
    })
    return list
  }

  const visible  = filterSubs(subs)
  const overdue  = subs.filter(s => s.expected_return && new Date(s.expected_return) < new Date().setHours(0,0,0,0))

  return (
    <div className="min-h-svh bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-0 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <h1 className="text-xl font-bold text-gray-900">Outside</h1>
          {subs.length > 0 && (
            <span className="text-xs bg-gray-900 text-white px-2 py-0.5 rounded-full font-medium">
              {subs.length}
            </span>
          )}
        </div>

        {overdue.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-3 flex items-center gap-2">
            <span className="text-red-600 text-lg">⚠️</span>
            <p className="text-sm text-red-700 font-medium">
              {overdue.length} jobs overdue. Follow up.
            </p>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {t.label}
              {t.key === 'overdue' && overdue.length > 0 && (
                <span className="ml-1 text-red-400">{overdue.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <SkeletonList count={3} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="📦"
            title="No jobs outside"
            message={tab === 'all' ? 'All jobs are in-house.' : 'No jobs match this filter.'}
          />
        ) : (
          <div className="space-y-3">
            {visible.map(sub => {
              const days = daysDiff(sub.expected_return)
              const isOverdue = days !== null && days < 0

              return (
                <div key={sub.id} className={`bg-white border rounded-xl p-4 ${isOverdue ? 'border-red-200' : 'border-gray-100'}`}>
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{sub.vendors?.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {sub.challan_ref} · {sub.jobs?.job_number} · {sub.qty_sent} pcs
                      </p>
                    </div>
                    {days !== null && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                        isOverdue         ? 'bg-red-100 text-red-700' :
                        days === 0        ? 'bg-amber-100 text-amber-700' :
                                           'bg-blue-100 text-blue-700'
                      }`}>
                        {isOverdue ? `Overdue ${Math.abs(days)}d` : days === 0 ? 'Today' : `${days}d`}
                      </span>
                    )}
                  </div>

                  {sub.operation_desc && (
                    <p className="text-sm text-gray-600 mb-2">{sub.operation_desc}</p>
                  )}

                  <p className="text-xs text-gray-400 mb-3">
                    Sent: {fmt(sub.sent_date)}
                    {sub.expected_return && ` · Expected: ${fmt(sub.expected_return)}`}
                  </p>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => sub.vendors?.phone && openWhatsApp(sub.vendors.phone, buildWhatsApp(sub))}
                      disabled={!sub.vendors?.phone}
                      className="flex-1 py-2 border border-gray-300 rounded-xl text-sm text-gray-700 disabled:opacity-40"
                    >
                      WhatsApp
                    </button>
                    <button
                      onClick={() => setReturnSub(sub)}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium"
                    >
                      Mark returned
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <MarkReturned
        open={!!returnSub}
        onClose={() => setReturnSub(null)}
        subcontract={returnSub}
        onComplete={() => { fetchSubs(); navigate(`/jobs/${returnSub?.jobs?.id}`) }}
      />
    </div>
  )
}
