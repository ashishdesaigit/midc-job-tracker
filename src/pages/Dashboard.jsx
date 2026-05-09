import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { SkeletonLine } from '../components/ui/Skeleton'
import StagePill from '../components/ui/StagePill'

function MetricCard({ label, value, red, amber, loading, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={`bg-white rounded-xl p-4 border text-left w-full ${red ? 'border-red-200' : amber ? 'border-amber-200' : 'border-gray-100'} ${onClick ? 'active:bg-gray-50' : ''}`}>
      {loading
        ? <SkeletonLine className="h-9 w-12 mb-1" />
        : <p className={`text-3xl font-bold ${red ? 'text-red-600' : amber ? 'text-amber-600' : 'text-gray-900'}`}>
            {value ?? 0}
          </p>
      }
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </Tag>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { unit } = useAuthStore()

  const [metrics, setMetrics] = useState(null)
  const [overdueJobs, setOverdueJobs] = useState([])
  const [vendorPayables, setVendorPayables] = useState([])
  const [quickLinks, setQuickLinks] = useState({ vendors: 0, customers: 0, vendorOutstanding: 0 })
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!unit?.id) return
    const today      = new Date().toISOString().split('T')[0]
    const now        = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    const [
      { count: activeCount },
      { count: overdueCount },
      { count: dispatchedCount },
      { count: atVendorCount },
      { data: overdueData },
      { data: pendingPay },
      { count: vendorCount },
      { count: customerCount },
      { data: vendorPaymentsData },
      { data: vendorPaymentsEarned },
    ] = await Promise.all([
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'active').lt('due_date', today),
      supabase.from('dispatches').select('*', { count: 'exact', head: true }).gte('dispatch_date', monthStart),
      supabase.from('subcontracts').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('jobs')
        .select('*, customers(name), stage_templates(name, is_subcontract)')
        .eq('status', 'active').lt('due_date', today).order('due_date'),
      supabase.from('subcontracts')
        .select('*, vendors(id, name)')
        .in('status', ['returned', 'partial'])
        .eq('payment_status', 'pending'),
      supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('vendor_payments').select('amount'),
      supabase.from('subcontracts').select('qty_received, qty_sent, rate_per_piece').in('status', ['returned', 'partial']),
    ])

    setMetrics({ activeCount, overdueCount, dispatchedCount, atVendorCount })
    setOverdueJobs(overdueData ?? [])

    const vendorMap = {}
    for (const s of pendingPay ?? []) {
      const id = s.vendors?.id
      if (!id) continue
      if (!vendorMap[id]) vendorMap[id] = { id, name: s.vendors.name, amount: 0 }
      vendorMap[id].amount += (s.qty_received ?? s.qty_sent) * (s.rate_per_piece ?? 0)
    }
    setVendorPayables(Object.values(vendorMap).sort((a, b) => b.amount - a.amount))

    // Quick links data
    const totalPaid     = (vendorPaymentsData ?? []).reduce((s, p) => s + p.amount, 0)
    const totalEarned   = (vendorPaymentsEarned ?? []).reduce((s, r) => s + (r.qty_received ?? r.qty_sent) * (r.rate_per_piece ?? 0), 0)
    const outstanding   = Math.max(0, Math.round(totalEarned - totalPaid))
    setQuickLinks({ vendors: vendorCount ?? 0, customers: customerCount ?? 0, vendorOutstanding: outstanding })

    setLoading(false)
  }, [unit?.id])

  useEffect(() => {
    fetchData()
    const ch = supabase.channel('dashboard-jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs', filter: `unit_id=eq.${unit?.id}` },
        () => fetchData())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetchData, unit?.id])

  const totalPayable = vendorPayables.reduce((s, v) => s + v.amount, 0)

  return (
    <div className="min-h-svh bg-gray-50 pb-6">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        {unit && <p className="text-sm text-gray-500 mt-0.5">{unit.name}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pt-4">
        <MetricCard label="Active jobs"           value={metrics?.activeCount}     loading={loading}
          onClick={() => navigate('/jobs')} />
        <MetricCard label="Overdue"               value={metrics?.overdueCount}    loading={loading}
          red={(metrics?.overdueCount ?? 0) > 0} />
        <MetricCard label="Dispatched this month" value={metrics?.dispatchedCount} loading={loading}
          onClick={() => navigate('/dispatch')} />
        <MetricCard label="At vendors"            value={metrics?.atVendorCount}   loading={loading}
          amber={(metrics?.atVendorCount ?? 0) > 0} onClick={() => navigate('/outside')} />
      </div>

      {/* Vendors + Customers quick links */}
      <div className="grid grid-cols-2 gap-3 px-4 mt-3">
        <button onClick={() => navigate('/vendors')}
          className="bg-white border border-gray-100 rounded-xl p-4 text-left active:bg-gray-50">
          <p className="text-xs text-gray-400 mb-1">Vendors</p>
          <p className="text-xl font-bold text-gray-900">{loading ? '—' : quickLinks.vendors}</p>
          {quickLinks.vendorOutstanding > 0
            ? <p className="text-xs text-red-500 mt-0.5">₹{quickLinks.vendorOutstanding.toLocaleString('en-IN')} outstanding</p>
            : <p className="text-xs text-green-600 mt-0.5">Payments up to date</p>
          }
        </button>
        <button onClick={() => navigate('/customers')}
          className="bg-white border border-gray-100 rounded-xl p-4 text-left active:bg-gray-50">
          <p className="text-xs text-gray-400 mb-1">Customers</p>
          <p className="text-xl font-bold text-gray-900">{loading ? '—' : quickLinks.customers}</p>
          <p className="text-xs text-gray-400 mt-0.5">Tap to view all</p>
        </button>
      </div>

      <div className="px-4 mt-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Overdue jobs</p>
        {loading ? (
          <div className="space-y-2">
            {[0,1].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : overdueJobs.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
            <span className="text-xl">✅</span>
            <p className="text-sm text-gray-500">No overdue jobs</p>
          </div>
        ) : (
          <div className="space-y-2">
            {overdueJobs.map(job => {
              const days = Math.ceil((new Date().setHours(0,0,0,0) - new Date(job.due_date)) / 86400000)
              return (
                <button key={job.id} onClick={() => navigate(`/jobs/${job.id}`)}
                  className="w-full bg-white border border-red-100 rounded-xl p-4 text-left active:bg-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 font-mono">{job.job_number}</p>
                      <p className="font-semibold text-gray-900 truncate mt-0.5">{job.part_name}</p>
                      <p className="text-sm text-gray-500">{job.customers?.name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <StagePill label={job.stage_templates?.name ?? '—'}
                        variant={job.stage_templates?.is_subcontract ? 'vendor' : 'overdue'} />
                      <span className="text-xs font-medium text-red-600">{days}d late</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {!loading && vendorPayables.length > 0 && (
        <div className="px-4 mt-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Vendor payable this month</p>
          <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50">
            {vendorPayables.map(v => (
              <button key={v.id} onClick={() => navigate(`/vendors/${v.id}`)}
                className="flex items-center justify-between w-full px-4 py-3.5 active:bg-gray-50">
                <span className="text-sm font-medium text-gray-800">{v.name}</span>
                <span className="text-sm font-semibold text-gray-900">₹{v.amount.toLocaleString('en-IN')}</span>
              </button>
            ))}
            <div className="flex items-center justify-between px-4 py-3.5 bg-gray-50 rounded-b-xl">
              <span className="text-sm font-semibold text-gray-700">Total pending</span>
              <span className="text-sm font-bold text-red-600">₹{totalPayable.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
