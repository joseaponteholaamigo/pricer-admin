import { useState, useMemo, useEffect } from 'react'
import { useUrlParam } from '../../lib/useUrlState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Save, Search } from 'lucide-react'
import api from '../../lib/api'
import type { CompetidoresData, SkuCalificaciones } from '../../lib/types'
import Spinner from '../../components/Spinner'

// ─── CalificacionesTab (R-002/R-003 — parte b: SKU × atributo) ───────────────

function CalificacionesTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const [filterCat, setFilterCat] = useUrlParam('cat')
  const [searchPropios, setSearchPropios] = useUrlParam('q')
  const [rawModo, setModo] = useUrlParam('modo', 'propio')
  const modo: 'propio' | 'competidor' = rawModo === 'competidor' ? 'competidor' : 'propio'
  const [rawComp, setSelectedCompId] = useUrlParam('comp')
  const selectedCompId: string | null = rawComp || null
  const [rawSku, setSelectedId] = useUrlParam('sku')
  const selectedId: string | null = rawSku || null
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
    setSelectedCompId('')
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
              className="form-select py-1.5 text-sm w-full"
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
                className="form-input pl-8 pr-4 py-1.5 text-sm w-full"
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
                    onClick={() => { if (!confirmIfDirty()) return; setModo(m); setCals(null); setSelectedCompId('') }}
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
                  onChange={e => { if (!confirmIfDirty()) return; setSelectedCompId(e.target.value); setCals(null) }}
                  className="form-select py-1.5 text-sm min-w-44"
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

export default CalificacionesTab
