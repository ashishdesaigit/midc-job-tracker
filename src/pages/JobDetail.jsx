import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { openWhatsApp } from '../lib/whatsapp'
import { uploadPhoto } from '../lib/photoUpload'
import BottomSheet from '../components/ui/BottomSheet'
import { generateJobReport } from '../lib/generateJobReport'
import StagePill from '../components/ui/StagePill'
import MarkReturned from '../components/ui/MarkReturned'

function GripIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
      <circle cx="7" cy="5" r="1.5"/><circle cx="13" cy="5" r="1.5"/>
      <circle cx="7" cy="10" r="1.5"/><circle cx="13" cy="10" r="1.5"/>
      <circle cx="7" cy="15" r="1.5"/><circle cx="13" cy="15" r="1.5"/>
    </svg>
  )
}

function SortableStageRow({ stage, onChange, onToggle, onDelete, canDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 bg-white border rounded-lg px-2 py-2 ${isDragging ? 'shadow-lg border-blue-300' : 'border-gray-200'}`}>
      <button {...attributes} {...listeners} className="text-gray-300 cursor-grab touch-none shrink-0" tabIndex={-1}><GripIcon /></button>
      <input value={stage.name} onChange={e => onChange(stage.id, e.target.value)} className="flex-1 text-sm outline-none bg-transparent" />
      <label className="flex items-center gap-1 shrink-0 select-none">
        <input type="checkbox" checked={stage.is_subcontract} onChange={e => onToggle(stage.id, e.target.checked)} className="w-3 h-3 accent-amber-500" />
        <span className="text-xs text-gray-400">Vendor</span>
      </label>
      {canDelete && <button onClick={() => onDelete(stage.id)} className="text-gray-300 hover:text-red-400 text-base w-5 h-5 flex items-center justify-center shrink-0">×</button>}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(dateStr, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', opts)
}

function fmtTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function dueInfo(dueDate, status) {
  if (status !== 'active' || !dueDate) return null
  const days = Math.ceil((new Date(dueDate) - new Date().setHours(0, 0, 0, 0)) / 86400000)
  if (days < 0)  return { text: `${Math.abs(days)} days overdue`, cls: 'text-red-600 bg-red-50' }
  if (days === 0) return { text: 'Due today', cls: 'text-amber-600 bg-amber-50' }
  if (days <= 3)  return { text: `Due in ${days} days`, cls: 'text-amber-600 bg-amber-50' }
  return null
}

// ── Stage tracker ─────────────────────────────────────────────────────────────

function StageTracker({ stages, currentStageId }) {
  const currentIdx = stages.findIndex(s => s.id === currentStageId)
  return (
    <div className="overflow-x-auto bg-white border-b border-gray-100">
      <div className="flex items-start px-4 py-5 min-w-max gap-0">
        {stages.map((stage, idx) => {
          const done   = idx < currentIdx
          const active = stage.id === currentStageId
          return (
            <div key={stage.id} className="flex items-start">
              <div className="flex flex-col items-center w-16">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                  done   ? 'bg-teal-500 text-white' :
                  active ? 'bg-gray-900 text-white' :
                           'border-2 border-gray-200 text-gray-400'
                }`}>
                  {done ? (
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : idx + 1}
                </div>
                <p className={`text-center mt-1.5 text-xs leading-tight px-0.5 w-16 line-clamp-2 ${
                  active ? 'text-gray-900 font-medium' : done ? 'text-teal-600' : 'text-gray-400'
                }`}>
                  {stage.name}
                </p>
              </div>
              {idx < stages.length - 1 && (
                <div className={`h-0.5 w-5 mt-4 shrink-0 ${idx < currentIdx ? 'bg-teal-500' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value || '—'}</p>
    </div>
  )
}

// ── Activity item ─────────────────────────────────────────────────────────────

function ActivityItem({ item }) {
  if (item._type === 'transition') return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="w-1.5 h-1.5 rounded-full bg-teal-300 mt-1.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500">Moved to {item.stage_name}</span>
          <span className="text-xs text-gray-400">{fmtTime(item.moved_at)}</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{item.users?.name ?? 'User'}</p>
        {item.closing_remark && (
          <p className="text-sm text-gray-600 mt-1 italic">"{item.closing_remark}"</p>
        )}
      </div>
    </div>
  )
  return (
    <div className="flex items-start gap-2 px-4 py-3">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-300 mt-1.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="bg-blue-50 rounded-xl rounded-tl-none px-3 py-2.5">
          {item.comment && <p className="text-sm text-gray-800">{item.comment}</p>}
          {item.photo_url && (
            <img src={item.photo_url} alt="comment" className="mt-2 w-full h-32 object-cover rounded-lg" />
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {item.users?.name ?? 'User'} · {fmtTime(item.created_at)}
        </p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, unit } = useAuthStore()

  const [job, setJob] = useState(null)
  const [allStages, setAllStages] = useState([])
  const [stageLog, setStageLog] = useState([])
  const [comments, setComments] = useState([])
  const [activeSub, setActiveSub] = useState(null)     // pending (with vendor)
  const [completedSub, setCompletedSub] = useState(null) // most recent returned/partial
  const [loading, setLoading] = useState(true)

  // Stage movement
  const [advancing, setAdvancing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [nextStage, setNextStage] = useState(null)
  const [closingRemark, setClosingRemark] = useState('')
  const [backConfirmOpen, setBackConfirmOpen] = useState(false)

  // Comments
  const [commentText, setCommentText] = useState('')
  const [commentPhoto, setCommentPhoto] = useState(null)
  const [commentPreview, setCommentPreview] = useState('')
  const [savingComment, setSavingComment] = useState(false)

  // Cancellation
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  // Stage editing
  const [stageEditOpen, setStageEditOpen] = useState(false)
  const [editFutureStages, setEditFutureStages] = useState([])
  const [savingStages, setSavingStages] = useState(false)

  const stageSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Report download
  const [generatingReport, setGeneratingReport] = useState(false)

  async function handleDownloadReport() {
    setGeneratingReport(true)
    const [{ data: allSubs }, { data: allDisps }] = await Promise.all([
      supabase.from('subcontracts').select('*, vendors(name, phone)').eq('job_id', id).order('created_at'),
      supabase.from('dispatches').select('*').eq('job_id', id).order('dispatch_date'),
    ])
    const html = generateJobReport({
      job, unit, stageLog, comments,
      subcontracts: allSubs ?? [],
      dispatches:   allDisps ?? [],
    })
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    setGeneratingReport(false)
  }

  // Vendor section toggle
  const [vendorExpanded, setVendorExpanded] = useState(false)

  // UI
  const [expandedStages, setExpandedStages] = useState({})
  const [photoOpen, setPhotoOpen] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)

  const canEdit = user?.role === 'supervisor' || user?.role === 'owner'

  const fetchAll = useCallback(async () => {
    const [{ data: j }, { data: log }, { data: cmts }] = await Promise.all([
      supabase
        .from('jobs')
        .select('*, customers(id, name, phone), stage_templates(id, name, is_subcontract), current_job_stage:job_stages!current_job_stage_id(id, name, is_subcontract)')
        .eq('id', id)
        .single(),
      supabase.from('job_stage_log').select('*, users!moved_by(name)').eq('job_id', id).order('moved_at', { ascending: false }),
      supabase.from('job_comments').select('*, users!created_by(name)').eq('job_id', id).order('created_at', { ascending: false }),
    ])

    if (!j) { setLoading(false); return }
    setJob(j)
    setStageLog(log ?? [])
    setComments(cmts ?? [])

    // Use job_stages if job has custom stages, else fall back to unit stage_templates
    const { data: stages } = j.current_job_stage_id
      ? await supabase.from('job_stages').select('id, name, order_index, is_subcontract').eq('job_id', id).order('order_index')
      : await supabase.from('stage_templates').select('id, name, order_index, is_subcontract').eq('unit_id', j.unit_id).order('order_index')
    setAllStages(stages ?? [])

    const currentStageData = j.current_job_stage_id ? j.current_job_stage : j.stage_templates
    if (currentStageData?.is_subcontract) {
      // Filter by stage_name — each stage only sees its own vendor work
      const sn = currentStageData.name
      const [{ data: pending }, { data: completed }] = await Promise.all([
        supabase.from('subcontracts').select('*, vendors(name, phone)')
          .eq('job_id', id).eq('status', 'pending').eq('stage_name', sn)
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('subcontracts').select('*, vendors(name, phone)')
          .eq('job_id', id).in('status', ['returned', 'partial']).eq('stage_name', sn)
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      setActiveSub(pending ?? null)
      setCompletedSub(completed ?? null)
    } else {
      setActiveSub(null)
      setCompletedSub(null)
    }

    setLoading(false)
  }, [id])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Stage movement ──────────────────────────────────────────────────────────

  function handleAdvance() {
    // Use render-time nextStageDef — already computed with dual-mode currentStageId
    if (!nextStageDef) return
    setClosingRemark('')
    setNextStage(nextStageDef)
    setConfirmOpen(true)
  }

  async function confirmMove() {
    if (!nextStage) return
    setAdvancing(true)
    setConfirmOpen(false)

    const updateField = isCustomStages ? { current_job_stage_id: nextStage.id } : { current_stage_id: nextStage.id }
    await supabase.from('jobs').update(updateField).eq('id', id)
    await supabase.from('job_stage_log').insert({
      job_id: id,
      stage_id: isCustomStages ? null : nextStage.id,
      stage_name: nextStage.name,
      moved_by: user.id,
      closing_remark: closingRemark.trim() || null,
    })

    setClosingRemark('')
    await fetchAll()
    setAdvancing(false)
  }

  // ── Back to previous stage ───────────────────────────────────────────────────

  async function confirmBack() {
    // Use render-time prevStageDef — already computed with dual-mode currentStageId
    const prev = prevStageDef
    if (!prev) return
    setAdvancing(true)
    setBackConfirmOpen(false)
    const updateField = isCustomStages ? { current_job_stage_id: prev.id } : { current_stage_id: prev.id }
    await supabase.from('jobs').update(updateField).eq('id', id)
    await supabase.from('job_stage_log').insert({
      job_id: id, stage_id: isCustomStages ? null : prev.id, stage_name: prev.name,
      moved_by: user.id, closing_remark: '← Moved back',
    })
    await fetchAll()
    setAdvancing(false)
  }

  // ── Edit job stages ──────────────────────────────────────────────────────────

  function openStageEdit() {
    const future = allStages.slice(currentIdx + 1)
    setEditFutureStages(future.map(s => ({ ...s })))
    setStageEditOpen(true)
  }

  async function saveJobStages() {
    setSavingStages(true)
    const completed = allStages.slice(0, currentIdx)
    const current   = allStages[currentIdx]
    const newStages = [...completed, current, ...editFutureStages.filter(s => s.name.trim())]

    // Delete existing job_stages and recreate
    await supabase.from('job_stages').delete().eq('job_id', id)
    await supabase.from('job_stages').insert(
      newStages.map((s, idx) => ({ job_id: id, name: s.name.trim(), order_index: idx, is_subcontract: s.is_subcontract }))
    )

    // Re-fetch sorted by order_index — INSERT return order is not guaranteed in PostgreSQL
    const { data: saved } = await supabase
      .from('job_stages')
      .select('id, order_index')
      .eq('job_id', id)
      .order('order_index')

    const newCurrentId = saved?.[currentIdx]?.id
    if (newCurrentId) {
      await supabase.from('jobs').update({ current_job_stage_id: newCurrentId }).eq('id', id)
    }

    setSavingStages(false)
    setStageEditOpen(false)
    await fetchAll()
  }

  // ── Cancel job ───────────────────────────────────────────────────────────────

  async function handleCancel() {
    setCancelling(true)
    await supabase.from('jobs').update({ status: 'cancelled' }).eq('id', id)
    await supabase.from('job_stage_log').insert({
      job_id: id,
      stage_id: job.current_stage_id,
      stage_name: 'Cancelled',
      moved_by: user.id,
      closing_remark: cancelReason.trim() || null,
    })
    setCancelling(false)
    setCancelOpen(false)
    navigate('/jobs', { replace: true })
  }

  // ── Comments ────────────────────────────────────────────────────────────────

  function handleCommentPhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setCommentPhoto(file)
    setCommentPreview(URL.createObjectURL(file))
  }

  async function handleSaveComment() {
    if (!commentText.trim() && !commentPhoto) return
    setSavingComment(true)

    let photoUrl = null
    if (commentPhoto) {
      try {
        const path = `${unit.id}/${id}/comment_${Date.now()}.jpg`
        photoUrl = await uploadPhoto(commentPhoto, path)
      } catch { /* silent */ }
    }

    await supabase.from('job_comments').insert({
      job_id: id,
      stage_id: job.current_stage_id,
      stage_name: job.stage_templates?.name ?? '',
      comment: commentText.trim() || null,
      photo_url: photoUrl,
      created_by: user.id,
    })

    setCommentText('')
    setCommentPhoto(null)
    setCommentPreview('')
    setSavingComment(false)
    fetchAll()
  }

  // ── Merged activity grouped by stage ─────────────────────────────────────────

  const activity = [
    ...stageLog.map(l => ({ _type: 'transition', _ts: l.moved_at, ...l })),
    ...comments.map(c => ({ _type: 'comment',    _ts: c.created_at, ...c })),
  ].sort((a, b) => new Date(b._ts) - new Date(a._ts))

  // Group by stage_name, preserve order of first occurrence (most recent stage first)
  const stageGroupsMap = activity.reduce((acc, item) => {
    const key = item.stage_name ?? '—'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})
  // Sort groups: most recent activity first
  const stageGroups = Object.entries(stageGroupsMap).sort(([, a], [, b]) =>
    new Date(b[0]._ts) - new Date(a[0]._ts)
  )
  const mostRecentStage = stageGroups[0]?.[0] ?? ''

  function isStageExpanded(name) {
    return name in expandedStages ? expandedStages[name] : name === mostRecentStage
  }
  function toggleStageGroup(name) {
    setExpandedStages(prev => ({ ...prev, [name]: !isStageExpanded(name) }))
  }

  // ── Guard ───────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-svh bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!job) return <div className="p-8 text-center text-gray-400">Job not found.</div>

  const isCustomStages = !!job.current_job_stage_id
  const currentStage   = isCustomStages ? job.current_job_stage : job.stage_templates
  const currentStageId = isCustomStages ? job.current_job_stage_id : job.current_stage_id
  const currentIdx   = allStages.findIndex(s => s.id === currentStageId)
  const nextStageDef = allStages[currentIdx + 1]
  const prevStageDef = allStages[currentIdx - 1]
  const isLastStage  = currentIdx === allStages.length - 1
  const isFirstStage = currentIdx === 0
  const due          = dueInfo(job.due_date, job.status)

  function subcontractFollowUp() {
    if (!activeSub?.vendors?.phone) return
    const days = activeSub.expected_return
      ? Math.ceil((new Date(activeSub.expected_return) - new Date().setHours(0,0,0,0)) / 86400000)
      : null
    let msg
    if (days === null || days > 0)
      msg = `${activeSub.vendors.name}, ${activeSub.challan_ref} — ${job.part_name} ${activeSub.qty_sent} pcs — expected in ${days} days. Please confirm.`
    else if (days === 0)
      msg = `${activeSub.vendors.name}, ${activeSub.challan_ref} — ${job.part_name} ${activeSub.qty_sent} pcs was expected today. When can we expect it? Please confirm.`
    else
      msg = `${activeSub.vendors.name}, ${activeSub.challan_ref} — ${job.part_name} ${activeSub.qty_sent} pcs — ${Math.abs(days)} days overdue. When will it be returned?`
    openWhatsApp(activeSub.vendors.phone, msg)
  }

  return (
    <div className="min-h-svh bg-gray-50">

      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Jobs
          </button>
          {job.status === 'dispatched' && (
            <button
              onClick={handleDownloadReport}
              disabled={generatingReport}
              className="flex items-center gap-1.5 text-xs text-blue-600 font-medium disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {generatingReport ? 'Generating...' : 'Download Report'}
            </button>
          )}
        </div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-gray-400 font-mono">{job.job_number}</p>
            <h1 className="text-xl font-bold text-gray-900 mt-0.5">{job.part_name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{job.customers?.name}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <StagePill
              label={job.status === 'dispatched' ? 'Dispatched' : (currentStage?.name ?? '—')}
              variant={
                job.status === 'dispatched' ? 'done' :
                currentStage?.is_subcontract ? 'vendor' :
                currentStage?.name === 'Inspection' ? 'inspect' : 'house'
              }
            />
            {due && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${due.cls}`}>
                {due.text}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stage tracker */}
      <StageTracker stages={allStages} currentStageId={currentStageId} />
      {canEdit && job.status === 'active' && (
        <div className="bg-white border-b border-gray-100 px-4 py-2 flex justify-end">
          <button onClick={openStageEdit} className="text-xs text-blue-600 font-medium">
            Edit stages
          </button>
        </div>
      )}

      {/* Job info */}
      <div className="bg-white mx-4 mt-4 rounded-xl border border-gray-100 p-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <InfoRow label="Customer"    value={job.customers?.name} />
          <InfoRow label="Material"    value={job.material} />
          <InfoRow label="Qty ordered" value={`${job.qty_ordered} pcs`} />
          <InfoRow label="Balance"     value={`${job.qty_balance ?? job.qty_ordered} pcs`} />
          {job.rate && <InfoRow label="Rate" value={`₹${job.rate}/${job.rate_unit}`} />}
          <InfoRow label="Due date"    value={fmt(job.due_date)} />
        </div>
        {job.free_issue && (
          <div className="mt-3">
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              Free issue · {job.free_issue_qty ?? '?'} pcs
            </span>
          </div>
        )}
        {job.remarks && (
          <p className="mt-3 text-sm text-gray-600 border-t border-gray-100 pt-3">{job.remarks}</p>
        )}
        {job.photo_url && (
          <button onClick={() => setPhotoOpen(true)} className="mt-3 border-t border-gray-100 pt-3 w-full">
            <img src={job.photo_url} alt="Job" className="w-full h-32 object-cover rounded-xl" />
          </button>
        )}
      </div>

      {/* Subcontract card — collapsible */}
      {currentStage?.is_subcontract && job.status === 'active' && (
        <div className="bg-white mx-4 mt-3 rounded-xl border border-amber-200">
          <button
            onClick={() => setVendorExpanded(v => !v)}
            className="flex items-center justify-between w-full px-4 py-3.5"
          >
            <span className="text-sm font-semibold text-amber-700">
              Outsource to vendor for {currentStage.name}?
            </span>
            <svg viewBox="0 0 24 24"
              className={`w-4 h-4 text-amber-500 transition-transform ${(vendorExpanded || activeSub) ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {(vendorExpanded || activeSub) && (
            <div className="border-t border-amber-100 p-4">
              {activeSub ? (
                /* Pending with vendor */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <InfoRow label="Vendor"          value={activeSub.vendors?.name} />
                    <InfoRow label="Challan"         value={activeSub.challan_ref} />
                    <InfoRow label="Qty sent"        value={`${activeSub.qty_sent} pcs`} />
                    <InfoRow label="Sent on"         value={fmt(activeSub.sent_date)} />
                    {activeSub.expected_return && (
                      <InfoRow label="Expected return" value={fmt(activeSub.expected_return)} />
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={subcontractFollowUp}
                      className="flex-1 py-2.5 border border-amber-300 text-amber-700 rounded-xl text-sm font-medium">
                      WhatsApp follow up
                    </button>
                    <button onClick={() => setReturnOpen(true)}
                      className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium">
                      Mark returned
                    </button>
                  </div>
                </div>
              ) : completedSub ? (
                /* Returned — Next stage → is now unlocked */
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      completedSub.status === 'returned' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {completedSub.status === 'returned' ? 'Returned ✓' : 'Partial return'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    <InfoRow label="Vendor"   value={completedSub.vendors?.name} />
                    <InfoRow label="Received" value={`${completedSub.qty_received} pcs`} />
                    {(completedSub.qty_rejected ?? 0) > 0 && (
                      <InfoRow label="Rejected" value={`${completedSub.qty_rejected} pcs`} />
                    )}
                  </div>
                  {completedSub.rejection_note && (
                    <p className="text-xs text-gray-600 italic">"{completedSub.rejection_note}"</p>
                  )}
                  {canEdit && completedSub.status === 'partial' && (
                    <button onClick={() => navigate(`/jobs/${id}/subcontract`)}
                      className="w-full py-2 border border-amber-300 text-amber-700 rounded-xl text-xs font-medium">
                      Send remaining to vendor
                    </button>
                  )}
                  <p className="text-xs text-gray-400">Use "Next stage →" below to advance.</p>
                </div>
              ) : canEdit && (
                /* Not sent yet */
                <button onClick={() => navigate(`/jobs/${id}/subcontract`)}
                  className="w-full py-3 bg-amber-500 text-white rounded-xl text-sm font-semibold">
                  Send to vendor
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Comment / photo section — log important info here */}
      {canEdit && job.status === 'active' && (
        <div className="bg-white mx-4 mt-3 rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-0.5">Log important info here</p>
          <p className="text-xs text-gray-400 mb-3">Quality observations, measurements, issues, photos — anything worth recording at this stage</p>
          <textarea
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder="e.g. Surface finish OK, dimensional check passed, 2 pcs with minor porosity noted..."
            rows={3}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          {commentPreview && (
            <div className="relative mt-2">
              <img src={commentPreview} alt="comment preview" className="w-full h-24 object-cover rounded-xl" />
              <button onClick={() => { setCommentPhoto(null); setCommentPreview('') }}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 text-white rounded-full text-xs flex items-center justify-center">×</button>
            </div>
          )}
          <div className="flex gap-2 mt-2">
            <label className="flex items-center justify-center w-11 h-11 border border-gray-200 rounded-xl text-gray-500 text-base shrink-0 cursor-pointer">
              <input type="file" accept="image/*" onChange={handleCommentPhoto} className="hidden" />
              📷
            </label>
            <button onClick={handleSaveComment}
              disabled={savingComment || (!commentText.trim() && !commentPhoto)}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-40">
              {savingComment ? 'Saving...' : 'Save comment'}
            </button>
          </div>
        </div>
      )}

      {/* Stage navigation — Next + Back */}
      {canEdit && job.status === 'active' && (
        <div className="mx-4 mt-3 space-y-2">
          {isLastStage ? (
            <button onClick={() => navigate(`/jobs/${id}/dispatch`)}
              className="w-full py-3.5 bg-green-600 text-white rounded-xl text-base font-semibold active:bg-green-700">
              Dispatch →
            </button>
          ) : (
            <>
              <button onClick={handleAdvance} disabled={advancing || !!activeSub}
                className="w-full py-3.5 bg-blue-600 text-white rounded-xl text-base font-semibold disabled:opacity-50 active:bg-blue-700">
                {advancing ? 'Updating...' : `Next stage → ${nextStageDef?.name ?? ''}`}
              </button>
              {activeSub && (
                <p className="text-xs text-center text-amber-600">
                  Mark vendor return before moving to next stage
                </p>
              )}
            </>
          )}
          {!isFirstStage && (
            <button onClick={() => setBackConfirmOpen(true)} disabled={advancing}
              className="w-full py-3 border border-gray-300 rounded-xl text-sm text-gray-600 disabled:opacity-50">
              ← Back to {prevStageDef?.name}
            </button>
          )}
        </div>
      )}

      {/* Current stage activity — always visible */}
      {stageGroups.length > 0 && (() => {
        const [[, currentItems], ...prevGroups] = stageGroups
        return (
          <>
            {currentItems?.length > 0 && (
              <div className="mx-4 mt-3 bg-white rounded-xl border border-gray-100">
                <div className="px-4 py-3 border-b border-gray-50">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    This stage — {currentItems.length} note{currentItems.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {currentItems.map((item, idx) => (
                    <ActivityItem key={item.id ?? idx} item={item} />
                  ))}
                </div>
              </div>
            )}

            {/* Previous stage details — collapsed */}
            {prevGroups.length > 0 && (
              <div className="mx-4 mt-3 mb-6 bg-white rounded-xl border border-gray-100">
                <button
                  onClick={() => toggleStageGroup('__previous__')}
                  className="flex items-center justify-between w-full px-4 py-3.5"
                >
                  <span className="text-sm font-semibold text-gray-500">
                    Previous Stage Details ({prevGroups.reduce((n, [, items]) => n + items.length, 0)})
                  </span>
                  <svg viewBox="0 0 24 24"
                    className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isStageExpanded('__previous__') ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {isStageExpanded('__previous__') && (
                  <div className="border-t border-gray-50 divide-y divide-gray-100">
                    {prevGroups.map(([stageName, items]) => (
                      <div key={stageName}>
                        <p className="px-4 py-2 text-xs font-medium text-gray-400 bg-gray-50">{stageName}</p>
                        <div className="divide-y divide-gray-50">
                          {items.map((item, idx) => (
                            <ActivityItem key={item.id ?? idx} item={item} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )
      })()}

      {/* Cancel job — owner only, very bottom, subtle */}
      {user?.role === 'owner' && job.status === 'active' && (
        <div className="px-4 mt-4 mb-2 text-center">
          <div className="border-t border-gray-100 pt-4">
            <button
              onClick={() => { setCancelReason(''); setCancelOpen(true) }}
              className="text-xs text-gray-400 underline underline-offset-2"
            >
              Cancel this job
            </button>
          </div>
        </div>
      )}

      {/* Stage confirmation bottom sheet */}
      <BottomSheet open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <div className="space-y-4 pb-2">
          <div className="text-center">
            <p className="text-base font-semibold text-gray-900">
              {currentStage?.name} → {nextStage?.name}
            </p>
            <p className="text-sm text-gray-500 mt-1">Confirm?</p>
          </div>
          <button onClick={confirmMove}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl text-base font-semibold">
            Yes, move forward
          </button>
          <button onClick={() => setConfirmOpen(false)}
            className="w-full py-3 border border-gray-300 rounded-xl text-base text-gray-700">
            Cancel
          </button>
        </div>
      </BottomSheet>

      <MarkReturned
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        subcontract={activeSub}
        onComplete={fetchAll}
      />

      {/* Cancel job confirmation */}
      <BottomSheet open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this job?">
        <div className="space-y-4 pb-2">
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-red-700">{job?.job_number} — {job?.part_name}</p>
            <p className="text-xs text-red-500 mt-0.5">This cannot be undone. Job will be removed from the active list.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Reason <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="e.g. Customer cancelled order"
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full py-3.5 bg-red-600 text-white rounded-xl text-base font-semibold disabled:opacity-50"
          >
            {cancelling ? 'Cancelling...' : 'Yes, cancel job'}
          </button>
          <button onClick={() => setCancelOpen(false)}
            className="w-full py-3 border border-gray-300 rounded-xl text-base text-gray-700">
            Keep job
          </button>
        </div>
      </BottomSheet>

      {/* Edit job stages */}
      <BottomSheet open={stageEditOpen} onClose={() => setStageEditOpen(false)} title="Edit stages for this job">
        <div className="space-y-3 pb-2">
          <p className="text-xs text-gray-400">Completed stages are locked. You can edit, reorder, add or remove future stages only.</p>

          {/* Locked completed stages */}
          {allStages.slice(0, currentIdx).map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 opacity-50">
              <span className="text-xs text-gray-400 w-4">{i+1}</span>
              <span className="flex-1 text-sm text-gray-400">{s.name}</span>
              <span className="text-xs text-gray-300">done</span>
            </div>
          ))}

          {/* Current stage — locked */}
          {allStages[currentIdx] && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <span className="text-xs text-blue-400 w-4">{currentIdx+1}</span>
              <span className="flex-1 text-sm font-medium text-blue-700">{allStages[currentIdx].name}</span>
              <span className="text-xs text-blue-400">current</span>
            </div>
          )}

          {/* Editable future stages */}
          <DndContext sensors={stageSensors} collisionDetection={closestCenter}
            onDragEnd={({ active, over }) => {
              if (!over || active.id === over.id) return
              setEditFutureStages(s => arrayMove(s, s.findIndex(x => x.id === active.id), s.findIndex(x => x.id === over.id)))
            }}>
            <SortableContext items={editFutureStages.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {editFutureStages.map(s => (
                <SortableStageRow key={s.id} stage={s}
                  onChange={(id, name) => setEditFutureStages(fs => fs.map(x => x.id === id ? { ...x, name } : x))}
                  onToggle={(id, v)   => setEditFutureStages(fs => fs.map(x => x.id === id ? { ...x, is_subcontract: v } : x))}
                  onDelete={(id)      => setEditFutureStages(fs => fs.filter(x => x.id !== id))}
                  canDelete={editFutureStages.length > 0} />
              ))}
            </SortableContext>
          </DndContext>

          <button
            onClick={() => setEditFutureStages(fs => [...fs, { id: `n${Date.now()}`, name: '', is_subcontract: false }])}
            className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-400">
            + Add stage
          </button>

          <button onClick={saveJobStages} disabled={savingStages}
            className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
            {savingStages ? 'Saving...' : 'Save stage changes'}
          </button>
        </div>
      </BottomSheet>

      {/* Back to previous stage confirmation */}
      <BottomSheet open={backConfirmOpen} onClose={() => setBackConfirmOpen(false)}>
        <div className="space-y-4 pb-2">
          <div className="text-center">
            <p className="text-base font-semibold text-gray-900">
              ← Back to {prevStageDef?.name}
            </p>
            <p className="text-sm text-gray-500 mt-1">Move job back to previous stage?</p>
          </div>
          <button onClick={confirmBack} disabled={advancing}
            className="w-full py-3.5 bg-gray-800 text-white rounded-xl text-base font-semibold disabled:opacity-50">
            Yes, go back
          </button>
          <button onClick={() => setBackConfirmOpen(false)}
            className="w-full py-3 border border-gray-300 rounded-xl text-base text-gray-700">
            Cancel
          </button>
        </div>
      </BottomSheet>

      {/* Photo fullscreen */}
      {photoOpen && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setPhotoOpen(false)}>
          <img src={job.photo_url} alt="Job" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  )
}
