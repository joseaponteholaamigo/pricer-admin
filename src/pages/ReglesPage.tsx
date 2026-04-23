import { useState, useRef, useCallback, useMemo, useEffect, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Lock, Plus, Trash2, Save, AlertTriangle,
  Download, Upload, ChevronDown, ChevronUp, Search, Pencil, X,
} from 'lucide-react'
import api from '../lib/api'
import type {
  TenantListItem,
  CompetidoresData,
  CompetidorItem,
  CategoriaAtributos,
  AtributoCategoria,
  SkuCalificaciones,
  ElasticidadItem,
  PortafolioData,
  PortafolioItem,
  CanalesMargenes,
  CanalSimple,
  Umbrales,
  RetailerItem,
  ImportacionRecord,
  CategoriaConfig,
  SkuCompetencia,
  SkuVinculacion,
  VinculacionesMapeo,
} from '../lib/types'

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'portafolio',     label: 'Portafolio' },
  { id: 'categorias',     label: 'Categorías' },
  { id: 'competidores',   label: 'Competidores' },
  { id: 'importaciones',  label: 'Importaciones' },
  { id: 'atributos',      label: 'Atributos' },
  { id: 'calificaciones', label: 'Calificaciones' },
  { id: 'elasticidad',    label: 'Elasticidad' },
  { id: 'canales',        label: 'Canales' },
  { id: 'umbrales',       label: 'Umbrales' },
  { id: 'retailers',      label: 'Retailers' },
]

// ─── Shared helpers ───────────────────────────────────────────────────────────

function SaveBar({ onSave, saving, dirty }: { onSave: () => void; saving: boolean; dirty: boolean }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-4 border-t border-p-border mt-6">
      {dirty && (
        <span className="text-xs text-p-yellow flex items-center gap-1">
          <AlertTriangle size={13} /> Cambios sin guardar
        </span>
      )}
      <button onClick={onSave} disabled={saving || !dirty} className="btn-primary flex items-center gap-2 disabled:opacity-40">
        <Save size={15} />
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  )
}

function SoloPrisierBadge() {
  return (
    <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}>
      <Lock size={10} className="mr-1" /> Solo Prisier
    </span>
  )
}

// ─── Filtros estándar para tablas de SKUs ────────────────────────────────────

const SELECT_CHEVRON = "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.293%207.293a1%201%200%20011.414%200L10%2010.586l3.293-3.293a1%201%200%20111.414%201.414l-4%204a1%201%200%2001-1.414%200l-4-4a1%201%200%20010-1.414z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[center_right_0.5rem]"
const INPUT_BASE = 'rounded-lg border border-p-border bg-white text-sm text-p-dark focus:outline-none focus:ring-2 focus:ring-p-lime/40 focus:border-p-lime transition-colors'

interface SkuTableFiltersProps {
  categorias: string[]
  filterCategoria: string
  filterSku: string
  onChange: (categoria: string, sku: string) => void
}

function SkuTableFilters({ categorias, filterCategoria, filterSku, onChange }: SkuTableFiltersProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={filterCategoria}
        onChange={e => onChange(e.target.value, filterSku)}
        className={`${INPUT_BASE} ${SELECT_CHEVRON} px-3 py-1.5 appearance-none pr-8 min-w-44`}
      >
        <option value="">Todas las categorías</option>
        {categorias.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-p-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar SKU o nombre…"
          value={filterSku}
          onChange={e => onChange(filterCategoria, e.target.value)}
          className={`${INPUT_BASE} pl-8 pr-4 py-1.5 min-w-52`}
        />
      </div>
      {(filterCategoria || filterSku) && (
        <button
          onClick={() => onChange('', '')}
          className="text-xs text-p-muted hover:text-p-dark transition-colors underline underline-offset-2"
        >
          Limpiar
        </button>
      )}
    </div>
  )
}

// ─── Multi-select de competidores por SKU ────────────────────────────────────

interface CompetidoresCellProps {
  skuId: string
  asignados: string[]
  competidores: CompetidorItem[]
  onChange: (skuId: string, ids: string[]) => void
}

