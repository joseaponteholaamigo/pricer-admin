import { useState, useMemo, useEffect } from 'react'
import { useUrlParam } from '../../lib/useUrlState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Save, Search, FileDown, Upload } from 'lucide-react'
import api from '../../lib/api'
import { downloadTemplate } from '../../lib/downloadTemplate'
import type { CompetidoresData, SkuCalificaciones, SniesItem } from '../../lib/types'
import Spinner from '../../components/Spinner'
import QueryErrorState from '../../components/QueryErrorState'
import { useToast } from '../../components/useToast'
import { calificacionesSchema } from '../../schemas/reglas'
import { useAuth } from '../../lib/auth'
import { isAdmin as checkIsAdmin } from '../../lib/permissions'
import UploadPlantillaModal from '../../components/UploadPlantillaModal'

// ─── verticalKey: 'r002' = FMCG (default), 'r010' = Educación ────────────────

type VerticalKey = 'r002' | 'r010'

// ─── CalificacionesTab (R-002 FMCG / R-010 Educación — parte b) ──────────────

function CalificacionesTab({ tenantId, verticalKey = 'r002' }: { tenantId: string; verticalKey?: VerticalKey }) {
  const isEdu = verticalKey === 'r010'
  const queryClient = useQueryClient()
  const toast = useToast()
  const { user } = useAuth()
  const isAdmin = checkIsAdmin(user?.rol)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [filterCat, setFilterCat] = useUrlParam('cat')
  const [searchPropios, setSearchPropios] = useUrlParam('q')
  const [rawModo, setModo] = useUrlParam('modo', 'propio')
  const modo: 'propio' | 'competidor' = rawModo === 'competidor' ? 'competidor' : 'propio'
  const [rawComp, setSelectedCompId] = useUrlParam('comp')
  const selectedCompId: string | null = rawComp || null
  const [rawSku, setSelectedId] = useUrlParam('sku')
  const selectedId: string | null = rawSku || null
  const [cals, setCals] = useState<Record<string, number> | null>(null)
  const [rawCals, setRawCals] = useState<Record<string, string>>({})
  const [zodError, setZodError] = useState<string | null>(null)
  const dirty = cals !== null

  // ── FMCG: datos de portafolio + competidores ──────────────────────────────
  const { data: r001, isLoading: loadingR001, isError: errorR001, refetch: refetchR001 } = useQuery<CompetidoresData>({
    queryKey: ['reglas-r001', tenantId],
    queryFn: () => api.get<CompetidoresData>(`reglas/competidores?tenantId=${tenantId}`).then(r => r.data),
    enabled: !isEdu,
  })

  // ── Edu: datos de portafolio académico ───────────────────────────────────
  const { data: portafolioEdu, isLoading: loadingEdu, isError: errorEdu, refetch: refetchEdu } = useQuery<{ programas: Array<{ id: string; nombre: string; nivel: string; facultad: string; ciudad: string; codigo: string }>; asignaciones: Array<{ programaId: string; sniesId: string }> }>({
    queryKey: ['reglas-portafolio-edu', tenantId],
    queryFn: () => api.get(`reglas/portafolio-edu?tenantId=${tenantId}`).then((r: { data: unknown }) => r.data as { programas: Array<{ id: string; nombre: string; nivel: string; facultad: string; ciudad: string; codigo: string }>; asignaciones: Array<{ programaId: string; sniesId: string }> }),
    enabled: isEdu,
  })

  // Base SNIES global para enriquecer el select de competidores con nombre+universidad+ciudad
  const { data: sniesBase = [] } = useQuery<SniesItem[]>({
    queryKey: ['reglas-snies-base'],
    queryFn: () => api.get<{ items: SniesItem[] }>('reglas/competidores-snies?page_size=1000').then(r => r.data.items),
    enabled: isEdu,
    staleTime: 5 * 60_000,
  })
  const sniesById = useMemo(() => new Map(sniesBase.map(s => [s.id, s])), [sniesBase])

  const skus = r001?.skus ?? []
  const currentSku = skus.find(s => s.id === selectedId) ?? null

  const programas = portafolioEdu?.programas ?? []
  const currentPrograma = programas.find(p => p.id === selectedId) ?? null

  const competidoresDelSku = selectedId && !isEdu
    ? (r001?.competidores ?? []).filter(c => (r001?.mapeo[selectedId] ?? []).includes(c.id))
    : []

  const sniesDelPrograma = selectedId && isEdu
    ? (portafolioEdu?.asignaciones ?? []).filter(a => a.programaId === selectedId).map(a => a.sniesId)
    : []

  const { data: skuCals, isLoading: loadingCals } = useQuery<SkuCalificaciones | null>({
    queryKey: ['reglas-calificaciones', tenantId, selectedId],
    queryFn: () =>
      selectedId
        ? api.get<SkuCalificaciones>(`reglas/calificaciones?tenantId=${tenantId}&skuId=${selectedId}`)
            .then(r => r.data)
            .catch(() => null)
        : Promise.resolve(null),
    enabled: !!selectedId && !isEdu,
  })

  // Calificaciones edu por programa
  interface EduCalsAtributo { nombre: string; peso: number; calificacionPropia: number; calificacionesSnies: Record<string, number> }
  interface EduCalsResponse { programaId: string; programaNombre: string; atributos: EduCalsAtributo[]; vpPropio: number; vpSnies: Record<string, number> }
  const { data: eduCals, isLoading: loadingEduCals } = useQuery<EduCalsResponse | null>({
    queryKey: ['reglas-calificaciones-edu', tenantId, selectedId],
    queryFn: () =>
      selectedId
        ? api.get<EduCalsResponse>(`reglas/calificaciones-edu?tenantId=${tenantId}&programaId=${selectedId}`)
            .then(r => r.data)
            .catch(() => null)
        : Promise.resolve(null),
    enabled: !!selectedId && isEdu,
  })

  const atributos = isEdu
    ? (eduCals?.atributos ?? []).map(a => ({
        nombre: a.nombre,
        peso: a.peso,
        calificacionPropia: a.calificacionPropia,
        calificacionesCompetidor: a.calificacionesSnies ?? {},
      }))
    : skuCals?.atributos ?? []

  const getCurrentCals = (): Record<string, number> => {
    if (cals) return cals
    const base: Record<string, number> = {}
    atributos.forEach(a => {
      base[a.nombre] = modo === 'propio'
        ? a.calificacionPropia
        : (selectedCompId ? (a.calificacionesCompetidor[selectedCompId] ?? 0) : 0)
    })
    return base
  }

  const currentCals = getCurrentCals()
  const vpActual = atributos.reduce((s, a) => s + a.peso * (currentCals[a.nombre] ?? 0), 0)

  const mutation = useMutation({
    mutationFn: () => isEdu
      ? api.put(`reglas/calificaciones-edu?tenantId=${tenantId}`, {
          programaId: selectedId,
          modo,
          sniesId: modo === 'competidor' ? selectedCompId : null,
          calificaciones: currentCals,
        })
      : api.put(`reglas/calificaciones?tenantId=${tenantId}`, {
          skuId: selectedId,
          modo,
          competidorId: modo === 'competidor' ? selectedCompId : null,
          calificaciones: currentCals,
        }),
    onSuccess: () => {
      if (isEdu) {
        queryClient.invalidateQueries({ queryKey: ['reglas-calificaciones-edu', tenantId, selectedId] })
      } else {
        queryClient.invalidateQueries({ queryKey: ['reglas-calificaciones', tenantId, selectedId] })
      }
      setZodError(null)
      setCals(null)
      setRawCals({})
      toast.success('Cambios guardados')
    },
    onError: (err: unknown) => {
      toast.error('No se pudo guardar: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    },
  })

  const handleMutate = () => {
    // Validación al borde antes del PATCH
    const result = calificacionesSchema.safeParse({
      skuId: selectedId ?? '',
      modo,
      competidorId: modo === 'competidor' ? selectedCompId : null,
      calificaciones: currentCals,
    })
    if (!result.success) {
      const msg = result.error.issues[0]?.message ?? 'Error de validación'
      setZodError(msg)
      return
    }
    setZodError(null)
    mutation.mutate()
  }

  const updateCalRaw = (atributo: string, text: string) => {
    setRawCals(prev => ({ ...prev, [atributo]: text }))
    const parsed = parseFloat(text)
    setCals({ ...getCurrentCals(), [atributo]: isNaN(parsed) ? 0 : parsed })
  }

  const confirmIfDirty = (): boolean => {
    if (!dirty) return true
    return window.confirm('Tienes cambios sin guardar. ¿Descartar y continuar?')
  }

  const selectSku = (id: string) => {
    if (!confirmIfDirty()) return
    setSelectedId(id)
    setCals(null)
    setRawCals({})
    setModo('propio')
    setSelectedCompId('')
  }

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const categorias = useMemo(() => Array.from(new Set(skus.map(s => s.categoria))).sort(), [skus])

  const filteredSkus = skus.filter(s => {
    if (filterCat && s.categoria !== filterCat) return false
    if (searchPropios) {
      const q = searchPropios.toLowerCase()
      return s.nombre.toLowerCase().includes(q) || s.marca.toLowerCase().includes(q) || s.ean.includes(q)
    }
    return true
  })

  const filteredProgramas = programas.filter(p => {
    if (filterCat && p.facultad !== filterCat) return false
    if (searchPropios) {
      const q = searchPropios.toLowerCase()
      return p.nombre.toLowerCase().includes(q) || (p.codigo ?? '').toLowerCase().includes(q)
    }
    return true
  })

  const facultadesProgramas = useMemo(() => Array.from(new Set(programas.map(p => p.facultad))).sort(), [programas])

  if (isEdu && errorEdu) return <QueryErrorState onRetry={refetchEdu} />
  if (isEdu && loadingEdu) return <Spinner />
  if (!isEdu && errorR001) return <QueryErrorState onRetry={refetchR001} />
  if (!isEdu && loadingR001) return <Spinner />

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <p className="text-sm text-p-gray flex-1">
          {isEdu
            ? 'Calificación de Valor Percibido por programa × atributo. Configura tanto para el programa propio como para cada SNIES asignado. Precisión 10 decimales.'
            : 'Calificación por SKU × atributo. Configura tanto para el propio producto como para cada competidor asignado. Precisión 10 decimales.'}
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => downloadTemplate(
              isEdu ? 'calificaciones_edu.xlsx' : 'calificaciones.xlsx',
              'Calificaciones',
              isEdu
                ? ['Programa', 'Atributo', 'Tipo (propio|competidor)', 'Código SNIES', 'Calificación']
                : ['EAN', 'Atributo', 'Tipo (propio|competidor)', 'Calificación'],
              isEdu
                ? { 'Programa': 'Ingeniería de Sistemas', 'Atributo': 'Empleabilidad', 'Tipo (propio|competidor)': 'propio', 'Código SNIES': '', 'Calificación': 4 }
                : { 'EAN': '7702001234567', 'Atributo': 'Sabor', 'Tipo (propio|competidor)': 'propio', 'Calificación': 4 },
            )}
            aria-label="Descargar plantilla de calificaciones"
            className="btn-secondary text-xs flex items-center gap-1 py-1.5"
          >
            <FileDown size={13} aria-hidden /> Descargar plantilla
          </button>
          {isAdmin && (
            <button
              onClick={() => setUploadOpen(true)}
              aria-label="Subir plantilla de calificaciones"
              className="btn-secondary text-xs flex items-center gap-1 py-1.5"
            >
              <Upload size={13} aria-hidden /> Subir plantilla
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* Panel izquierdo — lista de SKUs / Programas */}
        <div className="card w-full md:w-72 md:flex-shrink-0 p-0 overflow-hidden">
          <div className="px-3 pt-3 pb-2 border-b border-p-border space-y-2">
            <select
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
              className="form-select py-1.5 text-sm w-full"
            >
              <option value="">{isEdu ? 'Todas las Facultades/Escuelas' : 'Todas las categorías'}</option>
              {(isEdu ? facultadesProgramas : categorias).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-p-muted pointer-events-none" />
              <input
                type="text"
                placeholder={isEdu ? 'Buscar programa…' : 'Buscar SKU…'}
                value={searchPropios}
                onChange={e => setSearchPropios(e.target.value)}
                className="form-input pl-8 pr-4 py-1.5 text-sm w-full"
              />
            </div>
          </div>
          <ul className="overflow-y-auto max-h-[480px]">
            {isEdu ? filteredProgramas.map(prog => (
              <li
                key={prog.id}
                onClick={() => selectSku(prog.id)}
                className={`flex items-center justify-between px-3 py-2.5 cursor-pointer border-b border-p-border/50 transition-colors ${
                  selectedId === prog.id ? 'bg-p-lime/10 border-l-2 border-l-p-lime' : 'hover:bg-p-surface'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-p-dark truncate">{prog.nombre}</p>
                  <p className="text-xs text-p-muted truncate">{prog.facultad} · {prog.ciudad}</p>
                </div>
              </li>
            )) : filteredSkus.map(sku => (
              <li
                key={sku.id}
                onClick={() => selectSku(sku.id)}
                className={`flex items-center justify-between px-3 py-2.5 cursor-pointer border-b border-p-border/50 transition-colors ${
                  selectedId === sku.id ? 'bg-p-lime/10 border-l-2 border-l-p-lime' : 'hover:bg-p-surface'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-p-dark truncate">{sku.nombre}</p>
                  <p className="text-xs text-p-muted">{sku.marca}</p>
                </div>
              </li>
            ))}
            {isEdu && filteredProgramas.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-p-muted">Sin programas</li>
            )}
            {!isEdu && filteredSkus.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-p-muted">Sin SKUs</li>
            )}
          </ul>
        </div>

        {/* Panel derecho */}
        {(isEdu ? currentPrograma : currentSku) ? (
          <div className="flex-1 min-w-0">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-p-dark">
                {isEdu ? currentPrograma?.nombre : currentSku?.nombre}
              </h3>
              <p className="text-xs text-p-muted">
                {isEdu
                  ? `${currentPrograma?.nivel} · ${currentPrograma?.ciudad} · ${currentPrograma?.facultad} · ${currentPrograma?.codigo ?? ''}`
                  : `${currentSku?.marca} · ${currentSku?.categoria} · ${currentSku?.ean}`}
              </p>
            </div>

            {/* Toggle Propio / Competidor */}
            <div className="card mb-3 flex items-center gap-3 flex-wrap">
              <div className="flex rounded-lg border border-p-border overflow-hidden">
                {(['propio', 'competidor'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => { if (!confirmIfDirty()) return; setModo(m); setCals(null); setRawCals({}); setSelectedCompId('') }}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      modo === m ? 'bg-p-lime text-p-bg' : 'text-p-gray hover:text-p-dark'
                    }`}
                  >
                    {m === 'propio' ? 'Propio' : 'Competidor'}
                  </button>
                ))}
              </div>
              {modo === 'competidor' && !isEdu && (
                <select
                  value={selectedCompId ?? ''}
                  onChange={e => { if (!confirmIfDirty()) return; setSelectedCompId(e.target.value); setCals(null); setRawCals({}) }}
                  className="form-select py-1.5 text-sm min-w-44"
                >
                  <option value="">Selecciona competidor…</option>
                  {competidoresDelSku.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              )}
              {modo === 'competidor' && isEdu && (
                <select
                  value={selectedCompId ?? ''}
                  onChange={e => { if (!confirmIfDirty()) return; setSelectedCompId(e.target.value); setCals(null); setRawCals({}) }}
                  className="form-select py-1.5 text-sm min-w-[24rem]"
                >
                  <option value="">Selecciona SNIES…</option>
                  {sniesDelPrograma.map(sniesId => {
                    const s = sniesById.get(sniesId)
                    const label = s
                      ? `${s.programa} — ${s.universidad} — ${s.ciudad} (${s.codigoSnies})`
                      : sniesId
                    return <option key={sniesId} value={sniesId}>{label}</option>
                  })}
                </select>
              )}
            </div>

            {/* Tabla de atributos */}
            {(isEdu ? loadingEduCals : loadingCals) ? <Spinner /> : atributos.length > 0 ? (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-p-gray">
                    VP calculado ({modo === 'propio'
                      ? 'propio'
                      : (isEdu
                          ? (selectedCompId ? (sniesById.get(selectedCompId)?.programa ?? selectedCompId) : '…')
                          : (competidoresDelSku.find(c => c.id === selectedCompId)?.nombre ?? '…'))})
                  </span>
                  <span className="text-2xl font-bold text-p-lime">{vpActual.toFixed(2)}</span>
                </div>
                <div className="overflow-x-auto">
                <table className="data-table w-full min-w-[480px]">
                  <thead>
                    <tr>
                      <th className="text-left">#</th>
                      <th className="text-left">Atributo</th>
                      <th className="text-center w-24">Peso</th>
                      <th className="text-center w-40">Calificación</th>
                      <th className="text-center w-28">Contribución</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atributos.map((a, idx) => {
                      const cal = currentCals[a.nombre] ?? 0
                      return (
                        <tr key={idx}>
                          <td className="text-xs text-p-muted">{idx + 1}</td>
                          <td className="text-sm font-medium text-p-dark">{a.nombre}</td>
                          <td className="text-center text-xs text-p-gray font-mono">{a.peso.toFixed(10).replace(/\.?0+$/, '')}</td>
                          <td className="text-center">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={rawCals[a.nombre] ?? (cal === 0 ? '' : String(cal))}
                              onChange={e => {
                                const text = e.target.value
                                if (text === '' || /^\d*\.?\d*$/.test(text)) {
                                  updateCalRaw(a.nombre, text)
                                }
                              }}
                              onBlur={e => {
                                const text = e.target.value
                                const parsed = parseFloat(text)
                                setRawCals(prev => {
                                  const next = { ...prev }
                                  delete next[a.nombre]
                                  return next
                                })
                                if (!isNaN(parsed)) {
                                  setCals({ ...getCurrentCals(), [a.nombre]: parsed })
                                }
                              }}
                              placeholder="0"
                              className="form-input py-1 text-sm text-center w-36 mx-auto font-mono"
                            />
                          </td>
                          <td className="text-center text-sm font-medium text-p-lime font-mono">
                            {(a.peso * cal).toFixed(10).replace(/\.?0+$/, '')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            ) : (
              <div className="card text-center py-8 text-p-gray text-sm">
                {modo === 'competidor' && !selectedCompId
                  ? `Selecciona un ${isEdu ? 'SNIES' : 'competidor'} para configurar sus calificaciones.`
                  : `Este ${isEdu ? 'programa' : 'SKU'} no tiene atributos de Valor Percibido configurados.`}
              </div>
            )}

            {dirty && (
              <div className="flex flex-col items-end gap-1 pt-3 mt-1">
                {zodError && (
                  <p className="text-xs text-p-red flex items-center gap-1 self-start" role="alert">
                    <AlertTriangle size={12} aria-hidden /> {zodError}
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-p-yellow flex items-center gap-1">
                    <AlertTriangle size={12} aria-hidden /> Sin guardar
                  </span>
                  <button
                    onClick={handleMutate}
                    disabled={mutation.isPending}
                    className="btn-primary text-xs py-1.5 flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <Save size={13} />
                    {mutation.isPending ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 card flex items-center justify-center py-16 text-p-muted text-sm">
            {isEdu ? 'Selecciona un programa para configurar sus calificaciones' : 'Selecciona un SKU para configurar sus calificaciones'}
          </div>
        )}
      </div>

      {isAdmin && (
        <UploadPlantillaModal
          tipo={isEdu ? 'calificaciones_edu' : 'calificaciones'}
          tenantId={tenantId}
          isOpen={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onConfirmed={() => {
            setUploadOpen(false)
            if (isEdu) {
              queryClient.invalidateQueries({ queryKey: ['reglas-calificaciones-edu', tenantId] })
            } else {
              queryClient.invalidateQueries({ queryKey: ['reglas-r001', tenantId] })
            }
          }}
        />
      )}
    </div>
  )
}

export default CalificacionesTab
