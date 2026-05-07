import { lazy, Suspense, useRef, useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuth } from '../lib/auth'
import { isStaff } from '../lib/permissions'
import { useTenantActivo } from '../lib/TenantActivoContext'
import type { CategoriaConfig, PortafolioData } from '../lib/types'
import Spinner from '../components/Spinner'

// ─── Lazy tab imports — FMCG ──────────────────────────────────────────────────

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

// ─── Lazy tab imports — Educación ─────────────────────────────────────────────

const PortafolioEduTab         = lazy(() => import('./reglas/edu/PortafolioEduTab'))
const FacultadesEscuelasTab    = lazy(() => import('./reglas/edu/FacultadesEscuelasTab'))
const CompetidoresSniesTab     = lazy(() => import('./reglas/edu/CompetidoresSniesTab'))
const NivelesEducativosTab     = lazy(() => import('./reglas/edu/NivelesEducativosTab'))
const CiudadesTab              = lazy(() => import('./reglas/edu/CiudadesTab'))
const MatricesPreferenciaTab   = lazy(() => import('./reglas/edu/MatricesPreferenciaTab'))

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  // FMCG
  { id: 'portafolio',            label: 'Portafolio',            staffOnly: false, industria: 'consumo_masivo' as const },
  { id: 'categorias',            label: 'Categorías',            staffOnly: false, industria: 'consumo_masivo' as const },
  { id: 'competidores',          label: 'Competidores',          staffOnly: false, industria: 'consumo_masivo' as const },
  { id: 'atributos',             label: 'Atributos',             staffOnly: true,  industria: 'consumo_masivo' as const },
  { id: 'calificaciones',        label: 'Calificaciones',        staffOnly: false, industria: 'consumo_masivo' as const },
  { id: 'elasticidad',           label: 'Elasticidad',           staffOnly: true,  industria: 'consumo_masivo' as const },
  { id: 'canales',               label: 'Canales',               staffOnly: false, industria: 'consumo_masivo' as const },
  { id: 'umbrales',              label: 'Umbrales',              staffOnly: false, industria: 'consumo_masivo' as const },
  { id: 'retailers',             label: 'Retailers',             staffOnly: false, industria: 'consumo_masivo' as const },
  { id: 'importaciones',         label: 'Importaciones',         staffOnly: false, industria: 'consumo_masivo' as const },
  // Educación
  { id: 'edu-portafolio',        label: 'Portafolio',            staffOnly: false, industria: 'educacion' as const },
  { id: 'edu-facultades',        label: 'Facultad/Escuela',      staffOnly: false, industria: 'educacion' as const },
  { id: 'edu-niveles',           label: 'Niveles Educativos',    staffOnly: true,  industria: 'educacion' as const },
  { id: 'edu-ciudades',          label: 'Ciudades',              staffOnly: false, industria: 'educacion' as const },
  { id: 'edu-snies',             label: 'Competidores SNIES',    staffOnly: false, industria: 'educacion' as const },
  { id: 'edu-atributos',         label: 'Atributos',             staffOnly: true,  industria: 'educacion' as const },
  { id: 'edu-calificaciones',    label: 'Calificaciones',        staffOnly: false, industria: 'educacion' as const },
  { id: 'edu-matrices',          label: 'Matrices de Preferencia', staffOnly: true, industria: 'educacion' as const },
  { id: 'edu-importaciones',     label: 'Importaciones',         staffOnly: false, industria: 'educacion' as const },
] as const

type TabId = typeof TABS[number]['id']

