import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext, closestCenter,
  KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  sortableKeyboardCoordinates, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_STAGES = {
  foundry: [
    { name: 'Pattern Check', is_subcontract: false },
    { name: 'Moulding',      is_subcontract: false },
    { name: 'Pouring',       is_subcontract: false },
    { name: 'Shakeout',      is_subcontract: false },
    { name: 'Fettling',      is_subcontract: true  },
    { name: 'Inspection',    is_subcontract: false },
    { name: 'Dispatch',      is_subcontract: false },
  ],
  machine_shop: [
    { name: 'Material Received', is_subcontract: false },
    { name: 'Setup',             is_subcontract: false },
    { name: 'Turning',           is_subcontract: false },
    { name: 'Milling',           is_subcontract: false },
    { name: 'Drilling',          is_subcontract: false },
    { name: 'Inspection',        is_subcontract: false },
    { name: 'Dispatch',          is_subcontract: false },
  ],
  combined: [
    { name: 'Pattern Check', is_subcontract: false },
    { name: 'Moulding',      is_subcontract: false },
    { name: 'Pouring',       is_subcontract: false },
    { name: 'Fettling',      is_subcontract: false },
    { name: 'Turning',       is_subcontract: false },
    { name: 'Milling',       is_subcontract: false },
    { name: 'Inspection',    is_subcontract: false },
    { name: 'Dispatch',      is_subcontract: false },
  ],
}

const UNIT_TYPES = [
  { value: 'foundry',      emoji: '🔥', label: 'Foundry /\nCasting' },
  { value: 'machine_shop', emoji: '⚙️', label: 'Machine\nShop' },
  { value: 'combined',     emoji: '🏭', label: 'Casting +\nMachine' },
]

// ── Drag handle icon ─────────────────────────────────────────────────────────

function GripIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <circle cx="7"  cy="5"  r="1.5" /><circle cx="13" cy="5"  r="1.5" />
      <circle cx="7"  cy="10" r="1.5" /><circle cx="13" cy="10" r="1.5" />
      <circle cx="7"  cy="15" r="1.5" /><circle cx="13" cy="15" r="1.5" />
    </svg>
  )
}

// ── Sortable stage row ────────────────────────────────────────────────────────

