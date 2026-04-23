import { useState, lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import type { TenantListItem } from '../lib/types'
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
  { id: 'categorias',     label: 'Categorías' },
  { id: 'competidores',   label: 'Competidores' },
  { id: 'importaciones',  label: 'Importaciones' },
  { id: 'atributos',      label: 'Atributos' },
  { id: 'calificaciones', label: 'Calificaciones' },
  { id: 'elasticidad',    label: 'Elasticidad' },
  { id: 'canales',        label: 'Canales' },
  { id: 'umbrales',       label: 'Umbrales' },
  { id: 'retailers',      label: 'Retailers' },
] as const

type TabId = typeof TABS[number]['id']

const VALID_TABS = new Set<string>(TABS.map(t => t.id))
const DEFAULT_TAB: TabId = 'portafolio'

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReglesPage() {
  // tenant permanece local — no va a URL
  const [tenantId, setTenantId] = useState('tenant-001')
  const [searchParams, setSearchParams] = useSearchParams()

  const rawTab = searchParams.get('tab') ?? ''
  const tab: TabId = VALID_TABS.has(rawTab) ? (rawTab as TabId) : DEFAULT_TAB

  const setTab = (id: TabId) => {
    // Al cambiar de tab, reemplaza TODOS los params con solo tab=<id>
    // para evitar keys fantasma de la tab anterior.
    if (id === DEFAULT_TAB) {
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ tab: id }, { replace: true })
    }
  }

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
      <Suspense fallback={<Spinner />}>
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
      </Suspense>
    </div>
  )
}
