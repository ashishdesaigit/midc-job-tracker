import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { SkeletonList } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'

export default function Customers() {
  const navigate = useNavigate()
  const { unit } = useAuthStore()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!unit?.id) return
    supabase
      .from('customers')
      .select('*')
      .eq('unit_id', unit.id)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => { setCustomers(data ?? []); setLoading(false) })
  }, [unit?.id])

  return (
    <div className="min-h-svh bg-gray-50">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Customers</h1>
        <button
          onClick={() => navigate('/customers/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium active:bg-blue-700"
        >
          + New
        </button>
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <SkeletonList count={4} />
        ) : customers.length === 0 ? (
          <EmptyState
            icon="🏢"
            title="No customers yet"
            message="Add your first customer to track jobs."
            action={
              <button
                onClick={() => navigate('/customers/new')}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-medium"
              >
                + New customer
              </button>
            }
          />
        ) : (
          <div className="space-y-2">
            {customers.map(c => (
              <button
                key={c.id}
                onClick={() => navigate(`/customers/${c.id}`)}
                className="w-full bg-white border border-gray-100 rounded-xl p-4 text-left active:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-900">{c.name}</p>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                    {c.credit_days}d
                  </span>
                </div>
                {c.phone && (
                  <p className="text-sm text-gray-500 mt-1">+91 {c.phone}</p>
                )}
                {c.gstin && (
                  <p className="text-xs text-gray-400 mt-0.5">{c.gstin}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
