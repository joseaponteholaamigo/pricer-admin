import { useState, useMemo, useRef, useEffect, useId, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUrlParam, useUrlNumber } from '../../lib/useUrlState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil, X, AlertTriangle, CheckCircle } from 'lucide-react'
import api from '../../lib/api'
import type { CategoriaConfig, PortafolioData, PortafolioItem } from '../../lib/types'
import ConfirmModal from '../../components/ConfirmModal'
import { SkeletonTable } from '../../components/Skeleton'
import QueryErrorState from '../../components/QueryErrorState'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../components/useToast'
import { SkuTableFilters } from './_shared'
import { makeSkuSchema, makeCategoriaSchema } from '../../schemas/reglas'
import { useFocusTrap } from '../../lib/useFocusTrap'

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

interface CategoriaFormValues {
  nombre: string
  iva: string
}

// ── Sub-modal inline para crear categoría rápida ──────────────────────────────

function NuevaCategoriaSubModal({
  existingNombres,
  onSave,
  onClose,
}: {
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
    defaultValues: { nombre: '', iva: '19' },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const showErr = (field: keyof CategoriaFormValues) => {
    const touched = touchedFields[field] || isSubmitted
    const msg = errors[field]?.message
    if (!touched || !msg) return null
    return (
      <p id={`subcat-${field}-error`} className="text-xs text-p-red mt-1" role="alert">
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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-4 sm:p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 id={titleId} className="text-sm font-semibold text-p-dark">
            Nueva categoría
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar sub-modal de categoría"
            className="text-p-gray hover:text-p-dark transition-colors"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} noValidate>
          <div className="space-y-3">
            <div>
              <label htmlFor="subcat-nombre" className="form-label">Nombre</label>
              <input
                id="subcat-nombre"
                {...register('nombre')}
                aria-invalid={!!(touchedFields.nombre || isSubmitted) && !!errors.nombre}
                aria-describedby={errors.nombre ? 'subcat-nombre-error' : undefined}
                className="form-input w-full"
                placeholder="Ej: Bebidas Energéticas"
              />
              {showErr('nombre')}
            </div>

            <div>
              <label htmlFor="subcat-iva" className="form-label">IVA (%)</label>
              <input
                id="subcat-iva"
                type="number"
                min={0}
                max={100}
                step={0.5}
                {...register('iva')}
                aria-invalid={!!(touchedFields.iva || isSubmitted) && !!errors.iva}
                aria-describedby={errors.iva ? 'subcat-iva-error' : undefined}
                className="form-input w-full"
                placeholder="19"
              />
              {showErr('iva')}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-5">
            <button type="button" onClick={onClose} className="btn-secondary w-full sm:w-auto">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full sm:w-auto">
              Crear categoría
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── SkuModal ──────────────────────────────────────────────────────────────────

export function SkuModal({
  mode,
  variant,
  initial,
  existingEans,
  categorias,
  totalPesoActual,
  tenantId,
  onSave,
  onClose,
}: {
  mode: 'add' | 'edit'
  variant: 'propios' | 'competencia'
  initial?: Partial<SkuFormValues>
  existingEans: string[]
  categorias: string[]
  totalPesoActual?: number  // 0-100, para la advertencia de suma
  tenantId: string
  onSave: (values: SkuFormValues) => void
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [showNuevaCatModal, setShowNuevaCatModal] = useState(false)

  const schema = useMemo(
    () => makeSkuSchema({ variant, existingEans }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [variant, existingEans.join(',')],
  )

  const defaultValues: SkuFormValues = {
    ean: initial?.ean ?? '',
    nombre: initial?.nombre ?? '',
    marca: initial?.marca ?? '',
    categoria: initial?.categoria ?? categorias[0] ?? '',
    pvpSugerido: initial?.pvpSugerido ?? '',
    costoVariable: initial?.costoVariable ?? '',
    pesoProfitPool: initial?.pesoProfitPool ?? '',
  }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, touchedFields, isSubmitted },
  } = useForm<SkuFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  // Muestra el error solo si el campo fue tocado o se intentó enviar
  const showErr = (field: keyof SkuFormValues) => {
    const touched = touchedFields[field] || isSubmitted
    const msg = errors[field]?.message
    if (!touched || !msg) return null
    return (
      <p id={`${field}-error`} className="text-xs text-p-red mt-0.5" role="alert">
        {msg}
      </p>
    )
  }

  const pesoProfitPoolValue = watch('pesoProfitPool')

  const { pesoWarning, isWeightBlocking } = useMemo(() => {
    if (variant !== 'propios' || totalPesoActual === undefined) return { pesoWarning: null, isWeightBlocking: false }
    const nuevoPeso = parseFloat(pesoProfitPoolValue)
    if (isNaN(nuevoPeso)) return { pesoWarning: null, isWeightBlocking: false }
    const currentWeight = mode === 'edit' ? totalPesoActual - parseFloat(initial?.pesoProfitPool ?? '0') : totalPesoActual
    const sum = currentWeight + nuevoPeso
    if (Math.abs(sum - 100) <= 0.01) return { pesoWarning: null, isWeightBlocking: false }
    const diff = Math.abs(sum - 100)
    const blocking = diff > 5
    return {
      pesoWarning: `La suma de pesos quedaría en ${sum.toFixed(2)}% (se espera 100%)`,
      isWeightBlocking: blocking,
    }
  }, [variant, totalPesoActual, pesoProfitPoolValue, mode, initial?.pesoProfitPool])

  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useFocusTrap(dialogRef, !showNuevaCatModal)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showNuevaCatModal) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, showNuevaCatModal])

  // ── Mutación para crear categoría inline ─────────────────────────────────────

  const { data: categoriasConfig = [] } = useQuery<CategoriaConfig[]>({
    queryKey: ['reglas-categorias', tenantId],
    queryFn: () =>
      api.get<CategoriaConfig[]>(`reglas/categorias?tenantId=${tenantId}`)
        .then(r => r.data),
    staleTime: 30_000,
  })

  const catMutation = useMutation({
    mutationFn: (newCats: CategoriaConfig[]) =>
      api.put(`reglas/categorias?tenantId=${tenantId}`, { categorias: newCats }),
    onSuccess: (_data, newCats) => {
      queryClient.invalidateQueries({ queryKey: ['reglas-categorias', tenantId] })
      const ultima = newCats[newCats.length - 1]
      if (ultima) setValue('categoria', ultima.nombre)
      toast.success(`Categoría "${newCats[newCats.length - 1]?.nombre}" creada`)
    },
    onError: (err: unknown) => {
      toast.error('No se pudo crear la categoría: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    },
  })

  const handleCrearCategoria = useCallback((vals: CategoriaFormValues) => {
    const iva = parseFloat(vals.iva) / 100
    const newCats: CategoriaConfig[] = [
      ...categoriasConfig,
      { nombre: vals.nombre.trim(), iva },
    ]
    catMutation.mutate(newCats)
    setShowNuevaCatModal(false)
  }, [categoriasConfig, catMutation])

  const existingNombresParaSubModal = useMemo(
    () => categoriasConfig.map(c => c.nombre),
    [categoriasConfig],
  )

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        onMouseDown={e => { if (e.target === e.currentTarget && !showNuevaCatModal) onClose() }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 id={titleId} className="text-base font-semibold text-p-dark">
              {mode === 'add' ? 'Agregar producto' : 'Editar producto'}
            </h2>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="text-p-muted hover:text-p-dark transition-colors">
              <X size={18} aria-hidden />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSave)} noValidate>
            <div className="space-y-4">
              <div>
                <label htmlFor="sku-ean" className="form-label">EAN / Código</label>
                <input
                  id="sku-ean"
                  {...register('ean')}
                  aria-invalid={!!(touchedFields.ean || isSubmitted) && !!errors.ean}
                  aria-describedby={errors.ean ? 'ean-error' : undefined}
                  className="form-input w-full font-mono"
                  placeholder="1234567890123"
                />
                {showErr('ean')}
              </div>

              <div>
                <label htmlFor="sku-nombre" className="form-label">Nombre</label>
                <input
                  id="sku-nombre"
                  {...register('nombre')}
                  aria-invalid={!!(touchedFields.nombre || isSubmitted) && !!errors.nombre}
                  aria-describedby={errors.nombre ? 'nombre-error' : undefined}
                  className="form-input w-full"
                  placeholder="Nombre del producto"
                />
                {showErr('nombre')}
              </div>

              <div>
                <label htmlFor="sku-marca" className="form-label">Marca</label>
                <input
                  id="sku-marca"
                  {...register('marca')}
                  aria-invalid={!!(touchedFields.marca || isSubmitted) && !!errors.marca}
                  aria-describedby={errors.marca ? 'marca-error' : undefined}
                  className="form-input w-full"
                  placeholder="Marca"
                />
                {showErr('marca')}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="sku-categoria" className="form-label mb-0">Categoría</label>
                  <button
                    type="button"
                    onClick={() => setShowNuevaCatModal(true)}
                    className="text-xs text-p-lime hover:text-p-lime/80 font-medium transition-colors"
                    aria-label="Crear nueva categoría para asignar al producto"
                  >
                    + Crear categoría
                  </button>
                </div>
                {categorias.length === 0 && mode === 'add' && (
                  <p className="text-xs text-p-gray bg-p-bg border border-p-border rounded-lg px-3 py-2 mb-2" role="note">
                    Aún no tienes categorías. Usa el botón "+ Crear categoría" para empezar.
                  </p>
                )}
                <select
                  id="sku-categoria"
                  {...register('categoria')}
                  aria-invalid={!!(touchedFields.categoria || isSubmitted) && !!errors.categoria}
                  aria-describedby={errors.categoria ? 'categoria-error' : undefined}
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
                      <label htmlFor="sku-pvp" className="form-label">PVP Sugerido</label>
                      <input
                        id="sku-pvp"
                        type="number"
                        min={0}
                        {...register('pvpSugerido')}
                        aria-invalid={!!(touchedFields.pvpSugerido || isSubmitted) && !!errors.pvpSugerido}
                        aria-describedby={errors.pvpSugerido ? 'pvpSugerido-error' : undefined}
                        className="form-input w-full"
                        placeholder="0"
                      />
                      {showErr('pvpSugerido')}
                    </div>
                    <div>
                      <label htmlFor="sku-costo" className="form-label">Costo Variable</label>
                      <input
                        id="sku-costo"
                        type="number"
                        min={0}
                        {...register('costoVariable')}
                        aria-invalid={!!(touchedFields.costoVariable || isSubmitted) && !!errors.costoVariable}
                        aria-describedby={errors.costoVariable ? 'costoVariable-error' : undefined}
                        className="form-input w-full"
                        placeholder="0"
                      />
                      {showErr('costoVariable')}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="sku-peso" className="form-label">Peso Profit Pool (%)</label>
                    <input
                      id="sku-peso"
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      {...register('pesoProfitPool')}
                      aria-invalid={!!(touchedFields.pesoProfitPool || isSubmitted) && !!errors.pesoProfitPool}
                      aria-describedby={errors.pesoProfitPool ? 'pesoProfitPool-error' : undefined}
                      className="form-input w-full"
                      placeholder="0"
                    />
                    {showErr('pesoProfitPool')}
                    {!errors.pesoProfitPool && pesoWarning && (
                      <p className="text-xs text-amber-500 mt-0.5 flex items-center gap-1" role="alert">
                        <AlertTriangle size={11} aria-hidden /> {pesoWarning}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-6 pt-5 border-t border-p-border">
              <button type="button" onClick={onClose} className="btn-secondary w-full sm:w-auto">Cancelar</button>
              <button
                type="submit"
                disabled={isSubmitting || isWeightBlocking}
                title={isWeightBlocking ? 'El peso profit pool total está fuera del rango aceptable (95–105%)' : undefined}
                className="btn-primary w-full sm:w-auto disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {mode === 'add' ? 'Agregar' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showNuevaCatModal && (
        <NuevaCategoriaSubModal
          existingNombres={existingNombresParaSubModal}
          onSave={handleCrearCategoria}
          onClose={() => setShowNuevaCatModal(false)}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function PropiosTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [filterSku, setFilterSku] = useUrlParam('q')
  const [filterCategoria, setFilterCategoria] = useUrlParam('cat')
  const [page, setPage] = useUrlNumber('page', 1)
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: PortafolioItem } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<PortafolioItem | null>(null)

  const { data: portafolioData, isLoading, isError, refetch } = useQuery<PortafolioData | null>({
    queryKey: ['reglas-portafolio', tenantId],
    queryFn: () =>
      api.get<PortafolioData>(`reglas/portafolio?tenantId=${tenantId}`)
        .then(r => r.data),
  })

  const { data: categoriasConfig = [] } = useQuery<CategoriaConfig[]>({
    queryKey: ['reglas-categorias', tenantId],
    queryFn: () =>
      api.get<CategoriaConfig[]>(`reglas/categorias?tenantId=${tenantId}`)
        .then(r => r.data),
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

  // Semáforo para el badge de Profit Pool
  const profitPoolStatus = useMemo(() => {
    if (items.length === 0) return null
    const diff = Math.abs(totalPeso - 100)
    if (diff <= 0.01) return 'green' as const
    if (diff <= 5) return 'yellow' as const
    return 'red' as const
  }, [totalPeso, items.length])

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
      toast.success('Cambios guardados')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      toast.error(`No se pudo guardar: ${msg}`)
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

  if (isError) return <QueryErrorState onRetry={refetch} />

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Portafolio de productos propios. Puedes agregar productos manualmente o cargarlos desde la pestaña Importaciones.
      </p>

      <div className="card mt-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SkuTableFilters
            categorias={Array.from(new Set(items.map(i => i.categoria))).sort()}
            filterCategoria={filterCategoria}
            filterSku={filterSku}
            onChange={(cat, sku) => { setFilterCategoria(cat); setFilterSku(sku); setPage(1) }}
          />

          {/* Badge persistente de Profit Pool */}
          {profitPoolStatus !== null && (
            <span
              className={`badge flex items-center gap-1 ${
                profitPoolStatus === 'green'
                  ? 'badge-green'
                  : profitPoolStatus === 'yellow'
                    ? 'badge-yellow'
                    : 'badge-red'
              }`}
              aria-label={`Peso Profit Pool total: ${totalPeso.toFixed(2)}%`}
            >
              {profitPoolStatus === 'green'
                ? <CheckCircle size={11} aria-hidden />
                : <AlertTriangle size={11} aria-hidden />}
              Profit Pool: {totalPeso.toFixed(2)}%
            </span>
          )}

          <button
            onClick={() => setModal({ mode: 'add' })}
            className="btn-secondary text-xs flex items-center gap-1 py-1.5 sm:ml-auto w-full sm:w-auto justify-center"
          >
            <Plus size={13} /> Agregar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table w-full min-w-[640px]">
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
              {isLoading ? (
                <SkeletonTable rows={5} columns={7} />
              ) : pageItems.length > 0 ? (
                pageItems.map(item => (
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
                          aria-label={`Editar ${item.nombre}`}
                          className="btn-icon text-p-muted hover:text-p-dark"
                        >
                          <Pencil size={13} aria-hidden />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(item)}
                          aria-label={`Eliminar ${item.nombre}`}
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
                  <td colSpan={7}>
                    {items.length === 0 ? (
                      <EmptyState
                        title="Sin productos"
                        description="Usa el botón Agregar o carga desde la pestaña Importaciones."
                        action={{ label: 'Agregar producto', onClick: () => setModal({ mode: 'add' }) }}
                      />
                    ) : (
                      <EmptyState
                        title="Sin resultados"
                        description="Ningún producto coincide con los filtros aplicados."
                      />
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Aviso de Profit Pool debajo de la tabla cuando hay desviación */}
        {profitPoolStatus !== null && profitPoolStatus !== 'green' && (
          <p
            className={`text-xs flex items-center gap-1 mt-3 pt-3 border-t border-p-border ${
              profitPoolStatus === 'yellow' ? 'text-amber-600' : 'text-p-red'
            }`}
            role="status"
            aria-live="polite"
          >
            <AlertTriangle size={12} aria-hidden />
            Peso Profit Pool total: {totalPeso.toFixed(2)}% — debería sumar 100%
          </p>
        )}

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
          tenantId={tenantId}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

export default PropiosTab
export type { SkuFormValues }
