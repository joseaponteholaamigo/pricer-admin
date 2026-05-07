import { useState, useCallback, Fragment } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, ChevronDown, ChevronUp, Download, AlertTriangle, CheckCircle2, Loader2, Upload, Info,
} from 'lucide-react'
import api from '../../lib/api'
import type {
  TipoPlantilla, EstadoImportacion, ImportacionRecord,
} from '../../lib/types'
import { TEMPLATE_SPECS } from '../../lib/templateSpecs'
import { SkeletonTable } from '../../components/Skeleton'
import QueryErrorState from '../../components/QueryErrorState'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../components/useToast'
import { downloadBlob } from '../../lib/download'
import UploadPlantillaModal from '../../components/UploadPlantillaModal'
import { useAuth } from '../../lib/auth'
import { isAdmin } from '../../lib/permissions'

// ─── verticalKey: 'r002' = FMCG (default), 'r010' = Educación ────────────────

type VerticalKey = 'r002' | 'r010'

// ─── Arrays de tipos por vertical ────────────────────────────────────────────

const TIPOS_FMCG: TipoPlantilla[] = [
  'portafolio', 'categorias', 'competidores', 'atributos', 'calificaciones', 'elasticidad', 'canales', 'competencia',
]

const TIPOS_EDU: TipoPlantilla[] = [
  'programas', 'facultades_escuelas', 'niveles_educativos', 'ciudades', 'atributos_r010', 'calificaciones_edu', 'asignaciones_snies',
]

// ─── Utilidades visuales ──────────────────────────────────────────────────────

function tipoLabel(tipo: TipoPlantilla): string {
  return TEMPLATE_SPECS[tipo].label
}

function estadoBadge(estado: EstadoImportacion) {
  switch (estado) {
    case 'procesando':
      return (
        <span className="badge badge-blue inline-flex items-center gap-1" aria-label="Estado: Procesando">
          <Loader2 size={11} className="animate-spin" aria-hidden /> Procesando
        </span>
      )
    case 'exitoso':
      return (
        <span className="badge badge-green inline-flex items-center gap-1" aria-label="Estado: Exitoso">
          <CheckCircle2 size={11} aria-hidden /> Exitoso
        </span>
      )
    case 'con_advertencias':
      return (
        <span className="badge badge-yellow inline-flex items-center gap-1" aria-label="Estado: Con advertencias">
          <AlertTriangle size={11} aria-hidden /> Con advertencias
        </span>
      )
    case 'fallido':
      return (
        <span className="badge badge-red inline-flex items-center gap-1" aria-label="Estado: Fallido">
          <AlertTriangle size={11} aria-hidden /> Fallido
        </span>
      )
  }
}

function filasCell(record: ImportacionRecord) {
  const { filasNuevas: n, filasActualizadas: a, filasOmitidas: o } = record
  if (record.estado === 'procesando') {
    return <span className="text-p-muted text-xs" aria-label="En proceso">—</span>
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium flex-wrap">
      {n > 0 && <span className="text-p-lime" title={`${n} nuevas`}><CheckCircle2 size={12} className="inline" aria-hidden /> {n}</span>}
      {a > 0 && <span className="text-p-blue" title={`${a} actualizadas`}><CheckCircle2 size={12} className="inline" aria-hidden /> {a}</span>}
      {o > 0 && <span className="text-p-dark" title={`${o} omitidas`}><AlertTriangle size={12} className="inline" aria-hidden /> {o}</span>}
      {n === 0 && a === 0 && o === 0 && <span className="text-p-muted">—</span>}
    </span>
  )
}

// ─── Filtros desde URL ────────────────────────────────────────────────────────

interface Filtros {
  tipo: string
  estado: string
  desde: string
  hasta: string
  usuario: string
}

function useFiltros() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filtros: Filtros = {
    tipo: searchParams.get('tipo') ?? '',
    estado: searchParams.get('estado') ?? '',
    desde: searchParams.get('desde') ?? '',
    hasta: searchParams.get('hasta') ?? '',
    usuario: searchParams.get('usuario') ?? '',
  }

  const setFiltros = useCallback((patch: Partial<Filtros>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      Object.entries(patch).forEach(([k, v]) => {
        if (v) next.set(k, v)
        else next.delete(k)
      })
      // Preservar la tab activa
      return next
    }, { replace: true })
  }, [setSearchParams])

  return { filtros, setFiltros }
}

// ─── Detalle drawer ───────────────────────────────────────────────────────────

interface DetalleDrawerProps {
  record: ImportacionRecord
  onClose: () => void
  onDownloadAnotado: (id: string) => void
}

