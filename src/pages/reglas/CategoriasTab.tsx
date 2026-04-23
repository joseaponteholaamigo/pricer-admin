import { useState, useMemo } from 'react'
import { useUrlParam, useUrlNumber } from '../../lib/useUrlState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Search, Pencil, X } from 'lucide-react'
import api from '../../lib/api'
import type { CategoriaConfig } from '../../lib/types'
import Spinner from '../../components/Spinner'
import ConfirmModal from '../../components/ConfirmModal'

// ─── CategoriasTab ────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

interface CategoriaFormValues {
  nombre: string
  iva: string
}
type CategoriaFormErrors = Partial<Record<keyof CategoriaFormValues, string>>

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
  const [vals, setVals] = useState<CategoriaFormValues>({
    nombre: initial?.nombre ?? '',
    iva: initial?.iva ?? '19',
  })
  const [touched, setTouched] = useState<Partial<Record<keyof CategoriaFormValues, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const validate = (v: CategoriaFormValues): CategoriaFormErrors => {
    const err: CategoriaFormErrors = {}
    if (!v.nombre.trim()) err.nombre = 'El nombre es requerido'
    else if (existingNombres.includes(v.nombre.trim())) err.nombre = 'Ya existe una categoría con este nombre'
    const ivaNum = parseFloat(v.iva)
    if (v.iva === '' || isNaN(ivaNum)) err.iva = 'El IVA es requerido'
    else if (ivaNum < 0 || ivaNum > 100) err.iva = 'Debe estar entre 0 y 100'
    return err
  }

  const errors = validate(vals)
  const showError = (field: keyof CategoriaFormValues) =>
    (touched[field] || submitAttempted) ? errors[field] : undefined

  const set = (field: keyof CategoriaFormValues, value: string) => {
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
            {mode === 'add' ? 'Nueva categoría' : 'Editar categoría'}
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
              disabled={mode === 'edit'}
              className={`form-input w-full ${mode === 'edit' ? 'bg-p-surface text-p-muted cursor-not-allowed' : ''} ${showError('nombre') ? 'border-red-400' : ''}`}
              placeholder="Ej: Bebidas Energéticas"
            />
            {showError('nombre') && <p className="text-xs text-red-500 mt-1">{showError('nombre')}</p>}
          </div>

          <div>
            <label className="form-label">IVA (%)</label>
            <input
              type="number" min={0} max={100} step={0.5}
              value={vals.iva}
              onChange={e => set('iva', e.target.value)}
              onBlur={() => setTouched(p => ({ ...p, iva: true }))}
              className={`form-input w-full ${showError('iva') ? 'border-red-400' : ''}`}
              placeholder="19"
            />
            {showError('iva') && <p className="text-xs text-red-500 mt-1">{showError('iva')}</p>}
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

function CategoriasTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: CategoriaConfig } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<CategoriaConfig | null>(null)
  const [page, setPage] = useUrlNumber('page', 1)
  const [filterText, setFilterText] = useUrlParam('q')

  const { data: items = [], isLoading } = useQuery<CategoriaConfig[]>({
    queryKey: ['reglas-categorias', tenantId],
    queryFn: () =>
      api.get<CategoriaConfig[]>(`reglas/categorias?tenantId=${tenantId}`)
        .then(r => r.data)
        .catch(() => []),
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

  if (isLoading) return <Spinner />

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Configura el IVA aplicable por categoría de producto.
      </p>

      <div className="card mt-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-p-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar categoría o IVA…"
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
              <th className="text-left">Categoría</th>
              <th className="text-center w-40">IVA (%)</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {pageItems.map(cat => (
              <tr key={cat.nombre}>
                <td className="text-sm font-medium text-p-dark">{cat.nombre}</td>
                <td className="text-center text-sm text-p-dark">
                  {Math.round(cat.iva * 1000) / 10}%
                </td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setModal({ mode: 'edit', item: cat })}
                      className="p-1.5 rounded hover:bg-p-surface text-p-gray hover:text-p-dark transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(cat)}
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
                  Sin categorías — usa el botón Agregar para crear una.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-p-border">
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
