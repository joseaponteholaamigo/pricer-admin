import { useMemo, useState, useRef, useEffect, useId } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUrlParam, useUrlNumber } from '../../lib/useUrlState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil, Search, X } from 'lucide-react'
import api from '../../lib/api'
import type { RetailerItem } from '../../lib/types'
import { SkeletonTable } from '../../components/Skeleton'
import QueryErrorState from '../../components/QueryErrorState'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../components/useToast'
import ConfirmModal from '../../components/ConfirmModal'
import SoloPrisierBadge from '../../components/SoloPrisierBadge'
import { makeRetailerSchema } from '../../schemas/reglas'
import { useFocusTrap } from '../../lib/useFocusTrap'
import { useAuth } from '../../lib/auth'

// ─── RetailerModal ────────────────────────────────────────────────────────────

interface RetailerFormValues {
  nombre: string
}

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
  const schema = useMemo(
    () => makeRetailerSchema({ existingNombres }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [existingNombres.join(',')],
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, touchedFields, isSubmitted },
  } = useForm<RetailerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: initial?.nombre ?? '' },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const showErr = (field: keyof RetailerFormValues) => {
    const touched = touchedFields[field] || isSubmitted
    const msg = errors[field]?.message
    if (!touched || !msg) return null
    return (
      <p id={`retailer-${field}-error`} className="text-xs text-p-red mt-1" role="alert">
        {msg}
      </p>
    )
  }

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
        <div className="flex items-center justify-between mb-5">
          <h2 id={titleId} className="text-base font-semibold text-p-dark">
            {mode === 'add' ? 'Nuevo retailer' : 'Editar retailer'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-p-gray hover:text-p-dark transition-colors">
            <X size={18} aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} noValidate>
          <div className="space-y-4">
            <div>
              <label htmlFor="retailer-nombre" className="form-label">Nombre</label>
              <input
                id="retailer-nombre"
                {...register('nombre')}
                aria-invalid={!!(touchedFields.nombre || isSubmitted) && !!errors.nombre}
                aria-describedby={errors.nombre ? 'retailer-nombre-error' : undefined}
                className="form-input w-full"
                placeholder="Ej: Walmart"
              />
              {showErr('nombre')}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="btn-secondary w-full sm:w-auto">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full sm:w-auto">
              {mode === 'add' ? 'Agregar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── RetailersTab (R-010) ─────────────────────────────────────────────────────

const PAGE_SIZE = 10

function RetailersTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { user } = useAuth()
  const isAdmin = user?.rol === 'admin'
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: RetailerItem } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<RetailerItem | null>(null)
  const [page, setPage] = useUrlNumber('page', 1)
  const [filterText, setFilterText] = useUrlParam('q')

  const { data: items = [], isLoading, isError, refetch } = useQuery<RetailerItem[]>({
    queryKey: ['reglas-retailers', tenantId],
    queryFn: () => api.get<RetailerItem[]>(`reglas/retailers?tenantId=${tenantId}`).then(r => r.data),
  })

  const filteredItems = useMemo(() => {
    const q = filterText.trim().toLowerCase()
    if (!q) return items
    return items.filter(r => r.nombre.toLowerCase().includes(q))
  }, [items, filterText])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const mutation = useMutation({
    mutationFn: (newItems: RetailerItem[]) =>
      api.put(`reglas/retailers?tenantId=${tenantId}`, newItems),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-retailers', tenantId] })
      toast.success('Cambios guardados')
    },
    onError: (err: unknown) => {
      toast.error('No se pudo guardar: ' + (err instanceof Error ? err.message : 'Error desconocido'))
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

  if (isError) return <QueryErrorState onRetry={refetch} />

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <p className="text-sm text-p-gray flex-1">
          Listado de retailers del tenant. Solo los activos aparecen en comparaciones de precios.
        </p>
        <SoloPrisierBadge />
      </div>

      <div className="card mt-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-p-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar retailer…"
              value={filterText}
              onChange={e => { setFilterText(e.target.value); setPage(1) }}
              className="form-input pl-8 pr-3 py-1.5 w-full sm:w-56"
            />
          </div>
          <button
            onClick={() => setModal({ mode: 'add' })}
            disabled={!isAdmin}
            className="btn-secondary text-xs flex items-center gap-1 py-1.5 sm:ml-auto w-full sm:w-auto justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={13} /> Agregar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table w-full min-w-[320px]">
            <thead>
              <tr>
                <th className="text-left">Nombre</th>
                <th className="text-center w-28">Estado</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonTable rows={5} columns={3} />
              ) : pageItems.length > 0 ? (
                pageItems.map(r => (
                  <tr key={r.id}>
                    <td className="text-sm font-medium text-p-dark">{r.nombre}</td>
                    <td className="text-center">
                      <button
                        onClick={() => handleToggleActivo(r)}
                        disabled={!isAdmin}
                        className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          r.activo
                            ? 'bg-p-lime/20 text-p-lime border-p-lime/40'
                            : 'bg-p-border/40 text-p-muted border-p-border'
                        }`}
                      >
                        {r.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setModal({ mode: 'edit', item: r })}
                          disabled={!isAdmin}
                          aria-label={`Editar ${r.nombre}`}
                          className="btn-icon hover:bg-p-surface text-p-gray hover:text-p-dark disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Pencil size={14} aria-hidden />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(r)}
                          disabled={!isAdmin}
                          aria-label={`Eliminar ${r.nombre}`}
                          className="btn-icon hover:bg-red-50 text-p-gray hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={14} aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3}>
                    {items.length === 0 ? (
                      <EmptyState
                        title="Sin retailers"
                        description="Crea el primer retailer para que aparezca en las comparaciones de precios."
                        action={{ label: 'Agregar retailer', onClick: () => setModal({ mode: 'add' }) }}
                      />
                    ) : (
                      <EmptyState
                        title="Sin resultados"
                        description="Ningún retailer coincide con los filtros aplicados."
                      />
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3 pt-3 border-t border-p-border">
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
