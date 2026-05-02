import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { SkeletonList } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'

function fmtDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function thisMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
  return { start, end }
}

export default function Dispatch() {
  const navigate = useNavigate()
  const { unit } = useAuthStore()

  const [tab, setTab] = useState('pending')
  const [pendingJobs, setPendingJobs] = useState([])
  const [dispatches, setDispatches] = useState([])
  const [customers, setCustomers] = useState([])
  const [customerFilter, setCustomerFilter] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!unit?.id) return
    setLoading(true)

    // Find last stage (dispatch stage)
    const { data: lastStage } = await supabase
      .from('stage_templates')
      .select('id, name')
      .eq('unit_id', unit.id)
      .order('order_index', { ascending: false })
      .limit(1)
      .single()

    const [{ data: jobs }, { data: disps }, { data: custs }] = await Promise.all([
      // Pending: active jobs at last stage
      lastStage
        ? supabase.from('jobs')
            .select('*, customers(id, name)')
            .eq('unit_id', unit.id)
            .eq('current_stage_id', lastStage.id)
            .eq('status', 'active')
            .order('due_date', { ascending: true, nullsFirst: false })
        : Promise.resolve({ data: [] }),

      // Dispatched: this month (or all)
      (() => {
        let q = supabase.from('dispatches')
          .select('*, jobs(id, job_number, part_name, rate, rate_unit, customers(id, name))')
          .order('dispatch_date', { ascending: false })
        if (!showAll) {
          const { start, end } = thisMonthRange()
          q = q.gte('dispatch_date', start.split('T')[0]).lte('dispatch_date', end.split('T')[0])
        }
        return q
      })(),

      // Customer list for filter
      supabase.from('customers')
        .select('id, name')
        .eq('unit_id', unit.id)
        .eq('is_active', true)
        .order('name'),
    ])

    setPendingJobs(jobs ?? [])
    setDispatches(disps ?? [])
    setCustomers(custs ?? [])
    setLoading(false)
  }, [unit?.id, showAll])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredDispatches = customerFilter
    ? dispatches.filter(d => d.jobs?.customers?.id === customerFilter)
    : dispatches

  return (
    <div className="min-h-svh bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-0 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900 mb-3">Dispatch</h1>
        <div className="flex gap-4">
          {['pending', 'dispatched'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
              }`}
            >
              {t === 'pending' ? 'Pending' : 'Dispatched'}
              {t === 'pending' && pendingJobs.length > 0 && (
                <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                  {pendingJobs.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <SkeletonList count={4} />
        ) : tab === 'pending' ? (

          /* ── Pending tab ── */
          pendingJobs.length === 0 ? (
            <EmptyState icon="📦" title="No jobs ready to dispatch" message="Jobs at the last stage will appear here." />
          ) : (
            <div className="space-y-2">
              {pendingJobs.map(job => {
                const amount = job.rate ? (job.qty_balance ?? job.qty_ordered) * job.rate : null
                return (
                  <button
                    key={job.id}
                    onClick={() => navigate(`/jobs/${job.id}/dispatch`)}
                    className="w-full bg-white border border-gray-100 rounded-xl p-4 text-left active:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-gray-400 font-mono">{job.job_number}</p>
                        <p className="font-semibold text-gray-900 mt-0.5">{job.part_name}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{job.customers?.name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-gray-900">{job.qty_balance ?? job.qty_ordered} pcs</p>
                        {amount && <p className="text-xs text-gray-500 mt-0.5">₹{amount.toLocaleString('en-IN')}</p>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )

        ) : (

          /* ── Dispatched tab ── */
          <div className="space-y-3">
            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={customerFilter}
                onChange={e => setCustomerFilter(e.target.value)}
                className="flex-1 px-3 py-2.5 text-sm border border-gray-300 rounded-xl outline-none bg-white"
              >
                <option value="">All customers</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={() => setShowAll(v => !v)}
                className={`px-3 py-2 text-sm rounded-xl border transition-colors ${
                  showAll ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600'
                }`}
              >
                {showAll ? 'This month' : 'All time'}
              </button>
            </div>

            {filteredDispatches.length === 0 ? (
              <EmptyState icon="🚚" message="No dispatches in this period." />
            ) : (
              <div className="space-y-2">
                {filteredDispatches.map(d => {
                  const amount = d.jobs?.rate ? d.qty_dispatched * d.jobs.rate : null
                  return (
                    <div key={d.id} className="bg-white border border-gray-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-gray-400">{d.dc_number}</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-500">{fmtDate(d.dispatch_date)}</span>
                      </div>
                      <p className="font-medium text-gray-900 truncate">{d.jobs?.part_name}</p>
                      <p className="text-sm text-gray-500">{d.jobs?.customers?.name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {d.qty_dispatched} pcs{amount ? ` · ₹${amount.toLocaleString('en-IN')}` : ''}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
