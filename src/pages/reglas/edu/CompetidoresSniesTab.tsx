import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Search } from 'lucide-react'
import api from '../../../lib/api'
import type { ProgramaAcademicoItem, SniesItem, AsignacionSnies } from '../../../lib/types'
import Spinner from '../../../components/Spinner'
import QueryErrorState from '../../../components/QueryErrorState'
import EmptyState from '../../../components/EmptyState'
import { useToast } from '../../../components/useToast'
import { useUrlParam } from '../../../lib/useUrlState'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface PortafolioEduResponse {
  programas: ProgramaAcademicoItem[]
  asignaciones: AsignacionSnies[]
}

// ─── CompetidoresSniesTab — gestión de asignaciones SNIES ↔ programa propio ──

export default function CompetidoresSniesTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const toast = useToast()

  const [filterFacultad, setFilterFacultad] = useUrlParam('fac')
  const [searchPropios, setSearchPropios] = useUrlParam('q2')
  const [searchSnies, setSearchSnies] = useUrlParam('q')
  const [rawSelected, setSelectedProgramaId] = useUrlParam('prog')
  const selectedProgramaId: string | null = rawSelected || null

  const { data, isLoading, isError, refetch } = useQuery<PortafolioEduResponse>({
    queryKey: ['reglas-portafolio-edu', tenantId],
    queryFn: () => api.get<PortafolioEduResponse>(`reglas/portafolio-edu?tenantId=${tenantId}`).then(r => r.data),
    staleTime: 30_000,
  })

  const programas = data?.programas ?? []
  const asignaciones = data?.asignaciones ?? []

  const { data: sniesResults, isLoading: sniesLoading } = useQuery<{ items: SniesItem[]; total: number }>({
    queryKey: ['snies-busqueda', searchSnies],
    queryFn: () => api.get<{ items: SniesItem[]; total: number }>(
      `reglas/competidores-snies?q=${encodeURIComponent(searchSnies)}&page_size=20`,
    ).then(r => r.data),
    enabled: searchSnies.length >= 2,
    staleTime: 30_000,
  })

  // Catálogo SNIES completo (resolver detalles de IDs ya asignados sin depender de la búsqueda).
  const { data: sniesAll } = useQuery<{ items: SniesItem[]; total: number }>({
    queryKey: ['snies-global-catalog'],
    queryFn: () => api.get<{ items: SniesItem[]; total: number }>('reglas/competidores-snies?page_size=1000').then(r => r.data),
    staleTime: 5 * 60_000,
  })
  const sniesById = useMemo(
    () => new Map((sniesAll?.items ?? []).map(s => [s.id, s] as const)),
    [sniesAll],
  )

  const mutation = useMutation({
    mutationFn: (newAsignaciones: AsignacionSnies[]) =>
      api.put(`reglas/portafolio-edu?tenantId=${tenantId}`, { programas, asignaciones: newAsignaciones }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-portafolio-edu', tenantId] })
      toast.success('Cambios guardados')
    },
    onError: (err: unknown) => {
      toast.error('No se pudo guardar: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    },
  })

  const facultades = useMemo(
    () => Array.from(new Set(programas.map(p => p.facultad))).sort(),
    [programas],
  )

  const filteredPropios = useMemo(() => {
    return programas.filter(p => {
      if (filterFacultad && p.facultad !== filterFacultad) return false
      if (searchPropios) {
        const q = searchPropios.toLowerCase()
        return p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)
      }
      return true
    })
  }, [programas, filterFacultad, searchPropios])

  const selectedPrograma = programas.find(p => p.id === selectedProgramaId) ?? null
  const asignadosDelPrograma = selectedProgramaId
    ? asignaciones.filter(a => a.programaId === selectedProgramaId).map(a => a.sniesId)
    : []

  const disponibles = sniesResults?.items?.filter(s => !asignadosDelPrograma.includes(s.id)) ?? []

  const addSnies = (sniesId: string) => {
    if (!selectedProgramaId) return
    if (asignadosDelPrograma.includes(sniesId)) return
    if (asignadosDelPrograma.length >= 10) {
      toast.error('Máximo 10 competidores SNIES por programa')
      return
    }
    mutation.mutate([...asignaciones, { programaId: selectedProgramaId, sniesId }])
    setSearchSnies('')
  }

  const removeSnies = (sniesId: string) => {
    if (!selectedProgramaId) return
    mutation.mutate(asignaciones.filter(a => !(a.programaId === selectedProgramaId && a.sniesId === sniesId)))
  }

  if (isError) return <QueryErrorState onRetry={refetch} />
  if (isLoading || !data) return <Spinner />

  if (programas.length === 0) {
    return (
      <EmptyState
        title="Sin programas propios"
        description="Antes de asignar competidores SNIES, agrega al menos un programa propio en la pestaña Portafolio."
      />
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <p className="text-sm text-p-gray flex-1">
          Asigna competidores SNIES a cada programa propio. Selecciona un programa a la izquierda y busca
          en la base SNIES global para vincular hasta 10 competidores.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* Panel izquierdo — programas propios con filtros */}
        <div className="card w-full md:w-72 md:flex-shrink-0 p-0 overflow-hidden">
          <div className="px-3 pt-3 pb-2 border-b border-p-border space-y-2">
            <select
              value={filterFacultad}
              onChange={e => setFilterFacultad(e.target.value)}
              className="form-select py-1.5 text-sm w-full"
              aria-label="Filtrar por Facultad/Escuela"
            >
              <option value="">Todas las Facultades/Escuelas</option>
              {facultades.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-p-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar programa propio…"
                value={searchPropios}
                onChange={e => setSearchPropios(e.target.value)}
                className="form-input pl-8 pr-4 py-1.5 text-sm w-full"
                aria-label="Buscar programa propio"
              />
            </div>
          </div>
          <ul className="overflow-y-auto max-h-[480px]">
            {filteredPropios.map(prog => {
              const count = asignaciones.filter(a => a.programaId === prog.id).length
              const isSelected = selectedProgramaId === prog.id
              return (
                <li
                  key={prog.id}
                  onClick={() => { setSelectedProgramaId(prog.id); setSearchSnies('') }}
                  className={`flex items-center justify-between px-3 py-2.5 cursor-pointer border-b border-p-border/50 transition-colors ${
                    isSelected
                      ? 'bg-p-lime/10 border-l-2 border-l-p-lime'
                      : 'hover:bg-p-surface'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-p-dark truncate">{prog.nombre}</p>
                    <p className="text-xs text-p-muted">{prog.nivel} · {prog.ciudad}</p>
                  </div>
                  {count > 0 && (
                    <span className="ml-2 flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full bg-p-lime/20 text-p-lime font-medium">
                      {count}
                    </span>
                  )}
                </li>
              )
            })}
            {filteredPropios.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-p-muted">Sin programas</li>
            )}
          </ul>
        </div>

        {/* Panel derecho — vinculaciones del programa seleccionado */}
        {selectedPrograma ? (
          <div className="flex-1 min-w-0">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-p-dark">{selectedPrograma.nombre}</h3>
              <p className="text-xs text-p-muted">
                {selectedPrograma.nivel} · {selectedPrograma.ciudad} · {selectedPrograma.facultad} · {selectedPrograma.codigo}
              </p>
            </div>

            {/* Vinculados */}
            <div className="card mb-3">
              <p className="text-xs font-semibold text-p-gray uppercase tracking-wide mb-2">
                Vinculados ({asignadosDelPrograma.length}/10)
              </p>
              {asignadosDelPrograma.length > 0 ? (
                <div className="space-y-1">
                  {asignadosDelPrograma.map(sniesId => {
                    const detalle = sniesById.get(sniesId)
                    const label = detalle
                      ? `${detalle.programa} · ${detalle.universidad}`
                      : sniesId
                    return (
                      <div key={sniesId} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg bg-p-surface">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 bg-blue-500/15 text-blue-600">
                            SNIES
                          </span>
                          {detalle && (
                            <span className="text-xs font-mono text-p-muted flex-shrink-0">
                              {detalle.codigoSnies}
                            </span>
                          )}
                          <span className="text-sm text-p-dark truncate">{label}</span>
                        </div>
                        <button
                          onClick={() => removeSnies(sniesId)}
                          aria-label={`Quitar vinculación ${label}`}
                          className="btn-icon flex-shrink-0 text-p-muted hover:text-p-red hover:bg-red-50"
                        >
                          <Trash2 size={13} aria-hidden />
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-p-muted text-center py-3">Sin vinculaciones — busca abajo para agregar.</p>
              )}
            </div>

            {/* Buscador para agregar */}
            <div className="card">
              <p className="text-xs font-semibold text-p-gray uppercase tracking-wide mb-2">Agregar competidor SNIES</p>
              <div className="relative mb-2">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-p-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por universidad, programa o código SNIES…"
                  value={searchSnies}
                  onChange={e => setSearchSnies(e.target.value)}
                  className="form-input pl-8 pr-4 py-1.5 text-sm w-full"
                  aria-label="Buscar en base SNIES"
                />
              </div>
              {searchSnies.length < 2 && !sniesLoading && (
                <p className="text-center text-sm text-p-muted py-3">Escribe al menos 2 caracteres para buscar.</p>
              )}
              {sniesLoading && (
                <p className="text-center text-sm text-p-muted py-3">Buscando…</p>
              )}
              {searchSnies.length >= 2 && !sniesLoading && disponibles.length === 0 && (
                <p className="text-center text-sm text-p-muted py-3">Sin resultados o ya están asignados.</p>
              )}
              {disponibles.length > 0 && (
                <ul className="max-h-48 overflow-y-auto space-y-0.5">
                  {disponibles.slice(0, 20).map(s => (
                    <li key={s.id}>
                      <button
                        onClick={() => addSnies(s.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-p-surface transition-colors text-left"
                        aria-label={`Agregar ${s.programa} de ${s.universidad}`}
                      >
                        <Plus size={13} className="text-p-lime flex-shrink-0" aria-hidden />
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 bg-blue-500/15 text-blue-600">
                          SNIES
                        </span>
                        <span className="text-xs font-mono text-p-muted flex-shrink-0">{s.codigoSnies}</span>
                        <span className="text-sm text-p-dark truncate">
                          {s.programa} · {s.universidad}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 card flex items-center justify-center py-16 text-p-muted text-sm">
            Selecciona un programa propio para gestionar sus vinculaciones
          </div>
        )}
      </div>
    </div>
  )
}
