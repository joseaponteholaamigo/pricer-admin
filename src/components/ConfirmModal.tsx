import { useRef, useEffect, useId } from 'react'
import { useFocusTrap } from '../lib/useFocusTrap'

function ConfirmModal({ title, message, onConfirm, onClose }: {
  title: string
  message: string
  onConfirm: () => void
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useFocusTrap(dialogRef, true)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
      >
        <h2 id={titleId} className="text-base font-semibold text-p-dark mb-2">{title}</h2>
        <p className="text-sm text-p-gray mb-6">{message}</p>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
          <button onClick={onClose} className="btn-secondary w-full sm:w-auto">Cancelar</button>
          <button
            onClick={() => { onConfirm(); onClose() }}
            className="btn-danger w-full sm:w-auto"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
