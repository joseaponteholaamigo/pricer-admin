function ConfirmModal({ title, message, onConfirm, onClose }: {
  title: string
  message: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-base font-semibold text-p-dark mb-2">{title}</h2>
        <p className="text-sm text-p-gray mb-6">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            onClick={() => { onConfirm(); onClose() }}
            className="btn-danger"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
