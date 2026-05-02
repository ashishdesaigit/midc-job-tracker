export function SkeletonLine({ className = '' }) {
  return (
    <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
      <div className="flex justify-between items-start">
        <SkeletonLine className="h-3.5 w-20" />
        <SkeletonLine className="h-5 w-16 rounded-full" />
      </div>
      <SkeletonLine className="h-5 w-44" />
      <div className="flex gap-4">
        <SkeletonLine className="h-3 w-24" />
        <SkeletonLine className="h-3 w-20" />
      </div>
      <SkeletonLine className="h-3 w-28" />
    </div>
  )
}

export function SkeletonList({ count = 3 }) {
  return (
    <div className="space-y-3 px-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
