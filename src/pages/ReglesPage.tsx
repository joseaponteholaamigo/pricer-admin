import { useState, lazy, Suspense, useRef, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import type { TenantListItem, CategoriaConfig, PortafolioData } from '../lib/types'
import Spinner from '../components/Spinner'

// ─── Lazy tab imports ─────────────────────────────────────────────────────────

const PortafolioTab    = lazy(() => import('./reglas/PortafolioTab'))
const CategoriasTab    = lazy(() => import('./reglas/CategoriasTab'))
const CompetidoresTab  = lazy(() => import('./reglas/CompetidoresTab'))
const ImportacionesTab = lazy(() => import('./reglas/ImportacionesTab'))
const AtributosTab     = lazy(() => import('./reglas/AtributosTab'))
const CalificacionesTab = lazy(() => import('./reglas/CalificacionesTab'))
const ElasticidadTab   = lazy(() => import('./reglas/ElasticidadTab'))
const CanalesTab       = lazy(() => import('./reglas/CanalesTab'))
const UmbralesTab      = lazy(() => import('./reglas/UmbralesTab'))
const RetailersTab     = lazy(() => import('./reglas/RetailersTab'))

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'portafolio',     label: 'Portafolio' },
  { id: 'importaciones',  label: 'Importaciones' },
  { id: 'categorias',     label: 'Categorías' },
  { id: 'retailers',      label: 'Retailers' },
  { id: 'competidores',   label: 'Competidores' },
  { id: 'atributos',      label: 'Atributos' },
  { id: 'calificaciones', label: 'Calificaciones' },
  { id: 'elasticidad',    label: 'Elasticidad' },
  { id: 'canales',        label: 'Canales' },
  { id: 'umbrales',       label: 'Umbrales' },
] as const

type TabId = typeof TABS[number]['id']

const VALID_TABS = new Set<string>(TABS.map(t => t.id))
const DEFAULT_TAB: TabId = 'portafolio'

// ─── Dependencias por tab ─────────────────────────────────────────────────────

type TabDisabledInfo = {
  isDisabled: boolean
  tooltip: string
}

