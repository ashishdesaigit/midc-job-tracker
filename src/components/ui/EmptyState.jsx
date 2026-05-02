export default function EmptyState({ icon = '📋', title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="text-5xl mb-4 select-none">{icon}</div>
      {title && (
        <p className="text-base font-semibold text-gray-700 mb-1">{title}</p>
      )}
      {message && (
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{message}</p>
      )}
      {action}
    </div>
  )
}
