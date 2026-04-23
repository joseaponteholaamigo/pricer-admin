import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2, Users, DollarSign, Settings, Database,
  ArrowRight,
} from 'lucide-react'
import api from '../lib/api'
import type { TenantListItem, UserListItem, ScraperHistorialRow, ReglaResumenItem, TenantActividadItem } from '../lib/types'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 2) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

const SCRAPER_BADGE: Record<string, string> = {
  completado: 'badge-green',
  completado_con_errores: 'badge-yellow',
  error: 'badge-red',
  procesando: 'badge-blue',
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const { data: tenants = [] } = useQuery<TenantListItem[]>({
    queryKey: ['tenants'],
    queryFn: () => api.get<TenantListItem[]>('tenants').then(r => r.data),
  })

  const { data: users = [] } = useQuery<UserListItem[]>({
    queryKey: ['users'],
    queryFn: () => api.get<UserListItem[]>('users').then(r => r.data),
  })

  const { data: tenantActividad = [] } = useQuery<TenantActividadItem[]>({
    queryKey: ['dashboard-actividad-tenants'],
    queryFn: () => api.get<TenantActividadItem[]>('admin/dashboard/actividad-tenants').then(r => r.data),
  })

  const { data: cargas = [] } = useQuery<ScraperHistorialRow[]>({
    queryKey: ['scraper-historial-dashboard'],
    queryFn: () => api.get<ScraperHistorialRow[]>('admin/scraper/historial?tenantId=tenant-001').then(r => r.data),
  })

  const { data: reglas = [] } = useQuery<ReglaResumenItem[]>({
    queryKey: ['reglas-resumen-dashboard'],
    queryFn: () => api.get<ReglaResumenItem[]>('reglas/resumen').then(r => r.data),
  })

  const totalPrecios = useMemo(() =>
    cargas.reduce((sum, c) => sum + c.registrosProcesados, 0), [cargas])

  const reglasConfig = reglas.filter(r => r.configurada).length

  const kpis = [
    {
      label: 'Tenants activos',
      value: tenants.filter(t => t.estado === 'activo').length,
      sub: `${tenants.length} total`,
      icon: Building2,
      color: 'text-p-lime',
      to: '/tenants',
    },
    {
      label: 'Usuarios',
      value: users.filter(u => u.estado === 'activo').length,
      sub: `${users.length} registrados`,
      icon: Users,
      color: 'text-p-blue',
      to: '/usuarios',
    },
    {
      label: 'Precios capturados',
      value: totalPrecios.toLocaleString('es-CO'),
      sub: `${cargas.length} cargas realizadas`,
      icon: DollarSign,
      color: 'text-p-lime',
      to: '/scraper',
    },
    {
      label: 'Reglas configuradas',
      value: `${reglasConfig}/${reglas.length}`,
      sub: reglas.length > 0 && reglasConfig < reglas.length ? 'Hay pendientes' : 'Completas',
      icon: Settings,
      color: reglasConfig < reglas.length && reglas.length > 0 ? 'text-p-yellow' : 'text-p-lime',
      to: '/reglas',
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-5">
        {kpis.map(k => (
          <button
            key={k.label}
            onClick={() => navigate(k.to)}
            className="card text-left w-full hover:border-p-lime/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-p-gray">{k.label}</p>
              <k.icon size={18} className={k.color} />
            </div>
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-p-muted mt-1">{k.sub}</p>
          </button>
        ))}
      </div>

      {/* Actividad reciente por tenant */}
      <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-p-dark flex items-center gap-2">
              <Building2 size={15} className="text-p-muted" />
              Actividad por tenant
            </h3>
            <Link to="/scraper" className="text-xs text-p-lime hover:underline flex items-center gap-1">
              Ver scraper <ArrowRight size={11} />
            </Link>
          </div>
          {tenantActividad.length === 0 ? (
            <p className="text-sm text-p-muted py-8 text-center">Sin actividad registrada</p>
          ) : (
            <div className="divide-y divide-p-border">
              {tenantActividad.map(item => (
                <div key={item.tenantId} className="py-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-p-bg border border-p-border flex items-center justify-center shrink-0 text-xs font-bold text-p-gray select-none">
                    {item.tenantNombre.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-p-dark truncate">{item.tenantNombre}</p>
                      <span className={`badge text-xs ${
                        item.tenantEstado === 'activo' ? 'badge-green' :
                        item.tenantEstado === 'suspendido' ? 'badge-red' : 'badge'
                      }`}>
                        {item.tenantEstado}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                      <p className="text-xs text-p-muted flex items-center gap-1">
                        <Database size={10} />
                        {item.ultimaCargaScraper ? (
                          <span className={
                            item.ultimaCargaScraper.estado === 'error' ? 'text-p-red' :
                            item.ultimaCargaScraper.estado === 'completado_con_errores' ? 'text-p-yellow' :
                            ''
                          }>
                            {timeAgo(item.ultimaCargaScraper.fecha)} · {item.ultimaCargaScraper.tipo}
                          </span>
                        ) : (
                          <span className="italic">Sin cargas</span>
                        )}
                      </p>
                      <p className="text-xs text-p-muted flex items-center gap-1">
                        <Settings size={10} />
                        {item.ultimaActualizacionReglas ? (
                          <span>{timeAgo(item.ultimaActualizacionReglas.fecha)} · {item.ultimaActualizacionReglas.tipo}</span>
                        ) : (
                          <span className="italic">Sin reglas</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {item.ultimaCargaScraper && (
                    <span className={`badge text-xs shrink-0 ${SCRAPER_BADGE[item.ultimaCargaScraper.estado] ?? 'badge'}`}>
                      {item.ultimaCargaScraper.estado.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}
