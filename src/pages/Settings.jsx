import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAuthStore } from '../store/authStore'
import { loadDemoData } from '../lib/demoSeed'

const isUUID = id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(String(id))

function GripIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <circle cx="7" cy="5" r="1.5"/><circle cx="13" cy="5" r="1.5"/>
      <circle cx="7" cy="10" r="1.5"/><circle cx="13" cy="10" r="1.5"/>
      <circle cx="7" cy="15" r="1.5"/><circle cx="13" cy="15" r="1.5"/>
    </svg>
  )
}

function SortableStageItem({ stage, onChange, onToggle, onDelete, canDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 bg-white border rounded-xl px-3 py-2.5 ${isDragging ? 'shadow-xl border-blue-300' : 'border-gray-200'}`}>
      <button {...attributes} {...listeners} className="text-gray-300 cursor-grab active:cursor-grabbing touch-none shrink-0" tabIndex={-1}>
        <GripIcon />
      </button>
      <input value={stage.name} onChange={e => onChange(stage.id, e.target.value)} placeholder="Stage name"
        className="flex-1 text-sm py-1 outline-none bg-transparent" />
      <label className="flex items-center gap-1 shrink-0 cursor-pointer select-none">
        <input type="checkbox" checked={stage.is_subcontract} onChange={e => onToggle(stage.id, e.target.checked)}
          className="w-3.5 h-3.5 accent-amber-500" />
        <span className="text-xs text-gray-500">Vendor</span>
      </label>
      {canDelete && (
        <button onClick={() => onDelete(stage.id)}
          className="text-gray-300 hover:text-red-400 text-xl leading-none w-6 h-6 flex items-center justify-center shrink-0">×</button>
      )}
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const { unit, user, session, setAuth, clearAuth } = useAuthStore()

  async function handleSignOut() {
    await supabase.auth.signOut()
    clearAuth()
    navigate('/login', { replace: true })
  }

  const [unitForm, setUnitForm] = useState({ name: '', address: '', gstin: '' })
  const [stages, setStages] = useState([])
  const [loadingStages, setLoadingStages] = useState(true)
  const [saving, setSaving] = useState(false)
  const [seedLoading, setSeedLoading] = useState(false)
  const [message, setMessage] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    if (!unit) return
    setUnitForm({ name: unit.name ?? '', address: unit.address ?? '', gstin: unit.gstin ?? '' })
    supabase.from('stage_templates').select('*').eq('unit_id', unit.id).order('order_index')
      .then(({ data }) => { setStages(data ?? []); setLoadingStages(false) })
  }, [unit])

  function flash(msg) { setMessage(msg); setTimeout(() => setMessage(''), 2500) }

  async function saveUnitInfo() {
    if (!unitForm.name.trim()) return
    setSaving(true)
    const { data } = await supabase.from('units')
      .update({ name: unitForm.name.trim(), address: unitForm.address.trim() || null, gstin: unitForm.gstin.trim() || null })
      .eq('id', unit.id).select().single()
    if (data) setAuth(user, data, session)
    setSaving(false); flash('Saved!')
  }

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    setStages(s => arrayMove(s, s.findIndex(x => x.id === active.id), s.findIndex(x => x.id === over.id)))
  }
  function updateName(id, name)  { setStages(s => s.map(x => x.id === id ? { ...x, name }              : x)) }
  function toggleVendor(id, val) { setStages(s => s.map(x => x.id === id ? { ...x, is_subcontract: val } : x)) }
  function deleteStage(id)       { setStages(s => s.filter(x => x.id !== id)) }
  function addStage()            { setStages(s => [...s, { id: `n${Date.now()}`, name: '', is_subcontract: false }]) }

  async function saveStages() {
    setSaving(true)
    const insertedIds = []
    for (const [idx, stage] of stages.entries()) {
      if (!stage.name.trim()) continue
      if (isUUID(stage.id)) {
        await supabase.from('stage_templates')
          .update({ name: stage.name.trim(), is_subcontract: stage.is_subcontract, order_index: idx })
          .eq('id', stage.id)
      } else {
        const { data: inserted } = await supabase.from('stage_templates')
          .insert({ unit_id: unit.id, name: stage.name.trim(), is_subcontract: stage.is_subcontract, order_index: idx })
          .select('id').single()
        if (inserted) insertedIds.push(inserted.id)
      }
    }
    // Include newly inserted IDs so they aren't deleted in the cleanup below
    const keptIds = [...stages.filter(s => isUUID(s.id)).map(s => s.id), ...insertedIds]
    const { data: all } = await supabase.from('stage_templates').select('id').eq('unit_id', unit.id)
    for (const row of all ?? []) {
      if (!keptIds.includes(row.id)) {
        const { count } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('current_stage_id', row.id)
        if (!count) await supabase.from('stage_templates').delete().eq('id', row.id)
      }
    }
    setSaving(false); flash('Stages saved!')
  }

  async function handleDemoSeed() {
    if (!window.confirm('Load demo data? (existing data will remain)')) return
    setSeedLoading(true)
    try { await loadDemoData(unit.id, user.id); flash('Demo data loaded!') }
    catch (e) { flash(`Error: ${e.message}`) }
    setSeedLoading(false)
  }

  return (
    <div className="min-h-svh bg-gray-50 pb-10">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </div>

      {message && (
        <div className="mx-4 mt-3 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-700 font-medium">
          {message}
        </div>
      )}

      {/* Unit info */}
      <div className="mx-4 mt-4 bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit info</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit name *</label>
          <input value={unitForm.name} onChange={e => setUnitForm(f => ({ ...f, name: e.target.value }))}
            className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <textarea value={unitForm.address} onChange={e => setUnitForm(f => ({ ...f, address: e.target.value }))}
            rows={2} className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
          <input value={unitForm.gstin} onChange={e => setUnitForm(f => ({ ...f, gstin: e.target.value.toUpperCase() }))}
            className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={saveUnitInfo} disabled={saving}
          className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
          {saving ? 'Saving...' : 'Save unit info'}
        </button>
      </div>

      {/* Stage editor */}
      <div className="mx-4 mt-3 bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Stage configuration</p>
        {loadingStages ? <p className="text-sm text-gray-400">Loading...</p> : (
          <div className="space-y-2">
            {/* Draggable stages — all except the last (Dispatch) */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={stages.slice(0,-1).map(s => s.id)} strategy={verticalListSortingStrategy}>
                {stages.slice(0, -1).map(s => (
                  <SortableStageItem key={s.id} stage={s}
                    onChange={updateName} onToggle={toggleVendor} onDelete={deleteStage}
                    canDelete={stages.length > 2} />
                ))}
              </SortableContext>
            </DndContext>
            {/* Last stage (Dispatch) — always fixed at bottom, non-editable */}
            {stages.length > 0 && (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 opacity-60">
                <span className="text-gray-300 w-5 h-5 shrink-0 text-center">🔒</span>
                <span className="flex-1 text-sm text-gray-500">{stages[stages.length - 1]?.name} (fixed last stage)</span>
              </div>
            )}
            <button onClick={addStage}
              className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500">
              + Add stage
            </button>
            <button onClick={saveStages} disabled={saving}
              className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving...' : 'Save stages'}
            </button>
          </div>
        )}
      </div>

      {/* Team link */}
      <button onClick={() => navigate('/settings/team')}
        className="mx-4 mt-3 w-full bg-white border border-gray-100 rounded-xl px-4 py-4 flex items-center justify-between active:bg-gray-50">
        <div className="text-left">
          <p className="text-sm font-semibold text-gray-800">Team management</p>
          <p className="text-xs text-gray-400 mt-0.5">Add members, deactivate</p>
        </div>
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Demo data */}
      <div className="mx-4 mt-3 bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Demo data</p>
        <p className="text-xs text-gray-400 mb-3">Sample customers, vendors ani jobs insert hoil</p>
        <button onClick={handleDemoSeed} disabled={seedLoading}
          className="w-full py-3 border border-gray-300 rounded-xl text-sm text-gray-700 disabled:opacity-50">
          {seedLoading ? 'Loading...' : 'Load demo data'}
        </button>
      </div>

      {/* Sign out */}
      <div className="mx-4 mt-3 mb-2">
        <button onClick={handleSignOut}
          className="w-full py-3 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
          Sign out
        </button>
      </div>
    </div>
  )
}