function computeTabDisabled(
  tabId: TabId,
  categorias: CategoriaConfig[],
  portafolioPropios: PortafolioData | null,
  atributosCount: number,
): TabDisabledInfo {
  const hasCategorias = categorias.length > 0
  const hasPropios = (portafolioPropios?.items?.length ?? 0) > 0
  const hasAtributos = atributosCount > 0

  switch (tabId) {
    case 'portafolio':
    case 'importaciones':
    case 'categorias':
    case 'retailers':
    case 'umbrales':
      return { isDisabled: false, tooltip: '' }

    case 'atributos':
      return hasCategorias
        ? { isDisabled: false, tooltip: '' }
        : { isDisabled: true, tooltip: 'Primero configura Categorías' }

    case 'canales':
      return hasCategorias
        ? { isDisabled: false, tooltip: '' }
        : { isDisabled: true, tooltip: 'Primero configura Categorías' }

    case 'competidores':
      return hasPropios
        ? { isDisabled: false, tooltip: '' }
        : { isDisabled: true, tooltip: 'Primero configura el Portafolio' }

    case 'calificaciones':
      if (!hasPropios && !hasAtributos) {
        return { isDisabled: true, tooltip: 'Primero configura el Portafolio y Atributos' }
      }
      if (!hasPropios) {
        return { isDisabled: true, tooltip: 'Primero configura el Portafolio' }
      }
      if (!hasAtributos) {
        return { isDisabled: true, tooltip: 'Primero configura Atributos' }
      }
      return { isDisabled: false, tooltip: '' }

    case 'elasticidad':
      return hasPropios
        ? { isDisabled: false, tooltip: '' }
        : { isDisabled: true, tooltip: 'Primero configura el Portafolio' }
  }
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReglesPage() {
  const [tenantId, setTenantId] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const rawTab = searchParams.get('tab') ?? ''
  const tab: TabId = VALID_TABS.has(rawTab) ? (rawTab as TabId) : DEFAULT_TAB

  // ─── Queries de tenants y dependencias ───────────────────────────────────────

  const { data: tenants = [] } = useQuery<TenantListItem[]>({
    queryKey: ['tenants'],
    queryFn: () => api.get<TenantListItem[]>('tenants').then(r => r.data),
  })

  // Inicializar tenantId con el primer tenant real cuando llegan los datos
  useEffect(() => {
    if (!tenantId && tenants.length > 0) {
      setTenantId(tenants[0].id)
    }
  }, [tenants, tenantId])

  const activeTenantId = tenantId || ''

  const categoriasQ = useQuery<CategoriaConfig[]>({
    queryKey: ['reglas-categorias', activeTenantId],
    queryFn: () =>
      api.get<CategoriaConfig[]>(`reglas/categorias?tenantId=${activeTenantId}`)
        .then(r => r.data),
    enabled: !!activeTenantId,
    staleTime: 30_000,
  })

  const portafolioQ = useQuery<PortafolioData | null>({
    queryKey: ['reglas-portafolio', activeTenantId],
    queryFn: () =>
      api.get<PortafolioData>(`reglas/portafolio?tenantId=${activeTenantId}`)
        .then(r => r.data),
    enabled: !!activeTenantId,
    staleTime: 30_000,
  })

  // Usa queryKey propio para el conteo, no compartir con AtributosTab
  // (AtributosTab cachea CategoriaAtributos[] bajo ['reglas-atributos']).
  const atributosCountQ = useQuery<number>({
    queryKey: ['reglas-atributos-count', activeTenantId],
    queryFn: () =>
      api.get<unknown[]>(`reglas/atributos?tenantId=${activeTenantId}`)
        .then(r => r.data.length),
    enabled: !!activeTenantId,
    staleTime: 30_000,
  })

  const categoriasData = categoriasQ.data ?? []
  const portafolioData = portafolioQ.data ?? null
  const atributosCount = atributosCountQ.data ?? 0

  // Las dependencias solo son confiables cuando todas las queries han resuelto.
  // Antes de eso, tratamos todo como "no disabled" para no redirigir por error.
  const depsReady =
    categoriasQ.isSuccess && portafolioQ.isSuccess && atributosCountQ.isSuccess

  // ─── Lógica disabled por tab ─────────────────────────────────────────────────

  const tabDisabledMap = useCallback(
    (tabId: TabId): TabDisabledInfo => {
      if (!depsReady) return { isDisabled: false, tooltip: '' }
      return computeTabDisabled(tabId, categoriasData, portafolioData, atributosCount)
    },
    [depsReady, categoriasData, portafolioData, atributosCount],
  )

  // Redirigir a portafolio si la tab activa quedó deshabilitada por URL directa
  useEffect(() => {
    if (!activeTenantId || !depsReady) return
    const info = tabDisabledMap(tab)
    if (info.isDisabled) {
      setSearchParams({}, { replace: true })
    }
  }, [tab, tabDisabledMap, activeTenantId, depsReady, setSearchParams])

  const activeIndex = TABS.findIndex(t => t.id === tab)

  const setTab = (id: TabId) => {
    const info = tabDisabledMap(id)
    if (info.isDisabled) return
    if (id === DEFAULT_TAB) {
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ tab: id }, { replace: true })
    }
  }

  // Navegación por teclado que salta tabs deshabilitadas
  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    const direction = e.key === 'ArrowRight' ? 1
      : e.key === 'ArrowLeft' ? -1
      : null

    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      const candidates = e.key === 'Home'
        ? TABS.map((t, i) => ({ t, i }))
        : [...TABS.map((t, i) => ({ t, i }))].reverse()
      const target = candidates.find(({ t }) => !tabDisabledMap(t.id).isDisabled)
      if (target) {
        setTab(target.t.id)
        tabRefs.current[target.i]?.focus()
      }
      return
    }

    if (direction === null) return
    e.preventDefault()

    let nextIndex = activeIndex
    const maxTries = TABS.length
    for (let tries = 0; tries < maxTries; tries++) {
      nextIndex = (nextIndex + direction + TABS.length) % TABS.length
      if (!tabDisabledMap(TABS[nextIndex].id).isDisabled) break
    }
    setTab(TABS[nextIndex].id)
    tabRefs.current[nextIndex]?.focus()
  }, [activeIndex, tabDisabledMap]) // eslint-disable-line react-hooks/exhaustive-deps

  const panelId = `tabpanel-${tab}`

  return (
    <div>
      {/* Tenant selector */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm text-p-gray font-medium shrink-0">Tenant:</span>
        <select
          value={tenantId}
          onChange={e => setTenantId(e.target.value)}
          className="form-input py-1.5 text-sm w-full sm:w-48"
          aria-label="Seleccionar tenant activo"
        >
          {tenants.length === 0 && (
            <option value="" disabled>Cargando…</option>
          )}
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.nombre}</option>
          ))}
        </select>
      </div>

      {/* Tabs — WAI-ARIA tablist */}
      <div
        role="tablist"
        aria-label="Secciones de reglas"
        className="flex gap-1 overflow-x-auto border-b border-p-border mb-6 pb-px scrollbar-thin scrollbar-track-transparent scrollbar-thumb-p-border"
      >
        {TABS.map((t, i) => {
          const isActive = tab === t.id
          const { isDisabled, tooltip } = tabDisabledMap(t.id)
          return (
            <div key={t.id} className="relative group shrink-0">
              <button
                ref={el => { tabRefs.current[i] = el }}
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={isActive}
                aria-controls={isActive ? panelId : undefined}
                aria-disabled={isDisabled ? 'true' : undefined}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setTab(t.id)}
                onKeyDown={handleTabKeyDown}
                disabled={isDisabled}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-p-lime/40 ${
                  isDisabled
                    ? 'border-transparent text-p-border opacity-50 cursor-not-allowed'
                    : isActive
                      ? 'border-p-lime text-p-lime'
                      : 'border-transparent text-p-gray hover:text-p-dark'
                }`}
              >
                {t.label}
              </button>
              {/* Tooltip para tabs deshabilitadas */}
              {isDisabled && tooltip && (
                <div
                  role="tooltip"
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-p-dark text-white text-xs rounded whitespace-nowrap
                    opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10"
                >
                  {tooltip}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-p-dark" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Content — tabpanel */}
      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
      >
        <Suspense fallback={<Spinner />}>
          {tab === 'portafolio'     && <PortafolioTab tenantId={activeTenantId} />}
          {tab === 'categorias'     && <CategoriasTab tenantId={activeTenantId} />}
          {tab === 'competidores'   && <CompetidoresTab tenantId={activeTenantId} />}
          {tab === 'importaciones'  && <ImportacionesTab tenantId={activeTenantId} />}
          {tab === 'atributos'      && <AtributosTab tenantId={activeTenantId} />}
          {tab === 'calificaciones' && <CalificacionesTab tenantId={activeTenantId} />}
          {tab === 'elasticidad'    && <ElasticidadTab tenantId={activeTenantId} />}
          {tab === 'canales'        && <CanalesTab tenantId={activeTenantId} />}
          {tab === 'umbrales'       && <UmbralesTab tenantId={activeTenantId} />}
          {tab === 'retailers'      && <RetailersTab tenantId={activeTenantId} />}
        </Suspense>
      </div>
    </div>
  )
}
