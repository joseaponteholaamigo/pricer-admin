import { useMemo, useEffect, useState, useRef, useId } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUrlParam, useUrlNumber } from '../../lib/useUrlState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil, Search, X, FileDown } from 'lucide-react'
import api from '../../lib/api'
import { downloadTemplate } from '../../lib/downloadTemplate'
import type { CanalesMargenes, CanalSimple, PortafolioData } from '../../lib/types'
import { SkeletonTable } from '../../components/Skeleton'
import QueryErrorState from '../../components/QueryErrorState'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../components/useToast'
import ConfirmModal from '../../components/ConfirmModal'
import SoloPrisierBadge from '../../components/SoloPrisierBadge'
import SearchableSelect from '../../components/SearchableSelect'
import { makeCanalMargenSchema } from '../../schemas/reglas'
import { useFocusTrap } from '../../lib/useFocusTrap'
import { useAuth } from '../../lib/auth'

// ─── CanalMargenModal ────────────────────────────────────────────────────────

interface CanalMargenFormValues {
  nombre: string
  margen: string
}

function CanalMargenModal({
  mode,
  canalNombre,
  categoriaNombre,
  existingNombres,
  initial,
  onSave,
  onClose,
}: {
  mode: 'add' | 'edit'
  canalNombre?: string
  categoriaNombre: string
  existingNombres: string[]
  initial?: CanalMargenFormValues
  onSave: (values: CanalMargenFormValues) => void
  onClose: () => void
}) {
  const schema = useMemo(
    () => makeCanalMargenSchema({ existingNombres, isAdd: mode === 'add' }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [existingNombres.join(','), mode],
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, touchedFields, isSubmitted },
  } = useForm<CanalMargenFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: initial?.nombre ?? '',
      margen: initial?.margen ?? '70',
    },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const showErr = (field: keyof CanalMargenFormValues) => {
    const touched = touchedFields[field] || isSubmitted
    const msg = errors[field]?.message
    if (!touched || !msg) return null
    return (
      <p id={`canal-${field}-error`} className="text-xs text-p-red mt-1" role="alert">
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
            {mode === 'add' ? 'Nuevo canal' : 'Editar margen'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-p-gray hover:text-p-dark transition-colors">
            <X size={18} aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} noValidate>
          <div className="space-y-4">
            {mode === 'add' ? (
              <div>
                <label htmlFor="canal-nombre" className="form-label">Nombre</label>
                <input
                  id="canal-nombre"
                  {...register('nombre')}
                  aria-invalid={!!(touchedFields.nombre || isSubmitted) && !!errors.nombre}
                  aria-describedby={errors.nombre ? 'canal-nombre-error' : undefined}
                  className="form-input w-full"
                  placeholder="Ej: Supermercados"
                />
                {showErr('nombre')}
              </div>
            ) : (
              <div>
                <label className="form-label">Canal</label>
                <p className="text-sm font-medium text-p-dark">{canalNombre}</p>
              </div>
            )}

            <div>
              <label htmlFor="canal-margen" className="form-label">
                Margen — {categoriaNombre} (%)
              </label>
              <input
                id="canal-margen"
                type="number"
                min={1}
                max={100}
                step={1}
                {...register('margen')}
                aria-invalid={!!(touchedFields.margen || isSubmitted) && !!errors.margen}
                aria-describedby={errors.margen ? 'canal-margen-error' : undefined}
                className="form-input w-full"
                placeholder="70"
              />
              {showErr('margen')}
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

// ─── CanalesTab (R-007 — canales × categorías) ───────────────────────────────

const PAGE_SIZE = 10

function CanalesTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { user } = useAuth()
  const isAdmin = user?.rol === 'admin'
  const [modal, setModal] = useState<{ mode: 'add' } | { mode: 'edit'; idx: number } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ nombre: string; idx: number } | null>(null)
  const [page, setPage] = useUrlNumber('page', 1)
  const [filterText, setFilterText] = useUrlParam('q')
  const [selectedCategoria, setSelectedCategoria] = useUrlParam('cat')

  const { data, isLoading, isError, refetch } = useQuery<CanalesMargenes>({
    queryKey: ['reglas-canales', tenantId],
    queryFn: () => api.get<CanalesMargenes>(`reglas/canales-margenes?tenantId=${tenantId}`).then(r => r.data),
  })

  const { data: portafolioData } = useQuery<PortafolioData>({
    queryKey: ['reglas-portafolio', tenantId],
    queryFn: () => api.get<PortafolioData>(`reglas/portafolio?tenantId=${tenantId}`).then(r => r.data),
  })

  const categorias = useMemo(() =>
    Array.from(new Set((portafolioData?.items ?? []).map(i => i.categoria))).sort(),
    [portafolioData]
  )

  useEffect(() => {
    if (categorias.length > 0 && !selectedCategoria) setSelectedCategoria(categorias[0])
  }, [categorias, selectedCategoria])

  const serverData: CanalesMargenes = data ?? { iva: 0.19, canales: [] }

  const filteredItems = useMemo(() => {
    const q = filterText.trim().toLowerCase()
    if (!q) return serverData.canales
    return serverData.canales.filter(c => c.nombre.toLowerCase().includes(q))
  }, [serverData, filterText])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const mutation = useMutation({
    mutationFn: (newData: CanalesMargenes) =>
      api.put(`reglas/canales-margenes?tenantId=${tenantId}`, newData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-canales', tenantId] })
      toast.success('Cambios guardados')
    },
    onError: (err: unknown) => {
      toast.error('No se pudo guardar: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    },
  })

  const handleSave = (vals: CanalMargenFormValues) => {
    const margenDecimal = Number(vals.margen) / 100
    let newCanales: CanalSimple[]
    if (modal?.mode === 'add') {
      const defaultMargenes = Object.fromEntries(categorias.map(cat => [cat, 0.70]))
      newCanales = [
        ...serverData.canales,
        { nombre: vals.nombre.trim(), margenes: { ...defaultMargenes, [selectedCategoria]: margenDecimal } },
      ]
      setFilterText('')
      setPage(Math.ceil(newCanales.length / PAGE_SIZE))
    } else {
      const idx = (modal as { mode: 'edit'; idx: number }).idx
      newCanales = serverData.canales.map((c, i) =>
        i === idx ? { ...c, margenes: { ...c.margenes, [selectedCategoria]: margenDecimal } } : c
      )
    }
    mutation.mutate({ ...serverData, canales: newCanales })
    setModal(null)
  }

  const handleDelete = (idx: number) => {
    mutation.mutate({ ...serverData, canales: serverData.canales.filter((_, i) => i !== idx) })
    setConfirmDelete(null)
  }

  const modalInitial = useMemo((): CanalMargenFormValues | undefined => {
    if (!modal || modal.mode === 'add') return undefined
    const canal = serverData.canales[modal.idx]
    if (!canal) return undefined
    return {
      nombre: canal.nombre,
      margen: String(Math.round((canal.margenes?.[selectedCategoria] ?? 0.70) * 100)),
    }
  }, [modal, serverData, selectedCategoria])

  if (isError) return <QueryErrorState onRetry={refetch} />

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <p className="text-sm text-p-gray flex-1">
          Márgenes por canal y categoría. El precio al canal = PVP sin IVA × margen. Las categorías se derivan del portafolio cargado.
        </p>
        <SoloPrisierBadge />
      </div>

      {categorias.length === 0 ? (
        <div className="card text-center py-6 text-p-gray text-sm">
          Carga primero el portafolio para que aparezcan las categorías.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-1">
            <label className="form-label mb-0">Categoría:</label>
            <SearchableSelect
              options={categorias}
              value={selectedCategoria}
              onChange={v => { setSelectedCategoria(v); setPage(1) }}
              placeholder="Seleccionar categoría…"
            />
          </div>

          <div className="card mt-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-p-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar canal…"
                  value={filterText}
                  onChange={e => { setFilterText(e.target.value); setPage(1) }}
                  className="form-input pl-8 pr-3 py-1.5 w-full sm:w-56"
                />
              </div>
              <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
                <button
                  onClick={() => downloadTemplate(
                    'canales.xlsx',
                    'Canales',
                    ['Canal', 'Categoría', 'Margen (decimal)'],
                    { 'Canal': 'Mayorista', 'Categoría': 'Gaseosas', 'Margen (decimal)': 0.80 },
                  )}
                  aria-label="Descargar plantilla de canales"
                  className="btn-secondary text-xs flex items-center gap-1 py-1.5 flex-1 sm:flex-none justify-center"
                >
                  <FileDown size={13} aria-hidden /> Descargar plantilla
                </button>
                <button
                  onClick={() => setModal({ mode: 'add' })}
                  disabled={!isAdmin}
                  className="btn-secondary text-xs flex items-center gap-1 py-1.5 flex-1 sm:flex-none justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={13} /> Agregar
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table w-full min-w-[320px]">
                <thead>
                  <tr>
                    <th className="text-left">Canal</th>
                    <th className="text-center w-40">Margen — {selectedCategoria}</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <SkeletonTable rows={5} columns={3} />
                  ) : pageItems.length > 0 ? (
                    pageItems.map(canal => {
                      const globalIdx = serverData.canales.indexOf(canal)
                      return (
                        <tr key={globalIdx}>
                          <td className="text-sm font-medium text-p-dark">{canal.nombre}</td>
                          <td className="text-center text-sm text-p-dark">
                            {Math.round((canal.margenes?.[selectedCategoria] ?? 0.70) * 100)}%
                          </td>
                          <td>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setModal({ mode: 'edit', idx: globalIdx })}
                                disabled={!isAdmin}
                                aria-label={`Editar ${canal.nombre}`}
                                className="btn-icon hover:bg-p-surface text-p-gray hover:text-p-dark disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Pencil size={14} aria-hidden />
                              </button>
                              <button
                                onClick={() => setConfirmDelete({ nombre: canal.nombre, idx: globalIdx })}
                                disabled={!isAdmin}
                                aria-label={`Eliminar ${canal.nombre}`}
                                className="btn-icon hover:bg-red-50 text-p-gray hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Trash2 size={14} aria-hidden />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={3}>
                        {serverData.canales.length === 0 ? (
                          <EmptyState
                            title="Sin canales"
                            description="Crea el primer canal para configurar sus márgenes por categoría."
                            action={{ label: 'Agregar canal', onClick: () => setModal({ mode: 'add' }) }}
                          />
                        ) : (
                          <EmptyState
                            title="Sin resultados"
                            description="Ningún canal coincide con los filtros aplicados."
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
                {safePage} / {totalPages} — {filteredItems.length} canal{filteredItems.length !== 1 ? 'es' : ''}
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
        </>
      )}

      {modal && selectedCategoria && (
        <CanalMargenModal
          mode={modal.mode}
          canalNombre={modal.mode === 'edit' ? serverData.canales[modal.idx]?.nombre : undefined}
          categoriaNombre={selectedCategoria}
          existingNombres={serverData.canales.map(c => c.nombre)}
          initial={modalInitial}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Eliminar canal"
          message={`Se eliminará "${confirmDelete.nombre}" y todos sus márgenes configurados. Esta acción no se puede deshacer.`}
          onConfirm={() => handleDelete(confirmDelete.idx)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

export default CanalesTab
