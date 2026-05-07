import { useState, useMemo, useRef, useEffect, useId } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil, Search, X, Info } from 'lucide-react'
import api from '../../../lib/api'
import type {
  ProgramaAcademicoItem,
  SniesItem,
  AsignacionSnies,
  FacultadEscuela,
  NivelEducativo,
  CiudadEdu,
} from '../../../lib/types'
import Spinner from '../../../components/Spinner'
import QueryErrorState from '../../../components/QueryErrorState'
import EmptyState from '../../../components/EmptyState'
import ConfirmModal from '../../../components/ConfirmModal'
import { SkeletonTable } from '../../../components/Skeleton'
import { useToast } from '../../../components/useToast'
import { useUrlParam, useUrlNumber } from '../../../lib/useUrlState'
import { useFocusTrap } from '../../../lib/useFocusTrap'
import { makeProgramaSchema } from '../../../schemas/reglas'
import { useAuth } from '../../../lib/auth'
import { isAdmin as checkIsAdmin } from '../../../lib/permissions'

// ─── Tipos locales ────────────────────────────────────────────────────────────

interface PortafolioEduResponse {
  programas: ProgramaAcademicoItem[]
  asignaciones: AsignacionSnies[]
}

interface ProgramaFormValues {
  codigo: string
  nombre: string
  facultadEscuela: string
  nivelEducativo: string
  ciudad: string
  precioActual: string
}

const PAGE_SIZE = 10

// ─── Modal: Agregar / Editar Programa ─────────────────────────────────────────

