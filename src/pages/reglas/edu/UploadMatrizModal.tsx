import { useRef, useId, useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Upload, X, AlertTriangle, CheckCircle2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useFocusTrap } from '../../../lib/useFocusTrap'
import { useToast } from '../../../components/ToastProvider'
import api from '../../../lib/api'
import type {
  MatrizPreferencia,
  MatrizPreferenciaColumna,
  MatrizPreferenciaColumnaAtributoNivel,
  MatrizPreferenciaColumnaMarca,
  MatrizPreferenciaColumnaPrecio,
} from '../../../lib/types'

// ─── Constantes ───────────────────────────────────────────────────────────────

const MAX_FILE_BYTES = 10 * 1024 * 1024

// Regex para detectar headers de precio, ej: "$ 9.900.000" o "$9900000"
const PRECIO_REGEX = /^\$\s*[\d.,]+$/

// ─── Tipos internos ───────────────────────────────────────────────────────────

type Paso = 1 | 2 | 3 | 4 | 5 | 6

interface CatalogoItem { nombre: string }

interface AtributoR010ParItem { nombre: string; peso: number; orden: number }

/**
 * Atributo definido por el usuario para ESTA matriz (decisión 5 — 2026-05-06).
 * Vive aislado del catálogo R-010 del tenant: el autocompletar solo copia el
 * nombre como sugerencia, sin link interno.
 */
interface AtributoDefinido {
  id: string
  nombre: string
  niveles: string[]
}

interface EtiquetaColumna {
  headerOriginal: string
  columnIndex: number
  tipo: 'marca' | 'atributo'
  // si tipo='marca'
  nombreMarca: string
  esPropiaTenant: boolean
  // si tipo='atributo': referencia a un AtributoDefinido + uno de sus niveles
  atributoId: string
  nivelNombre: string
}

const newAttrId = () => `atr-${Math.random().toString(36).slice(2, 9)}`

// ─── Utilidades CSV/XLSX ──────────────────────────────────────────────────────

function detectSeparator(firstLine: string): string {
  const semicolons = (firstLine.match(/;/g) ?? []).length
  const commas = (firstLine.match(/,/g) ?? []).length
  return semicolons >= commas ? ';' : ','
}

function parseNumber(raw: string): number {
  // Formato colombiano: "1.234.567,89" o "1,234,567.89" o "9900000"
  const s = String(raw).trim()
  // Si tiene coma como decimal (formato español): eliminar puntos y reemplazar coma
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(s)) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.'))
  }
  // Formato estándar
  return parseFloat(s.replace(/[^\d.-]/g, '')) || 0
}

function parsePrecioHeader(header: string): number {
  // "$ 9.900.000" → 9900000
  return parseNumber(header.replace('$', '').trim())
}