function SortableStageItem({ stage, onNameChange, onVendorToggle, onDelete, canDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stage.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 bg-white border rounded-xl px-3 py-2.5 transition-shadow ${
        isDragging ? 'shadow-xl border-blue-300' : 'border-gray-200'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-gray-300 cursor-grab active:cursor-grabbing touch-none shrink-0 p-0.5"
        tabIndex={-1}
      >
        <GripIcon />
      </button>

      <input
        value={stage.name}
        onChange={e => onNameChange(stage.id, e.target.value)}
        placeholder="Stage name"
        className="flex-1 text-sm py-1 outline-none bg-transparent"
      />

      <label className="flex items-center gap-1 shrink-0 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={stage.is_subcontract}
          onChange={e => onVendorToggle(stage.id, e.target.checked)}
          className="w-3.5 h-3.5 accent-amber-500"
        />
        <span className="text-xs text-gray-500">Vendor</span>
      </label>

      {canDelete && (
        <button
          onClick={() => onDelete(stage.id)}
          className="text-gray-300 hover:text-red-400 text-xl leading-none w-6 h-6 flex items-center justify-center shrink-0"
        >
          ×
        </button>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Setup() {
  const navigate = useNavigate()
  const { user, setAuth } = useAuthStore()

  const [step, setStep] = useState(1)
  const [unitData, setUnitData] = useState({
    name: '', type: '', ownerName: '', ownerPhone: '', address: '', gstin: '',
  })
  const [stages, setStages] = useState([])
  const [customer, setCustomer] = useState({ name: '', phone: '', gstin: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function setField(key, val) {
    setUnitData(d => ({ ...d, [key]: val }))
    setError('')
  }

  function handleTypeSelect(type) {
    setUnitData(d => ({ ...d, type }))
    setStages(DEFAULT_STAGES[type].map((s, i) => ({ ...s, id: `s${Date.now()}${i}` })))
    setError('')
  }

  // ── Step 1 → 2 ──
  function goStep2() {
    if (!unitData.name.trim())     { setError('Enter unit name'); return }
    if (!unitData.type)            { setError('Select unit type'); return }
    if (!unitData.ownerName.trim()) { setError('Enter owner name'); return }
    setError(''); setStep(2)
  }

  // ── Stage mutations ──
  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    setStages(s => arrayMove(s, s.findIndex(x => x.id === active.id), s.findIndex(x => x.id === over.id)))
  }
  function updateName(id, name)    { setStages(s => s.map(x => x.id === id ? { ...x, name }            : x)) }
  function toggleVendor(id, val)   { setStages(s => s.map(x => x.id === id ? { ...x, is_subcontract: val } : x)) }
  function deleteStage(id)         { setStages(s => s.filter(x => x.id !== id)) }
  function addStage()              { setStages(s => [...s.slice(0, -1), { id: `s${Date.now()}`, name: '', is_subcontract: false }, s[s.length - 1]]) }

  // ── Step 2 → 3 ──
  function goStep3() {
    if (stages.filter(s => s.name.trim()).length < 2) { setError('Minimum 2 stages required'); return }
    setError(''); setStep(3)
  }

  // ── Final save ──
  async function handleComplete(skipCustomer) {
    if (!skipCustomer && !customer.name.trim()) { setError('Enter customer name'); return }
    setLoading(true); setError('')

    const { data: unitId, error: rpcErr } = await supabase.rpc('setup_unit', {
      p_unit_name:     unitData.name.trim(),
      p_unit_type:     unitData.type,
      p_owner_name:    unitData.ownerName.trim(),
      p_owner_phone:   unitData.ownerPhone.trim() || null,
      p_address:       unitData.address.trim()    || null,
      p_gstin:         unitData.gstin.trim()       || null,
      p_stages:        stages
                         .filter(s => s.name.trim())
                         .map(s => ({ name: s.name.trim(), is_subcontract: s.is_subcontract })),
      p_customer_name:  skipCustomer ? null : customer.name.trim(),
      p_customer_phone: skipCustomer ? null : (customer.phone.trim() || null),
      p_customer_gstin: skipCustomer ? null : (customer.gstin.trim() || null),
    })

    if (rpcErr) { setError(rpcErr.message); setLoading(false); return }

    const { data: { session } } = await supabase.auth.getSession()

    const unitRow = {
      id: unitId,
      name: unitData.name.trim(),
      type: unitData.type,
      owner_name: unitData.ownerName.trim(),
      phone: unitData.ownerPhone.trim() || null,
      address: unitData.address.trim() || null,
      gstin: unitData.gstin.trim() || null,
      is_active: true,
      plan: 'trial',
    }

    setAuth(
      { ...user, unit_id: unitId, name: unitData.ownerName.trim(), role: 'owner',
        phone: unitData.ownerPhone.trim() || null, is_active: true },
      unitRow,
      session,
    )

    navigate('/dashboard', { replace: true })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-svh flex flex-col bg-white">
      {/* Progress bar */}
      <div className="px-4 pt-12 pb-4 border-b border-gray-100">
        <div className="flex gap-1.5 mb-3">
          {[1, 2, 3].map(n => (
            <div key={n} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${n <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
          ))}
        </div>
        <p className="text-xs text-gray-400">Step {step} of 3</p>
        <h1 className="text-xl font-bold text-gray-900 mt-0.5">
          {step === 1 && 'Unit setup'}
          {step === 2 && 'Configure stages'}
          {step === 3 && 'First customer'}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 pb-10">

        {/* ── STEP 1 — Unit info ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit name *</label>
              <input
                value={unitData.name}
                onChange={e => setField('name', e.target.value)}
                placeholder="Desai Foundry"
                autoFocus
                className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit type *</label>
              <div className="grid grid-cols-3 gap-2">
                {UNIT_TYPES.map(({ value, emoji, label }) => (
                  <button
                    key={value}
                    onClick={() => handleTypeSelect(value)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-center transition-colors ${
                      unitData.type === value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-xs font-medium leading-tight text-gray-700 whitespace-pre-line">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Owner name *</label>
              <input
                value={unitData.ownerName}
                onChange={e => setField('ownerName', e.target.value)}
                placeholder="Suresh Desai"
                className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Owner phone <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="flex items-stretch border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                <span className="flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-300 select-none">+91</span>
                <input
                  type="tel" inputMode="numeric" maxLength={10}
                  value={unitData.ownerPhone}
                  onChange={e => setField('ownerPhone', e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="flex-1 px-3 py-3.5 text-base outline-none bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Address <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={unitData.address}
                onChange={e => setField('address', e.target.value)}
                placeholder="Shiroli MIDC, Kolhapur"
                rows={2}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                GSTIN <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                value={unitData.gstin}
                onChange={e => setField('gstin', e.target.value.toUpperCase())}
                placeholder="27XXXXX"
                className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              onClick={goStep2}
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl text-base font-semibold active:bg-blue-700 transition-colors"
            >
              Next →
            </button>
          </div>
        )}

        {/* ── STEP 2 — Stage editor ── */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 mb-1">
              Drag to reorder · Vendor = can outsource
            </p>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={stages.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {stages.map(stage => (
                    <SortableStageItem
                      key={stage.id}
                      stage={stage}
                      onNameChange={updateName}
                      onVendorToggle={toggleVendor}
                      onDelete={deleteStage}
                      canDelete={stages.length > 2}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <button
              onClick={addStage}
              className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 active:border-blue-400 active:text-blue-600 transition-colors"
            >
              + Add stage
            </button>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setStep(1); setError('') }}
                className="flex-1 py-3.5 border border-gray-300 rounded-xl text-base font-medium text-gray-700 active:bg-gray-50"
              >
                ← Back
              </button>
              <button
                onClick={goStep3}
                className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl text-base font-semibold active:bg-blue-700"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 — First customer ── */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Add your first customer. You can always do this later.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer name *</label>
              <input
                value={customer.name}
                onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))}
                placeholder="Kirloskar Brothers"
                autoFocus
                className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="flex items-stretch border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                <span className="flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-300 select-none">+91</span>
                <input
                  type="tel" inputMode="numeric" maxLength={10}
                  value={customer.phone}
                  onChange={e => setCustomer(c => ({ ...c, phone: e.target.value.replace(/\D/g, '') }))}
                  placeholder="9876543210"
                  className="flex-1 px-3 py-3.5 text-base outline-none bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                GSTIN <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                value={customer.gstin}
                onChange={e => setCustomer(c => ({ ...c, gstin: e.target.value.toUpperCase() }))}
                placeholder="27XXXXX"
                className="w-full px-4 py-3.5 text-base border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              onClick={() => handleComplete(false)}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl text-base font-semibold disabled:opacity-50 active:bg-blue-700 transition-colors"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>

            <button
              onClick={() => handleComplete(true)}
              disabled={loading}
              className="w-full py-2.5 text-sm text-gray-500 disabled:opacity-50"
            >
              Skip for now
            </button>

            <button
              onClick={() => { setStep(2); setError('') }}
              disabled={loading}
              className="w-full py-2 text-sm text-gray-400 disabled:opacity-50"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