function ProgramaModal({
  mode,
  initial,
  existingCodigos,
  facultades,
  niveles,
  ciudades,
  onSave,
  onClose,
}: {
  mode: 'add' | 'edit'
  initial?: Partial<ProgramaFormValues>
  existingCodigos: string[]
  facultades: FacultadEscuela[]
  niveles: NivelEducativo[]
  ciudades: CiudadEdu[]
  onSave: (values: ProgramaFormValues) => void
  onClose: () => void
}) {
  const schema = useMemo(
    () => makeProgramaSchema({ existingCodigos }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [existingCodigos.join(',')],
  )

  const defaultValues: ProgramaFormValues = {
    codigo: initial?.codigo ?? '',
    nombre: initial?.nombre ?? '',
    facultadEscuela: initial?.facultadEscuela ?? '',
    nivelEducativo: initial?.nivelEducativo ?? '',
    ciudad: initial?.ciudad ?? '',
    precioActual: initial?.precioActual ?? '',
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, touchedFields, isSubmitted },
  } = useForm<ProgramaFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const showErr = (field: keyof ProgramaFormValues) => {
    const touched = touchedFields[field] || isSubmitted
    const msg = errors[field]?.message
    if (!touched || !msg) return null
    return (
      <p id={`prog-${field}-error`} className="text-xs text-p-red mt-0.5" role="alert">
        {msg}
      </p>
    )
  }

  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useFocusTrap(dialogRef, true)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 id={titleId} className="text-base font-semibold text-p-dark">
            {mode === 'add' ? 'Agregar programa' : 'Editar programa'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-p-muted hover:text-p-dark transition-colors">
            <X size={18} aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} noValidate>
          <div className="space-y-4">
            <div>
              <label htmlFor="prog-codigo" className="form-label">Código Programa</label>
              <input
                id="prog-codigo"
                {...register('codigo')}
                disabled={mode === 'edit'}
                aria-invalid={!!(touchedFields.codigo || isSubmitted) && !!errors.codigo}
                aria-describedby={errors.codigo ? 'prog-codigo-error' : undefined}
                className="form-input w-full font-mono disabled:bg-p-bg disabled:text-p-muted"
                placeholder="Ej: UCE-001"
              />
              {showErr('codigo')}
              {mode === 'edit' && (
                <p className="text-xs text-p-muted mt-1">El Código Programa es la identidad estable y no se puede cambiar.</p>
              )}
            </div>

            <div>
              <label htmlFor="prog-nombre" className="form-label">Nombre</label>
              <input
                id="prog-nombre"
                {...register('nombre')}
                aria-invalid={!!(touchedFields.nombre || isSubmitted) && !!errors.nombre}
                aria-describedby={errors.nombre ? 'prog-nombre-error' : undefined}
                className="form-input w-full"
                placeholder="Ej: Ingeniería de Sistemas"
              />
              {showErr('nombre')}
            </div>

            <div>
              <label htmlFor="prog-facultad" className="form-label">Facultad/Escuela</label>
              <select
                id="prog-facultad"
                {...register('facultadEscuela')}
                aria-invalid={!!(touchedFields.facultadEscuela || isSubmitted) && !!errors.facultadEscuela}
                className="form-select w-full"
              >
                <option value="">Selecciona una Facultad/Escuela</option>
                {facultades.map(f => <option key={f.nombre} value={f.nombre}>{f.nombre}</option>)}
              </select>
              {showErr('facultadEscuela')}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="prog-nivel" className="form-label">Nivel Educativo</label>
                <select
                  id="prog-nivel"
                  {...register('nivelEducativo')}
                  aria-invalid={!!(touchedFields.nivelEducativo || isSubmitted) && !!errors.nivelEducativo}
                  className="form-select w-full"
                >
                  <option value="">Selecciona un nivel</option>
                  {niveles.map(n => <option key={n.nombre} value={n.nombre}>{n.nombre}</option>)}
                </select>
                {showErr('nivelEducativo')}
              </div>

              <div>
                <label htmlFor="prog-ciudad" className="form-label">Ciudad</label>
                <select
                  id="prog-ciudad"
                  {...register('ciudad')}
                  aria-invalid={!!(touchedFields.ciudad || isSubmitted) && !!errors.ciudad}
                  className="form-select w-full"
                >
                  <option value="">Selecciona una ciudad</option>
                  {ciudades.map(c => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
                </select>
                {showErr('ciudad')}
              </div>
            </div>

            <div>
              <label htmlFor="prog-precio" className="form-label">Precio Actual (COP)</label>
              <input
                id="prog-precio"
                type="number"
                min={0}
                {...register('precioActual')}
                aria-invalid={!!(touchedFields.precioActual || isSubmitted) && !!errors.precioActual}
                className="form-input w-full"
                placeholder="0"
              />
              {showErr('precioActual')}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-6 pt-5 border-t border-p-border">
            <button type="button" onClick={onClose} className="btn-secondary w-full sm:w-auto">Cancelar</button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full sm:w-auto disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {mode === 'add' ? 'Agregar' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Sub-tab: Programas Propios (paginado, read-only) ────────────────────────

function ProgramasPropiosPanel({
  tenantId,
  programas,
  asignaciones,
  onMutate,
  isSaving,
}: {
  tenantId: string
  programas: ProgramaAcademicoItem[]
  asignaciones: AsignacionSnies[]
  onMutate: (next: { programas: ProgramaAcademicoItem[]; asignaciones: AsignacionSnies[] }) => void
  isSaving: boolean
}) {
  const [search, setSearch] = useUrlParam('q')
  const [filterFacultad, setFilterFacultad] = useUrlParam('fac')
  const [page, setPage] = useUrlNumber('page', 1)
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: ProgramaAcademicoItem } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ProgramaAcademicoItem | null>(null)

  // Catálogos del tenant + global
  const { data: facultades = [] } = useQuery<FacultadEscuela[]>({
    queryKey: ['reglas-facultades-escuelas', tenantId],
    queryFn: () => api.get<FacultadEscuela[]>(`reglas/facultades-escuelas?tenantId=${tenantId}`).then(r => r.data),
    staleTime: 30_000,
  })
  const { data: niveles = [] } = useQuery<NivelEducativo[]>({
    queryKey: ['reglas-niveles-educativos', tenantId],
    queryFn: () => api.get<NivelEducativo[]>(`reglas/niveles-educativos?tenantId=${tenantId}`).then(r => r.data),
    staleTime: 30_000,
  })
  const { data: ciudades = [] } = useQuery<CiudadEdu[]>({
    queryKey: ['reglas-ciudades', tenantId],
    queryFn: () => api.get<CiudadEdu[]>(`reglas/ciudades?tenantId=${tenantId}`).then(r => r.data),
    staleTime: 30_000,
  })

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return programas.filter(p => {
      const matchFac = !filterFacultad || p.facultad === filterFacultad
      const matchSearch = !q || p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)
      return matchFac && matchSearch
    })
  }, [programas, search, filterFacultad])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const facultadesOptions = useMemo(() => Array.from(new Set(programas.map(p => p.facultad))).sort(), [programas])

  const existingCodigosForModal = useMemo(() => {
    const exclude = modal?.mode === 'edit' ? modal.item?.codigo : undefined
    return programas.map(p => p.codigo).filter(c => c !== exclude)
  }, [programas, modal])

  const handleSave = (vals: ProgramaFormValues) => {
    if (!modal) return
    const codigo = vals.codigo.trim()
    const nombre = vals.nombre.trim()
    const precioActual = parseInt(vals.precioActual, 10)
    const nivel = vals.nivelEducativo as ProgramaAcademicoItem['nivel']

    let nextProgramas: ProgramaAcademicoItem[]
    if (modal.mode === 'add') {
      const newItem: ProgramaAcademicoItem = {
        id: `prog-new-${Date.now()}`,
        codigo,
        nombre,
        facultad: vals.facultadEscuela,
        nivel,
        ciudad: vals.ciudad,
        precioActual,
        estudiantesBase: 0,
        tenantId,
      }
      nextProgramas = [...programas, newItem]
      setPage(Math.max(1, Math.ceil(nextProgramas.length / PAGE_SIZE)))
    } else if (modal.item) {
      nextProgramas = programas.map(p => p.id === modal.item!.id
        ? { ...p, nombre, facultad: vals.facultadEscuela, nivel, ciudad: vals.ciudad, precioActual }
        : p,
      )
    } else return

    onMutate({ programas: nextProgramas, asignaciones })
    setModal(null)
  }

  const handleDelete = (id: string) => {
    const nextProgramas = programas.filter(p => p.id !== id)
    const nextAsignaciones = asignaciones.filter(a => a.programaId !== id)
    onMutate({ programas: nextProgramas, asignaciones: nextAsignaciones })
    setConfirmDelete(null)
  }

  return (
    <div className="card mt-2">
      {/* Filtros + Agregar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={filterFacultad}
          onChange={e => { setFilterFacultad(e.target.value); setPage(1) }}
          className="form-select py-1.5 text-sm min-w-40"
          aria-label="Filtrar por Facultad/Escuela"
        >
          <option value="">Todas las Facultades/Escuelas</option>
          {facultadesOptions.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <div className="relative">
          <Search size={13} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-p-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar programa o código…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="form-input pl-8 pr-4 py-1.5 text-sm min-w-52"
            aria-label="Buscar programa"
          />
        </div>
        {(filterFacultad || search) && (
          <button onClick={() => { setFilterFacultad(''); setSearch(''); setPage(1) }} className="text-xs text-p-muted hover:text-p-dark underline underline-offset-2">
            Limpiar
          </button>
        )}

        <button
          onClick={() => setModal({ mode: 'add' })}
          className="btn-secondary text-xs flex items-center gap-1 py-1.5 sm:ml-auto w-full sm:w-auto justify-center"
          disabled={isSaving}
        >
          <Plus size={13} /> Agregar
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="data-table w-full min-w-[720px]">
          <thead>
            <tr>
              <th className="text-left">Código</th>
              <th className="text-left">Nombre</th>
              <th className="text-left">Facultad/Escuela</th>
              <th className="text-left">Nivel Educativo</th>
              <th className="text-left">Ciudad</th>
              <th className="text-right">Precio (COP)</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {pageItems.length > 0 ? (
              pageItems.map(prog => (
                <tr key={prog.id}>
                  <td className="text-xs text-p-muted font-mono">{prog.codigo}</td>
                  <td className="text-sm font-medium text-p-dark">{prog.nombre}</td>
                  <td className="text-xs text-p-gray">{prog.facultad}</td>
                  <td className="text-xs text-p-gray">{prog.nivel}</td>
                  <td className="text-xs text-p-gray">{prog.ciudad}</td>
                  <td className="text-right text-sm text-p-dark">${prog.precioActual.toLocaleString('es-CO')}</td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModal({ mode: 'edit', item: prog })}
                        aria-label={`Editar ${prog.nombre}`}
                        className="btn-icon text-p-muted hover:text-p-dark"
                      >
                        <Pencil size={13} aria-hidden />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(prog)}
                        aria-label={`Eliminar ${prog.nombre}`}
                        className="btn-icon text-p-muted hover:text-p-red hover:bg-red-50"
                      >
                        <Trash2 size={13} aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>
                  {programas.length === 0 ? (
                    <EmptyState
                      title="Sin programas"
                      description="Usa el botón Agregar o carga desde la pestaña Importaciones."
                      action={{ label: 'Agregar programa', onClick: () => setModal({ mode: 'add' }) }}
                    />
                  ) : (
                    <EmptyState
                      title="Sin resultados"
                      description="Ningún programa coincide con los filtros aplicados."
                    />
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3 pt-3 border-t border-p-border">
        <span className="text-sm text-p-muted">
          {safePage} / {totalPages} — {filtered.length} programa{filtered.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setPage(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            className="text-sm text-p-gray hover:text-p-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Anterior
          </button>
          <button
            onClick={() => setPage(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages}
            className="text-sm font-semibold text-p-dark hover:text-p-lime disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
          </button>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="¿Eliminar programa?"
          message={`Se eliminará "${confirmDelete.nombre}" (${confirmDelete.codigo}). Las asignaciones SNIES vinculadas también se perderán. Esta acción no se puede deshacer.`}
          onConfirm={() => handleDelete(confirmDelete.id)}
          onClose={() => setConfirmDelete(null)}
        />
      )}

      {modal && (
        <ProgramaModal
          mode={modal.mode}
          initial={modal.item
            ? {
                codigo: modal.item.codigo,
                nombre: modal.item.nombre,
                facultadEscuela: modal.item.facultad,
                nivelEducativo: modal.item.nivel,
                ciudad: modal.item.ciudad,
                precioActual: String(modal.item.precioActual),
              }
            : undefined}
          existingCodigos={existingCodigosForModal}
          facultades={facultades}
          niveles={niveles}
          ciudades={ciudades}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

// ─── Sub-tab: Programas SNIES (browse base global, read-only) ────────────────

const NIVELES_SNIES = ['Pregrado', 'Especialización', 'Maestría', 'Doctorado'] as const
const CIUDADES_SNIES = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga']
const SNIES_PAGE_SIZE = 50

interface SniesResponse {
  items: SniesItem[]
  total: number
}

function ProgramasSniesPanel() {
  const { user } = useAuth()
  const userIsAdmin = checkIsAdmin(user?.rol)

  const [search, setSearch] = useUrlParam('q')
  const [nivel, setNivel] = useUrlParam('nivel')
  const [ciudad, setCiudad] = useUrlParam('ciudad')
  const [page, setPage] = useUrlNumber('page', 1)

  const { data, isLoading, isError, refetch } = useQuery<SniesResponse>({
    queryKey: ['snies-global', search, nivel, ciudad, page],
    queryFn: () => {
      const p = new URLSearchParams()
      if (search) p.set('q', search)
      if (nivel) p.set('nivel', nivel)
      if (ciudad) p.set('ciudad', ciudad)
      p.set('page', String(page))
      p.set('page_size', String(SNIES_PAGE_SIZE))
      return api.get<SniesResponse>(`reglas/competidores-snies?${p}`).then(r => r.data)
    },
    staleTime: 60_000,
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / SNIES_PAGE_SIZE))

  const clearFilters = () => { setSearch(''); setNivel(''); setCiudad(''); setPage(1) }
  const hasFilters = !!(search || nivel || ciudad)

  if (isError) return <QueryErrorState onRetry={refetch} />

  return (
    <div>
      {/* Banner informativo */}
      <div className={`rounded-xl px-4 py-3 mb-4 flex items-start gap-3 text-sm ${
        userIsAdmin ? 'bg-blue-50 border border-blue-200 text-blue-800' : 'bg-p-bg border border-p-border text-p-gray'
      }`} role="note">
        <Info size={16} className="shrink-0 mt-0.5" aria-hidden />
        <span>
          {userIsAdmin
            ? 'La base SNIES es global y afecta a todos los tenants educación. Como admin, puedes actualizarla desde la tab Importaciones → "Actualizar Base SNIES".'
            : 'La base SNIES es global. Solo el rol admin puede actualizarla desde Importaciones. Para asignar SNIES a tus programas propios, ve a la tab Competidores SNIES.'}
        </span>
      </div>

      <div className="card">
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={13} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-p-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar universidad o programa…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="form-input pl-8 pr-4 py-1.5 text-sm w-full"
              aria-label="Buscar en SNIES"
            />
          </div>
          <select
            value={nivel}
            onChange={e => { setNivel(e.target.value); setPage(1) }}
            className="form-select py-1.5 text-sm min-w-40"
            aria-label="Filtrar por nivel"
          >
            <option value="">Todos los niveles</option>
            {NIVELES_SNIES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select
            value={ciudad}
            onChange={e => { setCiudad(e.target.value); setPage(1) }}
            className="form-select py-1.5 text-sm min-w-36"
            aria-label="Filtrar por ciudad"
          >
            <option value="">Todas las ciudades</option>
            {CIUDADES_SNIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-p-muted hover:text-p-dark underline underline-offset-2">
              Limpiar
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="data-table w-full min-w-[800px]">
            <thead>
              <tr>
                <th className="text-left w-24">Cód. SNIES</th>
                <th className="text-left">Programa</th>
                <th className="text-left">Universidad</th>
                <th className="text-left w-28">Ciudad</th>
                <th className="text-left w-28">Nivel</th>
                <th className="text-left w-24">Modalidad</th>
                <th className="text-right w-36">Precio (COP)</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonTable rows={8} columns={7} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title="Sin resultados"
                      description={hasFilters ? 'Ningún programa SNIES coincide con los filtros aplicados.' : 'La base SNIES global está vacía.'}
                    />
                  </td>
                </tr>
              ) : items.map(s => (
                <tr key={s.id}>
                  <td className="font-mono text-xs text-p-muted">{s.codigoSnies}</td>
                  <td className="text-sm text-p-dark font-medium">{s.programa}</td>
                  <td className="text-sm text-p-gray">{s.universidad}</td>
                  <td className="text-sm text-p-gray">{s.ciudad}</td>
                  <td>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-p-bg border border-p-border text-p-gray">
                      {s.nivel}
                    </span>
                  </td>
                  <td className="text-sm text-p-gray">{s.modalidad}</td>
                  <td className="text-right font-mono text-sm text-p-dark">
                    {s.precioActual.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3 pt-3 border-t border-p-border">
            <span className="text-sm text-p-muted">
              {page} / {totalPages} — {total} programa{total !== 1 ? 's' : ''} SNIES
            </span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="text-sm text-p-gray hover:text-p-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="text-sm font-semibold text-p-dark hover:text-p-lime disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PortafolioEduTab principal ───────────────────────────────────────────────

export default function PortafolioEduTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [, setSubTabUrl] = useUrlParam('sub', 'propios')
  const [rawSub] = useUrlParam('sub', 'propios')
  const subTab: 'propios' | 'competencia' = rawSub === 'competencia' ? 'competencia' : 'propios'

  const { data, isLoading, isError, refetch } = useQuery<PortafolioEduResponse>({
    queryKey: ['reglas-portafolio-edu', tenantId],
    queryFn: () => api.get<PortafolioEduResponse>(`reglas/portafolio-edu?tenantId=${tenantId}`).then(r => r.data),
    staleTime: 30_000,
  })

  const programas = data?.programas ?? []
  const asignaciones = data?.asignaciones ?? []

  const mutation = useMutation({
    mutationFn: (payload: PortafolioEduResponse) =>
      api.put(`reglas/portafolio-edu?tenantId=${tenantId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-portafolio-edu', tenantId] })
      toast.success('Cambios guardados')
    },
    onError: (err: unknown) => {
      toast.error('No se pudo guardar: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    },
  })

  if (isError) return <QueryErrorState onRetry={refetch} />
  if (isLoading) return <div className="card mt-2"><SkeletonTable rows={5} columns={8} /></div>
  if (!data) return <Spinner />

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <div className="flex gap-1 p-1 bg-p-surface rounded-lg w-fit">
          <button
            onClick={() => setSubTabUrl('propios')}
            className={subTab === 'propios'
              ? 'px-3 py-1 text-sm rounded-md bg-white text-p-dark font-medium shadow-sm transition-all'
              : 'px-3 py-1 text-sm rounded-md text-p-gray hover:text-p-dark transition-all'}
          >
            Propios
          </button>
          <button
            onClick={() => setSubTabUrl('competencia')}
            className={subTab === 'competencia'
              ? 'px-3 py-1 text-sm rounded-md bg-white text-p-dark font-medium shadow-sm transition-all'
              : 'px-3 py-1 text-sm rounded-md text-p-gray hover:text-p-dark transition-all'}
          >
            Competencia
          </button>
        </div>
      </div>

      {subTab === 'propios' && (
        <ProgramasPropiosPanel
          tenantId={tenantId}
          programas={programas}
          asignaciones={asignaciones}
          onMutate={payload => mutation.mutate(payload)}
          isSaving={mutation.isPending}
        />
      )}
      {subTab === 'competencia' && <ProgramasSniesPanel />}
    </div>
  )
}
