import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, X, AlertTriangle } from 'lucide-react'
import api from '../../../lib/api'
import type { CiudadEdu, PortafolioEduData } from '../../../lib/types'
import Spinner from '../../../components/Spinner'
import QueryErrorState from '../../../components/QueryErrorState'
import { useToast } from '../../../components/useToast'

// ─── Modal de Ciudad ──────────────────────────────────────────────────────────

interface ModalProps {
  isEdit: boolean
  initial: string
  existing: string[]
  onSave: (nombre: string) => void
  onClose: () => void
  isSaving: boolean
}

function CiudadModal({ isEdit, initial, existing, onSave, onClose, isSaving }: ModalProps) {
  const [nombre, setNombre] = useState(initial)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = nombre.trim()
    if (!trimmed) { setError('El nombre no puede estar vacío'); return }
    const dup = existing.some(n => n.toLowerCase() === trimmed.toLowerCase() && n !== initial)
    if (dup) { setError('Ya existe una Ciudad con ese nombre'); return }
    onSave(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="ciu-modal-title" className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 id="ciu-modal-title" className="text-sm font-semibold text-p-dark">
            {isEdit ? 'Ver Ciudad' : 'Nueva Ciudad'}
          </h2>
          <button onClick={onClose} aria-label="Cerrar modal" className="btn-icon text-p-gray hover:text-p-dark">
            <X size={16} aria-hidden />
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <label className="form-label" htmlFor="ciu-nombre">Nombre</label>
          <input
            id="ciu-nombre"
            type="text"
            value={nombre}
            onChange={e => { setNombre(e.target.value); setError('') }}
            disabled={isEdit}
            placeholder="Ej: Medellín"
            className="form-input mt-1 w-full disabled:opacity-60 disabled:cursor-not-allowed"
            aria-invalid={!!error}
            aria-describedby={error ? 'ciu-error' : undefined}
            autoFocus={!isEdit}
          />
          {isEdit && (
            <p className="text-xs text-p-muted mt-1">El nombre es la clave de matching y no se puede modificar.</p>
          )}
          {error && <p id="ciu-error" className="text-xs text-p-red mt-1 flex items-center gap-1" role="alert"><AlertTriangle size={12} aria-hidden />{error}</p>}
          <div className="flex gap-2 mt-5 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isSaving} className="btn-primary disabled:opacity-40">
              {isSaving ? 'Guardando…' : isEdit ? 'Aceptar' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── CiudadesTab ─────────────────────────────────────────────────────────────
// Catálogo por tenant. Accesible para admin, consultor y cliente_editor.

export default function CiudadesTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; nombre: string } | null>(null)

  const { data = [], isLoading, isError, refetch } = useQuery<CiudadEdu[]>({
    queryKey: ['reglas-ciudades-edu', tenantId],
    queryFn: () => api.get<CiudadEdu[]>(`reglas/ciudades?tenantId=${tenantId}`).then(r => r.data),
    staleTime: 30_000,
  })

  const { data: portafolioData } = useQuery<PortafolioEduData>({
    queryKey: ['reglas-portafolio-edu', tenantId],
    queryFn: () => api.get<PortafolioEduData>(`reglas/portafolio-edu?tenantId=${tenantId}`).then(r => r.data),
    staleTime: 30_000,
  })

  const mutation = useMutation({
    mutationFn: (items: CiudadEdu[]) =>
      api.put(`reglas/ciudades?tenantId=${tenantId}`, { ciudades: items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-ciudades-edu', tenantId] })
      toast.success('Cambios guardados')
      setModal(null)
    },
    onError: (err: unknown) => {
      toast.error('No se pudo guardar: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    },
  })

  const handleAdd = (nombre: string) => {
    mutation.mutate([...data, { nombre }])
  }

  const handleDelete = (nombre: string) => {
    const programas = portafolioData?.programas ?? []
    const count = programas.filter(p => p.ciudad === nombre).length
    if (count > 0) {
      toast.error(`No se puede eliminar "${nombre}": ${count} programa(s) la referencia(n). Elimina o reasigna los programas primero.`)
      return
    }
    if (!window.confirm(`¿Eliminar "${nombre}"?`)) return
    mutation.mutate(data.filter(c => c.nombre !== nombre))
  }

  if (isError) return <QueryErrorState onRetry={refetch} />
  if (isLoading) return <Spinner />

  const nombres = data.map(c => c.nombre)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-p-gray flex-1">
          Ciudades donde opera la institución. El nombre es inmutable tras crearse (clave de matching en importaciones y en la configuración de atributos por par Facultad/Escuela × Ciudad).
        </p>
        <button
          onClick={() => setModal({ mode: 'add', nombre: '' })}
          className="btn-primary text-sm shrink-0 ml-4"
          aria-label="Agregar Ciudad"
        >
          <Plus size={15} aria-hidden /> Agregar
        </button>
      </div>

      {data.length === 0 ? (
        <div className="card flex items-center justify-center py-16 text-p-muted text-sm">
          Sin ciudades configuradas. Agrégalas antes de cargar el portafolio edu.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table w-full min-w-[400px]">
            <thead>
              <tr>
                <th className="text-left">#</th>
                <th className="text-left">Ciudad</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr key={item.nombre}>
                  <td className="text-xs text-p-muted">{idx + 1}</td>
                  <td className="text-sm font-medium text-p-dark">{item.nombre}</td>
                  <td>
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setModal({ mode: 'edit', nombre: item.nombre })}
                        aria-label={`Ver detalles de ${item.nombre}`}
                        className="btn-icon text-p-muted hover:text-p-dark"
                      >
                        <Pencil size={13} aria-hidden />
                      </button>
                      <button
                        onClick={() => handleDelete(item.nombre)}
                        aria-label={`Eliminar ${item.nombre}`}
                        className="btn-icon text-p-muted hover:text-p-red"
                      >
                        <Trash2 size={13} aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <CiudadModal
          isEdit={modal.mode === 'edit'}
          initial={modal.nombre}
          existing={nombres}
          onSave={handleAdd}
          onClose={() => setModal(null)}
          isSaving={mutation.isPending}
        />
      )}
    </div>
  )
}
