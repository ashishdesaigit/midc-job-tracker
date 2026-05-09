import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

// ── Date helpers ──────────────────────────────────────────────────────────────

export function getMonthOptions() {
  const now = new Date()
  return Array.from({ length: 4 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return {
      label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      year: d.getFullYear(),
      month: d.getMonth() + 1,
    }
  })
}

function monthRange(year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end   = new Date(year, month, 0).toISOString().split('T')[0]
  return { start, end }
}

function prevMonth(year, month) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

// ── Calculation helpers ───────────────────────────────────────────────────────

function avgCycleDays(dispatches) {
  if (!dispatches?.length) return null
  // Latest dispatch per job only
  const latestByJob = Object.values(
    dispatches.reduce((acc, d) => {
      if (!acc[d.job_id] || d.dispatch_date > acc[d.job_id].dispatch_date) acc[d.job_id] = d
      return acc
    }, {})
  ).filter(d => d.jobs?.created_at)

  if (!latestByJob.length) return null
  const days = latestByJob.map(d =>
    Math.ceil((new Date(d.dispatch_date) - new Date(d.jobs.created_at)) / 86400000)
  ).filter(n => n > 0)
  return days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null
}

function calcCycleTime(dispatches, prevDispatches) {
  return { current: avgCycleDays(dispatches), prev: avgCycleDays(prevDispatches) }
}

function calcStageTime(dispatches, stageLogs) {
  if (!dispatches?.length || !stageLogs?.length) return null
  const dispByJob = dispatches.reduce((a, d) => {
    if (!a[d.job_id] || d.dispatch_date > a[d.job_id].dispatch_date) a[d.job_id] = d
    return a
  }, {})

  const byJob = stageLogs.reduce((acc, l) => {
    acc[l.job_id] = [...(acc[l.job_id] ?? []), l]
    return acc
  }, {})

  const stageDurations = {} // { name: [days] }

  for (const [jobId, logs] of Object.entries(byJob)) {
    const sorted = [...logs].sort((a, b) => new Date(a.moved_at) - new Date(b.moved_at))
    for (let i = 0; i < sorted.length - 1; i++) {
      const name = sorted[i].stage_name
      const days = (new Date(sorted[i + 1].moved_at) - new Date(sorted[i].moved_at)) / 86400000
      if (days >= 0) { stageDurations[name] ??= []; stageDurations[name].push(days) }
    }
    const last = sorted[sorted.length - 1]
    const disp = dispByJob[jobId]
    if (last && disp) {
      const days = (new Date(disp.dispatch_date) - new Date(last.moved_at)) / 86400000
      if (days >= 0) { stageDurations[last.stage_name] ??= []; stageDurations[last.stage_name].push(days) }
    }
  }

  const result = Object.entries(stageDurations)
    .map(([name, arr]) => ({
      name,
      avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10,
    }))
    .filter(s => s.avg > 0)
    .sort((a, b) => b.avg - a.avg)

  return result.length ? result : null
}

function calcVendorReliability(subcontracts) {
  const returned = subcontracts?.filter(s => ['returned', 'partial'].includes(s.status)) ?? []
  if (!returned.length) return []

  const byVendor = {}
  for (const s of returned) {
    const id = s.vendor_id
    byVendor[id] ??= { id, name: s.vendors?.name ?? '?', onTime: 0, total: 0, delays: [] }
    byVendor[id].total++
    if (s.actual_return_date && s.expected_return) {
      const diff = (new Date(s.actual_return_date) - new Date(s.expected_return)) / 86400000
      if (diff <= 0) byVendor[id].onTime++
      else byVendor[id].delays.push(diff)
    }
  }

  return Object.values(byVendor).map(v => ({
    ...v,
    onTimePct: Math.round((v.onTime / v.total) * 100),
    avgDelay: v.delays.length
      ? Math.round(v.delays.reduce((a, b) => a + b, 0) / v.delays.length * 10) / 10
      : 0,
  })).sort((a, b) => a.onTimePct - b.onTimePct)
}

