import { useState } from 'react'
import { useUrlParam } from '../../lib/useUrlState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, FileDown, Upload } from 'lucide-react'
import api from '../../lib/api'
import { downloadTemplate } from '../../lib/downloadTemplate'
import type { CategoriaAtributos, AtributoCategoria, FacultadEscuela, CiudadEdu } from '../../lib/types'
import Spinner from '../../components/Spinner'
import QueryErrorState from '../../components/QueryErrorState'
import SaveBar from '../../components/SaveBar'
import SearchableSelect from '../../components/SearchableSelect'
import { useToast } from '../../components/useToast'
import { atributosSchema } from '../../schemas/reglas'
import { useAuth } from '../../lib/auth'
import { isAdmin as checkIsAdmin } from '../../lib/permissions'
import UploadPlantillaModal from '../../components/UploadPlantillaModal'

// ─── verticalKey: 'r002' = FMCG (default), 'r010' = Educación ────────────────

type VerticalKey = 'r002' | 'r010'

// ─── Tipo atributos para edu (par Facultad × Ciudad) ─────────────────────────

interface AtributoParItem {
  nombre: string
  peso: number
  orden: number
}

function getAtributosConfig(verticalKey: VerticalKey) {
  if (verticalKey === 'r010') {
    return {
      endpoint: 'reglas/atributos-r010',
      queryKey: 'reglas-atributos-r010',
      descripcion: 'Configura los atributos de Valor Percibido por par (Facultad/Escuela × Ciudad). Los pesos deben sumar 100%.',
      plantillaArgs: {
        nombre: 'pesos_r010.xlsx',
        hoja: 'Atributos',
        headers: ['Facultad/Escuela', 'Ciudad', 'Atributo', 'Peso (%)'] as string[],
        ejemplo: { 'Facultad/Escuela': 'Ingeniería', 'Ciudad': 'Bogotá', 'Atributo': 'Empalme', 'Peso (%)': 30 } as Record<string, string | number>,
      },
      tipo: 'atributos_r010' as const,
    }
  }
  return {
    endpoint: 'reglas/atributos',
    queryKey: 'reglas-atributos',
    descripcion: 'Configura los 5 atributos de valor percibido por categoría. Los pesos deben sumar 100% (precisión 10 decimales).',
    plantillaArgs: {
      nombre: 'atributos.xlsx',
      hoja: 'Atributos',
      headers: ['Categoría', 'Atributo', 'Peso (%)'] as string[],
      ejemplo: { 'Categoría': 'Gaseosas', 'Atributo': 'Sabor', 'Peso (%)': 25 } as Record<string, string | number>,
    },
    tipo: 'atributos' as const,
  }
}

// ─── SubTab Edu: selectores en cascada Facultad → Ciudad ─────────────────────

