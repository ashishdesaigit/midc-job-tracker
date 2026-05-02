import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { openWhatsApp } from '../lib/whatsapp'
import { uploadPhoto } from '../lib/photoUpload'
import BottomSheet from '../components/ui/BottomSheet'
import StagePill from '../components/ui/StagePill'
import MarkReturned from '../components/ui/MarkReturned'

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

// ── Main component ────────────────────────────────────────────────────────────

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, unit } = useAuthStore()

  const [job, setJob] = useState(null)
  const [allStages, setAllStages] = useState([])
  const [stageLog, setStageLog] = useState([])
  const [comments, setComments] = useState([])
  const [activeSub, setActiveSub] = useState(null)
  const [loading, setLoading] = useState(true)

  // Stage movement
  const [advancing, setAdvancing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [nextStage, setNextStage] = useState(null)
  const [closingRemark, setClosingRemark] = useState('')

  // Comments
  const [commentText, setCommentText] = useState('')
  const [commentPhoto, setCommentPhoto] = useState(null)
  const [commentPreview, setCommentPreview] = useState('')
  const [savingComment, setSavingComment] = useState(false)

  // Cancellation
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  // UI
  const [expandedStages, setExpandedStages] = useState({})
  const [photoOpen, setPhotoOpen] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)

  const canEdit = user?.role === 'supervisor' || user?.role === 'owner'

  const fetchAll = useCallback(async () => {
    const [{ data: j }, { data: log }, { data: cmts }] = await Promise.all([
      supabase
        .from('jobs')
        .select('*, customers(id, name, phone), stage_templates(id, name, is_subcontract)')
        .eq('id', id)
        .single(),
      supabase
        .from('job_stage_log')
        .select('*, users!moved_by(name)')
        .eq('job_id', id)
        .order('moved_at', { ascending: false }),
      supabase
        .from('job_comments')
        .select('*, users!created_by(name)')
        .eq('job_id', id)
        .order('created_at', { ascending: false }),
    ])

    if (!j) { setLoading(false); return }
    setJob(j)
    setStageLog(log ?? [])
    setComments(cmts ?? [])

    const { data: stages } = await supabase
      .from('stage_templates')
      .select('id, name, order_index, is_subcontract')
      .eq('unit_id', j.unit_id)
      .order('order_index')
    setAllStages(stages ?? [])

    if (j.stage_templates?.is_subcontract) {
      const { data: sub } = await supabase
        .from('subcontracts')
        .select('*, vendors(name, phone)')
        .eq('job_id', id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setActiveSub(sub ?? null)
    } else {
      setActiveSub(null)
    }

    setLoading(false)
  }, [id])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Stage movement ──────────────────────────────────────────────────────────

  function handleAdvance() {
    const currentIdx = allStages.findIndex(s => s.id === job.current_stage_id)
    const next = allStages[currentIdx + 1]
    if (!next) return
    setClosingRemark('')
    setNextStage(next)
    setConfirmOpen(true)
  }

  async function confirmMove() {
    if (!nextStage) return
    setAdvancing(true)
    setConfirmOpen(false)

    await supabase.from('jobs').update({ current_stage_id: nextStage.id }).eq('id', id)
    await supabase.from('job_stage_log').insert({
      job_id: id,
      stage_id: nextStage.id,
      stage_name: nextStage.name,
      moved_by: user.id,
      closing_remark: closingRemark.trim() || null,
    })

    setClosingRemark('')
    await fetchAll()
    setAdvancing(false)
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

  const currentStage = job.stage_templates
  const currentIdx   = allStages.findIndex(s => s.id === job.current_stage_id)
  const nextStageDef = allStages[currentIdx + 1]
  const isLastStage  = currentIdx === allStages.length - 1
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
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 mb-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Jobs
        </button>
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
      <StageTracker stages={allStages} currentStageId={job.current_stage_id} />

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

      {/* Subcontract card */}
      {currentStage?.is_subcontract && job.status === 'active' && (
        <div className="bg-white mx-4 mt-3 rounded-xl border border-amber-200 p-4">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">
            Vendor stage (optional)
          </p>
          {activeSub ? (
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
          ) : canEdit && (
            <button onClick={() => navigate(`/jobs/${id}/subcontract`)}
              className="w-full py-3 bg-amber-500 text-white rounded-xl text-sm font-semibold">
              Send to vendor
            </button>
          )}
        </div>
      )}

      {/* Stage movement button */}
      {canEdit && job.status === 'active' && (
        <div className="mx-4 mt-3">
          {isLastStage ? (
            <button onClick={() => navigate(`/jobs/${id}/dispatch`)}
              className="w-full py-3.5 bg-green-600 text-white rounded-xl text-base font-semibold active:bg-green-700">
              Dispatch →
            </button>
          ) : (
            <button onClick={handleAdvance} disabled={advancing}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl text-base font-semibold disabled:opacity-50 active:bg-blue-700">
              {advancing ? 'Updating...' : `Next stage → ${nextStageDef?.name ?? ''}`}
            </button>
          )}
        </div>
      )}

      {/* Comment input */}
      {canEdit && job.status === 'active' && (
        <div className="bg-white mx-4 mt-3 rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Add comment</p>
          <textarea
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder="Notes, observations, quality remarks..."
            rows={2}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          {commentPreview && (
            <div className="relative mt-2">
              <img src={commentPreview} alt="comment preview" className="w-full h-24 object-cover rounded-xl" />
              <button onClick={() => { setCommentPhoto(null); setCommentPreview('') }}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 text-white rounded-full text-xs flex items-center justify-center">
                ×
              </button>
            </div>
          )}
          <div className="flex gap-2 mt-2">
            <label className="flex items-center justify-center w-11 h-11 border border-gray-200 rounded-xl text-gray-500 text-base shrink-0">
              <input type="file" accept="image/*" onChange={handleCommentPhoto} className="hidden" />
              📷
            </label>
            <button
              onClick={handleSaveComment}
              disabled={savingComment || (!commentText.trim() && !commentPhoto)}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-40"
            >
              {savingComment ? 'Saving...' : 'Save comment'}
            </button>
          </div>
        </div>
      )}

      {/* Activity — grouped by stage, each collapsible */}
      {/* Cancel job — owner only, only active jobs */}
      {user?.role === 'owner' && job.status === 'active' && (
        <div className="px-4 mt-2 mb-1">
          <button
            onClick={() => { setCancelReason(''); setCancelOpen(true) }}
            className="w-full py-2.5 text-sm text-red-400 border border-red-100 rounded-xl"
          >
            Cancel this job
          </button>
        </div>
      )}

      {stageGroups.length > 0 && (
        <div className="mx-4 mt-3 mb-6 bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
          {stageGroups.map(([stageName, items]) => {
            const expanded = isStageExpanded(stageName)
            return (
              <div key={stageName}>
                {/* Stage group header */}
                <button
                  onClick={() => toggleStageGroup(stageName)}
                  className="flex items-center justify-between w-full px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
                    <span className="text-sm font-medium text-gray-800">{stageName}</span>
                    <span className="text-xs text-gray-400">({items.length})</span>
                  </div>
                  <svg viewBox="0 0 24 24"
                    className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Stage group items */}
                {expanded && (
                  <div className="border-t border-gray-50 divide-y divide-gray-50">
                    {items.map((item, idx) => (
                      <div key={item.id ?? idx} className="px-4 py-3">
                        {item._type === 'transition' ? (
                          <div className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-teal-300 mt-1.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-xs font-medium text-gray-500">
                                  Moved to {item.stage_name}
                                </span>
                                <span className="text-xs text-gray-400">{fmtTime(item.moved_at)}</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">{item.users?.name ?? 'User'}</p>
                              {item.closing_remark && (
                                <p className="text-sm text-gray-600 mt-1 italic">"{item.closing_remark}"</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-300 mt-1.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="bg-blue-50 rounded-xl rounded-tl-none px-3 py-2.5">
                                {item.comment && <p className="text-sm text-gray-800">{item.comment}</p>}
                                {item.photo_url && (
                                  <img src={item.photo_url} alt="comment"
                                    className="mt-2 w-full h-32 object-cover rounded-lg" />
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                {item.users?.name ?? 'User'} · {fmtTime(item.created_at)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Closing remark <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              value={closingRemark}
              onChange={e => setClosingRemark(e.target.value)}
              placeholder="e.g. Moulding complete, pouring ready"
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
