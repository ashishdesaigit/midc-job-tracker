import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { SkeletonList } from '../components/ui/Skeleton'
import StagePill from '../components/ui/StagePill'
import EmptyState from '../components/ui/EmptyState'

function dueDateInfo(due, status) {
  if (status === 'dispatched') return null
  if (!due) return null
  const days = Math.ceil((new Date(due) - new Date().setHours(0, 0, 0, 0)) / 86400000)
  if (days < 0)  return { label: `${Math.abs(days)}d late`, color: 'text-red-600' }
  if (days === 0) return { label: 'Today', color: 'text-amber-600' }
  if (days <= 3)  return { label: `${days}d left`, color: 'text-amber-600' }
  return { label: `${days}d left`, color: 'text-green-600' }
}

function pillVariant(job) {
  if (job.status === 'dispatched') return 'done'
  const name = job.stage_templates?.name ?? ''
  if (job.stage_templates?.is_subcontract) return 'vendor'
  if (name === 'Inspection') return 'inspect'
  return 'house'
}

function sortJobs(jobs) {
  return [...jobs].sort((a, b) => {
    const daysA = a.due_date ? Math.ceil((new Date(a.due_date) - Date.now()) / 86400000) : 999
    const daysB = b.due_date ? Math.ceil((new Date(b.due_date) - Date.now()) / 86400000) : 999
    if (daysA !== daysB) return daysA - daysB
    return new Date(b.created_at) - new Date(a.created_at)
  })
}

export default function Jobs() {
  const navigate = useNavigate()
  const { unit, user } = useAuthStore()

  const [jobs, setJobs] = useState([])
  const [stages, setStages] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [loading, setLoading] = useState(true)

  const isOwner = user?.role === 'owner'

  useEffect(() => {
    if (!unit?.id) return

    Promise.all([
      supabase
        .from('jobs')
        .select('*, stage_templates(name, is_subcontract), customers(name)')
        .eq('unit_id', unit.id)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false }),
      supabase
        .from('stage_templates')
        .select('id, name, is_subcontract')
        .eq('unit_id', unit.id)
        .order('order_index'),
    ]).then(([{ data: j }, { data: s }]) => {
      setJobs(j ?? [])
      setStages(s ?? [])
      setLoading(false)
    })
  }, [unit?.id])

  // Build filter tabs
  const tabs = [
    { key: 'all',        label: 'All' },
    ...stages.map(s => ({ key: s.id, label: s.name })),
    { key: 'overdue',    label: 'Overdue' },
    { key: 'dispatched', label: 'Dispatched' },
  ]

  function filterJobs(list) {
    if (activeTab === 'dispatched') return sortJobs(list.filter(j => j.status === 'dispatched'))
    // All other tabs show only active jobs
    const active = list.filter(j => j.status === 'active')
    if (activeTab === 'all') return sortJobs(active)
    if (activeTab === 'overdue') {
      return sortJobs(active.filter(j =>
        j.due_date && new Date(j.due_date) < new Date().setHours(0, 0, 0, 0)
      ))
    }
    return sortJobs(active.filter(j => j.current_stage_id === activeTab))
  }

  const visible = filterJobs(jobs)

  return (
    <div className="min-h-svh bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-0 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900">Jobs</h1>
          {!isOwner && (
            <button
              onClick={() => navigate('/jobs/new')}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium active:bg-blue-700"
            >
              + New job
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => navigate('/jobs/new')}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium active:bg-blue-700"
            >
              + New job
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <SkeletonList count={4} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No jobs yet"
            message={activeTab === 'all' ? 'Create your first job.' : 'No jobs in this stage.'}
            action={
              activeTab === 'all' && (
                <button
                  onClick={() => navigate('/jobs/new')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-medium"
                >
                  + New job
                </button>
              )
            }
          />
        ) : (
          <div className="space-y-2">
            {visible.map(job => {
              const due = dueDateInfo(job.due_date, job.status)
              return (
                <button
                  key={job.id}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className="w-full bg-white border border-gray-100 rounded-xl p-4 text-left active:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-gray-400 font-mono">{job.job_number}</span>
                        <span className="text-xs text-gray-500">·</span>
                        <span className="text-xs text-gray-500 truncate">{job.customers?.name}</span>
                      </div>
                      <p className="font-semibold text-gray-900 truncate">{job.part_name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {job.material} · {job.qty_balance ?? job.qty_ordered} pcs
                        {job.rate ? ` · ₹${job.rate}/${job.rate_unit}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <StagePill
                        label={job.status === 'dispatched' ? 'Dispatched' : (job.stage_templates?.name ?? '—')}
                        variant={pillVariant(job)}
                      />
                      {due && (
                        <span className={`text-xs font-medium ${due.color}`}>{due.label}</span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
