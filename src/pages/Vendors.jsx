import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { SkeletonList } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'

const WORK_LABELS = {
  boring: 'Boring', heat_treatment: 'Heat Treatment', grinding: 'Grinding',
  turning: 'Turning', milling: 'Milling', welding: 'Welding',
  plating: 'Plating', painting: 'Painting', other: 'Other',
}

export default function Vendors() {
  const navigate = useNavigate()
  const { unit } = useAuthStore()
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!unit?.id) return
    supabase
      .from('vendors')
      .select('*')
      .eq('unit_id', unit.id)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => { setVendors(data ?? []); setLoading(false) })
  }, [unit?.id])

  return (
    <div className="min-h-svh bg-gray-50">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Vendors</h1>
        <button
          onClick={() => navigate('/vendors/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium active:bg-blue-700"
        >
          + New
        </button>
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <SkeletonList count={4} />
        ) : vendors.length === 0 ? (
          <EmptyState
            icon="🏭"
            title="No vendors yet"
            message="Add your first vendor to track subcontracting."
            action={
              <button
                onClick={() => navigate('/vendors/new')}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-medium"
              >
                + New vendor
              </button>
            }
          />
        ) : (
          <div className="space-y-2">
            {vendors.map(v => (
              <button
                key={v.id}
                onClick={() => navigate(`/vendors/${v.id}`)}
                className="w-full bg-white border border-gray-100 rounded-xl p-4 text-left active:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{v.name}</p>
                    {v.phone && (
                      <a
                        href={`tel:${v.phone}`}
                        onClick={e => e.stopPropagation()}
                        className="text-sm text-blue-600 mt-0.5 block"
                      >
                        +91 {v.phone}
                      </a>
                    )}
                  </div>
                </div>
                {v.work_types?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {v.work_types.map(wt => (
                      <span key={wt} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {WORK_LABELS[wt] ?? wt}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
