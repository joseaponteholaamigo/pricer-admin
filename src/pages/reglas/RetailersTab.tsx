import { useState, useMemo } from 'react'
import { useUrlParam, useUrlNumber } from '../../lib/useUrlState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil, Search, X } from 'lucide-react'
import api from '../../lib/api'
import type { RetailerItem } from '../../lib/types'
import Spinner from '../../components/Spinner'
import ConfirmModal from '../../components/ConfirmModal'
import SoloPrisierBadge from '../../components/SoloPrisierBadge'

// ─── RetailerModal ────────────────────────────────────────────────────────────

interface RetailerFormValues {
  nombre: string
}
type RetailerFormErrors = Partial<Record<keyof RetailerFormValues, string>>

function RetailerModal({
  mode,
  initial,
  existingNombres,
  onSave,
  onClose,
}: {
  mode: 'add' | 'edit'
  initial?: RetailerFormValues
  existingNombres: string[]
  onSave: (values: RetailerFormValues) => void
  onClose: () => void
}) {
  const [vals, setVals] = useState<RetailerFormValues>({ nombre: initial?.nombre ?? '' })
  const [touched, setTouched] = useState<Partial<Record<keyof RetailerFormValues, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const validate = (v: RetailerFormValues): RetailerFormErrors => {
    const err: RetailerFormErrors = {}
    if (!v.nombre.trim()) err.nombre = 'El nombre es requerido'
    else if (existingNombres.map(n => n.toLowerCase()).includes(v.nombre.trim().toLowerCase()))
      err.nombre = 'Ya existe un retailer con este nombre'
    return err
  }

  const errors = validate(vals)
  const showError = (field: keyof RetailerFormValues) =>
    (touched[field] || submitAttempted) ? errors[field] : undefined

  const set = (field: keyof RetailerFormValues, value: string) => {
    setVals(prev => ({ ...prev, [field]: value }))
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const handleSubmit = () => {
    setSubmitAttempted(true)
    if (Object.keys(validate(vals)).length === 0) onSave(vals)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-p-dark">
            {mode === 'add' ? 'Nuevo retailer' : 'Editar retailer'}
          </h2>
          <button onClick={onClose} className="text-p-gray hover:text-p-dark transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="form-label">Nombre</label>
            <input
              value={vals.nombre}
              onChange={e => set('nombre', e.target.value)}
              onBlur={() => setTouched(p => ({ ...p, nombre: true }))}
              className={`form-input w-full ${showError('nombre') ? 'border-red-400' : ''}`}
              placeholder="Ej: Walmart"
            />
            {showError('nombre') && <p className="text-xs text-red-500 mt-1">{showError('nombre')}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} className="btn-primary">
            {mode === 'add' ? 'Agregar' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── RetailersTab (R-010) ─────────────────────────────────────────────────────

const PAGE_SIZE = 10

function RetailersTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: RetailerItem } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<RetailerItem | null>(null)
  const [page, setPage] = useUrlNumber('page', 1)
  const [filterText, setFilterText] = useUrlParam('q')

  const { data: items = [], isLoading } = useQuery<RetailerItem[]>({
    queryKey: ['reglas-retailers', tenantId],
    queryFn: () => api.get<RetailerItem[]>(`reglas/retailers?tenantId=${tenantId}`).then(r => r.data),
  })

  const filteredItems = useMemo(() => {
    const q = filterText.trim().toLowerCase()
    if (!q) return items
    return items.filter(r => r.nombre.toLowerCase().includes(r.nombre.toLowerCase()))
  }, [items, filterText])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const mutation = useMutation({
    mutationFn: (newItems: RetailerItem[]) =>
      api.put(`reglas/retailers?tenantId=${tenantId}`, newItems),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-retailers', tenantId] })
    },
  })

  const handleSave = (vals: RetailerFormValues) => {
    let newItems: RetailerItem[]
    if (modal?.mode === 'add') {
      newItems = [...items, { id: `new-${Date.now()}`, nombre: vals.nombre.trim(), activo: true }]
      setFilterText('')
      setPage(Math.ceil(newItems.length / PAGE_SIZE))
    } else {
      newItems = items.map(r => r.id === modal?.item?.id ? { ...r, nombre: vals.nombre.trim() } : r)
    }
    mutation.mutate(newItems)
    setModal(null)
  }

  const handleToggleActivo = (retailer: RetailerItem) => {
    mutation.mutate(items.map(r => r.id === retailer.id ? { ...r, activo: !r.activo } : r))
  }

  const handleDelete = (retailer: RetailerItem) => {
    mutation.mutate(items.filter(r => r.id !== retailer.id))
    setConfirmDelete(null)
  }

  const existingNombresForModal = useMemo(() => {
    const exclude = modal?.mode === 'edit' ? modal.item?.nombre : undefined
    return items.map(r => r.nombre).filter(n => n !== exclude)
  }, [items, modal])

  if (isLoading) return <Spinner />

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <p className="text-sm text-p-gray flex-1">
          Listado de retailers del tenant. Solo los activos aparecen en comparaciones de precios.
        </p>
        <SoloPrisierBadge />
      </div>

      <div className="card mt-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-p-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar retailer…"
              value={filterText}
              onChange={e => { setFilterText(e.target.value); setPage(1) }}
              className="form-input pl-8 pr-3 py-1.5 w-56"
            />
          </div>
          <button
            onClick={() => setModal({ mode: 'add' })}
            className="btn-secondary text-xs flex items-center gap-1 py-1.5 ml-auto"
          >
            <Plus size={13} /> Agregar
          </button>
        </div>

        <table className="data-table w-full">
          <thead>
            <tr>
              <th className="text-left">Nombre</th>
              <th className="text-center w-28">Estado</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {pageItems.map(r => (
              <tr key={r.id}>
                <td className="text-sm font-medium text-p-dark">{r.nombre}</td>
                <td className="text-center">
                  <button
                    onClick={() => handleToggleActivo(r)}
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                      r.activo
                        ? 'bg-p-lime/20 text-p-lime border-p-lime/40'
                        : 'bg-p-border/40 text-p-muted border-p-border'
                    }`}
                  >
                    {r.activo ? '✓ Activo' : 'Inactivo'}
                  </button>
                </td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setModal({ mode: 'edit', item: r })}
                      className="p-1.5 rounded hover:bg-p-surface text-p-gray hover:text-p-dark transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(r)}
                      className="p-1.5 rounded hover:bg-red-50 text-p-gray hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center text-sm text-p-muted py-6">
                  Sin retailers — usa el botón Agregar para crear uno.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-p-border">
          <span className="text-sm text-p-muted">
            {safePage} / {totalPages} — {filteredItems.length} retailer{filteredItems.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setPage(Math.max(1, safePage - 1))}
              disabled={safePage === 1}
              className="text-sm text-p-gray hover:text-p-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, safePage + 1))}
              disabled={safePage === totalPages}
              className="text-sm font-semibold text-p-dark hover:text-p-lime disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {modal && (
        <RetailerModal
          mode={modal.mode}
          initial={modal.item ? { nombre: modal.item.nombre } : undefined}
          existingNombres={existingNombresForModal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Eliminar retailer"
          message={`Se eliminará "${confirmDelete.nombre}" del listado. Esta acción no se puede deshacer.`}
          onConfirm={() => handleDelete(confirmDelete)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

export default RetailersTab
