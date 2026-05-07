import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, X, AlertTriangle, GraduationCap } from 'lucide-react'
import api from '../../../lib/api'
import type { NivelEducativo, PortafolioEduData, TenantListItem } from '../../../lib/types'
import Spinner from '../../../components/Spinner'
import QueryErrorState from '../../../components/QueryErrorState'
import { useToast } from '../../../components/useToast'

// ─── Modal de Nivel Educativo ─────────────────────────────────────────────────

interface ModalProps {
  isEdit: boolean
  initial: string
  existing: string[]
  onSave: (nombre: string) => void
  onClose: () => void
  isSaving: boolean
}

function NivelModal({ isEdit, initial, existing, onSave, onClose, isSaving }: ModalProps) {
  const [nombre, setNombre] = useState(initial)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = nombre.trim()
    if (!trimmed) { setError('El nombre no puede estar vacío'); return }
    const dup = existing.some(n => n.toLowerCase() === trimmed.toLowerCase() && n !== initial)
    if (dup) { setError('Ya existe un Nivel Educativo con ese nombre'); return }
    onSave(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="niv-modal-title" className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 id="niv-modal-title" className="text-sm font-semibold text-p-dark">
            {isEdit ? 'Ver Nivel Educativo' : 'Nuevo Nivel Educativo'}
          </h2>
          <button onClick={onClose} aria-label="Cerrar modal" className="btn-icon text-p-gray hover:text-p-dark">
            <X size={16} aria-hidden />
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <label className="form-label" htmlFor="niv-nombre">Nombre</label>
          <input
            id="niv-nombre"
            type="text"
            value={nombre}
            onChange={e => { setNombre(e.target.value); setError('') }}
            disabled={isEdit}
            placeholder="Ej: Maestría"
            className="form-input mt-1 w-full disabled:opacity-60 disabled:cursor-not-allowed"
            aria-invalid={!!error}
            aria-describedby={error ? 'niv-error' : undefined}
            autoFocus={!isEdit}
          />
          {isEdit && (
            <p className="text-xs text-p-muted mt-1">El nombre es la clave de matching y no se puede modificar.</p>
          )}
          {error && <p id="niv-error" className="text-xs text-p-red mt-1 flex items-center gap-1" role="alert"><AlertTriangle size={12} aria-hidden />{error}</p>}
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

// ─── NivelesEducativosTab ─────────────────────────────────────────────────────
// Catálogo POR TENANT (2026-05-06 reemplaza P2 global). Cada universidad define su nomenclatura.

export default function NivelesEducativosTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; nombre: string } | null>(null)

  const { data = [], isLoading, isError, refetch } = useQuery<NivelEducativo[]>({
    queryKey: ['reglas-niveles-educativos', tenantId],
    queryFn: () => api.get<NivelEducativo[]>(`reglas/niveles-educativos?tenantId=${tenantId}`).then(r => r.data),
    staleTime: 30_000,
    enabled: !!tenantId,
  })

  const { data: tenants = [] } = useQuery<TenantListItem[]>({
    queryKey: ['tenants'],
    queryFn: () => api.get<TenantListItem[]>('tenants').then(r => r.data),
    staleTime: 5 * 60_000,
  })
  const tenantNombre = tenants.find(t => t.id === tenantId)?.nombre ?? tenantId

  // Portafolio del tenant activo para verificar referencias antes de eliminar
  const { data: portafolioData } = useQuery<PortafolioEduData>({
    queryKey: ['reglas-portafolio-edu', tenantId],
    queryFn: () => api.get<PortafolioEduData>(`reglas/portafolio-edu?tenantId=${tenantId}`).then(r => r.data),
    staleTime: 30_000,
    enabled: !!tenantId,
  })

  const mutation = useMutation({
    mutationFn: (items: NivelEducativo[]) =>
      api.put(`reglas/niveles-educativos?tenantId=${tenantId}`, { niveles: items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-niveles-educativos', tenantId] })
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
    const count = programas.filter(p => p.nivel === nombre).length
    if (count > 0) {
      toast.error(`No se puede eliminar "${nombre}": ${count} programa(s) lo referencia(n) en el tenant activo. Elimina o reasigna los programas primero.`)
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
      <div className="flex items-start justify-between mb-4 gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap size={14} className="text-p-lime shrink-0" aria-hidden />
            <span className="text-xs font-semibold text-p-lime uppercase tracking-wide">Por tenant</span>
          </div>
          <p className="text-sm text-p-gray">
            Niveles Educativos del tenant <span className="font-medium text-p-dark">{tenantNombre}</span>.
            Cada universidad define su propia nomenclatura (Pregrado, Especialización, Maestría, etc.).
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: 'add', nombre: '' })}
          className="btn-primary text-sm shrink-0"
          aria-label="Agregar Nivel Educativo"
        >
          <Plus size={15} aria-hidden /> Agregar
        </button>
      </div>

      {data.length === 0 ? (
        <div className="card flex items-center justify-center py-16 text-p-muted text-sm">
          Sin Niveles Educativos configurados. Agréga los niveles antes de cargar el portafolio edu.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table w-full min-w-[400px]">
            <thead>
              <tr>
                <th className="text-left">#</th>
                <th className="text-left">Nivel Educativo</th>
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
        <NivelModal
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
