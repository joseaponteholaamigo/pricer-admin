import { AlertTriangle, Save } from 'lucide-react'

function SaveBar({ onSave, saving, dirty }: { onSave: () => void; saving: boolean; dirty: boolean }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-4 border-t border-p-border mt-6">
      {dirty && (
        <span className="text-xs text-p-yellow flex items-center gap-1">
          <AlertTriangle size={13} /> Cambios sin guardar
        </span>
      )}
      <button onClick={onSave} disabled={saving || !dirty} className="btn-primary flex items-center gap-2 disabled:opacity-40">
        <Save size={15} />
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  )
}

export default SaveBar
