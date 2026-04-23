import { useState, useMemo, useEffect } from 'react'
import { useUrlParam, useUrlNumber } from '../../lib/useUrlState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil, Search, X } from 'lucide-react'
import api from '../../lib/api'
import type { CanalesMargenes, CanalSimple, PortafolioData } from '../../lib/types'
import Spinner from '../../components/Spinner'
import ConfirmModal from '../../components/ConfirmModal'
import SoloPrisierBadge from '../../components/SoloPrisierBadge'

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
              <label className="form-label">Nombre</label>
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
              <label className="form-label">Canal</label>
              <p className="text-sm font-medium text-p-dark">{canalNombre}</p>
            </div>
          )}

          <div>
            <label className="form-label">
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

const PAGE_SIZE = 10

function CanalesTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<{ mode: 'add' } | { mode: 'edit'; idx: number } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ nombre: string; idx: number } | null>(null)
  const [page, setPage] = useUrlNumber('page', 1)
  const [filterText, setFilterText] = useUrlParam('q')
  const [selectedCategoria, setSelectedCategoria] = useUrlParam('cat')

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
            <label className="form-label mb-0">Categoría:</label>
            <select
              value={selectedCategoria}
              onChange={e => { setSelectedCategoria(e.target.value); setPage(1) }}
              className="form-select py-1.5 text-sm min-w-44"
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