function DetalleDrawer({ record, onClose, onDownloadAnotado }: DetalleDrawerProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-label={`Detalle de importación de ${tipoLabel(record.tipo)}`}
        aria-modal="true"
        className="bg-white w-full max-w-md h-full shadow-xl overflow-y-auto flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-p-border shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-p-dark">
              Importación de {tipoLabel(record.tipo)}
            </h3>
            <p className="text-xs text-p-gray mt-0.5">
              {new Date(record.createdAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
              {' · '}por {record.usuarioNombre}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="btn-icon text-p-gray hover:text-p-dark"
          >
            <ChevronDown size={18} aria-hidden className="rotate-90" />
          </button>
        </div>

        <div className="px-5 py-4 flex-1 flex flex-col gap-4">
          {/* Estado */}
          <div className="flex items-center gap-2">
            {estadoBadge(record.estado)}
            {record.finalizedAt && (
              <span className="text-xs text-p-gray">
                Finalizado: {new Date(record.finalizedAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            )}
          </div>

          {/* Métricas */}
          {record.estado !== 'procesando' && (
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-p-border p-3 text-center">
                <p className="text-xl font-bold text-p-lime">{record.filasNuevas}</p>
                <p className="text-xs text-p-gray mt-0.5">Nuevas</p>
              </div>
              <div className="rounded-lg border border-p-border p-3 text-center">
                <p className="text-xl font-bold text-p-blue">{record.filasActualizadas}</p>
                <p className="text-xs text-p-gray mt-0.5">Actualizadas</p>
              </div>
              <div className={`rounded-lg border p-3 text-center ${record.filasOmitidas > 0 ? 'border-p-yellow/30 bg-p-yellow/5' : 'border-p-border'}`}>
                <p className={`text-xl font-bold ${record.filasOmitidas > 0 ? 'text-p-dark' : 'text-p-muted'}`}>
                  {record.filasOmitidas}
                </p>
                <p className="text-xs text-p-gray mt-0.5">Omitidas</p>
              </div>
            </div>
          )}

          {/* Errores */}
          {record.errores.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-p-gray uppercase tracking-wider mb-2">
                Errores ({record.errores.length})
              </p>
              <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {record.errores.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <AlertTriangle size={12} className="text-p-red shrink-0 mt-0.5" aria-hidden />
                    <span>
                      <span className="font-medium text-p-dark">Fila {e.fila}</span>
                      {e.columna ? ` · ${e.columna}` : ''} — {e.mensaje}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Acciones */}
          <div className="mt-auto pt-4 border-t border-p-border flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onDownloadAnotado(record.id)}
              disabled={record.estado === 'procesando' || record.errores.length === 0}
              className="btn-secondary w-full justify-center disabled:opacity-40"
              title={
                record.estado === 'procesando'
                  ? 'Solo disponible cuando la importación finaliza'
                  : record.errores.length === 0
                    ? 'No hay errores en esta importación'
                    : undefined
              }
            >
              <Download size={14} aria-hidden /> Descargar Excel anotado
            </button>
            <div className="relative group">
              <button
                type="button"
                disabled
                className="btn-secondary w-full justify-center opacity-40 cursor-not-allowed"
                aria-describedby="tooltip-original"
              >
                <Download size={14} aria-hidden /> Descargar archivo original
              </button>
              <div
                id="tooltip-original"
                role="tooltip"
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-p-dark text-white text-xs rounded whitespace-nowrap
                  opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10"
              >
                Disponible solo en producción
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-p-dark" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ImportacionesTab ─────────────────────────────────────────────────────────

interface ImportacionListResponse {
  items: ImportacionRecord[]
  total: number
  page: number
  pageSize: number
}

export default function ImportacionesTab({ tenantId, verticalKey = 'r002' }: { tenantId: string; verticalKey?: VerticalKey }) {
  const isEdu = verticalKey === 'r010'
  const queryClient = useQueryClient()
  const toast = useToast()
  const { filtros, setFiltros } = useFiltros()
  const { user } = useAuth()
  const userIsAdmin = isAdmin(user?.rol)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalTipo, setModalTipo] = useState<TipoPlantilla>(isEdu ? 'programas' : 'portafolio')
  const [detalle, setDetalle] = useState<ImportacionRecord | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [sniesModalOpen, setSniesModalOpen] = useState(false)

  // Arrays de tipos según vertical
  const TIPOS = isEdu ? TIPOS_EDU : TIPOS_FMCG
  const defaultTipo = isEdu ? 'programas' : 'portafolio'

  // Endpoints según vertical
  const listEndpoint = isEdu ? 'admin/importaciones/edu' : 'admin/importaciones'
  const queryKey = [isEdu ? 'admin-importaciones-edu' : 'admin-importaciones', tenantId, filtros] as const

  const { data, isLoading, isError, refetch } = useQuery<ImportacionListResponse>({
    queryKey,
    queryFn: () => {
      const p = new URLSearchParams({ tenantId })
      if (filtros.tipo) p.set('tipo', filtros.tipo)
      if (filtros.estado) p.set('estado', filtros.estado)
      if (filtros.desde) p.set('desde', filtros.desde)
      if (filtros.hasta) p.set('hasta', filtros.hasta)
      if (filtros.usuario) p.set('usuario', filtros.usuario)
      return api.get<ImportacionListResponse>(`${listEndpoint}?${p}`).then(r => r.data)
    },
    staleTime: 5_000,
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? []
      return items.some(r => r.estado === 'procesando') ? 3_000 : false
    },
    enabled: !!tenantId,
  })

  const items = data?.items ?? []

  const openModal = (tipo: TipoPlantilla) => {
    setModalTipo(tipo)
    setModalOpen(true)
  }

  const handleConfirmed = useCallback((importId: string) => {
    queryClient.invalidateQueries({ queryKey: [isEdu ? 'admin-importaciones-edu' : 'admin-importaciones', tenantId] })
    if (isEdu) {
      // También refrescar snies-global si es una actualización de base SNIES
      queryClient.invalidateQueries({ queryKey: ['snies-global'] })
    }
    toast.success(`Importación enviada (ID: ${importId.slice(-6)})`)
  }, [queryClient, tenantId, toast, isEdu])

  const handleSniesConfirmed = useCallback((importId: string) => {
    queryClient.invalidateQueries({ queryKey: ['snies-global'] })
    setSniesModalOpen(false)
    toast.success(`Base SNIES actualizada (ID: ${importId.slice(-6)})`)
  }, [queryClient, toast])

  const handleDownloadAnotado = useCallback(async (id: string) => {
    try {
      const res = await api.get<Blob>(`admin/importaciones/${id}/errores.xlsx`, { responseType: 'blob' })
      downloadBlob(res.data, `errores-importacion-${id.slice(-6)}.xlsx`)
    } catch {
      toast.error('No se pudo descargar el Excel anotado.')
    }
  }, [toast])

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-lg font-semibold text-p-dark">Importaciones</h1>
          <p className="text-sm text-p-gray mt-0.5">
            {isEdu
              ? 'Carga masiva de datos educativos: programas, categorías, atributos, calificaciones y asignaciones SNIES.'
              : 'Cargá datos masivos al tenant desde plantillas Excel. Cada importación pasa por un preview antes de aplicarse.'}
          </p>
        </div>
        <div className="shrink-0">
          <button
            type="button"
            onClick={() => openModal(defaultTipo as TipoPlantilla)}
            className="btn-primary whitespace-nowrap"
          >
            <Plus size={16} aria-hidden /> Nueva importación
          </button>
        </div>
      </div>

      {/* Actualizar Base SNIES — solo edu, solo admin */}
      {isEdu && userIsAdmin && (
        <div className="card mb-5 border-blue-100 bg-blue-50/40">
          <div className="flex items-start gap-3">
            <Info size={16} className="text-blue-600 shrink-0 mt-0.5" aria-hidden />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900 mb-0.5">Actualizar Base SNIES global</p>
              <p className="text-xs text-blue-700">
                La base SNIES es compartida entre todos los tenants educación. Esta operación reemplaza completamente
                los datos de competidores SNIES. Solo disponible para rol Admin.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSniesModalOpen(true)}
              className="btn-secondary text-xs py-1.5 shrink-0 whitespace-nowrap"
              aria-label="Subir actualización de base SNIES"
            >
              <Upload size={12} aria-hidden /> Actualizar SNIES
            </button>
          </div>
        </div>
      )}

      {/* Acceso rápido por tipo */}
      <div className="flex flex-wrap gap-2 mb-5">
        {TIPOS.map(tipo => (
          <button
            key={tipo}
            type="button"
            onClick={() => openModal(tipo)}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            <Upload size={12} aria-hidden /> {tipoLabel(tipo)}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="card mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="form-label text-xs">Tipo</label>
            <select
              value={filtros.tipo}
              onChange={e => setFiltros({ tipo: e.target.value })}
              className="form-select text-sm"
              aria-label="Filtrar por tipo de plantilla"
            >
              <option value="">Todos</option>
              {TIPOS.map(t => <option key={t} value={t}>{tipoLabel(t)}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label text-xs">Estado</label>
            <select
              value={filtros.estado}
              onChange={e => setFiltros({ estado: e.target.value })}
              className="form-select text-sm"
              aria-label="Filtrar por estado"
            >
              <option value="">Todos</option>
              <option value="procesando">Procesando</option>
              <option value="exitoso">Exitoso</option>
              <option value="con_advertencias">Con advertencias</option>
              <option value="fallido">Fallido</option>
            </select>
          </div>
          <div>
            <label className="form-label text-xs">Desde</label>
            <input
              type="date"
              value={filtros.desde}
              onChange={e => setFiltros({ desde: e.target.value })}
              className="form-input text-sm"
              aria-label="Fecha desde"
            />
          </div>
          <div>
            <label className="form-label text-xs">Hasta</label>
            <input
              type="date"
              value={filtros.hasta}
              onChange={e => setFiltros({ hasta: e.target.value })}
              className="form-input text-sm"
              aria-label="Fecha hasta"
            />
          </div>
          <div>
            <label className="form-label text-xs">Usuario</label>
            <input
              type="text"
              value={filtros.usuario}
              onChange={e => setFiltros({ usuario: e.target.value })}
              placeholder="Buscar por nombre"
              className="form-input text-sm"
              aria-label="Filtrar por usuario"
            />
          </div>
        </div>
      </div>

      {/* Tabla historial */}
      <div className="card">
        <h2 className="text-sm font-semibold text-p-dark mb-4">Historial de importaciones</h2>

        {isError ? (
          <QueryErrorState onRetry={refetch} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full min-w-[640px]">
              <thead>
                <tr>
                  <th className="text-left">Fecha</th>
                  <th className="text-left">Usuario</th>
                  <th className="text-left">Tipo</th>
                  <th className="text-left">Filas</th>
                  <th className="text-left">Estado</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <SkeletonTable rows={4} columns={6} />
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        title="Sin importaciones"
                        description={isEdu
                          ? 'Aún no se han realizado importaciones para este tenant educativo. Comienza cargando tus programas académicos.'
                          : "Aún no se ha realizado ninguna importación para este tenant. Usá el botón 'Nueva importación' para comenzar."}
                        action={{ label: 'Nueva importación', onClick: () => openModal(defaultTipo as TipoPlantilla) }}
                      />
                    </td>
                  </tr>
                ) : items.map(record => (
                  <Fragment key={record.id}>
                    <tr
                      className="cursor-pointer"
                      onClick={() => setDetalle(detalle?.id === record.id ? null : record)}
                    >
                      <td className="text-sm whitespace-nowrap text-p-dark">
                        {new Date(record.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="text-sm text-p-gray">{record.usuarioNombre}</td>
                      <td className="text-sm font-medium text-p-dark">{tipoLabel(record.tipo)}</td>
                      <td>{filasCell(record)}</td>
                      <td>{estadoBadge(record.estado)}</td>
                      <td>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation()
                            setExpanded(expanded === record.id ? null : record.id)
                          }}
                          aria-label={expanded === record.id ? 'Colapsar errores' : 'Ver errores'}
                          aria-expanded={expanded === record.id}
                          className="btn-icon text-p-muted hover:text-p-dark"
                          disabled={record.errores.length === 0 || record.estado === 'procesando'}
                        >
                          {expanded === record.id
                            ? <ChevronUp size={14} aria-hidden />
                            : <ChevronDown size={14} aria-hidden />}
                        </button>
                      </td>
                    </tr>

                    {expanded === record.id && record.errores.length > 0 && (
                      <tr>
                        <td colSpan={6} className="py-0 px-4 bg-p-bg/30">
                          <div className="py-3">
                            <p className="text-[10px] font-semibold text-p-muted uppercase tracking-wider mb-2">
                              Errores ({record.errores.length})
                            </p>
                            <ul className="space-y-1 max-h-36 overflow-y-auto">
                              {record.errores.map((e, i) => (
                                <li key={i} className="text-xs text-p-red flex items-start gap-1.5">
                                  <AlertTriangle size={11} className="shrink-0 mt-0.5" aria-hidden />
                                  <span>
                                    <span className="font-medium text-p-dark">Fila {e.fila}</span>
                                    {e.columna ? ` · ${e.columna}` : ''} — {e.mensaje}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleDownloadAnotado(record.id)}
                                className="btn-secondary text-xs py-1"
                              >
                                <Download size={12} aria-hidden /> Excel anotado
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de upload (tipos normales) */}
      <UploadPlantillaModal
        tipo={modalTipo}
        tenantId={tenantId}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirmed={handleConfirmed}
      />

      {/* Modal actualización SNIES global (solo admin edu) */}
      {isEdu && userIsAdmin && (
        <UploadPlantillaModal
          tipo="snies_update"
          tenantId={tenantId}
          isOpen={sniesModalOpen}
          onClose={() => setSniesModalOpen(false)}
          onConfirmed={handleSniesConfirmed}
        />
      )}

      {/* Drawer de detalle */}
      {detalle && (
        <DetalleDrawer
          record={detalle}
          onClose={() => setDetalle(null)}
          onDownloadAnotado={handleDownloadAnotado}
        />
      )}
    </div>
  )
}
