import { useState, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity, Upload,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import api from '../lib/api'
import type { ScraperHistorialRow } from '../lib/types'
import { MAX_SCRAPER_FILE_SIZE_BYTES } from '../lib/templateSpecs'
import { useTenantActivo } from '../lib/TenantActivoContext'

export default function MonitoreoScraperPage() {
  const { tenantId } = useTenantActivo()

  return (
    <div className="space-y-6">
      <UploadManual tenantId={tenantId} />
      <HistorialSection tenantId={tenantId} />
    </div>
  )
}

// ─── Upload Manual ────────────────────────────────────────────────────────────

function UploadManual({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ procesados: number; errores: string[] } | null>(null)

  const handleFile = useCallback(async (file: File) => {
    const lower = file.name.toLowerCase()
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.csv')) {
      setResult({ procesados: 0, errores: ['Solo se aceptan archivos .xlsx o .csv'] })
      return
    }
    if (file.size > MAX_SCRAPER_FILE_SIZE_BYTES) {
      setResult({ procesados: 0, errores: ['El archivo excede el límite de 30 MB'] })
      return
    }
    setUploading(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post<{ procesados: number; errores: string[] }>(
        `admin/scraper/upload?tenantId=${tenantId}`, formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      setResult(res.data)
      queryClient.invalidateQueries({ queryKey: ['scraper-status', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['scraper-historial', tenantId] })
    } catch {
      setResult({ procesados: 0, errores: ['Error al procesar el archivo'] })
    } finally {
      setUploading(false)
    }
  }, [tenantId, queryClient])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-p-dark mb-3 flex items-center gap-2">
        <Upload size={16} className="text-p-lime" /> Carga manual de precios de mercado
      </h3>
      <p className="text-xs text-p-gray mb-4">
        Formato wide single-table: <span className="font-mono">EAN, Retailer, Fecha, Precio, Promo, Disponibilidad</span>. Una fila por observación. Precios en 0 o vacíos se ignoran.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
          ${isDragOver ? 'border-p-lime bg-p-lime/10' : 'border-p-border hover:border-p-muted hover:bg-white/5'}`}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.csv" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
        {uploading ? (
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-p-lime border-t-transparent" />
            <p className="text-sm text-p-muted">Procesando…</p>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <Upload className={`w-6 h-6 ${isDragOver ? 'text-p-lime' : 'text-p-muted'}`} />
            <div className="text-left">
              <p className="text-sm text-p-dark">Arrastra el archivo .xlsx o .csv aquí</p>
              <p className="text-xs text-p-muted">o haz clic para seleccionar (máx. 30 MB)</p>
            </div>
          </div>
        )}
      </div>

      {result && (
        <div className={`mt-3 rounded-lg px-4 py-3 border ${result.errores.length > 0 ? 'bg-yellow-900/20 border-yellow-600/40' : 'bg-green-900/20 border-green-700/40'}`}>
          <p className="text-sm text-p-dark">
            {result.procesados} registro{result.procesados !== 1 ? 's' : ''} procesado{result.procesados !== 1 ? 's' : ''}
            {result.errores.length > 0 && (
              <span className="text-yellow-300"> · {result.errores.length} advertencia{result.errores.length !== 1 ? 's' : ''}</span>
            )}
          </p>
          {result.errores.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {result.errores.slice(0, 5).map((e, i) => <li key={i} className="text-xs text-yellow-300">• {e}</li>)}
              {result.errores.length > 5 && <li className="text-xs text-p-muted">…y {result.errores.length - 5} más</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Historial ────────────────────────────────────────────────────────────────

function HistorialSection({ tenantId }: { tenantId: string }) {
  const { data: historial = [], isLoading } = useQuery<ScraperHistorialRow[]>({
    queryKey: ['scraper-historial', tenantId],
    queryFn: () => api.get<ScraperHistorialRow[]>(`admin/scraper/historial?tenantId=${tenantId}`).then(r => r.data),
  })

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <div className="card overflow-x-auto">
      <h3 className="text-sm font-semibold text-p-dark mb-4 flex items-center gap-2">
        <Activity size={16} className="text-p-muted" /> Historial de cargas
      </h3>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-p-lime border-t-transparent" />
        </div>
      ) : historial.length === 0 ? (
        <p className="text-center py-8 text-p-muted text-sm">Sin cargas registradas</p>
      ) : (
        <table className="data-table w-full">
          <thead>
            <tr>
              <th className="text-left">Fecha</th>
              <th className="text-left">Tenant</th>
              <th className="text-left">Archivo</th>
              <th className="text-right">Recibidos</th>
              <th className="text-right">Procesados</th>
              <th className="text-right">Errores</th>
              <th className="text-center">Estado</th>
              <th className="text-left">Subido por</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {historial.map(row => (
              <>
                <tr key={row.id}>
                  <td className="text-xs text-p-muted whitespace-nowrap">
                    {new Date(row.fecha).toLocaleDateString('es-CO', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="text-xs text-p-muted">{row.tenantNombre ?? '—'}</td>
                  <td className="text-xs text-p-muted truncate max-w-[160px]">{row.nombreArchivo ?? '—'}</td>
                  <td className="text-right text-sm text-p-muted">
                    {row.registrosRecibidos != null ? row.registrosRecibidos.toLocaleString('es-CO') : '—'}
                  </td>
                  <td className="text-right text-sm text-p-dark">{row.registrosProcesados.toLocaleString('es-CO')}</td>
                  <td className="text-right">
                    {row.totalErrores > 0
                      ? <span className="text-p-yellow text-sm">{row.totalErrores}</span>
                      : <span className="text-p-muted text-sm">0</span>}
                  </td>
                  <td className="text-center">
                    <EstadoBadge estado={row.estado} />
                  </td>
                  <td className="text-xs text-p-muted">{row.subidoPor ?? '—'}</td>
                  <td className="text-center">
                    {row.errores.length > 0 && (
                      <button onClick={() => toggle(row.id)} className="text-p-muted hover:text-p-dark">
                        {expanded.has(row.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                  </td>
                </tr>
                {expanded.has(row.id) && row.errores.length > 0 && (
                  <tr key={`${row.id}-errors`}>
                    <td colSpan={9} className="bg-p-bg px-4 py-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-p-muted border-b border-p-border">
                            <th className="text-left py-1 pr-3 w-16">Fila</th>
                            <th className="text-left py-1 pr-3 w-32">Columna</th>
                            <th className="text-left py-1 pr-3 w-40">Valor recibido</th>
                            <th className="text-left py-1">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.errores.map((e, i) => (
                            <tr key={i}>
                              <td className="py-1 pr-3 text-p-muted">{e.fila}</td>
                              <td className="py-1 pr-3 text-p-muted">{e.columna ?? '—'}</td>
                              <td className="py-1 pr-3 font-mono text-p-dark">
                                {e.valor === null ? '—' : e.valor === '' ? <span className="italic text-p-muted">(vacío)</span> : e.valor}
                              </td>
                              <td className="py-1 text-p-red">{e.mensaje}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function EstadoBadge({ estado }: { estado: ScraperHistorialRow['estado'] }) {
  if (estado === 'completado')
    return <span className="badge badge-green">Completado</span>
  if (estado === 'completado_con_errores')
    return <span className="badge badge-yellow">Con errores</span>
  if (estado === 'error')
    return <span className="badge badge-red">Error</span>
  return <span className="badge">Procesando…</span>
}
