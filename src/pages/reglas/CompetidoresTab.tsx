import { useState, useMemo } from 'react'
import { useUrlParam } from '../../lib/useUrlState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Search } from 'lucide-react'
import api from '../../lib/api'
import type { PortafolioData, PortafolioItem, SkuCompetencia, SkuVinculacion, VinculacionesMapeo } from '../../lib/types'
import Spinner from '../../components/Spinner'

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
  const [search, setSearch] = useUrlParam('q')
  const [filterCat, setFilterCat] = useUrlParam('cat')
  const [searchPropios, setSearchPropios] = useUrlParam('q2')
  const [rawSku, setSelectedId] = useUrlParam('sku')
  const selectedId: string | null = rawSku || null

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
              className="form-select py-1.5 text-sm w-full"
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
                className="form-input pl-8 pr-4 py-1.5 text-sm w-full"
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
                  className="form-input pl-8 pr-4 py-1.5 text-sm w-full"
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

export default CompetidoresTab
