import { useState, useMemo, useRef, useCallback } from 'react'
import { useUrlParam, useUrlNumber } from '../../lib/useUrlState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import api from '../../lib/api'
import type { CategoriaConfig, PortafolioData, SkuCompetencia } from '../../lib/types'
import ConfirmModal from '../../components/ConfirmModal'
import { SkeletonTable } from '../../components/Skeleton'
import QueryErrorState from '../../components/QueryErrorState'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../components/useToast'
import { SkuTableFilters } from './_shared'
import { SkuModal } from './PropiosTab'
import type { SkuFormValues } from './PropiosTab'

const PAGE_SIZE = 10

// ─── Celda editable inline ───────────────────────────────────────────────────

interface InlineCellProps {
  value: string
  onCommit: (next: string) => void
  className?: string
  placeholder?: string
}

function InlineCell({ value, onCommit, className = '', placeholder }: InlineCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setDraft(value)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) onCommit(trimmed)
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commit() }
    if (e.key === 'Escape') { setDraft(value); setEditing(false) }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`form-input py-0.5 text-sm w-full ${className}`}
        aria-label="Editar campo"
      />
    )
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={startEdit}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEdit() } }}
      title="Clic para editar"
      className={`cursor-pointer rounded px-1 -mx-1 hover:bg-p-bg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-p-lime/60 ${className}`}
    >
      {value || <span className="text-p-muted italic">{placeholder}</span>}
    </span>
  )
}

// ─── Select editable inline ──────────────────────────────────────────────────

interface InlineSelectProps {
  value: string
  options: string[]
  onCommit: (next: string) => void
}

function InlineSelect({ value, options, onCommit }: InlineSelectProps) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <select
        autoFocus
        value={value}
        onChange={e => { onCommit(e.target.value); setEditing(false) }}
        onBlur={() => setEditing(false)}
        onKeyDown={e => { if (e.key === 'Escape') setEditing(false) }}
        className="form-select py-0.5 text-xs w-full"
        aria-label="Editar categoría"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditing(true) } }}
      title="Clic para editar"
      className="cursor-pointer rounded px-1 -mx-1 hover:bg-p-bg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-p-lime/60 text-xs text-p-gray"
    >
      {value}
    </span>
  )
}

function CompetenciaSkusTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [filterSku, setFilterSku] = useUrlParam('q')
  const [filterCategoria, setFilterCategoria] = useUrlParam('cat')
  const [page, setPage] = useUrlNumber('page', 1)
  const [modal, setModal] = useState<{ mode: 'add' } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<SkuCompetencia | null>(null)

  const { data: rawItems = [], isLoading, isError, refetch } = useQuery<SkuCompetencia[]>({
    queryKey: ['reglas-skus-competencia', tenantId],
    queryFn: () =>
      api.get<SkuCompetencia[]>(`reglas/skus-competencia?tenantId=${tenantId}`)
        .then(r => r.data),
  })

  const { data: portafolioData } = useQuery<PortafolioData | null>({
    queryKey: ['reglas-portafolio', tenantId],
    queryFn: () =>
      api.get<PortafolioData>(`reglas/portafolio?tenantId=${tenantId}`)
        .then(r => r.data)
        .catch(() => null),
  })

  const { data: categoriasConfig = [] } = useQuery<CategoriaConfig[]>({
    queryKey: ['reglas-categorias', tenantId],
    queryFn: () =>
      api.get<CategoriaConfig[]>(`reglas/categorias?tenantId=${tenantId}`)
        .then(r => r.data),
  })

  const current = rawItems

  const categorias = useMemo(() => {
    const fromConfig = categoriasConfig.map(c => c.nombre)
    const fromPortafolio = (portafolioData?.items ?? []).map(i => i.categoria)
    const fromCurrent = current.map(s => s.categoria)
    return Array.from(new Set([...fromConfig, ...fromPortafolio, ...fromCurrent])).sort()
  }, [categoriasConfig, portafolioData, current])

  const filteredItems = useMemo(() => {
    const q = filterSku.toLowerCase()
    return current.filter(s => {
      const matchSku = !q || s.ean.toLowerCase().includes(q) || s.nombre.toLowerCase().includes(q)
      const matchCat = !filterCategoria || s.categoria === filterCategoria
      return matchSku && matchCat
    })
  }, [current, filterSku, filterCategoria])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const mutation = useMutation({
    mutationFn: (newItems: SkuCompetencia[]) =>
      api.put(`reglas/skus-competencia?tenantId=${tenantId}`, { items: newItems }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-skus-competencia', tenantId] })
      toast.success('Cambios guardados')
    },
    onError: (err: unknown) => {
      toast.error('No se pudo guardar: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    },
  })

  const handleSave = (vals: SkuFormValues) => {
    if (!modal) return
    const next: SkuCompetencia = {
      id: `sc-new-${Date.now()}`,
      ean: vals.ean.trim(),
      nombre: vals.nombre.trim(),
      marca: vals.marca.trim(),
      categoria: vals.categoria,
      pvpReferencia: 0,
    }
    const newItems = [...current, next]
    setPage(Math.max(1, Math.ceil(newItems.length / PAGE_SIZE)))
    mutation.mutate(newItems)
    setModal(null)
  }

  const handleInlineEdit = useCallback((id: string, field: keyof Pick<SkuCompetencia, 'nombre' | 'marca' | 'categoria'>, value: string) => {
    const newItems = current.map(s => s.id === id ? { ...s, [field]: value } : s)
    mutation.mutate(newItems)
  }, [current, mutation])

  const handleDelete = (id: string) =>
    mutation.mutate(current.filter(s => s.id !== id))

  const existingEansForModal = useMemo(() => current.map(s => s.ean), [current])

  if (isError) return <QueryErrorState onRetry={refetch} />

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Productos individuales de la competencia. Se usan como referencia en el análisis de posicionamiento.
      </p>

      <div className="card mt-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SkuTableFilters
            categorias={Array.from(new Set(current.map(s => s.categoria))).sort()}
            filterCategoria={filterCategoria}
            filterSku={filterSku}
            onChange={(cat, sku) => { setFilterCategoria(cat); setFilterSku(sku); setPage(1) }}
          />
          <button
            onClick={() => setModal({ mode: 'add' })}
            className="btn-secondary text-xs flex items-center gap-1 py-1.5 sm:ml-auto w-full sm:w-auto justify-center"
          >
            <Plus size={13} /> Agregar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table w-full min-w-[480px]">
            <thead>
              <tr>
                <th className="text-left">SKU</th>
                <th className="text-left">Nombre</th>
                <th className="text-left">Marca</th>
                <th className="text-left">Categoría</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonTable rows={5} columns={5} />
              ) : pageItems.length > 0 ? (
                pageItems.map(s => (
                  <tr key={s.id}>
                    <td className="text-xs text-p-muted font-mono">{s.ean}</td>
                    <td className="text-sm font-medium text-p-dark">
                      <InlineCell
                        value={s.nombre}
                        onCommit={v => handleInlineEdit(s.id, 'nombre', v)}
                        placeholder="Nombre del producto"
                      />
                    </td>
                    <td className="text-xs text-p-gray">
                      <InlineCell
                        value={s.marca}
                        onCommit={v => handleInlineEdit(s.id, 'marca', v)}
                        placeholder="Marca"
                        className="text-xs"
                      />
                    </td>
                    <td className="text-xs text-p-gray">
                      <InlineSelect
                        value={s.categoria}
                        options={categorias}
                        onCommit={v => handleInlineEdit(s.id, 'categoria', v)}
                      />
                    </td>
                    <td>
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => setConfirmDelete(s)}
                          aria-label={`Eliminar ${s.nombre}`}
                          className="btn-icon text-p-muted hover:text-p-red hover:bg-red-50"
                        >
                          <Trash2 size={13} aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    {current.length === 0 ? (
                      <EmptyState
                        title="Sin SKUs de competencia"
                        description="Agrega productos de la competencia como referencia en el análisis de posicionamiento."
                        action={{ label: 'Agregar SKU', onClick: () => setModal({ mode: 'add' }) }}
                      />
                    ) : (
                      <EmptyState
                        title="Sin resultados"
                        description="Ningún SKU coincide con los filtros aplicados."
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
            {safePage} / {totalPages} — {filteredItems.length} producto{filteredItems.length !== 1 ? 's' : ''}
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

      {confirmDelete && (
        <ConfirmModal
          title="¿Eliminar producto?"
          message={`Se eliminará "${confirmDelete.nombre}" (${confirmDelete.ean}) de los SKUs de competencia. Esta acción no se puede deshacer.`}
          onConfirm={() => handleDelete(confirmDelete.id)}
          onClose={() => setConfirmDelete(null)}
        />
      )}

      {modal && (
        <SkuModal
          mode="add"
          variant="competencia"
          existingEans={existingEansForModal}
          categorias={categorias}
          tenantId={tenantId}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

export default CompetenciaSkusTab