function calcDeliveryPerformance(dispatches) {
  const withDue = dispatches?.filter(d => d.jobs?.due_date) ?? []
  if (!withDue.length) return { onTimePct: null, byCustomer: [] }

  const onTimeList = withDue.filter(d => d.dispatch_date <= d.jobs.due_date)
  const onTimePct  = Math.round((onTimeList.length / withDue.length) * 100)

  const byCust = {}
  for (const d of withDue) {
    const cid  = d.jobs?.customers?.id ?? 'unknown'
    const name = d.jobs?.customers?.name ?? '?'
    byCust[cid] ??= { name, onTime: 0, total: 0 }
    byCust[cid].total++
    if (d.dispatch_date <= d.jobs.due_date) byCust[cid].onTime++
  }

  const byCustomer = Object.values(byCust)
    .map(c => ({ ...c, pct: Math.round((c.onTime / c.total) * 100) }))
    .sort((a, b) => a.pct - b.pct)

  return { onTimePct, byCustomer }
}

function calcSubcontractSpend(subcontracts) {
  const withRate = subcontracts?.filter(s => s.rate_per_piece > 0) ?? []
  if (!withRate.length) return null

  const total = Math.round(withRate.reduce((s, r) => s + r.qty_sent * r.rate_per_piece, 0))

  const byVendor = {}
  const byOp     = {}
  for (const s of withRate) {
    const spend = s.qty_sent * s.rate_per_piece
    byVendor[s.vendor_id]      ??= { name: s.vendors?.name ?? '?', spend: 0 }
    byVendor[s.vendor_id].spend += spend
    const op = (s.operation_desc ?? 'Other').toLowerCase().trim()
    byOp[op] ??= { name: s.operation_desc ?? 'Other', spend: 0 }
    byOp[op].spend += spend
  }

  const topVendors = Object.values(byVendor)
    .sort((a, b) => b.spend - a.spend).slice(0, 3)
    .map(v => ({ ...v, spend: Math.round(v.spend), pct: Math.round(v.spend / total * 100) }))

  const topOps = Object.values(byOp)
    .sort((a, b) => b.spend - a.spend).slice(0, 3)
    .map(o => ({ ...o, spend: Math.round(o.spend) }))

  return { total, topVendors, topOps }
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useInsightsData(year, month) {
  const { unit } = useAuthStore()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!unit?.id) return
    let cancelled = false
    setLoading(true)

    ;(async () => {
      const { start, end }       = monthRange(year, month)
      const prev                 = prevMonth(year, month)
      const { start: ps, end: pe } = monthRange(prev.year, prev.month)

      const [{ data: dispatches }, { data: prevDispatches }, { data: subcontracts }] =
        await Promise.all([
          supabase.from('dispatches')
            .select('id, job_id, dispatch_date, qty_dispatched, jobs(id, created_at, due_date, customers(id, name))')
            .gte('dispatch_date', start).lte('dispatch_date', end),
          supabase.from('dispatches')
            .select('id, job_id, dispatch_date, jobs(id, created_at)')
            .gte('dispatch_date', ps).lte('dispatch_date', pe),
          supabase.from('subcontracts')
            .select('id, job_id, vendor_id, qty_sent, rate_per_piece, operation_desc, status, actual_return_date, expected_return, vendors(id, name)')
            .gte('created_at', `${start}T00:00:00Z`).lte('created_at', `${end}T23:59:59Z`),
        ])

      // Fetch stage logs for dispatched jobs
      const jobIds = [...new Set((dispatches ?? []).map(d => d.job_id))]
      let stageLogs = []
      if (jobIds.length) {
        const { data: logs } = await supabase.from('job_stage_log')
          .select('job_id, stage_name, moved_at')
          .in('job_id', jobIds).order('moved_at')
        stageLogs = logs ?? []
      }

      if (!cancelled) {
        setData({
          totalJobs: jobIds.length,
          cycleTime:           calcCycleTime(dispatches, prevDispatches),
          stageTime:           calcStageTime(dispatches, stageLogs),
          vendorReliability:   calcVendorReliability(subcontracts),
          deliveryPerformance: calcDeliveryPerformance(dispatches),
          subcontractSpend:    calcSubcontractSpend(subcontracts),
        })
        setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [unit?.id, year, month])

  return { data, loading }
}
