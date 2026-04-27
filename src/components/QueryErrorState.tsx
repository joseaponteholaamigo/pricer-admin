import { AlertTriangle } from 'lucide-react'

interface QueryErrorStateProps {
  onRetry: () => void
  message?: string
  className?: string
}

function QueryErrorState({
  onRetry,
  message = 'No se pudieron cargar los datos.',
  className = '',
}: QueryErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-3 py-10 text-center ${className}`}
    >
      <AlertTriangle size={28} className="text-p-red" aria-hidden="true" />
      <p className="text-sm text-p-dark font-medium">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="btn-secondary text-xs"
      >
        Reintentar
      </button>
    </div>
  )
}

export default QueryErrorState
