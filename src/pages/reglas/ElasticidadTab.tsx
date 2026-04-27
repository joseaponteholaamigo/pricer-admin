import { useState, useMemo, useRef, useEffect } from 'react'
import { useUrlParam } from '../../lib/useUrlState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Save, Search, FileDown } from 'lucide-react'
import api from '../../lib/api'
import { downloadTemplate } from '../../lib/downloadTemplate'
import type { ElasticidadItem, PortafolioData, PortafolioItem } from '../../lib/types'
import Spinner from '../../components/Spinner'
import QueryErrorState from '../../components/QueryErrorState'
import SoloPrisierBadge from '../../components/SoloPrisierBadge'
import { useToast } from '../../components/useToast'
import { elasticidadItemSchema } from '../../schemas/reglas'
import { useAuth } from '../../lib/auth'

// ─── ElasticidadTab (R-004) ───────────────────────────────────────────────────

function ElasticidadTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { user } = useAuth()
  const isAdmin = user?.rol === 'admin'

  const { data = [], isLoading, isError, refetch } = useQuery<ElasticidadItem[]>({
    queryKey: ['reglas-elasticidad', tenantId],
    queryFn: () => api.get<ElasticidadItem[]>(`reglas/elasticidad?tenantId=${tenantId}`).then(r => r.data),
  })

  const { data: portafolioData } = useQuery<PortafolioData | null>({
    queryKey: ['reglas-portafolio', tenantId],
    queryFn: () => api.get<PortafolioData>(`reglas/portafolio?tenantId=${tenantId}`).then(r => r.data).catch(() => null),
  })

  const [rawSku, setSelectedSkuId] = useUrlParam('sku')
  const selectedSkuId: string | null = rawSku || null
  const [filterCat, setFilterCat] = useUrlParam('cat')
  const [searchText, setSearchText] = useUrlParam('q')
  const [coefInput, setCoefInput] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [coefError, setCoefError] = useState<string | null>(null)
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
      toast.success('Cambios guardados')
    },
    onError: (err: unknown) => {
      toast.error('No se pudo guardar: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    },
  })

  const handleCoefChange = (raw: string) => {
    setCoefInput(raw)
    setCoefError(null)
    const v = parseFloat(raw)
    if (!isNaN(v)) {
      pendingCoef.current = v
      setIsDirty(true)
    }
  }

  const handleSave = () => {
    if (!selectedSkuId || !isDirty || pendingCoef.current === null) return

    // Validación al borde antes del PATCH
    const result = elasticidadItemSchema.safeParse({
      skuId: selectedSkuId,
      coeficiente: pendingCoef.current,
    })
    if (!result.success) {
      const msg = result.error.issues[0]?.message ?? 'Error de validación'
      setCoefError(msg)
      return
    }
    setCoefError(null)

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

  if (isError) return <QueryErrorState onRetry={refetch} />
  if (isLoading) return <Spinner />

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <p className="text-sm text-p-gray flex-1">
          Coeficientes de elasticidad por SKU. Negativos indican relación inversa (precio sube → demanda baja).
          Rango: 0 a -1 = poco elástico, -1 a -1.8 = elástico, &lt; -1.8 = muy elástico.
        </p>
        <button
          onClick={() => downloadTemplate(
            'elasticidad.xlsx',
            'Elasticidad',
            ['EAN', 'Coeficiente Elasticidad'],
            { 'EAN': '7702001234567', 'Coeficiente Elasticidad': -1.2 },
          )}
          aria-label="Descargar plantilla de elasticidad"
          className="btn-secondary text-xs flex items-center gap-1 py-1.5"
        >
          <FileDown size={13} aria-hidden /> Descargar plantilla
        </button>
        <SoloPrisierBadge />
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* Panel izquierdo — lista de SKUs */}
        <div className="card w-full md:w-72 md:flex-shrink-0 p-0 overflow-hidden">
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
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="form-input pl-8 pr-4 py-1.5 text-sm w-full"
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
              <div className="flex items-center gap-4 mb-2">
                <div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={coefInput}
                    onChange={e => handleCoefChange(e.target.value)}
                    disabled={!isAdmin}
                    readOnly={!isAdmin}
                    aria-invalid={!!coefError}
                    aria-describedby={coefError ? 'elasticidad-coef-error' : undefined}
                    className="form-input py-2 text-2xl text-center font-mono w-36 disabled:bg-p-surface disabled:cursor-not-allowed"
                  />
                  {coefError && (
                    <p id="elasticidad-coef-error" className="text-xs text-p-red mt-1" role="alert">
                      {coefError}
                    </p>
                  )}
                </div>
                <span className={`text-sm ${badgeCls(liveCoef)}`}>
                  {interpretacion(liveCoef)}
                </span>
              </div>
              <p className="text-xs text-p-muted mb-4">
                Valores guía: -0.5 = poco elástico · -1.2 = elástico · -2.1 = muy elástico
              </p>
              {isDirty && isAdmin && (
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-p-border">
                  <span className="text-xs text-p-yellow flex items-center gap-1">
                    <AlertTriangle size={12} aria-hidden /> Sin guardar
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

export default ElasticidadTab
