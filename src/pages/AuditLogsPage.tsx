import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Filter, ChevronDown, ChevronUp, FileSpreadsheet, FileText } from 'lucide-react'
import api from '../lib/api'
import type { TenantListItem, AuditLogRow } from '../lib/types'
import { AUDIT_ACCIONES, AUDIT_ENTIDADES } from '../shared/catalog'

const PAGE_SIZE = 25

interface Filters {
  busqueda: string
  usuario: string
  tenantId: string
  fechaDesde: string
  fechaHasta: string
  accion: string
  entidad: string
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    busqueda: '', usuario: '', tenantId: '', fechaDesde: '', fechaHasta: '', accion: '', entidad: '',
  })
  const [appliedFilters, setAppliedFilters] = useState<Filters>(filters)

  const { data: tenants = [] } = useQuery<TenantListItem[]>({
    queryKey: ['tenants'],
    queryFn: () => api.get<TenantListItem[]>('tenants').then(r => r.data),
  })

  useEffect(() => { setPage(1) }, [appliedFilters])

  const queryString = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
    ...(appliedFilters.busqueda   && { busqueda: appliedFilters.busqueda }),
    ...(appliedFilters.usuario    && { usuario: appliedFilters.usuario }),
    ...(appliedFilters.tenantId   && { tenantId: appliedFilters.tenantId }),
    ...(appliedFilters.fechaDesde && { fechaDesde: appliedFilters.fechaDesde }),
    ...(appliedFilters.fechaHasta && { fechaHasta: appliedFilters.fechaHasta }),
    ...(appliedFilters.accion     && { accion: appliedFilters.accion }),
    ...(appliedFilters.entidad    && { entidad: appliedFilters.entidad }),
  }).toString()

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', queryString],
    queryFn: async () => {
      const res = await api.get<AuditLogRow[]>(`audit-logs?${queryString}`)
      const total = parseInt(res.headers['x-total-count'] || '0')
      return { rows: res.data, total }
    },
  })

  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const setFilter = (key: keyof Filters, val: string) =>
    setFilters(prev => ({ ...prev, [key]: val }))

  const applyFilters = () => setAppliedFilters(filters)
  const clearFilters = () => {
    const empty: Filters = { busqueda: '', usuario: '', tenantId: '', fechaDesde: '', fechaHasta: '', accion: '', entidad: '' }
    setFilters(empty)
    setAppliedFilters(empty)
  }

  const doExport = async (format: 'excel' | 'csv') => {
    const setter = format === 'excel' ? setExportingExcel : setExportingCsv
    setter(true)
    try {
      const res = await api.get<Blob>(`audit-logs/export/${format}?${queryString}`, { responseType: 'blob' })
      const ext = format === 'excel' ? 'xlsx' : 'csv'
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setter(false)
    }
  }

  const hasActiveFilters = Object.values(appliedFilters).some(v => v !== '')

  return (
    <div className="space-y-4">
      {/* Filter panel */}
      <div className="card">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="flex items-center gap-2 text-sm font-semibold text-p-dark"
          >
            <Filter size={15} />
            Filtros
            {hasActiveFilters && <span className="badge badge-yellow text-xs">Activos</span>}
            {filtersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => doExport('excel')}
              disabled={exportingExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-600/10 text-green-700 border border-green-600/20 rounded-lg hover:bg-green-600/20 transition-colors disabled:opacity-40"
            >
              <FileSpreadsheet size={13} /> Excel
            </button>
            <button
              onClick={() => doExport('csv')}
              disabled={exportingCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600/10 text-blue-700 border border-blue-600/20 rounded-lg hover:bg-blue-600/20 transition-colors disabled:opacity-40"
            >
              <FileText size={13} /> CSV
            </button>
          </div>
        </div>

        {filtersOpen && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="col-span-3">
              <label className="form-label">Búsqueda libre</label>
              <input
                type="text"
                placeholder="Buscar en todas las columnas…"
                value={filters.busqueda}
                onChange={e => setFilter('busqueda', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                className="form-input text-sm w-full"
              />
            </div>
            <div>
              <label className="form-label">Usuario</label>
              <input
                type="text"
                placeholder="Buscar por email o nombre…"
                value={filters.usuario}
                onChange={e => setFilter('usuario', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                className="form-input text-sm w-full"
              />
            </div>
            <div>
              <label className="form-label">Tenant</label>
              <select
                value={filters.tenantId}
                onChange={e => setFilter('tenantId', e.target.value)}
                className="form-input text-sm w-full"
              >
                <option value="">Todos</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Acción</label>
              <select
                value={filters.accion}
                onChange={e => setFilter('accion', e.target.value)}
                className="form-input text-sm w-full"
              >
                <option value="">Todas</option>
                {AUDIT_ACCIONES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Entidad</label>
              <select
                value={filters.entidad}
                onChange={e => setFilter('entidad', e.target.value)}
                className="form-input text-sm w-full"
              >
                <option value="">Todas</option>
                {AUDIT_ENTIDADES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Desde</label>
              <input
                type="date"
                value={filters.fechaDesde}
                onChange={e => setFilter('fechaDesde', e.target.value)}
                className="form-input text-sm w-full"
              />
            </div>
            <div>
              <label className="form-label">Hasta</label>
              <input
                type="date"
                value={filters.fechaHasta}
                onChange={e => setFilter('fechaHasta', e.target.value)}
                className="form-input text-sm w-full"
              />
            </div>

            <div className="col-span-3 flex items-center justify-end gap-3 pt-1">
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-sm text-p-muted hover:text-p-dark transition-colors">
                  Limpiar filtros
                </button>
              )}
              <button onClick={applyFilters} className="btn-primary text-sm px-4 py-1.5">
                Aplicar filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-p-lime border-t-transparent" />
          </div>
        ) : (
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="text-left">Fecha</th>
                <th className="text-left">Usuario</th>
                <th className="text-left">Tenant</th>
                <th className="text-left">Acción</th>
                <th className="text-left">Entidad</th>
                <th className="text-left">Valor anterior</th>
                <th className="text-left">Valor nuevo</th>
                <th className="text-left">IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td className="text-xs text-p-muted whitespace-nowrap">
                    {new Date(row.fecha).toLocaleDateString('es-CO', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="text-sm text-p-dark">{row.usuario}</td>
                  <td className="text-xs text-p-muted">{row.tenantNombre ?? '—'}</td>
                  <td>
                    <span className="badge text-xs capitalize">{row.accion.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="text-xs text-p-dark capitalize">{row.entidad}</td>
                  <td className="text-xs text-p-muted max-w-[160px] truncate" title={row.valorAnterior ?? ''}>
                    {row.valorAnterior ?? '—'}
                  </td>
                  <td className="text-xs text-p-dark max-w-[160px] truncate" title={row.valorNuevo ?? ''}>
                    {row.valorNuevo ?? '—'}
                  </td>
                  <td className="text-xs text-p-muted font-mono">{row.ip ?? '—'}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-p-muted text-sm">
                    Sin registros para los filtros aplicados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-p-muted">{total} registros</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg border border-p-border text-sm text-p-gray
                         disabled:opacity-30 hover:bg-white/5 transition-colors"
            >
              Anterior
            </button>
            <span className="px-4 py-2 text-sm text-p-muted">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg border border-p-border text-sm text-p-gray
                         disabled:opacity-30 hover:bg-white/5 transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
