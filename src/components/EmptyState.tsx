import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  className?: string
}

function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 py-10 text-center ${className}`}>
      {icon && (
        <div className="text-p-muted" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-p-dark">{title}</p>
      {description && (
        <p className="text-xs text-p-muted max-w-xs">{description}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="btn-secondary text-xs mt-1"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export default EmptyState
