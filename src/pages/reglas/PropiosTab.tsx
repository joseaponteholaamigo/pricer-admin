import { useState, useMemo } from 'react'
import { useUrlParam, useUrlNumber } from '../../lib/useUrlState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil, X, AlertTriangle } from 'lucide-react'
import api from '../../lib/api'
import type { CategoriaConfig, PortafolioData, PortafolioItem } from '../../lib/types'
import Spinner from '../../components/Spinner'
import ConfirmModal from '../../components/ConfirmModal'
import { SkuTableFilters } from './_shared'

// ─── Portafolio: SkuModal + PropiosTab ───────────────────────────────────────

const PAGE_SIZE = 10

// ── Shared modal for add / edit ───────────────────────────────────────────────

interface SkuFormValues {
  ean: string
  nombre: string
  marca: string
  categoria: string
  pvpSugerido: string
  costoVariable: string
  pesoProfitPool: string
}

type SkuFormErrors = Partial<Record<keyof SkuFormValues, string>>

export function SkuModal({
  mode,
  variant,
  initial,
  existingEans,
  categorias,
  totalPesoActual,
  onSave,
  onClose,
}: {
  mode: 'add' | 'edit'
  variant: 'propios' | 'competencia'
  initial?: Partial<SkuFormValues>
  existingEans: string[]
  categorias: string[]
  totalPesoActual?: number  // 0-100, para la advertencia de suma
  onSave: (values: SkuFormValues) => void
  onClose: () => void
}) {
  const [vals, setVals] = useState<SkuFormValues>({
    ean: initial?.ean ?? '',
    nombre: initial?.nombre ?? '',
    marca: initial?.marca ?? '',
    categoria: initial?.categoria ?? categorias[0] ?? '',
    pvpSugerido: initial?.pvpSugerido ?? '',
    costoVariable: initial?.costoVariable ?? '',
    pesoProfitPool: initial?.pesoProfitPool ?? '',
  })
  const [touched, setTouched] = useState<Partial<Record<keyof SkuFormValues, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const validate = (v: SkuFormValues): SkuFormErrors => {
    const e: SkuFormErrors = {}
    const ean = v.ean.trim()

    if (!ean) {
      e.ean = 'El EAN es requerido'
    } else if (!/^\d+$/.test(ean)) {
      e.ean = 'Solo se permiten dígitos'
    } else if (ean.length !== 8 && ean.length !== 13) {
      e.ean = 'Debe tener 8 o 13 dígitos (EAN-8 / EAN-13)'
    } else if (existingEans.includes(ean)) {
      e.ean = 'Ya existe un producto con este EAN'
    }

    const nombre = v.nombre.trim()
    if (!nombre) e.nombre = 'El nombre es requerido'
    else if (nombre.length < 3) e.nombre = 'Mínimo 3 caracteres'
    else if (nombre.length > 100) e.nombre = 'Máximo 100 caracteres'

    if (!v.marca.trim()) e.marca = 'La marca es requerida'
    if (!v.categoria) e.categoria = 'La categoría es requerida'

    if (variant === 'propios') {
      const pvp = parseFloat(v.pvpSugerido)
      const costo = parseFloat(v.costoVariable)
      const peso = parseFloat(v.pesoProfitPool)

      if (!v.pvpSugerido || isNaN(pvp) || pvp <= 0)
        e.pvpSugerido = 'Debe ser mayor a 0'

      if (!v.costoVariable || isNaN(costo) || costo <= 0)
        e.costoVariable = 'Debe ser mayor a 0'
      else if (!isNaN(pvp) && pvp > 0 && costo >= pvp)
        e.costoVariable = 'Debe ser menor al PVP Sugerido'

      if (v.pesoProfitPool === '' || isNaN(peso) || peso < 0 || peso > 100)
        e.pesoProfitPool = 'Debe estar entre 0 y 100'
    }

    return e
  }

  const errors = validate(vals)
  const isValid = Object.keys(errors).length === 0

  const set = (field: keyof SkuFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setVals(v => ({ ...v, [field]: e.target.value }))

  const blur = (field: keyof SkuFormValues) =>
    () => setTouched(t => ({ ...t, [field]: true }))

  const showErr = (field: keyof SkuFormErrors) =>
    (touched[field] || submitAttempted) && errors[field]
      ? <p className="text-xs text-p-red mt-0.5">{errors[field]}</p>
      : null

  const pesoWarning = useMemo(() => {
    if (variant !== 'propios' || totalPesoActual === undefined) return null
    const nuevoPeso = parseFloat(vals.pesoProfitPool)
    if (isNaN(nuevoPeso)) return null
    const currentWeight = mode === 'edit' ? totalPesoActual - parseFloat(initial?.pesoProfitPool ?? '0') : totalPesoActual
    const sum = currentWeight + nuevoPeso
    if (Math.abs(sum - 100) > 0.01) {
      return `La suma de pesos quedaría en ${sum.toFixed(2)}% (se espera 100%)`
    }
    return null
  }, [variant, totalPesoActual, vals.pesoProfitPool, mode, initial?.pesoProfitPool])

  const handleSubmit = () => {
    setSubmitAttempted(true)
    if (isValid) onSave(vals)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-p-dark">
            {mode === 'add' ? 'Agregar producto' : 'Editar producto'}
          </h2>
          <button onClick={onClose} className="text-p-muted hover:text-p-dark transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="form-label">EAN / Código</label>
            <input
              value={vals.ean}
              onChange={set('ean')}
              onBlur={blur('ean')}
              className="form-input w-full font-mono"
              placeholder="1234567890123"
            />
            {showErr('ean')}
          </div>

          <div>
            <label className="form-label">Nombre</label>
            <input
              value={vals.nombre}
              onChange={set('nombre')}
              onBlur={blur('nombre')}
              className="form-input w-full"
              placeholder="Nombre del producto"
            />
            {showErr('nombre')}
          </div>

          <div>
            <label className="form-label">Marca</label>
            <input
              value={vals.marca}
              onChange={set('marca')}
              onBlur={blur('marca')}
              className="form-input w-full"
              placeholder="Marca"
            />
            {showErr('marca')}
          </div>

          <div>
            <label className="form-label">Categoría</label>
            <select
              value={vals.categoria}
              onChange={set('categoria')}
              onBlur={blur('categoria')}
              className="form-select w-full"
            >
              <option value="">Selecciona una categoría</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {showErr('categoria')}
          </div>

          {variant === 'propios' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">PVP Sugerido</label>
                  <input
                    type="number"
                    min={0}
                    value={vals.pvpSugerido}
                    onChange={set('pvpSugerido')}
                    onBlur={blur('pvpSugerido')}
                    className="form-input w-full"
                    placeholder="0"
                  />
                  {showErr('pvpSugerido')}
                </div>
                <div>
                  <label className="form-label">Costo Variable</label>
                  <input
                    type="number"
                    min={0}
                    value={vals.costoVariable}
                    onChange={set('costoVariable')}
                    onBlur={blur('costoVariable')}
                    className="form-input w-full"
                    placeholder="0"
                  />
                  {showErr('costoVariable')}
                </div>
              </div>

              <div>
                <label className="form-label">Peso Profit Pool (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={vals.pesoProfitPool}
                  onChange={set('pesoProfitPool')}
                  onBlur={blur('pesoProfitPool')}
                  className="form-input w-full"
                  placeholder="0"
                />
                {showErr('pesoProfitPool')}
                {!errors.pesoProfitPool && pesoWarning && (
                  <p className="text-xs text-amber-500 mt-0.5 flex items-center gap-1">
                    <AlertTriangle size={11} /> {pesoWarning}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-5 border-t border-p-border">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} className="btn-primary">
            {mode === 'add' ? 'Agregar' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function PropiosTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const [filterSku, setFilterSku] = useUrlParam('q')
  const [filterCategoria, setFilterCategoria] = useUrlParam('cat')
  const [page, setPage] = useUrlNumber('page', 1)
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: PortafolioItem } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<PortafolioItem | null>(null)

  const { data: portafolioData, isLoading } = useQuery<PortafolioData | null>({
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

  const items: PortafolioItem[] = useMemo(() => portafolioData?.items ?? [], [portafolioData])

  const categorias = useMemo(() => {
    const fromConfig = categoriasConfig.map(c => c.nombre)
    const fromItems = items.map(i => i.categoria)
    return Array.from(new Set([...fromConfig, ...fromItems])).sort()
  }, [categoriasConfig, items])

  const totalPeso = useMemo(() =>
    items.reduce((sum, i) => sum + i.pesoProfitPool * 100, 0),
    [items],
  )

  const filteredItems = useMemo(() => {
    const q = filterSku.toLowerCase()
    return items.filter(item => {
      const matchSku = !q || item.ean.toLowerCase().includes(q) || item.nombre.toLowerCase().includes(q)
      const matchCat = !filterCategoria || item.categoria === filterCategoria
      return matchSku && matchCat
    })
  }, [items, filterSku, filterCategoria])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const mutation = useMutation({
    mutationFn: (newItems: PortafolioItem[]) =>
      api.put(`reglas/portafolio?tenantId=${tenantId}`, { items: newItems }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-portafolio', tenantId] })
    },
  })

  const handleSave = (vals: SkuFormValues) => {
    if (!modal) return
    let newItems: PortafolioItem[]
    if (modal.mode === 'add') {
      const next: PortafolioItem = {
        skuId: `sku-new-${Date.now()}`,
        ean: vals.ean.trim(),
        nombre: vals.nombre.trim(),
        marca: vals.marca.trim(),
        categoria: vals.categoria,
        pvpSugerido: parseFloat(vals.pvpSugerido),
        costoVariable: parseFloat(vals.costoVariable),
        pesoProfitPool: parseFloat(vals.pesoProfitPool) / 100,
      }
      newItems = [...items, next]
      setPage(Math.max(1, Math.ceil(newItems.length / PAGE_SIZE)))
    } else if (modal.item) {
      newItems = items.map(i => i.skuId === modal.item!.skuId
        ? {
            ...i,
            ean: vals.ean.trim(),
            nombre: vals.nombre.trim(),
            marca: vals.marca.trim(),
            categoria: vals.categoria,
            pvpSugerido: parseFloat(vals.pvpSugerido),
            costoVariable: parseFloat(vals.costoVariable),
            pesoProfitPool: parseFloat(vals.pesoProfitPool) / 100,
          }
        : i,
      )
    } else return
    mutation.mutate(newItems)
    setModal(null)
  }

  const handleDelete = (skuId: string) =>
    mutation.mutate(items.filter(i => i.skuId !== skuId))

  const existingEansForModal = useMemo(() => {
    const exclude = modal?.mode === 'edit' ? modal.item?.ean : undefined
    return items.map(i => i.ean).filter(e => e !== exclude)
  }, [items, modal])

  if (isLoading) return <Spinner />

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Portafolio de productos propios. Puedes agregar productos manualmente o cargarlos desde la pestaña Importaciones.
      </p>

      <div className="card mt-5">
        <div className="mb-4 flex items-center gap-2">
          <SkuTableFilters
            categorias={Array.from(new Set(items.map(i => i.categoria))).sort()}
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

        {Math.abs(totalPeso - 100) > 0.01 && items.length > 0 && (
          <p className="text-xs text-amber-500 flex items-center gap-1 mb-3">
            <AlertTriangle size={12} />
            La suma de Pesos Profit Pool es {totalPeso.toFixed(2)}% (se espera 100%)
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="text-left">SKU</th>
                <th className="text-left">Nombre</th>
                <th className="text-left">Marca</th>
                <th className="text-left">Categoría</th>
                <th className="text-right">PVP Sugerido</th>
                <th className="text-right">Costo Variable</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {pageItems.map(item => (
                <tr key={item.skuId}>
                  <td className="text-xs text-p-muted font-mono">{item.ean}</td>
                  <td className="text-sm font-medium text-p-dark">{item.nombre}</td>
                  <td className="text-xs text-p-gray">{item.marca}</td>
                  <td className="text-xs text-p-gray">{item.categoria}</td>
                  <td className="text-right text-sm text-p-dark">${item.pvpSugerido.toLocaleString('es-CO')}</td>
                  <td className="text-right text-sm text-p-gray">${item.costoVariable.toLocaleString('es-CO')}</td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModal({ mode: 'edit', item })}
                        className="text-p-muted hover:text-p-dark transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(item)}
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
                  <td colSpan={7} className="text-center text-sm text-p-muted py-8">
                    {items.length === 0
                      ? 'Sin productos — usa el botón Agregar o carga desde Importaciones.'
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
          message={`Se eliminará "${confirmDelete.nombre}" (${confirmDelete.ean}) del portafolio. Esta acción no se puede deshacer.`}
          onConfirm={() => handleDelete(confirmDelete.skuId)}
          onClose={() => setConfirmDelete(null)}
        />
      )}

      {modal && (
        <SkuModal
          mode={modal.mode}
          variant="propios"
          initial={modal.item
            ? {
                ean: modal.item.ean,
                nombre: modal.item.nombre,
                marca: modal.item.marca,
                categoria: modal.item.categoria,
                pvpSugerido: String(modal.item.pvpSugerido),
                costoVariable: String(modal.item.costoVariable),
                pesoProfitPool: String(modal.item.pesoProfitPool * 100),
              }
            : undefined}
          existingEans={existingEansForModal}
          categorias={categorias}
          totalPesoActual={totalPeso}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

export default PropiosTab
export type { SkuFormValues }
