import { useState, useRef, useCallback, Fragment } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Upload, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import api from '../../lib/api'
import type { ImportacionRecord } from '../../lib/types'
import { SkeletonTable } from '../../components/Skeleton'
import QueryErrorState from '../../components/QueryErrorState'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../components/useToast'
import { downloadBlob } from '../../lib/download'

// ─── ImportacionesTab ─────────────────────────────────────────────────────────

function ImportacionesTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: historial = [], isLoading, isError, refetch } = useQuery<ImportacionRecord[]>({
    queryKey: ['reglas-importaciones', tenantId],
    queryFn: () => api.get<ImportacionRecord[]>(`reglas/portafolio/importaciones?tenantId=${tenantId}`).then(r => r.data),
  })

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get(`reglas/portafolio/plantilla?tenantId=${tenantId}`, { responseType: 'blob' })
      downloadBlob(res.data as Blob, 'plantilla-portafolio.xlsx')
    } catch { /* silent */ }
  }

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.xlsx') || file.size > 5 * 1024 * 1024) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.post(`reglas/portafolio/upload?tenantId=${tenantId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      queryClient.invalidateQueries({ queryKey: ['reglas-importaciones', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['reglas-portafolio', tenantId] })
      toast.success('Archivo importado correctamente')
    } catch (err) {
      toast.error('No se pudo importar: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    } finally {
      setUploading(false)
    }
  }, [tenantId, queryClient, toast])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const estadoBadge = (estado: ImportacionRecord['estado']) => {
    if (estado === 'exitoso') return <span className="badge badge-green">Exitoso</span>
    if (estado === 'con_advertencias') return <span className="badge badge-yellow">Con advertencias</span>
    return <span className="badge badge-red">Fallido</span>
  }

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Carga el portafolio de productos desde la plantilla Excel. Cada importación queda registrada en el historial.
      </p>

      <div className="flex items-center gap-3 mb-4">
        <button onClick={handleDownloadTemplate} className="btn-secondary flex items-center gap-2">
          <Download size={15} /> Descargar plantilla
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${isDragOver ? 'border-p-lime bg-p-lime/10' : 'border-p-border hover:border-p-muted hover:bg-white/5'}`}
      >
        <input ref={inputRef} type="file" accept=".xlsx" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-p-lime border-t-transparent" />
            <p className="text-sm text-p-muted">Procesando archivo…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className={`w-8 h-8 ${isDragOver ? 'text-p-lime' : 'text-p-muted'}`} />
            <div>
              <p className="text-sm text-p-dark">Arrastra la plantilla .xlsx aquí</p>
              <p className="text-xs text-p-muted mt-1">o haz clic para seleccionar (máx. 5MB)</p>
            </div>
          </div>
        )}
      </div>

      {/* Historial */}
      <div className="card mt-6">
        <h3 className="text-sm font-semibold text-p-dark mb-4">Historial de importaciones</h3>
        {isError ? (
          <QueryErrorState onRetry={refetch} />
        ) : (
          <div className="overflow-x-auto">
          <table className="data-table w-full min-w-[560px]">
            <thead>
              <tr>
                <th className="text-left">Fecha</th>
                <th className="text-left">Archivo</th>
                <th className="text-center">SKUs</th>
                <th className="text-center">Advertencias</th>
                <th className="text-center">Estado</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonTable rows={3} columns={6} />
              ) : historial.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title="Sin importaciones"
                      description="Aún no se ha cargado ningún archivo. Usa la zona de arrastre para importar el portafolio."
                    />
                  </td>
                </tr>
              ) : historial.map(imp => (
                <Fragment key={imp.id}>
                  <tr>
                    <td className="text-sm text-p-dark whitespace-nowrap">
                      {new Date(imp.fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="text-sm text-p-gray font-mono">{imp.archivo}</td>
                    <td className="text-center text-sm font-medium text-p-dark">{imp.totalSkus}</td>
                    <td className="text-center">
                      {imp.advertencias > 0
                        ? <span className="text-sm text-p-yellow font-medium">{imp.advertencias}</span>
                        : <span className="text-sm text-p-muted">—</span>}
                    </td>
                    <td className="text-center">{estadoBadge(imp.estado)}</td>
                    <td className="text-center">
                      {imp.errores.length > 0 && (
                        <button
                          onClick={() => setExpanded(expanded === imp.id ? null : imp.id)}
                          aria-label={expanded === imp.id ? 'Colapsar errores' : 'Expandir errores'}
                          aria-expanded={expanded === imp.id}
                          className="btn-icon text-p-muted hover:text-p-dark"
                        >
                          {expanded === imp.id
                            ? <ChevronUp size={15} aria-hidden />
                            : <ChevronDown size={15} aria-hidden />}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded === imp.id && (
                    <tr>
                      <td colSpan={6} className="py-0 px-4 bg-p-bg/40">
                        <div className="py-3">
                          <p className="text-[10px] font-semibold text-p-muted uppercase tracking-wider mb-2">Detalle</p>
                          <ul className="space-y-1">
                            {imp.errores.map((e, i) => (
                              <li key={i} className="text-xs text-p-yellow flex items-start gap-2">
                                <AlertTriangle size={12} aria-hidden className="shrink-0 mt-0.5" />
                                {e}
                              </li>
                            ))}
                          </ul>
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
    </div>
  )
}

export default ImportacionesTab