function AtributosTabEdu({ tenantId }: { tenantId: string }) {
  const config = getAtributosConfig('r010')
  const queryClient = useQueryClient()
  const toast = useToast()
  const { user } = useAuth()
  const isAdmin = checkIsAdmin(user?.rol)
  const [uploadOpen, setUploadOpen] = useState(false)

  // Catálogos para los selectores
  const { data: facultades = [], isLoading: loadingFac, isError: errorFac } = useQuery<FacultadEscuela[]>({
    queryKey: ['reglas-facultades-escuelas', tenantId],
    queryFn: () => api.get<FacultadEscuela[]>(`reglas/facultades-escuelas?tenantId=${tenantId}`).then(r => r.data),
    staleTime: 60_000,
  })

  const { data: ciudades = [], isLoading: loadingCiu, isError: errorCiu } = useQuery<CiudadEdu[]>({
    queryKey: ['reglas-ciudades', tenantId],
    queryFn: () => api.get<CiudadEdu[]>(`reglas/ciudades?tenantId=${tenantId}`).then(r => r.data),
    staleTime: 60_000,
  })

  const [selectedFacultad, setSelectedFacultad] = useUrlParam('r010fac')
  const [selectedCiudad, setSelectedCiudad]     = useUrlParam('r010ciu')

  const facultadActual = selectedFacultad || facultades[0]?.nombre || ''
  const ciudadActual   = selectedCiudad   || ciudades[0]?.nombre   || ''
  const parKey = facultadActual && ciudadActual ? `${facultadActual}|${ciudadActual}` : ''

  const {
    data: atributosPar = [],
    isLoading: loadingAtributos,
    isError: errorAtributos,
    refetch,
  } = useQuery<AtributoParItem[]>({
    queryKey: ['reglas-atributos-r010-par', tenantId, facultadActual, ciudadActual],
    queryFn: () =>
      api
        .get<AtributoParItem[]>(`reglas/atributos-r010?tenantId=${tenantId}&facultad=${encodeURIComponent(facultadActual)}&ciudad=${encodeURIComponent(ciudadActual)}`)
        .then(r => r.data),
    enabled: !!facultadActual && !!ciudadActual,
    staleTime: 30_000,
  })

  const [atributos, setAtributos] = useState<AtributoParItem[] | null>(null)
  const dirty = atributos !== null
  const currentAtributos = atributos ?? atributosPar

  const selectFacultad = (fac: string) => {
    setSelectedFacultad(fac)
    setAtributos(null)
  }

  const selectCiudad = (ciu: string) => {
    setSelectedCiudad(ciu)
    setAtributos(null)
  }

  const updateAtributo = (idx: number, field: keyof AtributoParItem, value: string | number) => {
    const base: AtributoParItem[] = atributos ?? (atributosPar.length > 0
      ? atributosPar.map(a => ({ ...a }))
      : [1, 2, 3, 4, 5].map(orden => ({ nombre: '', peso: 0, orden })))
    const copy = base.map((a, i) => i === idx ? { ...a, [field]: value } : a)
    setAtributos(copy)
  }

  const sumaPesos = currentAtributos.reduce((acc, a) => acc + Number(a.peso), 0)
  const pesoError = Math.abs(sumaPesos - 1.0) > 0.01

  const [zodError, setZodError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      api.put(`${config.endpoint}?tenantId=${tenantId}`, {
        facultad: facultadActual,
        ciudad: ciudadActual,
        atributos: currentAtributos,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-atributos-r010-par', tenantId, facultadActual, ciudadActual] })
      setZodError(null)
      setAtributos(null)
      toast.success('Cambios guardados')
    },
    onError: (err: unknown) => {
      toast.error('No se pudo guardar: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    },
  })

  const handleSave = () => {
    const result = atributosSchema.safeParse({ atributos: currentAtributos })
    if (!result.success) {
      const msg = result.error.issues[0]?.message ?? 'Error de validación'
      setZodError(msg)
      return
    }
    setZodError(null)
    mutation.mutate()
  }

  const handleConfigurePar = () => {
    // Crear 5 atributos vacíos para el par
    const nuevos: AtributoParItem[] = [1, 2, 3, 4, 5].map(orden => ({ nombre: '', peso: 0.2, orden }))
    setAtributos(nuevos)
  }

  if (errorFac || errorCiu) return <QueryErrorState onRetry={refetch} message="No se pudo cargar los catálogos de Facultad/Escuela o Ciudades." />

  const loadingCatalogs = loadingFac || loadingCiu

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <p className="text-sm text-p-gray flex-1">
          {config.descripcion}
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => downloadTemplate(
              config.plantillaArgs.nombre,
              config.plantillaArgs.hoja,
              config.plantillaArgs.headers,
              config.plantillaArgs.ejemplo,
            )}
            aria-label="Descargar plantilla de atributos"
            className="btn-secondary text-xs flex items-center gap-1 py-1.5"
          >
            <FileDown size={13} aria-hidden /> Descargar plantilla
          </button>
          {isAdmin && (
            <button
              onClick={() => setUploadOpen(true)}
              aria-label="Subir plantilla de atributos"
              className="btn-secondary text-xs flex items-center gap-1 py-1.5"
            >
              <Upload size={13} aria-hidden /> Subir plantilla
            </button>
          )}
        </div>
      </div>

      {/* Selectores en cascada */}
      {loadingCatalogs ? (
        <div className="flex gap-3 mb-4">
          <div className="h-10 w-44 animate-pulse bg-p-border/30 rounded-lg" />
          <div className="h-10 w-44 animate-pulse bg-p-border/30 rounded-lg" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 mb-4">
          <div>
            <label htmlFor="r010-facultad" className="block text-xs text-p-gray mb-1">Facultad/Escuela</label>
            <select
              id="r010-facultad"
              value={facultadActual}
              onChange={e => selectFacultad(e.target.value)}
              className="form-select text-sm"
              aria-label="Seleccionar facultad/escuela"
            >
              {facultades.length === 0 && <option value="">Sin facultades configuradas</option>}
              {facultades.map(f => (
                <option key={f.nombre} value={f.nombre}>{f.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="r010-ciudad" className="block text-xs text-p-gray mb-1">Ciudad</label>
            <select
              id="r010-ciudad"
              value={ciudadActual}
              onChange={e => selectCiudad(e.target.value)}
              className="form-select text-sm"
              aria-label="Seleccionar ciudad"
            >
              {ciudades.length === 0 && <option value="">Sin ciudades configuradas</option>}
              {ciudades.map(c => (
                <option key={c.nombre} value={c.nombre}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Tabla de atributos del par */}
      {!parKey ? (
        <div className="flex items-center justify-center h-40 text-sm text-p-muted border border-dashed border-p-border rounded-xl">
          Selecciona una Facultad/Escuela y Ciudad para ver los atributos
        </div>
      ) : loadingAtributos ? (
        <Spinner />
      ) : errorAtributos ? (
        <QueryErrorState onRetry={refetch} message="No se pudo cargar los atributos de este par." />
      ) : currentAtributos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-3 border border-dashed border-p-border rounded-xl">
          <p className="text-sm text-p-muted">Sin atributos configurados para {facultadActual} · {ciudadActual}</p>
          <button onClick={handleConfigurePar} className="btn-primary text-xs">
            Configurar atributos para este par
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <span className="text-sm font-medium text-p-dark">{facultadActual} · {ciudadActual}</span>
            <div className="flex items-center gap-3">
              {pesoError && (
                <span className="text-xs text-p-red flex items-center gap-1" role="alert">
                  <AlertTriangle size={13} aria-hidden /> Suman {(sumaPesos * 100).toFixed(2)}% (deben ser 100%)
                </span>
              )}
              <span className={`text-lg font-bold ${pesoError ? 'text-p-red' : 'text-p-lime'}`}>
                {(sumaPesos * 100).toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table w-full min-w-[320px]">
              <thead>
                <tr>
                  <th className="text-left w-6">#</th>
                  <th className="text-left">Atributo</th>
                  <th className="text-center w-36">Peso (%)</th>
                </tr>
              </thead>
              <tbody>
                {currentAtributos.map((a, idx) => (
                  <tr key={idx}>
                    <td className="text-xs text-p-muted">{idx + 1}</td>
                    <td>
                      <input
                        value={a.nombre}
                        onChange={e => updateAtributo(idx, 'nombre', e.target.value)}
                        placeholder={`Atributo ${idx + 1} (texto libre)`}
                        className="form-input py-1 text-sm w-full"
                      />
                    </td>
                    <td className="text-center">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={a.peso === 0 ? '' : String(a.peso)}
                        onChange={e => {
                          const v = parseFloat(e.target.value)
                          updateAtributo(idx, 'peso', isNaN(v) ? 0 : Math.min(1, Math.max(0, v)))
                        }}
                        placeholder="0.2"
                        className="form-input py-1 text-sm text-center w-28 mx-auto font-mono"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} />
                  <td className={`text-center text-sm font-bold ${pesoError ? 'text-p-red' : 'text-p-lime'}`}>
                    {(sumaPesos * 100).toFixed(2)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {zodError && (
        <p className="text-xs text-p-red flex items-center gap-1 mt-3" role="alert" aria-live="polite">
          <AlertTriangle size={12} aria-hidden /> {zodError}
        </p>
      )}
      <SaveBar onSave={handleSave} saving={mutation.isPending} dirty={dirty && !pesoError} />

      {isAdmin && (
        <UploadPlantillaModal
          tipo={config.tipo}
          tenantId={tenantId}
          isOpen={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onConfirmed={() => {
            setUploadOpen(false)
            queryClient.invalidateQueries({ queryKey: ['reglas-atributos-r010-par', tenantId] })
          }}
        />
      )}
    </div>
  )
}

// ─── AtributosTab FMCG (r002) — sin cambios ──────────────────────────────────

function AtributosTabFmcg({ tenantId }: { tenantId: string }) {
  const config = getAtributosConfig('r002')
  const queryClient = useQueryClient()
  const toast = useToast()
  const { user } = useAuth()
  const isAdmin = checkIsAdmin(user?.rol)
  const [uploadOpen, setUploadOpen] = useState(false)

  const { data = [], isLoading, isError, refetch } = useQuery<CategoriaAtributos[]>({
    queryKey: [config.queryKey, tenantId],
    queryFn: () => api.get<CategoriaAtributos[]>(`${config.endpoint}?tenantId=${tenantId}`).then(r => r.data),
  })

  const [selectedCat, setSelectedCat] = useUrlParam('cat')
  const [atributos, setAtributos] = useState<AtributoCategoria[] | null>(null)
  const dirty = atributos !== null

  const categoria = selectedCat || data[0]?.categoria || ''
  const currentAtributos = atributos ?? data.find(d => d.categoria === categoria)?.atributos ?? []

  const selectCat = (cat: string) => {
    setSelectedCat(cat)
    setAtributos(null)
  }

  const updateAtributo = (idx: number, field: keyof AtributoCategoria, value: string | number) => {
    const copy = currentAtributos.map((a, i) => i === idx ? { ...a, [field]: value } : a)
    setAtributos(copy)
  }

  const sumaPesos = currentAtributos.reduce((acc, a) => acc + Number(a.peso), 0)
  const pesoError = Math.abs(sumaPesos - 1.0) > 0.01

  const [zodError, setZodError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => api.put(`${config.endpoint}?tenantId=${tenantId}`, { categoria, atributos: currentAtributos }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.queryKey, tenantId] })
      setZodError(null)
      setAtributos(null)
      toast.success('Cambios guardados')
    },
    onError: (err: unknown) => {
      toast.error('No se pudo guardar: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    },
  })

  const handleSave = () => {
    const result = atributosSchema.safeParse({ atributos: currentAtributos })
    if (!result.success) {
      const msg = result.error.issues[0]?.message ?? 'Error de validación'
      setZodError(msg)
      return
    }
    setZodError(null)
    mutation.mutate()
  }

  const categorias = data.map(d => d.categoria)

  if (isError) return <QueryErrorState onRetry={refetch} />
  if (isLoading) return <Spinner />

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <p className="text-sm text-p-gray flex-1">
          {config.descripcion}
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => downloadTemplate(
              config.plantillaArgs.nombre,
              config.plantillaArgs.hoja,
              config.plantillaArgs.headers,
              config.plantillaArgs.ejemplo,
            )}
            aria-label="Descargar plantilla de atributos"
            className="btn-secondary text-xs flex items-center gap-1 py-1.5"
          >
            <FileDown size={13} aria-hidden /> Descargar plantilla
          </button>
          {isAdmin && (
            <button
              onClick={() => setUploadOpen(true)}
              aria-label="Subir plantilla de atributos"
              className="btn-secondary text-xs flex items-center gap-1 py-1.5"
            >
              <Upload size={13} aria-hidden /> Subir plantilla
            </button>
          )}
        </div>
      </div>

      {/* Selector de categoría */}
      <div className="mb-4">
        <SearchableSelect
          options={categorias}
          value={categoria}
          onChange={selectCat}
          placeholder="Selecciona una categoría…"
        />
      </div>

      {/* Tabla de atributos */}
      {currentAtributos.length > 0 ? (
        <div className="card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <span className="text-sm font-medium text-p-dark">{categoria}</span>
            <div className="flex items-center gap-3">
              {pesoError && (
                <span className="text-xs text-p-red flex items-center gap-1" role="alert">
                  <AlertTriangle size={13} aria-hidden /> Suman {(sumaPesos * 100).toFixed(2)}% (deben ser 100%)
                </span>
              )}
              <span className={`text-lg font-bold ${pesoError ? 'text-p-red' : 'text-p-lime'}`}>
                {(sumaPesos * 100).toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table w-full min-w-[320px]">
              <thead>
                <tr>
                  <th className="text-left w-6">#</th>
                  <th className="text-left">Atributo</th>
                  <th className="text-center w-36">Peso (%)</th>
                </tr>
              </thead>
              <tbody>
                {currentAtributos.map((a, idx) => (
                  <tr key={idx}>
                    <td className="text-xs text-p-muted">{idx + 1}</td>
                    <td>
                      <input
                        value={a.nombre}
                        onChange={e => updateAtributo(idx, 'nombre', e.target.value)}
                        className="form-input py-1 text-sm w-full"
                      />
                    </td>
                    <td className="text-center">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={a.peso === 0 ? '' : String(a.peso)}
                        onChange={e => {
                          const v = parseFloat(e.target.value)
                          updateAtributo(idx, 'peso', isNaN(v) ? 0 : Math.min(1, Math.max(0, v)))
                        }}
                        placeholder="0.2"
                        className="form-input py-1 text-sm text-center w-28 mx-auto font-mono"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} />
                  <td className={`text-center text-sm font-bold ${pesoError ? 'text-p-red' : 'text-p-lime'}`}>
                    {(sumaPesos * 100).toFixed(2)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-40 text-sm text-p-muted border border-dashed border-p-border rounded-xl">
          Selecciona una categoría para ver sus atributos
        </div>
      )}

      {zodError && (
        <p className="text-xs text-p-red flex items-center gap-1 mt-3" role="alert" aria-live="polite">
          <AlertTriangle size={12} aria-hidden /> {zodError}
        </p>
      )}
      <SaveBar onSave={handleSave} saving={mutation.isPending} dirty={dirty && !pesoError} />

      {isAdmin && (
        <UploadPlantillaModal
          tipo={config.tipo}
          tenantId={tenantId}
          isOpen={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onConfirmed={() => {
            setUploadOpen(false)
            queryClient.invalidateQueries({ queryKey: [config.queryKey, tenantId] })
          }}
        />
      )}
    </div>
  )
}

// ─── AtributosTab — dispatcher público ───────────────────────────────────────

function AtributosTab({ tenantId, verticalKey = 'r002' }: { tenantId: string; verticalKey?: VerticalKey }) {
  if (verticalKey === 'r010') {
    return <AtributosTabEdu tenantId={tenantId} />
  }
  return <AtributosTabFmcg tenantId={tenantId} />
}

export default AtributosTab
