import { useState, useMemo } from 'react'
import { useUrlParam, useUrlNumber } from '../../lib/useUrlState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil } from 'lucide-react'
import api from '../../lib/api'
import type { CategoriaConfig, PortafolioData, SkuCompetencia } from '../../lib/types'
import Spinner from '../../components/Spinner'
import ConfirmModal from '../../components/ConfirmModal'
import { SkuTableFilters } from './_shared'
import { SkuModal } from './PropiosTab'
import type { SkuFormValues } from './PropiosTab'

const PAGE_SIZE = 10

function CompetenciaSkusTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const [filterSku, setFilterSku] = useUrlParam('q')
  const [filterCategoria, setFilterCategoria] = useUrlParam('cat')
  const [page, setPage] = useUrlNumber('page', 1)
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: SkuCompetencia } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<SkuCompetencia | null>(null)

  const { data: rawItems = [], isLoading } = useQuery<SkuCompetencia[]>({
    queryKey: ['reglas-skus-competencia', tenantId],
    queryFn: () =>
      api.get<SkuCompetencia[]>(`reglas/skus-competencia?tenantId=${tenantId}`)
        .then(r => r.data)
        .catch(() => []),
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
        .then(r => r.data)
        .catch(() => []),
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
    },
  })

  const handleSave = (vals: SkuFormValues) => {
    if (!modal) return
    let newItems: SkuCompetencia[]
    if (modal.mode === 'add') {
      const next: SkuCompetencia = {
        id: `sc-new-${Date.now()}`,
        ean: vals.ean.trim(),
        nombre: vals.nombre.trim(),
        marca: vals.marca.trim(),
        categoria: vals.categoria,
        pvpReferencia: 0,
      }
      newItems = [...current, next]
      setPage(Math.max(1, Math.ceil(newItems.length / PAGE_SIZE)))
    } else if (modal.item) {
      newItems = current.map(s => s.id === modal.item!.id
        ? { ...s, ean: vals.ean.trim(), nombre: vals.nombre.trim(), marca: vals.marca.trim(), categoria: vals.categoria }
        : s,
      )
    } else return
    mutation.mutate(newItems)
    setModal(null)
  }

  const handleDelete = (id: string) =>
    mutation.mutate(current.filter(s => s.id !== id))

  const existingEansForModal = useMemo(() => {
    const exclude = modal?.mode === 'edit' ? modal.item?.ean : undefined
    return current.map(s => s.ean).filter(e => e !== exclude)
  }, [current, modal])

  if (isLoading) return <Spinner />

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Productos individuales de la competencia. Se usan como referencia en el análisis de posicionamiento.
      </p>

      <div className="card mt-5">
        <div className="mb-4 flex items-center gap-2">
          <SkuTableFilters
            categorias={Array.from(new Set(current.map(s => s.categoria))).sort()}
            filterCategoria={filterCategoria}
            filterSku={filterSku}
            onChange={(cat, sku) => { setFilterCategoria(cat); setFilterSku(sku); setPage(1) }}
          />
          <button
            onClick={() => setModal({ mode: 'add' })}
            className="btn-secondary text-xs flex items-center gap-1 py-1.5 ml-auto"
          >
            <Plus size={13} /> Agregar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="text-left">SKU</th>
                <th className="text-left">Nombre</th>
                <th className="text-left">Marca</th>
                <th className="text-left">Categoría</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {pageItems.map(s => (
                <tr key={s.id}>
                  <td className="text-xs text-p-muted font-mono">{s.ean}</td>
                  <td className="text-sm font-medium text-p-dark">{s.nombre}</td>
                  <td className="text-xs text-p-gray">{s.marca}</td>
                  <td className="text-xs text-p-gray">{s.categoria}</td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModal({ mode: 'edit', item: s })}
                        className="text-p-muted hover:text-p-dark transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(s)}
                        className="text-p-muted hover:text-p-red transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-sm text-p-muted py-8">
                    {current.length === 0
                      ? 'Sin SKUs de competencia — usa el botón Agregar para cargar productos.'
                      : 'Sin resultados para los filtros aplicados.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-p-border">
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
          mode={modal.mode}
          variant="competencia"
          initial={modal.item
            ? { ean: modal.item.ean, nombre: modal.item.nombre, marca: modal.item.marca, categoria: modal.item.categoria }
            : undefined}
          existingEans={existingEansForModal}
          categorias={categorias}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

export default CompetenciaSkusTab
