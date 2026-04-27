import { useMemo, useState, useRef, useEffect, useId } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUrlParam, useUrlNumber } from '../../lib/useUrlState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Search, Pencil, X, FileDown } from 'lucide-react'
import api from '../../lib/api'
import { downloadTemplate } from '../../lib/downloadTemplate'
import type { CategoriaConfig } from '../../lib/types'
import ConfirmModal from '../../components/ConfirmModal'
import { SkeletonTable } from '../../components/Skeleton'
import QueryErrorState from '../../components/QueryErrorState'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../components/useToast'
import { makeCategoriaSchema } from '../../schemas/reglas'
import { useFocusTrap } from '../../lib/useFocusTrap'

// ─── CategoriasTab ────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

interface CategoriaFormValues {
  nombre: string
  iva: string
}

function CategoriaModal({
  mode,
  initial,
  existingNombres,
  onSave,
  onClose,
}: {
  mode: 'add' | 'edit'
  initial?: CategoriaFormValues
  existingNombres: string[]
  onSave: (values: CategoriaFormValues) => void
  onClose: () => void
}) {
  const schema = useMemo(
    () => makeCategoriaSchema({ existingNombres }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [existingNombres.join(',')],
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, touchedFields, isSubmitted },
  } = useForm<CategoriaFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: initial?.nombre ?? '',
      iva: initial?.iva ?? '19',
    },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const showErr = (field: keyof CategoriaFormValues) => {
    const touched = touchedFields[field] || isSubmitted
    const msg = errors[field]?.message
    if (!touched || !msg) return null
    return (
      <p id={`cat-${field}-error`} className="text-xs text-p-red mt-1" role="alert">
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
            {mode === 'add' ? 'Nueva categoría' : 'Editar categoría'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-p-gray hover:text-p-dark transition-colors">
            <X size={18} aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} noValidate>
          <div className="space-y-4">
            <div>
              <label htmlFor="cat-nombre" className="form-label">Nombre</label>
              <input
                id="cat-nombre"
                {...register('nombre')}
                disabled={mode === 'edit'}
                aria-invalid={!!(touchedFields.nombre || isSubmitted) && !!errors.nombre}
                aria-describedby={errors.nombre ? 'cat-nombre-error' : undefined}
                className={`form-input w-full ${mode === 'edit' ? 'bg-p-surface text-p-muted cursor-not-allowed' : ''}`}
                placeholder="Ej: Bebidas Energéticas"
              />
              {showErr('nombre')}
            </div>

            <div>
              <label htmlFor="cat-iva" className="form-label">IVA (%)</label>
              <input
                id="cat-iva"
                type="number"
                min={0}
                max={100}
                step={0.5}
                {...register('iva')}
                aria-invalid={!!(touchedFields.iva || isSubmitted) && !!errors.iva}
                aria-describedby={errors.iva ? 'cat-iva-error' : undefined}
                className="form-input w-full"
                placeholder="19"
              />
              {showErr('iva')}
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

function CategoriasTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: CategoriaConfig } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<CategoriaConfig | null>(null)
  const [page, setPage] = useUrlNumber('page', 1)
  const [filterText, setFilterText] = useUrlParam('q')

  const { data: items = [], isLoading, isError, refetch } = useQuery<CategoriaConfig[]>({
    queryKey: ['reglas-categorias', tenantId],
    queryFn: () =>
      api.get<CategoriaConfig[]>(`reglas/categorias?tenantId=${tenantId}`)
        .then(r => r.data),
  })

  const filteredItems = useMemo(() => {
    const q = filterText.trim().toLowerCase()
    if (!q) return items
    return items.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      String(Math.round(c.iva * 1000) / 10).includes(q)
    )
  }, [items, filterText])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const mutation = useMutation({
    mutationFn: (newItems: CategoriaConfig[]) =>
      api.put(`reglas/categorias?tenantId=${tenantId}`, { categorias: newItems }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-categorias', tenantId] })
      toast.success('Cambios guardados')
    },
    onError: (err: unknown) => {
      toast.error('No se pudo guardar: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    },
  })

  const handleSave = (vals: CategoriaFormValues) => {
    const iva = parseFloat(vals.iva) / 100
    let newItems: CategoriaConfig[]
    if (modal?.mode === 'add') {
      newItems = [...items, { nombre: vals.nombre.trim(), iva }]
      setFilterText('')
      setPage(Math.ceil(newItems.length / PAGE_SIZE))
    } else {
      newItems = items.map(c => c.nombre === modal?.item?.nombre ? { ...c, iva } : c)
    }
    mutation.mutate(newItems)
    setModal(null)
  }

  const handleDelete = (cat: CategoriaConfig) => {
    mutation.mutate(items.filter(c => c.nombre !== cat.nombre))
    setConfirmDelete(null)
  }

  const existingNombresForModal = useMemo(() => {
    const exclude = modal?.mode === 'edit' ? modal.item?.nombre : undefined
    return items.map(c => c.nombre).filter(n => n !== exclude)
  }, [items, modal])

  if (isError) return <QueryErrorState onRetry={refetch} />

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Configura el IVA aplicable por categoría de producto.
      </p>

      <div className="card mt-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-p-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar categoría o IVA…"
              value={filterText}
              onChange={e => { setFilterText(e.target.value); setPage(1) }}
              className="form-input pl-8 pr-3 py-1.5 w-full sm:w-56"
            />
          </div>
          <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
            <button
              onClick={() => downloadTemplate(
                'categorias.xlsx',
                'Categorías',
                ['Categoría', 'IVA (%)'],
                { 'Categoría': 'Gaseosas', 'IVA (%)': 19 },
              )}
              aria-label="Descargar plantilla de categorías"
              className="btn-secondary text-xs flex items-center gap-1 py-1.5 flex-1 sm:flex-none justify-center"
            >
              <FileDown size={13} aria-hidden /> Descargar plantilla
            </button>
            <button
              onClick={() => setModal({ mode: 'add' })}
              className="btn-secondary text-xs flex items-center gap-1 py-1.5 flex-1 sm:flex-none justify-center"
            >
              <Plus size={13} /> Agregar
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table w-full min-w-[320px]">
            <thead>
              <tr>
                <th className="text-left">Categoría</th>
                <th className="text-center w-40">IVA (%)</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonTable rows={5} columns={3} />
              ) : pageItems.length > 0 ? (
                pageItems.map(cat => (
                  <tr key={cat.nombre}>
                    <td className="text-sm font-medium text-p-dark">{cat.nombre}</td>
                    <td className="text-center text-sm text-p-dark">
                      {Math.round(cat.iva * 1000) / 10}%
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setModal({ mode: 'edit', item: cat })}
                          aria-label={`Editar ${cat.nombre}`}
                          className="btn-icon hover:bg-p-surface text-p-gray hover:text-p-dark"
                        >
                          <Pencil size={14} aria-hidden />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(cat)}
                          aria-label={`Eliminar ${cat.nombre}`}
                          className="btn-icon hover:bg-red-50 text-p-gray hover:text-red-500"
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
                        title="Sin categorías"
                        description="Crea la primera categoría para configurar el IVA aplicable."
                        action={{ label: 'Agregar categoría', onClick: () => setModal({ mode: 'add' }) }}
                      />
                    ) : (
                      <EmptyState
                        title="Sin resultados"
                        description="Ninguna categoría coincide con los filtros."
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
            {safePage} / {totalPages} — {filteredItems.length} categoría{filteredItems.length !== 1 ? 's' : ''}
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
        <CategoriaModal
          mode={modal.mode}
          initial={modal.item ? { nombre: modal.item.nombre, iva: String(Math.round(modal.item.iva * 1000) / 10) } : undefined}
          existingNombres={existingNombresForModal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Eliminar categoría"
          message={`Se eliminará "${confirmDelete.nombre}" y su configuración de IVA. Esta acción no se puede deshacer.`}
          onConfirm={() => handleDelete(confirmDelete)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

export default CategoriasTab