async function parseArchivo(file: File): Promise<{ headers: string[]; rows: number[][] } | null> {
  const ext = file.name.toLowerCase().split('.').pop()
  if (ext === 'xlsx' || ext === 'xls') {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    if (!ws) return null
    const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 })
    const headers = (data[0] as string[]).map(h => String(h ?? '').trim())
    const rows = (data.slice(1) as unknown[][])
      .filter(r => r.some(v => v !== undefined && v !== null && String(v).trim() !== ''))
      .map(r => headers.map((_, ci) => {
        const v = r[ci]
        if (v === undefined || v === null || String(v).trim() === '') return 0
        return typeof v === 'number' ? v : parseNumber(String(v))
      }))
    return { headers, rows }
  }

  if (ext === 'csv') {
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')
    if (lines.length < 2) return null
    const sep = detectSeparator(lines[0])
    const headers = lines[0].split(sep).map(h => h.replace(/["']/g, '').trim())
    const rows = lines.slice(1).map(line =>
      line.split(sep).map(cell => parseNumber(cell.replace(/["']/g, '').trim()))
    )
    return { headers, rows }
  }

  return null
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function PasoIndicador({ actual, total }: { actual: Paso; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-5">
      {Array.from({ length: total }, (_, i) => i + 1).map(n => (
        <div key={n} className="flex items-center gap-1.5">
          <div
            className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center border transition-colors ${
              n < actual
                ? 'bg-p-lime border-p-lime text-p-dark'
                : n === actual
                  ? 'bg-p-lime/20 border-p-lime text-p-lime'
                  : 'bg-transparent border-p-border text-p-muted'
            }`}
            aria-current={n === actual ? 'step' : undefined}
          >
            {n < actual ? <CheckCircle2 size={14} aria-hidden /> : n}
          </div>
          {n < total && <div className={`flex-1 h-px w-6 ${n < actual ? 'bg-p-lime' : 'bg-p-border'}`} />}
        </div>
      ))}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface UploadMatrizModalProps {
  isOpen: boolean
  tenantId: string
  tenantNombre: string
  onClose: () => void
  onConfirmed: () => void
}

export default function UploadMatrizModal({ isOpen, tenantId, tenantNombre, onClose, onConfirmed }: UploadMatrizModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  useFocusTrap(dialogRef, isOpen)

  // ── Paso 1: Identificación (tenant heredado del contexto) ────────────────

  const [paso, setPaso] = useState<Paso>(1)
  const [facultadEscuela, setFacultadEscuela] = useState('')
  const [nivelEducativo, setNivelEducativo] = useState('')
  const [ciudad, setCiudad] = useState('')

  const { data: facultades = [] } = useQuery<CatalogoItem[]>({
    queryKey: ['facultades-escuelas', tenantId],
    queryFn: () => api.get<CatalogoItem[]>(`reglas/facultades-escuelas?tenantId=${tenantId}`).then(r => r.data),
    staleTime: 120_000,
    enabled: isOpen && !!tenantId,
  })

  const { data: niveles = [] } = useQuery<CatalogoItem[]>({
    queryKey: ['niveles-educativos', tenantId],
    queryFn: () => api.get<CatalogoItem[]>(`reglas/niveles-educativos?tenantId=${tenantId}`).then(r => r.data),
    staleTime: 120_000,
    enabled: isOpen && !!tenantId,
  })

  const { data: ciudades = [] } = useQuery<CatalogoItem[]>({
    queryKey: ['ciudades-edu', tenantId],
    queryFn: () => api.get<CatalogoItem[]>(`reglas/ciudades?tenantId=${tenantId}`).then(r => r.data),
    staleTime: 120_000,
    enabled: isOpen && !!tenantId,
  })

  const paso1Valido = !!tenantId && !!facultadEscuela && !!nivelEducativo && !!ciudad

  // ── Paso 2: Upload ────────────────────────────────────────────────────────

  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFileSelect = useCallback(async (selected: File) => {
    setFileError(null)
    if (selected.size > MAX_FILE_BYTES) {
      setFileError(`Archivo demasiado grande (${(selected.size / 1024 / 1024).toFixed(1)} MB). Máximo 10 MB.`)
      return
    }
    const ext = selected.name.toLowerCase().split('.').pop()
    if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
      setFileError('Solo se aceptan archivos .csv o .xlsx')
      return
    }
    setFile(selected)
  }, [])

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) void handleFileSelect(f)
  }, [handleFileSelect])

  // ── Paso 3: Auto-detección ────────────────────────────────────────────────

  const [parsedHeaders, setParsedHeaders] = useState<string[]>([])
  const [parsedRows, setParsedRows] = useState<number[][]>([])
  const [colIndicesOptin, setColIndicesOptin] = useState<number[]>([])
  const [colIndicesPrecio, setColIndicesPrecio] = useState<number[]>([])
  const [colIndicesEtiquetar, setColIndicesEtiquetar] = useState<number[]>([])
  const [parseError, setParseError] = useState<string | null>(null)

  const ejecutarParseo = useCallback(async () => {
    if (!file) return
    setParseError(null)
    try {
      const resultado = await parseArchivo(file)
      if (!resultado) {
        setParseError('No se pudo leer el archivo. Verifica que no esté corrupto.')
        return false
      }
      const { headers, rows } = resultado
      if (headers.length < 4) {
        setParseError('El archivo tiene muy pocas columnas (mínimo 4: Opt-in, ≥1 marca, ≥2 precios).')
        return false
      }

      const optinIdx = [0] // col 0 siempre es Opt-in
      const precioIdxs: number[] = []
      const etiquetarIdxs: number[] = []

      headers.forEach((h, i) => {
        if (i === 0) return // Opt-in
        if (PRECIO_REGEX.test(h.trim())) {
          precioIdxs.push(i)
        } else {
          etiquetarIdxs.push(i)
        }
      })

      if (precioIdxs.length < 2) {
        setParseError('No se detectaron columnas de precio (mínimo 2). Los headers de precio deben tener el formato "$ 9.900.000".')
        return false
      }

      setParsedHeaders(headers)
      setParsedRows(rows)
      setColIndicesOptin(optinIdx)
      setColIndicesPrecio(precioIdxs)
      setColIndicesEtiquetar(etiquetarIdxs)

      // Inicializar etiquetas — todas como Marca por defecto. Si el usuario define
      // atributos en el paso 4, podrá cambiar el tipo en el paso 5.
      setEtiquetas(etiquetarIdxs.map(ci => ({
        headerOriginal: headers[ci],
        columnIndex: ci,
        tipo: 'marca' as const,
        nombreMarca: headers[ci],
        esPropiaTenant: false,
        atributoId: '',
        nivelNombre: '',
      })))

      return true
    } catch {
      setParseError('Error inesperado al parsear el archivo.')
      return false
    }
  }, [file])

  // ── Paso 4: Definir atributos cualitativos (decisión 5 — 2026-05-06) ────────

  const [atributosDef, setAtributosDef] = useState<AtributoDefinido[]>([])

  // Catálogo R-010 del tenant filtrado por par (facultad, ciudad). Solo se usa
  // como AUTOCOMPLETAR: copia el nombre, sin link interno (los atributos de la
  // matriz viven aislados).
  const { data: r010Catalogo = [] } = useQuery<AtributoR010ParItem[]>({
    queryKey: ['reglas-atributos-r010', tenantId, facultadEscuela, ciudad],
    queryFn: () =>
      api.get<AtributoR010ParItem[]>(
        `reglas/atributos-r010?tenantId=${tenantId}&facultad=${encodeURIComponent(facultadEscuela)}&ciudad=${encodeURIComponent(ciudad)}`,
      ).then(r => r.data),
    enabled: isOpen && paso >= 4 && !!tenantId && !!facultadEscuela && !!ciudad,
    staleTime: 120_000,
  })

  const addAtributoManual = () => {
    setAtributosDef(prev => [...prev, { id: newAttrId(), nombre: '', niveles: [] }])
  }
  const addAtributoFromR010 = (nombre: string) => {
    if (atributosDef.some(a => a.nombre.trim().toLowerCase() === nombre.trim().toLowerCase())) return
    setAtributosDef(prev => [...prev, { id: newAttrId(), nombre, niveles: [] }])
  }
  const updateAtributoNombre = (id: string, nombre: string) => {
    setAtributosDef(prev => prev.map(a => a.id === id ? { ...a, nombre } : a))
  }
  const addNivel = (id: string, nivel: string) => {
    const t = nivel.trim()
    if (!t) return
    setAtributosDef(prev => prev.map(a =>
      a.id === id && !a.niveles.some(n => n.toLowerCase() === t.toLowerCase())
        ? { ...a, niveles: [...a.niveles, t] }
        : a,
    ))
  }
  const removeNivel = (id: string, nivel: string) => {
    setAtributosDef(prev => prev.map(a =>
      a.id === id ? { ...a, niveles: a.niveles.filter(n => n !== nivel) } : a,
    ))
    // Si alguna columna mapeaba a este nivel, limpiar la referencia
    setEtiquetas(prev => prev.map(e =>
      e.atributoId === id && e.nivelNombre === nivel ? { ...e, nivelNombre: '' } : e,
    ))
  }
  const removeAtributo = (id: string) => {
    setAtributosDef(prev => prev.filter(a => a.id !== id))
    // Columnas que apuntaban a este atributo regresan a 'marca' por defecto
    setEtiquetas(prev => prev.map(e =>
      e.atributoId === id
        ? { ...e, tipo: 'marca' as const, atributoId: '', nivelNombre: '' }
        : e,
    ))
  }

  const paso4Errores = (): string[] => {
    const errs: string[] = []
    atributosDef.forEach((a, i) => {
      if (!a.nombre.trim()) errs.push(`Atributo ${i + 1}: falta el nombre.`)
      if (a.niveles.length === 0) errs.push(`Atributo "${a.nombre || `#${i + 1}`}": debe tener al menos un nivel.`)
    })
    const dupNombres = atributosDef.map(a => a.nombre.trim().toLowerCase()).filter(Boolean)
    if (new Set(dupNombres).size !== dupNombres.length) {
      errs.push('No puede haber atributos con el mismo nombre.')
    }
    return errs
  }

  // ── Paso 5: Mapeo de columnas ──────────────────────────────────────────────

  const [etiquetas, setEtiquetas] = useState<EtiquetaColumna[]>([])

  const updateEtiqueta = useCallback((ci: number, patch: Partial<EtiquetaColumna>) => {
    setEtiquetas(prev => prev.map(e => e.columnIndex === ci ? { ...e, ...patch } : e))
  }, [])

  const paso5Errores = (): string[] => {
    const errs: string[] = []
    const marcas = etiquetas.filter(e => e.tipo === 'marca')
    if (marcas.length === 0) errs.push('Debe haber al menos 1 columna etiquetada como Marca.')
    if (marcas.some(e => !e.nombreMarca.trim())) errs.push('Todas las marcas deben tener nombre.')
    etiquetas.filter(e => e.tipo === 'atributo').forEach(e => {
      if (!e.atributoId) errs.push(`Columna "${e.headerOriginal}": selecciona el atributo.`)
      else if (!e.nivelNombre) errs.push(`Columna "${e.headerOriginal}": selecciona el nivel.`)
    })
    if (etiquetas.some(e => e.tipo === 'atributo') && atributosDef.length === 0) {
      errs.push('Hay columnas etiquetadas como Atributo pero no definiste ningún atributo en el paso anterior.')
    }
    return errs
  }

  // ── Paso 6: Marca propia + confirmar ───────────────────────────────────────

  const setMarcaPropia = useCallback((ci: number) => {
    setEtiquetas(prev => prev.map(e => ({
      ...e,
      esPropiaTenant: e.tipo === 'marca' ? e.columnIndex === ci : false,
    })))
  }, [])

  const paso6Errores = (): string[] => {
    const errs: string[] = []
    const marcas = etiquetas.filter(e => e.tipo === 'marca')
    const propias = marcas.filter(e => e.esPropiaTenant)
    if (propias.length === 0) errs.push('Debe indicar cuál es la marca del tenant.')
    if (propias.length > 1) errs.push('Solo puede haber una marca del tenant.')
    return errs
  }

  const buildPayload = (): MatrizPreferencia => {
    const idToNombre = new Map(atributosDef.map(a => [a.id, a.nombre.trim()]))

    const columnas: MatrizPreferenciaColumna[] = [
      { kind: 'optin', columnIndex: 0 },
      ...etiquetas.map((e): MatrizPreferenciaColumna => {
        if (e.tipo === 'marca') {
          return {
            kind: 'marca',
            nombre: e.nombreMarca.trim(),
            esPropiaTenant: e.esPropiaTenant,
            columnIndex: e.columnIndex,
          } satisfies MatrizPreferenciaColumnaMarca
        }
        return {
          kind: 'atributo',
          atributoNombre: idToNombre.get(e.atributoId) ?? '',
          nivelNombre: e.nivelNombre,
          columnIndex: e.columnIndex,
        } satisfies MatrizPreferenciaColumnaAtributoNivel
      }),
      ...colIndicesPrecio.map((ci): MatrizPreferenciaColumnaPrecio => ({
        kind: 'precio',
        precio: parsePrecioHeader(parsedHeaders[ci]),
        columnIndex: ci,
      })),
    ].sort((a, b) => a.columnIndex - b.columnIndex)

    const marcas = etiquetas.filter(e => e.tipo === 'marca').map(e => e.nombreMarca.trim())
    const marcaPropia = etiquetas.find(e => e.tipo === 'marca' && e.esPropiaTenant)?.nombreMarca.trim() ?? ''

    // Atributos definidos en el paso 4 — viven aislados de la matriz, sin link a R-010
    const atributos = atributosDef.map(a => ({ nombre: a.nombre.trim(), niveles: [...a.niveles] }))

    const precios = colIndicesPrecio.map(ci => parsePrecioHeader(parsedHeaders[ci]))

    return {
      id: '',
      tenantId,
      tenantNombre,
      facultadEscuela,
      nivelEducativo,
      ciudad,
      fechaSubida: '',
      nombreArchivo: file?.name ?? '',
      columnas,
      encuestados: parsedRows,
      marcas,
      marcaPropia,
      atributos,
      precios,
    }
  }

  const saveMutation = useMutation({
    mutationFn: (payload: MatrizPreferencia) =>
      api.post<MatrizPreferencia>('reglas/matrices-preferencia', payload).then(r => r.data),
    onSuccess: () => {
      toast.success('Matriz guardada correctamente')
      onConfirmed()
      handleClose()
    },
    onError: () => {
      toast.error('No se pudo guardar la matriz. Intenta de nuevo.')
    },
  })

  // ── Navegación entre pasos ────────────────────────────────────────────────

  const avanzar = useCallback(async () => {
    if (paso === 2) {
      const ok = await ejecutarParseo()
      if (!ok) return
    }
    setPaso(p => Math.min(6, p + 1) as Paso)
  }, [paso, ejecutarParseo])

  const retroceder = () => {
    setPaso(p => Math.max(1, p - 1) as Paso)
  }

  const handleClose = () => {
    setPaso(1)
    setFacultadEscuela('')
    setNivelEducativo('')
    setCiudad('')
    setFile(null)
    setFileError(null)
    setParsedHeaders([])
    setParsedRows([])
    setAtributosDef([])
    setEtiquetas([])
    setParseError(null)
    onClose()
  }

  if (!isOpen) return null

  const erroresAtributos = paso4Errores()
  const erroresMapeo     = paso5Errores()
  const erroresMarca     = paso6Errores()
  const pasoActualValido =
    paso === 1 ? paso1Valido :
    paso === 2 ? !!file && !fileError :
    paso === 3 ? parsedHeaders.length > 0 && !parseError :
    paso === 4 ? erroresAtributos.length === 0 :
    paso === 5 ? erroresMapeo.length === 0 :
    paso === 6 ? erroresMarca.length === 0 :
    true

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} aria-hidden />

      {/* Panel */}
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-6 mx-4"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <h2 id={titleId} className="text-xl font-bold text-p-dark">Subir Matriz de Preferencia</h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Cerrar modal"
            className="text-p-muted hover:text-p-dark transition-colors ml-4 shrink-0"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <PasoIndicador actual={paso} total={6} />

        {/* ── Paso 1: Identificación (tenant heredado del contexto) ── */}
        {paso === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-p-gray">Selecciona la combinación (Facultad/Escuela · Nivel Educativo · Ciudad) que identificará esta matriz.</p>

            <div className="bg-p-bg border border-p-border rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-p-muted">Tenant</span>
              <span className="text-sm font-medium text-p-dark">{tenantNombre}</span>
            </div>

            <div>
              <label htmlFor="mp-facultad" className="form-label">Facultad / Escuela</label>
              <select
                id="mp-facultad"
                value={facultadEscuela}
                onChange={e => setFacultadEscuela(e.target.value)}
                className="form-select w-full"
              >
                <option value="">Seleccionar facultad...</option>
                {facultades.map(f => <option key={f.nombre} value={f.nombre}>{f.nombre}</option>)}
              </select>
              {facultades.length === 0 && (
                <p className="text-xs text-p-muted mt-1">Este tenant no tiene facultades configuradas. Configúralas en la pestaña Facultad/Escuela.</p>
              )}
            </div>

            <div>
              <label htmlFor="mp-nivel" className="form-label">Nivel Educativo</label>
              <select
                id="mp-nivel"
                value={nivelEducativo}
                onChange={e => setNivelEducativo(e.target.value)}
                className="form-select w-full"
              >
                <option value="">Seleccionar nivel...</option>
                {niveles.map(n => <option key={n.nombre} value={n.nombre}>{n.nombre}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="mp-ciudad" className="form-label">Ciudad</label>
              <select
                id="mp-ciudad"
                value={ciudad}
                onChange={e => setCiudad(e.target.value)}
                className="form-select w-full"
              >
                <option value="">Seleccionar ciudad...</option>
                {ciudades.map(c => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
              </select>
              {ciudades.length === 0 && (
                <p className="text-xs text-p-muted mt-1">Este tenant no tiene ciudades configuradas. Configúralas en la pestaña Ciudades.</p>
              )}
            </div>
          </div>
        )}

        {/* ── Paso 2: Upload ── */}
        {paso === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-p-gray">
              Sube el archivo CSV o XLSX en formato wide: filas = encuestados, columnas = coeficientes β.
            </p>

            <div
              role="button"
              tabIndex={0}
              aria-label="Zona de carga de archivo"
              onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                isDragOver ? 'border-p-blue bg-p-blue/5' : 'border-p-border hover:border-p-blue/50'
              }`}
            >
              <Upload size={32} className="mx-auto mb-2 text-p-muted" aria-hidden />
              <p className="text-sm font-medium text-p-gray">
                {file ? file.name : 'Arrastra aquí o haz clic para seleccionar'}
              </p>
              <p className="text-xs text-p-muted mt-1">.csv o .xlsx · máx. 10 MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="sr-only"
              aria-hidden
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) void handleFileSelect(f)
              }}
            />

            {fileError && (
              <div role="alert" className="flex items-start gap-2 text-sm text-p-red bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
                {fileError}
              </div>
            )}
          </div>
        )}

        {/* ── Paso 3: Auto-detección ── */}
        {paso === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-p-gray">Revisando estructura del archivo...</p>

            {parseError ? (
              <div role="alert" className="flex items-start gap-2 text-sm text-p-red bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
                {parseError}
              </div>
            ) : parsedHeaders.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="card p-3 text-center">
                    <p className="text-xs text-p-muted">Encuestados</p>
                    <p className="text-xl font-bold text-p-dark">{parsedRows.length}</p>
                  </div>
                  <div className="card p-3 text-center">
                    <p className="text-xs text-p-muted">Columnas precio</p>
                    <p className="text-xl font-bold text-p-dark">{colIndicesPrecio.length}</p>
                  </div>
                  <div className="card p-3 text-center">
                    <p className="text-xs text-p-muted">Para etiquetar</p>
                    <p className="text-xl font-bold text-p-dark">{colIndicesEtiquetar.length}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-p-muted uppercase tracking-wider mb-1">
                    Precios detectados
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {colIndicesPrecio.map(ci => (
                      <span key={ci} className="badge badge-blue text-xs">
                        {parsedHeaders[ci]}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-p-muted uppercase tracking-wider mb-1">
                    Vista previa (5 filas)
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-p-border">
                    <table className="data-table text-xs w-full">
                      <thead>
                        <tr>
                          {parsedHeaders.slice(0, Math.min(parsedHeaders.length, 8)).map((h, i) => (
                            <th key={i} className="text-left whitespace-nowrap max-w-[120px] truncate">{h}</th>
                          ))}
                          {parsedHeaders.length > 8 && <th>…</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.slice(0, 5).map((row, ri) => (
                          <tr key={ri}>
                            {row.slice(0, Math.min(row.length, 8)).map((v, ci) => (
                              <td key={ci} className="text-right font-mono">{v.toFixed(2)}</td>
                            ))}
                            {row.length > 8 && <td className="text-p-muted">…</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={24} className="animate-spin text-p-blue" aria-label="Procesando archivo" />
              </div>
            )}
          </div>
        )}

        {/* ── Paso 4: Definir atributos cualitativos (decisión 5 — 2026-05-06) ── */}
        {paso === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-p-gray">
              Define los atributos cualitativos de esta matriz. Cada atributo tiene <span className="font-medium">N niveles</span> (típicamente 2–5).
              Puedes autocompletar el nombre desde el catálogo de atributos del tenant — pero los atributos viven aislados (no se enlazan al catálogo).
            </p>

            {/* Autocompletar desde R-010 */}
            {r010Catalogo.length > 0 && (
              <div className="border border-p-border rounded-xl p-3 bg-blue-50/40">
                <p className="text-xs font-medium text-p-muted mb-2">
                  Atributos del catálogo del tenant para {facultadEscuela} · {ciudad}:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {r010Catalogo.map(a => {
                    const yaAgregado = atributosDef.some(d => d.nombre.trim().toLowerCase() === a.nombre.trim().toLowerCase())
                    return (
                      <button
                        key={a.nombre}
                        type="button"
                        onClick={() => addAtributoFromR010(a.nombre)}
                        disabled={yaAgregado}
                        className="text-xs px-2.5 py-1 rounded-full border border-p-blue/40 bg-white text-p-blue hover:bg-p-blue/10 disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label={`Agregar ${a.nombre} desde el catálogo`}
                      >
                        + {a.nombre}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Atributos definidos */}
            <div className="space-y-3 max-h-[42vh] overflow-y-auto pr-1">
              {atributosDef.map((a, i) => (
                <div key={a.id} className="border border-p-border rounded-xl p-3 bg-gray-50">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <label className="form-label">Atributo #{i + 1}</label>
                      <input
                        type="text"
                        value={a.nombre}
                        onChange={ev => updateAtributoNombre(a.id, ev.target.value)}
                        placeholder="Ej. Internacionalización"
                        className="form-input text-sm w-full"
                        aria-label={`Nombre del atributo ${i + 1}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAtributo(a.id)}
                      aria-label={`Eliminar atributo ${a.nombre || i + 1}`}
                      className="mt-6 text-p-muted hover:text-p-red transition-colors"
                    >
                      <X size={15} aria-hidden />
                    </button>
                  </div>

                  <label className="form-label">Niveles ({a.niveles.length})</label>
                  <p className="text-xs text-p-muted mb-1.5">
                    Variantes del atributo. Ej.: <span className="font-medium">Modalidad</span> → <span className="italic">Presencial</span>, <span className="italic">Virtual</span>, <span className="italic">Híbrido</span>.
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    {a.niveles.map(n => (
                      <span key={n} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white border border-p-border">
                        {n}
                        <button
                          type="button"
                          onClick={() => removeNivel(a.id, n)}
                          aria-label={`Quitar nivel ${n}`}
                          className="text-p-muted hover:text-p-red"
                        >
                          <X size={11} aria-hidden />
                        </button>
                      </span>
                    ))}
                    {a.niveles.length === 0 && (
                      <span className="text-xs italic text-p-muted">Sin niveles aún</span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Escribe un nivel y presiona Enter"
                    onKeyDown={ev => {
                      if (ev.key === 'Enter') {
                        ev.preventDefault()
                        addNivel(a.id, (ev.target as HTMLInputElement).value)
                        ;(ev.target as HTMLInputElement).value = ''
                      }
                    }}
                    className="form-input text-sm w-full"
                    aria-label={`Agregar nivel al atributo ${a.nombre || i + 1}`}
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addAtributoManual}
              className="text-sm text-p-lime border border-p-lime/40 rounded-lg px-3 py-1.5 hover:bg-p-lime/10 transition-colors"
            >
              + Agregar atributo manual
            </button>

            {atributosDef.length === 0 && (
              <p className="text-xs text-p-muted">
                Si esta matriz no tiene atributos cualitativos (solo marcas + precios), puedes saltar este paso.
              </p>
            )}

            {erroresAtributos.length > 0 && (
              <div role="alert" className="space-y-1">
                {erroresAtributos.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-p-red bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
                    {err}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Paso 5: Mapeo de columnas ── */}
        {paso === 5 && (
          <div className="space-y-4">
            <p className="text-sm text-p-gray">
              Asigna cada columna a una <span className="font-medium">Marca</span> o a un <span className="font-medium">Nivel de un atributo</span> definido en el paso anterior.
            </p>

            <div className="space-y-3 max-h-[42vh] overflow-y-auto pr-1">
              {etiquetas.map(e => {
                const atributoActual = atributosDef.find(a => a.id === e.atributoId)
                return (
                  <div key={e.columnIndex} className="border border-p-border rounded-xl p-3 bg-gray-50">
                    <p className="text-xs font-medium text-p-muted mb-2">{e.headerOriginal}</p>
                    <div className="flex flex-wrap items-start gap-3">
                      <div>
                        <label className="form-label">Tipo</label>
                        <select
                          value={e.tipo}
                          onChange={ev => updateEtiqueta(e.columnIndex, {
                            tipo: ev.target.value as 'marca' | 'atributo',
                            // limpia campos del otro tipo
                            atributoId: '',
                            nivelNombre: '',
                          })}
                          className="form-select text-sm"
                          disabled={atributosDef.length === 0}
                          aria-label={`Tipo para columna ${e.headerOriginal}`}
                          title={atributosDef.length === 0 ? 'No hay atributos definidos en el paso anterior' : ''}
                        >
                          <option value="marca">Marca</option>
                          <option value="atributo" disabled={atributosDef.length === 0}>Atributo</option>
                        </select>
                      </div>

                      {e.tipo === 'marca' && (
                        <div className="flex-1 min-w-[160px]">
                          <label className="form-label">Nombre de la marca</label>
                          <input
                            type="text"
                            value={e.nombreMarca}
                            onChange={ev => updateEtiqueta(e.columnIndex, { nombreMarca: ev.target.value })}
                            className="form-input text-sm w-full"
                            placeholder="Ej. EAFIT"
                            aria-label={`Nombre marca columna ${e.headerOriginal}`}
                          />
                        </div>
                      )}

                      {e.tipo === 'atributo' && (
                        <>
                          <div className="flex-1 min-w-[150px]">
                            <label className="form-label">Atributo</label>
                            <select
                              value={e.atributoId}
                              onChange={ev => updateEtiqueta(e.columnIndex, { atributoId: ev.target.value, nivelNombre: '' })}
                              className="form-select text-sm w-full"
                              aria-label={`Atributo de columna ${e.headerOriginal}`}
                            >
                              <option value="">Selecciona…</option>
                              {atributosDef.map(a => (
                                <option key={a.id} value={a.id}>{a.nombre || '(sin nombre)'}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1 min-w-[150px]">
                            <label className="form-label">Nivel</label>
                            <select
                              value={e.nivelNombre}
                              onChange={ev => updateEtiqueta(e.columnIndex, { nivelNombre: ev.target.value })}
                              className="form-select text-sm w-full"
                              disabled={!atributoActual}
                              aria-label={`Nivel de columna ${e.headerOriginal}`}
                            >
                              <option value="">Selecciona…</option>
                              {(atributoActual?.niveles ?? []).map(n => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {erroresMapeo.length > 0 && (
              <div role="alert" className="space-y-1">
                {erroresMapeo.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-p-red bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
                    {err}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Paso 6: Marca propia + Confirmar ── */}
        {paso === 6 && (
          <div className="space-y-4">
            <p className="text-sm text-p-gray">Indica cuál de las marcas mapeadas corresponde al tenant y confirma los datos.</p>

            {/* Selector de marca propia */}
            <div className="border border-p-border rounded-xl p-3 bg-gray-50">
              <p className="text-xs font-medium text-p-muted mb-2">Marca del tenant</p>
              <div className="flex flex-wrap gap-2">
                {etiquetas.filter(e => e.tipo === 'marca').map(e => (
                  <label key={e.columnIndex} className="flex items-center gap-1.5 text-sm cursor-pointer select-none px-3 py-1.5 rounded-lg border border-p-border bg-white hover:border-p-lime/40">
                    <input
                      type="radio"
                      name="marca-propia"
                      checked={e.esPropiaTenant}
                      onChange={() => setMarcaPropia(e.columnIndex)}
                      className="accent-p-lime"
                    />
                    <span className="text-p-dark">{e.nombreMarca || '(sin nombre)'}</span>
                  </label>
                ))}
                {etiquetas.filter(e => e.tipo === 'marca').length === 0 && (
                  <span className="text-xs italic text-p-muted">No hay marcas mapeadas. Vuelve al paso anterior.</span>
                )}
              </div>
            </div>

            {erroresMarca.length > 0 && (
              <div role="alert" className="space-y-1">
                {erroresMarca.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-p-red bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
                    {err}
                  </div>
                ))}
              </div>
            )}

            <p className="text-sm text-p-gray pt-1">Resumen — esta acción reemplazará la matriz existente para la combinación.</p>

            <div className="border border-p-border rounded-xl overflow-hidden">
              <dl className="divide-y divide-p-border">
                {[
                  ['Tenant', tenantNombre],
                  ['Facultad / Escuela', facultadEscuela],
                  ['Nivel Educativo', nivelEducativo],
                  ['Ciudad', ciudad],
                  ['Archivo', file?.name ?? '—'],
                  ['Atributos definidos', atributosDef.length > 0
                    ? atributosDef.map(a => `${a.nombre} (${a.niveles.length})`).join(', ')
                    : '—'],
                  ['Marcas', etiquetas.filter(e => e.tipo === 'marca').map(e => e.nombreMarca).join(', ') || '—'],
                  ['Marca del tenant', etiquetas.find(e => e.tipo === 'marca' && e.esPropiaTenant)?.nombreMarca ?? '—'],
                  ['Precios detectados', colIndicesPrecio.length.toString()],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-2 gap-2 px-4 py-2.5 text-sm">
                    <dt className="text-p-muted">{label}</dt>
                    <dd className="font-medium text-p-dark">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}

        {/* Footer de navegación */}
        <div className="flex justify-between mt-6 pt-4 border-t border-p-border">
          <button
            type="button"
            onClick={paso === 1 ? handleClose : retroceder}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            {paso === 1 ? (
              'Cancelar'
            ) : (
              <><ChevronLeft size={14} aria-hidden /> Anterior</>
            )}
          </button>

          {paso < 6 ? (
            <button
              type="button"
              onClick={() => void avanzar()}
              disabled={!pasoActualValido}
              className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente <ChevronRight size={14} aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => saveMutation.mutate(buildPayload())}
              disabled={saveMutation.isPending}
              className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <><Loader2 size={14} className="animate-spin" aria-hidden /> Guardando...</>
              ) : (
                <><CheckCircle2 size={14} aria-hidden /> Confirmar y guardar</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