const VALID_TABS = new Set<string>(TABS.map(t => t.id))
const DEFAULT_TAB_FMCG: TabId = 'portafolio'
const DEFAULT_TAB_EDU: TabId  = 'edu-portafolio'

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
    // FMCG — sin dependencias
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

    // Educación — todas habilitadas sin dependencias
    case 'edu-portafolio':
    case 'edu-facultades':
    case 'edu-niveles':
    case 'edu-ciudades':
    case 'edu-snies':
    case 'edu-atributos':
    case 'edu-calificaciones':
    case 'edu-matrices':
    case 'edu-importaciones':
      return { isDisabled: false, tooltip: '' }
  }
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReglesPage() {
  const { user } = useAuth()
  const userIsStaff = isStaff(user?.rol)
  const { tenantId, industria } = useTenantActivo()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const activeTenantIndustria = industria ?? 'consumo_masivo'
  const isEdu = activeTenantIndustria === 'educacion'

  const visibleTabs = useMemo(
    () => TABS.filter(t =>
      t.industria === activeTenantIndustria &&
      (!t.staffOnly || userIsStaff)
    ),
    [userIsStaff, activeTenantIndustria],
  )
  const visibleIds = useMemo(() => new Set(visibleTabs.map(t => t.id)), [visibleTabs])

  // Tab activo: respetar URL pero validar que sea visible
  const defaultTab: TabId = isEdu ? DEFAULT_TAB_EDU : DEFAULT_TAB_FMCG
  const rawTab = searchParams.get('tab') ?? ''
  const tab: TabId = VALID_TABS.has(rawTab) && visibleIds.has(rawTab as TabId)
    ? (rawTab as TabId)
    : defaultTab

  // ─── Queries de dependencias (categorías, portafolio, atributos — FMCG) ──

  const activeTenantId = tenantId || ''

  const categoriasQ = useQuery<CategoriaConfig[]>({
    queryKey: ['reglas-categorias', activeTenantId],
    queryFn: () =>
      api.get<CategoriaConfig[]>(`reglas/categorias?tenantId=${activeTenantId}`)
        .then(r => r.data),
    enabled: !!activeTenantId && !isEdu,
    staleTime: 30_000,
  })

  const portafolioQ = useQuery<PortafolioData | null>({
    queryKey: ['reglas-portafolio', activeTenantId],
    queryFn: () =>
      api.get<PortafolioData>(`reglas/portafolio?tenantId=${activeTenantId}`)
        .then(r => r.data),
    enabled: !!activeTenantId && !isEdu,
    staleTime: 30_000,
  })

  const atributosCountQ = useQuery<number>({
    queryKey: ['reglas-atributos-count', activeTenantId],
    queryFn: () =>
      api.get<unknown[]>(`reglas/atributos?tenantId=${activeTenantId}`)
        .then(r => r.data.length),
    enabled: !!activeTenantId && !isEdu,
    staleTime: 30_000,
  })

  const categoriasData = categoriasQ.data ?? []
  const portafolioData = portafolioQ.data ?? null
  const atributosCount = atributosCountQ.data ?? 0

  // Dependencias listas: para edu siempre true (sin deps FMCG)
  const depsReady = isEdu
    || (categoriasQ.isSuccess && portafolioQ.isSuccess && atributosCountQ.isSuccess)

  // ─── Lógica disabled por tab ─────────────────────────────────────────────

  const tabDisabledMap = useCallback(
    (tabId: TabId): TabDisabledInfo => {
      if (!depsReady) return { isDisabled: false, tooltip: '' }
      return computeTabDisabled(tabId, categoriasData, portafolioData, atributosCount)
    },
    [depsReady, categoriasData, portafolioData, atributosCount],
  )

  // Helpers para mutar searchParams sin tocar el ?tenant=...
  const updateTabParam = useCallback((nextTab: TabId | null) => {
    const next = new URLSearchParams(searchParams)
    if (nextTab && nextTab !== defaultTab) next.set('tab', nextTab)
    else next.delete('tab')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, defaultTab])

  // Redirigir a tab default si la activa quedó deshabilitada por URL directa
  useEffect(() => {
    if (!activeTenantId || !depsReady) return
    const info = tabDisabledMap(tab)
    if (info.isDisabled) {
      updateTabParam(null)
    }
  }, [tab, tabDisabledMap, activeTenantId, depsReady, updateTabParam])

  // Limpiar URL si el `?tab=` solicitado no es visible para el rol actual
  useEffect(() => {
    if (rawTab && !visibleIds.has(rawTab as TabId)) {
      updateTabParam(null)
    }
  }, [rawTab, visibleIds, updateTabParam])

  // Al cambiar de tenant, limpiar tab activo si no es válido para la nueva industria
  useEffect(() => {
    if (rawTab && !visibleIds.has(rawTab as TabId)) {
      updateTabParam(null)
    }
  }, [activeTenantIndustria]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeIndex = visibleTabs.findIndex(t => t.id === tab)

  const setTab = (id: TabId) => {
    const info = tabDisabledMap(id)
    if (info.isDisabled) return
    updateTabParam(id === defaultTab ? null : id)
  }

  // Navegación por teclado que salta tabs deshabilitadas
  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    const direction = e.key === 'ArrowRight' ? 1
      : e.key === 'ArrowLeft' ? -1
      : null

    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      const candidates = e.key === 'Home'
        ? visibleTabs.map((t, i) => ({ t, i }))
        : [...visibleTabs.map((t, i) => ({ t, i }))].reverse()
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
    const maxTries = visibleTabs.length
    for (let tries = 0; tries < maxTries; tries++) {
      nextIndex = (nextIndex + direction + visibleTabs.length) % visibleTabs.length
      if (!tabDisabledMap(visibleTabs[nextIndex].id).isDisabled) break
    }
    setTab(visibleTabs[nextIndex].id)
    tabRefs.current[nextIndex]?.focus()
  }, [activeIndex, tabDisabledMap, visibleTabs]) // eslint-disable-line react-hooks/exhaustive-deps

  const panelId = `tabpanel-${tab}`

  return (
    <div>
      {/* Tabs — WAI-ARIA tablist */}
      {visibleTabs.length > 0 && (
        <div
          role="tablist"
          aria-label="Secciones de reglas"
          className="flex gap-1 overflow-x-auto border-b border-p-border mb-6 pb-px scrollbar-thin scrollbar-track-transparent scrollbar-thumb-p-border"
        >
          {visibleTabs.map((t, i) => {
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
      )}

      {/* Content — tabpanel */}
      {visibleTabs.length > 0 && (
        <div
          role="tabpanel"
          id={panelId}
          aria-labelledby={`tab-${tab}`}
          tabIndex={0}
        >
          <Suspense fallback={<Spinner />}>
            {/* FMCG */}
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
            {/* Educación */}
            {tab === 'edu-portafolio'    && <PortafolioEduTab tenantId={activeTenantId} />}
            {tab === 'edu-facultades'    && <FacultadesEscuelasTab tenantId={activeTenantId} />}
            {tab === 'edu-niveles'       && <NivelesEducativosTab tenantId={activeTenantId} />}
            {tab === 'edu-ciudades'      && <CiudadesTab tenantId={activeTenantId} />}
            {tab === 'edu-snies'         && <CompetidoresSniesTab tenantId={activeTenantId} />}
            {tab === 'edu-atributos'     && <AtributosTab tenantId={activeTenantId} verticalKey="r010" />}
            {tab === 'edu-calificaciones'&& <CalificacionesTab tenantId={activeTenantId} verticalKey="r010" />}
            {tab === 'edu-matrices'      && <MatricesPreferenciaTab tenantId={activeTenantId} />}
            {tab === 'edu-importaciones' && <ImportacionesTab tenantId={activeTenantId} verticalKey="r010" />}
          </Suspense>
        </div>
      )}
    </div>
  )
}