function CompetidoresCell({ skuId, asignados, competidores, onChange }: CompetidoresCellProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const VISIBLE = 2
  const MAX_CHARS = 10

  const asignadosItems = asignados
    .map(id => competidores.find(c => c.id === id))
    .filter((c): c is CompetidorItem => !!c)

  const visible = asignadosItems.slice(0, VISIBLE)
  const extra = asignadosItems.length - VISIBLE

  const filtrados = competidores.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase())
  )
  const asignadosFiltrados = filtrados.filter(c => asignados.includes(c.id))
  const disponiblesFiltrados = filtrados.filter(c => !asignados.includes(c.id))

  const toggle = (id: string) => {
    if (asignados.includes(id)) onChange(skuId, asignados.filter(a => a !== id))
    else { onChange(skuId, [...asignados, id]); setSearch('') }
  }

  const truncate = (s: string) => s.length > MAX_CHARS ? s.slice(0, MAX_CHARS) + '…' : s

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-1 flex-wrap">
        {asignados.length === 0 && (
          <span className="text-xs text-p-muted">Sin asignar</span>
        )}
        {visible.map(c => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                       bg-p-lime-bg border border-p-lime-border text-p-dark max-w-[160px]"
          >
            <span className="truncate">{truncate(c.nombre)}</span>
            <button
              onClick={e => { e.stopPropagation(); toggle(c.id) }}
              className="hover:text-p-red leading-none shrink-0"
            >×</button>
          </span>
        ))}
        {extra > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs
                           bg-p-border text-p-gray font-medium cursor-default">
            +{extra}
          </span>
        )}
        <button
          onClick={() => setOpen(o => !o)}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-p-border
                     text-p-gray hover:border-p-lime hover:text-p-lime transition-colors text-sm font-bold"
        >
          +
        </button>
      </div>

      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 w-56 bg-white border border-p-border
                        rounded-lg shadow-lg">
          <div className="p-2 border-b border-p-border">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-p-muted pointer-events-none" />
              <input
                autoFocus
                type="text"
                placeholder="Buscar competidor…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-xs rounded-md border border-p-border
                           focus:outline-none focus:ring-2 focus:ring-p-lime/40 focus:border-p-lime"
              />
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {asignadosFiltrados.length > 0 && (
              <>
                <li className="px-3 pt-2 pb-1">
                  <span className="text-[10px] font-semibold text-p-muted uppercase tracking-wider">
                    Vinculados
                  </span>
                </li>
                {asignadosFiltrados.map(c => (
                  <li key={c.id}>
                    <button
                      onClick={() => toggle(c.id)}
                      className="w-full text-left px-3 py-1.5 text-xs text-p-dark hover:bg-red-50
                                 transition-colors flex items-center justify-between group"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full bg-p-lime flex items-center justify-center shrink-0">
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                        {c.nombre}
                      </span>
                      <span className="text-p-muted group-hover:text-p-red transition-colors">Quitar</span>
                    </button>
                  </li>
                ))}
              </>
            )}
            {disponiblesFiltrados.length > 0 && (
              <>
                <li className={`px-3 pb-1 ${asignadosFiltrados.length > 0 ? 'pt-2 border-t border-p-border mt-1' : 'pt-2'}`}>
                  <span className="text-[10px] font-semibold text-p-muted uppercase tracking-wider">
                    Disponibles
                  </span>
                </li>
                {disponiblesFiltrados.map(c => (
                  <li key={c.id}>
                    <button
                      onClick={() => toggle(c.id)}
                      className="w-full text-left px-3 py-1.5 text-xs text-p-dark hover:bg-p-lime-bg
                                 transition-colors flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full border border-p-border shrink-0" />
                        {c.nombre}
                      </span>
                      <span className="text-p-muted">{c.pais}</span>
                    </button>
                  </li>
                ))}
              </>
            )}
            {filtrados.length === 0 && (
              <li className="px-3 py-3 text-xs text-p-muted text-center">Sin resultados</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ─── CategoriasTab ────────────────────────────────────────────────────────────

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
            <label className="block text-xs font-medium text-p-gray mb-1">Nombre</label>
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
            <label className="block text-xs font-medium text-p-gray mb-1">IVA (%)</label>
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
  const [page, setPage] = useState(1)
  const [filterText, setFilterText] = useState('')

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
              className={`${INPUT_BASE} pl-8 pr-3 py-1.5 w-56`}
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
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="text-sm text-p-gray hover:text-p-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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

// ─── Portafolio: SkuModal + PropiosTab + CompetenciaSkusTab + wrapper ────────

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

function ConfirmModal({ title, message, onConfirm, onClose }: {
  title: string
  message: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-base font-semibold text-p-dark mb-2">{title}</h2>
        <p className="text-sm text-p-gray mb-6">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            onClick={() => { onConfirm(); onClose() }}
            className="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

function SkuModal({
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
            <label className="block text-xs font-medium text-p-gray mb-1">EAN / Código</label>
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
            <label className="block text-xs font-medium text-p-gray mb-1">Nombre</label>
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
            <label className="block text-xs font-medium text-p-gray mb-1">Marca</label>
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
            <label className="block text-xs font-medium text-p-gray mb-1">Categoría</label>
            <select
              value={vals.categoria}
              onChange={set('categoria')}
              onBlur={blur('categoria')}
              className={`${INPUT_BASE} ${SELECT_CHEVRON} form-input w-full appearance-none pr-7`}
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
                  <label className="block text-xs font-medium text-p-gray mb-1">PVP Sugerido</label>
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
                  <label className="block text-xs font-medium text-p-gray mb-1">Costo Variable</label>
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
                <label className="block text-xs font-medium text-p-gray mb-1">Peso Profit Pool (%)</label>
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
  const [filterSku, setFilterSku] = useState('')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [page, setPage] = useState(1)
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
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="text-sm text-p-gray hover:text-p-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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

function CompetenciaSkusTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const [filterSku, setFilterSku] = useState('')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [page, setPage] = useState(1)
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
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="text-sm text-p-gray hover:text-p-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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

function PortafolioTab({ tenantId }: { tenantId: string }) {
  const [subTab, setSubTab] = useState<'propios' | 'competencia'>('propios')

  return (
    <div>
      <div className="flex gap-1 mb-5 p-1 bg-p-surface rounded-lg w-fit">
        <button
          onClick={() => setSubTab('propios')}
          className={subTab === 'propios'
            ? 'px-3 py-1 text-sm rounded-md bg-white text-p-dark font-medium shadow-sm transition-all'
            : 'px-3 py-1 text-sm rounded-md text-p-gray hover:text-p-dark transition-all'}
        >
          Propios
        </button>
        <button
          onClick={() => setSubTab('competencia')}
          className={subTab === 'competencia'
            ? 'px-3 py-1 text-sm rounded-md bg-white text-p-dark font-medium shadow-sm transition-all'
            : 'px-3 py-1 text-sm rounded-md text-p-gray hover:text-p-dark transition-all'}
        >
          Competencia
        </button>
      </div>

      {subTab === 'propios'     && <PropiosTab tenantId={tenantId} />}
      {subTab === 'competencia' && <CompetenciaSkusTab tenantId={tenantId} />}
    </div>
  )
}

// ─── CompetidoresTab (vinculación SKU propio → SKUs competidores) ─────────────

function CompetidoresTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()

  const { data: portafolioData, isLoading: loadingPortafolio } = useQuery<PortafolioData | null>({
    queryKey: ['reglas-portafolio', tenantId],
    queryFn: () => api.get<PortafolioData>(`reglas/portafolio?tenantId=${tenantId}`).then(r => r.data).catch(() => null),
  })

  const { data: competenciaData = [], isLoading: loadingComp } = useQuery<SkuCompetencia[]>({
    queryKey: ['reglas-skus-competencia', tenantId],
    queryFn: () => api.get<SkuCompetencia[]>(`reglas/skus-competencia?tenantId=${tenantId}`).then(r => r.data).catch(() => []),
  })

  const { data: rawMapeo, isLoading: loadingVinc } = useQuery<VinculacionesMapeo>({
    queryKey: ['reglas-vinculaciones', tenantId],
    queryFn: () => api.get<VinculacionesMapeo>(`reglas/vinculaciones?tenantId=${tenantId}`).then(r => r.data).catch(() => ({})),
  })

  const propios: PortafolioItem[] = useMemo(() => portafolioData?.items ?? [], [portafolioData])
  const [mapeo, setMapeo] = useState<VinculacionesMapeo | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [searchPropios, setSearchPropios] = useState('')

  const current: VinculacionesMapeo = mapeo ?? rawMapeo ?? {}

  const selectedSku = propios.find(s => s.skuId === selectedId)
  const vinculados: SkuVinculacion[] = selectedId ? (current[selectedId] ?? []) : []

  const getLabel = (v: SkuVinculacion) => {
    if (v.tipo === 'propio') {
      const s = propios.find(p => p.skuId === v.id)
      return s ? `${s.nombre} · ${s.marca}` : v.id
    }
    const s = competenciaData.find(c => c.id === v.id)
    return s ? `${s.nombre} · ${s.marca}` : v.id
  }

  const vinculadosIds = new Set(vinculados.map(v => v.id))

  const candidatos: SkuVinculacion[] = useMemo(() => {
    const q = search.toLowerCase()
    const results: SkuVinculacion[] = []
    propios
      .filter(p => p.skuId !== selectedId && !vinculadosIds.has(p.skuId))
      .filter(p => !q || p.nombre.toLowerCase().includes(q) || p.marca.toLowerCase().includes(q) || p.ean.includes(q))
      .forEach(p => results.push({ tipo: 'propio', id: p.skuId }))
    competenciaData
      .filter(c => !vinculadosIds.has(c.id))
      .filter(c => !q || c.nombre.toLowerCase().includes(q) || c.marca.toLowerCase().includes(q) || c.ean.includes(q))
      .forEach(c => results.push({ tipo: 'competencia', id: c.id }))
    return results
  }, [propios, competenciaData, selectedId, vinculadosIds, search])

  const mutation = useMutation({
    mutationFn: (newMapeo: VinculacionesMapeo) =>
      api.put(`reglas/vinculaciones?tenantId=${tenantId}`, { mapeo: newMapeo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-vinculaciones', tenantId] })
      setMapeo(null)
    },
  })

  const addVinculacion = (v: SkuVinculacion) => {
    if (!selectedId) return
    const newMapeo = { ...current, [selectedId]: [...vinculados, v] }
    setMapeo(newMapeo)
    setSearch('')
    mutation.mutate(newMapeo)
  }

  const removeVinculacion = (id: string) => {
    if (!selectedId) return
    const newMapeo = { ...current, [selectedId]: vinculados.filter(x => x.id !== id) }
    setMapeo(newMapeo)
    mutation.mutate(newMapeo)
  }

  const categorias = useMemo(() => Array.from(new Set(propios.map(p => p.categoria))).sort(), [propios])

  const filteredPropios = propios.filter(p => {
    if (filterCat && p.categoria !== filterCat) return false
    if (searchPropios) {
      const q = searchPropios.toLowerCase()
      return p.nombre.toLowerCase().includes(q) || p.marca.toLowerCase().includes(q) || p.ean.includes(q)
    }
    return true
  })

  if (loadingPortafolio || loadingComp || loadingVinc) return <Spinner />

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Vincula cada SKU propio con los SKUs (propios o de competencia) contra los que se compara en el análisis de precios.
      </p>

      <div className="flex gap-4 items-start">
        {/* Panel izquierdo — lista de SKUs propios */}
        <div className="card w-72 flex-shrink-0 p-0 overflow-hidden">
          <div className="px-3 pt-3 pb-2 border-b border-p-border space-y-2">
            <select
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
              className={`${INPUT_BASE} ${SELECT_CHEVRON} w-full px-3 py-1.5 text-sm appearance-none pr-8`}
            >
              <option value="">Todas las categorías</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-p-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar SKU propio…"
                value={searchPropios}
                onChange={e => setSearchPropios(e.target.value)}
                className={`${INPUT_BASE} pl-8 pr-4 py-1.5 text-sm w-full`}
              />
            </div>
          </div>
          <ul className="overflow-y-auto max-h-[480px]">
            {filteredPropios.map(sku => {
              const count = (current[sku.skuId] ?? []).length
              return (
                <li
                  key={sku.skuId}
                  onClick={() => { setSelectedId(sku.skuId); setSearch('') }}
                  className={`flex items-center justify-between px-3 py-2.5 cursor-pointer border-b border-p-border/50 transition-colors ${
                    selectedId === sku.skuId
                      ? 'bg-p-lime/10 border-l-2 border-l-p-lime'
                      : 'hover:bg-p-surface'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-p-dark truncate">{sku.nombre}</p>
                    <p className="text-xs text-p-muted">{sku.marca}</p>
                  </div>
                  {count > 0 && (
                    <span className="ml-2 flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full bg-p-lime/20 text-p-lime font-medium">
                      {count}
                    </span>
                  )}
                </li>
              )
            })}
            {filteredPropios.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-p-muted">Sin SKUs</li>
            )}
          </ul>
        </div>

        {/* Panel derecho — vinculaciones del SKU seleccionado */}
        {selectedSku ? (
          <div className="flex-1 min-w-0">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-p-dark">{selectedSku.nombre}</h3>
              <p className="text-xs text-p-muted">{selectedSku.marca} · {selectedSku.categoria} · {selectedSku.ean}</p>
            </div>

            {/* Vinculados */}
            <div className="card mb-3">
              <p className="text-xs font-semibold text-p-gray uppercase tracking-wide mb-2">
                Vinculados ({vinculados.length})
              </p>
              {vinculados.length > 0 ? (
                <div className="space-y-1">
                  {vinculados.map(v => (
                    <div key={v.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg bg-p-surface">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                          v.tipo === 'propio'
                            ? 'bg-p-lime/20 text-p-lime'
                            : 'bg-blue-500/15 text-blue-400'
                        }`}>
                          {v.tipo === 'propio' ? 'Propio' : 'Compet.'}
                        </span>
                        <span className="text-sm text-p-dark truncate">{getLabel(v)}</span>
                      </div>
                      <button
                        onClick={() => removeVinculacion(v.id)}
                        className="flex-shrink-0 text-p-muted hover:text-p-red transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-p-muted text-center py-3">Sin vinculaciones — agrega SKUs abajo.</p>
              )}
            </div>

            {/* Buscador para agregar */}
            <div className="card">
              <p className="text-xs font-semibold text-p-gray uppercase tracking-wide mb-2">Agregar SKU</p>
              <div className="relative mb-2">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-p-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, marca o EAN…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className={`${INPUT_BASE} pl-8 pr-4 py-1.5 text-sm w-full`}
                />
              </div>
              <ul className="max-h-48 overflow-y-auto space-y-0.5">
                {candidatos.slice(0, 20).map(v => (
                  <li key={`${v.tipo}-${v.id}`}>
                    <button
                      onClick={() => addVinculacion(v)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-p-surface transition-colors text-left"
                    >
                      <Plus size={13} className="text-p-lime flex-shrink-0" />
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                        v.tipo === 'propio'
                          ? 'bg-p-lime/20 text-p-lime'
                          : 'bg-blue-500/15 text-blue-400'
                      }`}>
                        {v.tipo === 'propio' ? 'Propio' : 'Compet.'}
                      </span>
                      <span className="text-sm text-p-dark truncate">{getLabel(v)}</span>
                    </button>
                  </li>
                ))}
                {candidatos.length === 0 && (
                  <li className="text-center text-sm text-p-muted py-3">
                    {search ? 'Sin resultados' : 'Todos los SKUs ya están vinculados'}
                  </li>
                )}
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex-1 card flex items-center justify-center py-16 text-p-muted text-sm">
            Selecciona un SKU propio para gestionar sus vinculaciones
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Combobox con filtro de texto ────────────────────────────────────────────

interface SearchableSelectProps {
  options: string[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

function SearchableSelect({ options, value, onChange, placeholder = 'Seleccionar…' }: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()))

  const select = (v: string) => {
    onChange(v)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={ref} className="relative min-w-56">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`${INPUT_BASE} w-full flex items-center justify-between px-3 py-1.5 gap-2`}
      >
        <span className={value ? 'text-p-dark' : 'text-p-muted'}>{value || placeholder}</span>
        <ChevronDown size={14} className={`text-p-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 w-full min-w-56 bg-white border border-p-border rounded-lg shadow-lg">
          <div className="p-2 border-b border-p-border">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-p-muted pointer-events-none" />
              <input
                autoFocus
                type="text"
                placeholder="Buscar categoría…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-xs rounded-md border border-p-border
                           focus:outline-none focus:ring-2 focus:ring-p-lime/40 focus:border-p-lime"
              />
            </div>
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-xs text-p-muted text-center">Sin resultados</li>
            )}
            {filtered.map(o => (
              <li key={o}>
                <button
                  onClick={() => select(o)}
                  className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                    o === value
                      ? 'bg-p-lime text-p-bg font-medium'
                      : 'text-p-dark hover:bg-p-lime-bg'
                  }`}
                >
                  {o}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── ImportacionesTab ─────────────────────────────────────────────────────────

function ImportacionesTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: historial = [], isLoading } = useQuery<ImportacionRecord[]>({
    queryKey: ['reglas-importaciones', tenantId],
    queryFn: () => api.get<ImportacionRecord[]>(`reglas/portafolio/importaciones?tenantId=${tenantId}`).then(r => r.data),
  })

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get(`reglas/portafolio/plantilla?tenantId=${tenantId}`, { responseType: 'blob' })
      downloadBlob(res.data as Blob, 'plantilla-portafolio.xlsx')
    } catch { /* silent */ }
  }

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.xlsx') || file.size > 5 * 1024 * 1024) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.post(`reglas/portafolio/upload?tenantId=${tenantId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      queryClient.invalidateQueries({ queryKey: ['reglas-importaciones', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['reglas-portafolio', tenantId] })
    } catch { /* silent */ } finally {
      setUploading(false)
    }
  }, [tenantId, queryClient])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const estadoBadge = (estado: ImportacionRecord['estado']) => {
    if (estado === 'exitoso') return <span className="badge badge-green">Exitoso</span>
    if (estado === 'con_advertencias') return <span className="badge badge-yellow">Con advertencias</span>
    return <span className="badge badge-red">Fallido</span>
  }

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Carga el portafolio de productos desde la plantilla Excel. Cada importación queda registrada en el historial.
      </p>

      <div className="flex items-center gap-3 mb-4">
        <button onClick={handleDownloadTemplate} className="btn-secondary flex items-center gap-2">
          <Download size={15} /> Descargar plantilla
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${isDragOver ? 'border-p-lime bg-p-lime/10' : 'border-p-border hover:border-p-muted hover:bg-white/5'}`}
      >
        <input ref={inputRef} type="file" accept=".xlsx" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-p-lime border-t-transparent" />
            <p className="text-sm text-p-muted">Procesando archivo…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className={`w-8 h-8 ${isDragOver ? 'text-p-lime' : 'text-p-muted'}`} />
            <div>
              <p className="text-sm text-p-dark">Arrastra la plantilla .xlsx aquí</p>
              <p className="text-xs text-p-muted mt-1">o haz clic para seleccionar (máx. 5MB)</p>
            </div>
          </div>
        )}
      </div>

      {/* Historial */}
      <div className="card mt-6">
        <h3 className="text-sm font-semibold text-p-dark mb-4">Historial de importaciones</h3>
        {isLoading ? <Spinner /> : historial.length === 0 ? (
          <p className="text-sm text-p-muted text-center py-6">Sin importaciones registradas.</p>
        ) : (
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="text-left">Fecha</th>
                <th className="text-left">Archivo</th>
                <th className="text-center">SKUs</th>
                <th className="text-center">Advertencias</th>
                <th className="text-center">Estado</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {historial.map(imp => (
                <Fragment key={imp.id}>
                  <tr>
                    <td className="text-sm text-p-dark whitespace-nowrap">
                      {new Date(imp.fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="text-sm text-p-gray font-mono">{imp.archivo}</td>
                    <td className="text-center text-sm font-medium text-p-dark">{imp.totalSkus}</td>
                    <td className="text-center">
                      {imp.advertencias > 0
                        ? <span className="text-sm text-p-yellow font-medium">{imp.advertencias}</span>
                        : <span className="text-sm text-p-muted">—</span>}
                    </td>
                    <td className="text-center">{estadoBadge(imp.estado)}</td>
                    <td className="text-center">
                      {imp.errores.length > 0 && (
                        <button
                          onClick={() => setExpanded(expanded === imp.id ? null : imp.id)}
                          className="text-p-muted hover:text-p-dark transition-colors"
                        >
                          {expanded === imp.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded === imp.id && (
                    <tr>
                      <td colSpan={6} className="py-0 px-4 bg-p-bg/40">
                        <div className="py-3">
                          <p className="text-[10px] font-semibold text-p-muted uppercase tracking-wider mb-2">Detalle</p>
                          <ul className="space-y-1">
                            {imp.errores.map((e, i) => (
                              <li key={i} className="text-xs text-p-yellow flex items-start gap-2">
                                <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                {e}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── AtributosTab (R-002 — parte a: atributos + pesos) ───────────────────────

function AtributosTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const { data = [], isLoading } = useQuery<CategoriaAtributos[]>({
    queryKey: ['reglas-atributos', tenantId],
    queryFn: () => api.get<CategoriaAtributos[]>(`reglas/atributos?tenantId=${tenantId}`).then(r => r.data),
  })

  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [atributos, setAtributos] = useState<AtributoCategoria[] | null>(null)
  const dirty = atributos !== null

  const categoria = selectedCat ?? data[0]?.categoria ?? ''
  const currentAtributos = atributos ?? data.find(d => d.categoria === categoria)?.atributos ?? []

  const selectCat = (cat: string) => {
    setSelectedCat(cat)
    setAtributos(null)
  }

  const updateAtributo = (idx: number, field: keyof AtributoCategoria, value: string | number) => {
    const copy = currentAtributos.map((a, i) => i === idx ? { ...a, [field]: value } : a)
    setAtributos(copy)
  }

  const sumaPesos = currentAtributos.reduce((acc, a) => acc + Number(a.peso), 0)
  const pesoError = Math.abs(sumaPesos - 1.0) > 0.01

  const mutation = useMutation({
    mutationFn: () => api.put(`reglas/atributos?tenantId=${tenantId}`, { categoria, atributos: currentAtributos }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-atributos', tenantId] })

      setAtributos(null)
    },
  })

  const categorias = data.map(d => d.categoria)

  if (isLoading) return <Spinner />

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Configura los 5 atributos de valor percibido por categoría. Los pesos deben sumar 100% (precisión 10 decimales).
      </p>

      {/* Selector de categoría */}
      <div className="mb-4">
        <SearchableSelect
          options={categorias}
          value={categoria}
          onChange={selectCat}
          placeholder="Selecciona una categoría…"
        />
      </div>

      {/* Tabla de atributos */}
      {currentAtributos.length > 0 ? (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-p-dark">{categoria}</span>
            <div className="flex items-center gap-3">
              {pesoError && (
                <span className="text-xs text-p-red flex items-center gap-1">
                  <AlertTriangle size={13} /> Suman {(sumaPesos * 100).toFixed(2)}% (deben ser 100%)
                </span>
              )}
              <span className={`text-lg font-bold ${pesoError ? 'text-p-red' : 'text-p-lime'}`}>
                {(sumaPesos * 100).toFixed(2)}%
              </span>
            </div>
          </div>

          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="text-left w-6">#</th>
                <th className="text-left">Atributo</th>
                <th className="text-center w-36">Peso (%)</th>
              </tr>
            </thead>
            <tbody>
              {currentAtributos.map((a, idx) => (
                <tr key={idx}>
                  <td className="text-xs text-p-muted">{idx + 1}</td>
                  <td>
                    <input
                      value={a.nombre}
                      onChange={e => updateAtributo(idx, 'nombre', e.target.value)}
                      className="form-input py-1 text-sm w-full"
                    />
                  </td>
                  <td className="text-center">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={a.peso === 0 ? '' : String(a.peso)}
                      onChange={e => {
                        const v = parseFloat(e.target.value)
                        updateAtributo(idx, 'peso', isNaN(v) ? 0 : Math.min(1, Math.max(0, v)))
                      }}
                      placeholder="0.2"
                      className="form-input py-1 text-sm text-center w-28 mx-auto font-mono"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} />
                <td className={`text-center text-sm font-bold ${pesoError ? 'text-p-red' : 'text-p-lime'}`}>
                  {(sumaPesos * 100).toFixed(2)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="flex items-center justify-center h-40 text-sm text-p-muted border border-dashed border-p-border rounded-xl">
          Selecciona una categoría para ver sus atributos
        </div>
      )}

      <SaveBar onSave={() => mutation.mutate()} saving={mutation.isPending} dirty={dirty && !pesoError} />
    </div>
  )
}

// ─── CalificacionesTab (R-002/R-003 — parte b: SKU × atributo) ───────────────

function CalificacionesTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState('')
  const [searchPropios, setSearchPropios] = useState('')
  const [modo, setModo] = useState<'propio' | 'competidor'>('propio')
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null)
  const [cals, setCals] = useState<Record<string, number> | null>(null)
  const dirty = cals !== null

  const { data: r001, isLoading: loadingR001 } = useQuery<CompetidoresData>({
    queryKey: ['reglas-r001', tenantId],
    queryFn: () => api.get<CompetidoresData>(`reglas/competidores?tenantId=${tenantId}`).then(r => r.data),
  })

  const skus = r001?.skus ?? []
  const currentSku = skus.find(s => s.id === selectedId) ?? null

  const competidoresDelSku = selectedId
    ? (r001?.competidores ?? []).filter(c => (r001?.mapeo[selectedId] ?? []).includes(c.id))
    : []

  const { data: skuCals, isLoading: loadingCals } = useQuery<SkuCalificaciones | null>({
    queryKey: ['reglas-calificaciones', tenantId, selectedId],
    queryFn: () =>
      selectedId
        ? api.get<SkuCalificaciones>(`reglas/calificaciones?tenantId=${tenantId}&skuId=${selectedId}`)
            .then(r => r.data)
            .catch(() => null)
        : Promise.resolve(null),
    enabled: !!selectedId,
  })

  const atributos = skuCals?.atributos ?? []

  const getCurrentCals = (): Record<string, number> => {
    if (cals) return cals
    const base: Record<string, number> = {}
    atributos.forEach(a => {
      base[a.nombre] = modo === 'propio'
        ? a.calificacionPropia
        : (selectedCompId ? (a.calificacionesCompetidor[selectedCompId] ?? 0) : 0)
    })
    return base
  }

  const currentCals = getCurrentCals()
  const vpActual = atributos.reduce((s, a) => s + a.peso * (currentCals[a.nombre] ?? 0), 0)

  const mutation = useMutation({
    mutationFn: () => api.put(`reglas/calificaciones?tenantId=${tenantId}`, {
      skuId: selectedId,
      modo,
      competidorId: modo === 'competidor' ? selectedCompId : null,
      calificaciones: currentCals,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-calificaciones', tenantId, selectedId] })
      setCals(null)
    },
  })

  const updateCal = (atributo: string, val: number) => {
    setCals({ ...getCurrentCals(), [atributo]: val })
  }

  const confirmIfDirty = (): boolean => {
    if (!dirty) return true
    return window.confirm('Tienes cambios sin guardar. ¿Descartar y continuar?')
  }

  const selectSku = (id: string) => {
    if (!confirmIfDirty()) return
    setSelectedId(id)
    setCals(null)
    setModo('propio')
    setSelectedCompId(null)
  }

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const categorias = useMemo(() => Array.from(new Set(skus.map(s => s.categoria))).sort(), [skus])

  const filteredSkus = skus.filter(s => {
    if (filterCat && s.categoria !== filterCat) return false
    if (searchPropios) {
      const q = searchPropios.toLowerCase()
      return s.nombre.toLowerCase().includes(q) || s.marca.toLowerCase().includes(q) || s.ean.includes(q)
    }
    return true
  })

  if (loadingR001) return <Spinner />

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Calificación por SKU × atributo. Configura tanto para el propio producto como para cada competidor asignado. Precisión 10 decimales.
      </p>

      <div className="flex gap-4 items-start">
        {/* Panel izquierdo — lista de SKUs */}
        <div className="card w-72 flex-shrink-0 p-0 overflow-hidden">
          <div className="px-3 pt-3 pb-2 border-b border-p-border space-y-2">
            <select
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
              className={`${INPUT_BASE} ${SELECT_CHEVRON} w-full px-3 py-1.5 text-sm appearance-none pr-8`}
            >
              <option value="">Todas las categorías</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-p-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar SKU…"
                value={searchPropios}
                onChange={e => setSearchPropios(e.target.value)}
                className={`${INPUT_BASE} pl-8 pr-4 py-1.5 text-sm w-full`}
              />
            </div>
          </div>
          <ul className="overflow-y-auto max-h-[480px]">
            {filteredSkus.map(sku => (
              <li
                key={sku.id}
                onClick={() => selectSku(sku.id)}
                className={`flex items-center justify-between px-3 py-2.5 cursor-pointer border-b border-p-border/50 transition-colors ${
                  selectedId === sku.id
                    ? 'bg-p-lime/10 border-l-2 border-l-p-lime'
                    : 'hover:bg-p-surface'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-p-dark truncate">{sku.nombre}</p>
                  <p className="text-xs text-p-muted">{sku.marca}</p>
                </div>
              </li>
            ))}
            {filteredSkus.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-p-muted">Sin SKUs</li>
            )}
          </ul>
        </div>

        {/* Panel derecho */}
        {currentSku ? (
          <div className="flex-1 min-w-0">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-p-dark">{currentSku.nombre}</h3>
              <p className="text-xs text-p-muted">{currentSku.marca} · {currentSku.categoria} · {currentSku.ean}</p>
            </div>

            {/* Toggle Propio / Competidor */}
            <div className="card mb-3 flex items-center gap-3 flex-wrap">
              <div className="flex rounded-lg border border-p-border overflow-hidden">
                {(['propio', 'competidor'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => { if (!confirmIfDirty()) return; setModo(m); setCals(null); setSelectedCompId(null) }}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      modo === m ? 'bg-p-lime text-p-bg' : 'text-p-gray hover:text-p-dark'
                    }`}
                  >
                    {m === 'propio' ? 'Propio' : 'Competidor'}
                  </button>
                ))}
              </div>
              {modo === 'competidor' && (
                <select
                  value={selectedCompId ?? ''}
                  onChange={e => { if (!confirmIfDirty()) return; setSelectedCompId(e.target.value || null); setCals(null) }}
                  className={`${INPUT_BASE} ${SELECT_CHEVRON} px-3 py-1.5 text-sm appearance-none pr-8 min-w-44`}
                >
                  <option value="">Selecciona competidor…</option>
                  {competidoresDelSku.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              )}
            </div>

            {/* Tabla de atributos */}
            {loadingCals ? <Spinner /> : atributos.length > 0 ? (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-p-gray">
                    VP calculado ({modo === 'propio' ? 'propio' : competidoresDelSku.find(c => c.id === selectedCompId)?.nombre ?? '…'})
                  </span>
                  <span className="text-2xl font-bold text-p-lime">{vpActual.toFixed(10).replace(/\.?0+$/, '')}</span>
                </div>
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th className="text-left">#</th>
                      <th className="text-left">Atributo</th>
                      <th className="text-center w-24">Peso</th>
                      <th className="text-center w-40">Calificación</th>
                      <th className="text-center w-28">Contribución</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atributos.map((a, idx) => {
                      const cal = currentCals[a.nombre] ?? 0
                      return (
                        <tr key={idx}>
                          <td className="text-xs text-p-muted">{idx + 1}</td>
                          <td className="text-sm font-medium text-p-dark">{a.nombre}</td>
                          <td className="text-center text-xs text-p-gray font-mono">{a.peso.toFixed(10).replace(/\.?0+$/, '')}</td>
                          <td className="text-center">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={cal === 0 ? '' : String(cal)}
                              onChange={e => {
                                const v = parseFloat(e.target.value)
                                updateCal(a.nombre, isNaN(v) ? 0 : v)
                              }}
                              placeholder="0"
                              className="form-input py-1 text-sm text-center w-36 mx-auto font-mono"
                            />
                          </td>
                          <td className="text-center text-sm font-medium text-p-lime font-mono">
                            {(a.peso * cal).toFixed(10).replace(/\.?0+$/, '')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card text-center py-8 text-p-gray text-sm">
                {modo === 'competidor' && !selectedCompId
                  ? 'Selecciona un competidor para configurar sus calificaciones.'
                  : 'Este SKU no tiene atributos configurados en R-002.'}
              </div>
            )}

            {dirty && (
              <div className="flex items-center justify-end gap-3 pt-3 mt-1">
                <span className="text-xs text-p-yellow flex items-center gap-1">
                  <AlertTriangle size={12} /> Sin guardar
                </span>
                <button
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending}
                  className="btn-primary text-xs py-1.5 flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Save size={13} />
                  {mutation.isPending ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 card flex items-center justify-center py-16 text-p-muted text-sm">
            Selecciona un SKU para configurar sus calificaciones
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ElasticidadTab (R-004) ───────────────────────────────────────────────────

function ElasticidadTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()

  const { data = [], isLoading } = useQuery<ElasticidadItem[]>({
    queryKey: ['reglas-elasticidad', tenantId],
    queryFn: () => api.get<ElasticidadItem[]>(`reglas/elasticidad?tenantId=${tenantId}`).then(r => r.data),
  })

  const { data: portafolioData } = useQuery<PortafolioData | null>({
    queryKey: ['reglas-portafolio', tenantId],
    queryFn: () => api.get<PortafolioData>(`reglas/portafolio?tenantId=${tenantId}`).then(r => r.data).catch(() => null),
  })

  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState('')
  const [searchText, setSearchText] = useState('')
  const [coefInput, setCoefInput] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const pendingCoef = useRef<number | null>(null)

  const portafolioMap = useMemo(() => {
    const m = new Map<string, PortafolioItem>()
    portafolioData?.items.forEach(p => m.set(p.skuId, p))
    return m
  }, [portafolioData])

  const categorias = useMemo(() =>
    Array.from(new Set(data.map(e => portafolioMap.get(e.skuId)?.categoria).filter(Boolean) as string[])).sort(),
    [data, portafolioMap]
  )

  const selectedItem = data.find(e => e.skuId === selectedSkuId) ?? null
  const selectedPortafolio = selectedSkuId ? portafolioMap.get(selectedSkuId) : null

  const liveCoef = isDirty && pendingCoef.current !== null ? pendingCoef.current : (selectedItem?.coeficiente ?? 0)

  const interpretacion = (c: number) =>
    c < -1.8 ? 'Muy elástico' : c < -1 ? 'Elástico' : 'Poco elástico'

  const badgeCls = (c: number) =>
    c < -1.8 ? 'badge badge-red' : c < -1 ? 'badge badge-yellow' : 'badge badge-green'

  const filteredItems = data.filter(e => {
    const p = portafolioMap.get(e.skuId)
    if (filterCat && p?.categoria !== filterCat) return false
    if (searchText) {
      const q = searchText.toLowerCase()
      return (
        e.skuNombre.toLowerCase().includes(q) ||
        (p?.marca.toLowerCase().includes(q) ?? false) ||
        (p?.ean.includes(q) ?? false)
      )
    }
    return true
  })

  const mutation = useMutation({
    mutationFn: (newItems: ElasticidadItem[]) =>
      api.put(`reglas/elasticidad?tenantId=${tenantId}`, newItems),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-elasticidad', tenantId] })
      setIsDirty(false)
      pendingCoef.current = null
    },
  })

  const handleCoefChange = (raw: string) => {
    setCoefInput(raw)
    const v = parseFloat(raw)
    if (!isNaN(v)) {
      pendingCoef.current = v
      setIsDirty(true)
    }
  }

  const handleSave = () => {
    if (!selectedSkuId || !isDirty || pendingCoef.current === null) return
    const newItems = data.map(e =>
      e.skuId === selectedSkuId ? { ...e, coeficiente: pendingCoef.current! } : e
    )
    mutation.mutate(newItems)
  }

  const confirmIfDirty = (): boolean => {
    if (!isDirty) return true
    return window.confirm('Tienes cambios sin guardar. ¿Descartar y continuar?')
  }

  const selectSku = (skuId: string) => {
    if (!confirmIfDirty()) return
    const item = data.find(e => e.skuId === skuId)
    setSelectedSkuId(skuId)
    setCoefInput(item ? String(item.coeficiente) : '0')
    pendingCoef.current = null
    setIsDirty(false)
  }

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  if (isLoading) return <Spinner />

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <p className="text-sm text-p-gray flex-1">
          Coeficientes de elasticidad por SKU. Negativos indican relación inversa (precio sube → demanda baja).
          Rango: 0 a -1 = poco elástico, -1 a -1.8 = elástico, &lt; -1.8 = muy elástico.
        </p>
        <SoloPrisierBadge />
      </div>

      <div className="flex gap-4 items-start">
        {/* Panel izquierdo — lista de SKUs */}
        <div className="card w-72 flex-shrink-0 p-0 overflow-hidden">
          <div className="px-3 pt-3 pb-2 border-b border-p-border space-y-2">
            <select
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
              className={`${INPUT_BASE} ${SELECT_CHEVRON} w-full px-3 py-1.5 text-sm appearance-none pr-8`}
            >
              <option value="">Todas las categorías</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-p-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar SKU…"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className={`${INPUT_BASE} pl-8 pr-4 py-1.5 text-sm w-full`}
              />
            </div>
          </div>
          <ul className="overflow-y-auto max-h-[480px]">
            {filteredItems.map(e => (
              <li
                key={e.skuId}
                onClick={() => selectSku(e.skuId)}
                className={`flex items-center justify-between px-3 py-2.5 cursor-pointer border-b border-p-border/50 transition-colors ${
                  selectedSkuId === e.skuId
                    ? 'bg-p-lime/10 border-l-2 border-l-p-lime'
                    : 'hover:bg-p-surface'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-p-dark truncate">{e.skuNombre}</p>
                  <p className="text-xs text-p-muted">{portafolioMap.get(e.skuId)?.marca ?? ''}</p>
                </div>
                <span className={`ml-2 flex-shrink-0 text-xs px-1.5 py-0.5 rounded font-mono font-medium ${badgeCls(e.coeficiente)}`}>
                  {e.coeficiente}
                </span>
              </li>
            ))}
            {filteredItems.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-p-muted">Sin SKUs</li>
            )}
          </ul>
        </div>

        {/* Panel derecho */}
        {selectedItem ? (
          <div className="flex-1 min-w-0">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-p-dark">{selectedItem.skuNombre}</h3>
              {selectedPortafolio && (
                <p className="text-xs text-p-muted">
                  {selectedPortafolio.marca} · {selectedPortafolio.categoria} · {selectedPortafolio.ean}
                </p>
              )}
            </div>

            <div className="card max-w-sm">
              <p className="text-xs font-semibold text-p-gray uppercase tracking-wide mb-4">
                Coeficiente de elasticidad (ε)
              </p>
              <div className="flex items-center gap-4 mb-4">
                <input
                  type="text"
                  inputMode="decimal"
                  value={coefInput}
                  onChange={e => handleCoefChange(e.target.value)}
                  className="form-input py-2 text-2xl text-center font-mono w-36"
                />
                <span className={`text-sm ${badgeCls(liveCoef)}`}>
                  {interpretacion(liveCoef)}
                </span>
              </div>
              <p className="text-xs text-p-muted mb-4">
                Valores guía: -0.5 = poco elástico · -1.2 = elástico · -2.1 = muy elástico
              </p>
              {isDirty && (
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-p-border">
                  <span className="text-xs text-p-yellow flex items-center gap-1">
                    <AlertTriangle size={12} /> Sin guardar
                  </span>
                  <button
                    onClick={handleSave}
                    disabled={mutation.isPending}
                    className="btn-primary text-xs py-1.5 flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <Save size={13} />
                    {mutation.isPending ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 card flex items-center justify-center py-16 text-p-muted text-sm">
            Selecciona un SKU para configurar su coeficiente de elasticidad
          </div>
        )}
      </div>
    </div>
  )
}

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
  const [vals, setVals] = useState<CanalMargenFormValues>({
    nombre: initial?.nombre ?? '',
    margen: initial?.margen ?? '70',
  })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const validateNombre = () => {
    if (mode !== 'add') return undefined
    if (!vals.nombre.trim()) return 'El nombre es requerido'
    if (existingNombres.map(n => n.toLowerCase()).includes(vals.nombre.trim().toLowerCase()))
      return 'Ya existe un canal con este nombre'
    return undefined
  }

  const validateMargen = () => {
    const n = parseFloat(vals.margen)
    if (isNaN(n)) return 'El margen es requerido'
    if (n < 1 || n > 100) return 'Debe estar entre 1 y 100'
    return undefined
  }

  const handleSubmit = () => {
    setSubmitAttempted(true)
    if (!validateNombre() && !validateMargen()) onSave(vals)
  }

  const nombreErr = (touched['nombre'] || submitAttempted) ? validateNombre() : undefined
  const margenErr = (touched['margen'] || submitAttempted) ? validateMargen() : undefined

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-p-dark">
            {mode === 'add' ? 'Nuevo canal' : 'Editar margen'}
          </h2>
          <button onClick={onClose} className="text-p-gray hover:text-p-dark transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {mode === 'add' ? (
            <div>
              <label className="block text-xs font-medium text-p-gray mb-1">Nombre</label>
              <input
                value={vals.nombre}
                onChange={e => { setVals(p => ({ ...p, nombre: e.target.value })); setTouched(p => ({ ...p, nombre: true })) }}
                onBlur={() => setTouched(p => ({ ...p, nombre: true }))}
                className={`form-input w-full ${nombreErr ? 'border-red-400' : ''}`}
                placeholder="Ej: Supermercados"
              />
              {nombreErr && <p className="text-xs text-red-500 mt-1">{nombreErr}</p>}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-p-gray mb-1">Canal</label>
              <p className="text-sm font-medium text-p-dark">{canalNombre}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-p-gray mb-1">
              Margen — {categoriaNombre} (%)
            </label>
            <input
              type="number" min={1} max={100} step={1}
              value={vals.margen}
              onChange={e => { setVals(p => ({ ...p, margen: e.target.value })); setTouched(p => ({ ...p, margen: true })) }}
              onBlur={() => setTouched(p => ({ ...p, margen: true }))}
              className={`form-input w-full ${margenErr ? 'border-red-400' : ''}`}
              placeholder="70"
            />
            {margenErr && <p className="text-xs text-red-500 mt-1">{margenErr}</p>}
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

// ─── CanalesTab (R-007 — canales × categorías) ───────────────────────────────

function CanalesTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<{ mode: 'add' } | { mode: 'edit'; idx: number } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ nombre: string; idx: number } | null>(null)
  const [page, setPage] = useState(1)
  const [filterText, setFilterText] = useState('')
  const [selectedCategoria, setSelectedCategoria] = useState('')

  const { data, isLoading } = useQuery<CanalesMargenes>({
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

  if (isLoading) return <Spinner />

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
            <label className="text-sm font-medium text-p-gray">Categoría:</label>
            <select
              value={selectedCategoria}
              onChange={e => { setSelectedCategoria(e.target.value); setPage(1) }}
              className={`${INPUT_BASE} ${SELECT_CHEVRON} px-3 py-1.5 text-sm appearance-none pr-8 min-w-44`}
            >
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="card mt-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-p-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar canal…"
                  value={filterText}
                  onChange={e => { setFilterText(e.target.value); setPage(1) }}
                  className={`${INPUT_BASE} pl-8 pr-3 py-1.5 w-56`}
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
                  <th className="text-left">Canal</th>
                  <th className="text-center w-40">Margen — {selectedCategoria}</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map(canal => {
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
                            className="p-1.5 rounded hover:bg-p-surface text-p-gray hover:text-p-dark transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ nombre: canal.nombre, idx: globalIdx })}
                            className="p-1.5 rounded hover:bg-red-50 text-p-gray hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {serverData.canales.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-sm text-p-muted py-6">
                      Sin canales — usa el botón Agregar para crear uno.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-p-border">
              <span className="text-sm text-p-muted">
                {safePage} / {totalPages} — {filteredItems.length} canal{filteredItems.length !== 1 ? 'es' : ''}
              </span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="text-sm text-p-gray hover:text-p-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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

// ─── UmbralesTab (R-008) ──────────────────────────────────────────────────────

function UmbralesTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery<Umbrales>({
    queryKey: ['reglas-umbrales', tenantId],
    queryFn: () => api.get<Umbrales>(`reglas/umbrales?tenantId=${tenantId}`).then(r => r.data),
  })

  const [form, setForm] = useState<Umbrales | null>(null)
  const dirty = form !== null
  const current = form ?? data ?? { umbralSuperior: 0.05, umbralInferior: 0.05 }

  const mutation = useMutation({
    mutationFn: () => api.put(`reglas/umbrales?tenantId=${tenantId}`, current),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-umbrales', tenantId] })

      setForm(null)
    },
  })

  if (isLoading) return <Spinner />

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Define el porcentaje de desviación que dispara una alerta. Se aplica a todos los SKUs del tenant.
      </p>
      <div className="card max-w-sm">
        <div className="space-y-5">
          {[
            { field: 'umbralSuperior' as const, label: 'Umbral superior', color: 'text-p-red', desc: 'Alerta cuando el precio sube más de X%' },
            { field: 'umbralInferior' as const, label: 'Umbral inferior', color: 'text-p-blue', desc: 'Alerta cuando el precio baja más de X%' },
          ].map(({ field, label, color, desc }) => (
            <div key={field}>
              <label className="form-label">{label}</label>
              <p className="text-xs text-p-muted mb-2">{desc}</p>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={1} max={30} step={0.5}
                  value={Math.round(current[field] * 100)}
                  onChange={e => setForm({ ...current, [field]: Number(e.target.value) / 100 })}
                  className="flex-1 accent-p-lime"
                />
                <span className={`text-xl font-bold tabular-nums w-16 text-right ${color}`}>
                  {(current[field] * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 p-3 rounded-lg bg-p-bg border border-p-border">
          <p className="text-xs text-p-muted mb-2">Zona de alerta visualizada</p>
          <div className="relative h-6 rounded-full bg-gradient-to-r from-p-red via-p-lime to-p-red overflow-hidden opacity-70" />
          <div className="flex justify-between text-[10px] text-p-muted mt-1">
            <span>-{(current.umbralInferior * 100).toFixed(1)}%</span>
            <span className="text-p-lime text-xs font-medium">Precio actual</span>
            <span>+{(current.umbralSuperior * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>
      <SaveBar onSave={() => mutation.mutate()} saving={mutation.isPending} dirty={dirty} />
    </div>
  )
}

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
            <label className="block text-xs font-medium text-p-gray mb-1">Nombre</label>
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

function RetailersTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: RetailerItem } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<RetailerItem | null>(null)
  const [page, setPage] = useState(1)
  const [filterText, setFilterText] = useState('')

  const { data: items = [], isLoading } = useQuery<RetailerItem[]>({
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
              className={`${INPUT_BASE} pl-8 pr-3 py-1.5 w-56`}
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
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="text-sm text-p-gray hover:text-p-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-p-lime border-t-transparent" />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReglesPage() {
  const [tenantId, setTenantId] = useState('tenant-001')
  const [tab, setTab] = useState('portafolio')

  const { data: tenants = [] } = useQuery<TenantListItem[]>({
    queryKey: ['tenants'],
    queryFn: () => api.get<TenantListItem[]>('tenants').then(r => r.data),
  })

  return (
    <div>
      {/* Tenant selector */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm text-p-gray font-medium">Tenant:</span>
        <select
          value={tenantId}
          onChange={e => setTenantId(e.target.value)}
          className="form-input py-1.5 text-sm w-48"
        >
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.nombre}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap border-b border-p-border mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? 'border-p-lime text-p-lime'
                : 'border-transparent text-p-gray hover:text-p-dark'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'portafolio'     && <PortafolioTab tenantId={tenantId} />}
      {tab === 'categorias'     && <CategoriasTab tenantId={tenantId} />}
      {tab === 'competidores'   && <CompetidoresTab tenantId={tenantId} />}
      {tab === 'importaciones'  && <ImportacionesTab tenantId={tenantId} />}
      {tab === 'atributos'      && <AtributosTab tenantId={tenantId} />}
      {tab === 'calificaciones' && <CalificacionesTab tenantId={tenantId} />}
      {tab === 'elasticidad'    && <ElasticidadTab tenantId={tenantId} />}
      {tab === 'canales'        && <CanalesTab tenantId={tenantId} />}
      {tab === 'umbrales'       && <UmbralesTab tenantId={tenantId} />}
      {tab === 'retailers'      && <RetailersTab tenantId={tenantId} />}
    </div>
  )
}
