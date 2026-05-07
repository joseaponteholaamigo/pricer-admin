import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GraduationCap, Lock, Trash2, Upload } from 'lucide-react'
import api from '../../../lib/api'
import { useAuth } from '../../../lib/auth'
import { isAdmin as checkIsAdmin, isConsultorPrisier } from '../../../lib/permissions'
import type { MatrizPreferencia, TenantListItem } from '../../../lib/types'
import Skeleton from '../../../components/Skeleton'
import QueryErrorState from '../../../components/QueryErrorState'
import { useToast } from '../../../components/ToastProvider'
import UploadMatrizModal from './UploadMatrizModal'
import ConfirmModal from '../../../components/ConfirmModal'

// ─── MatricesPreferenciaTab ───────────────────────────────────────────────────

export default function MatricesPreferenciaTab({ tenantId }: { tenantId: string }) {
  const { user } = useAuth()
  const isAdmin = checkIsAdmin(user?.rol)
  const isConsultor = isConsultorPrisier(user?.rol)
  const puedeGestionar = isAdmin || isConsultor

  const queryClient = useQueryClient()
  const toast = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: tenants = [] } = useQuery<TenantListItem[]>({
    queryKey: ['tenants'],
    queryFn: () => api.get<TenantListItem[]>('tenants').then(r => r.data),
    staleTime: 5 * 60_000,
  })
  const tenantNombre = useMemo(
    () => tenants.find(t => t.id === tenantId)?.nombre ?? tenantId,
    [tenants, tenantId],
  )

  const { data: allMatrices = [], isLoading, isError, refetch } = useQuery<MatrizPreferencia[]>({
    queryKey: ['reglas-matrices-preferencia'],
    queryFn: () => api.get<MatrizPreferencia[]>('reglas/matrices-preferencia').then(r => r.data),
    staleTime: 60_000,
  })
  const matrices = useMemo(
    () => allMatrices.filter(m => m.tenantId === tenantId),
    [allMatrices, tenantId],
  )

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`reglas/matrices-preferencia/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reglas-matrices-preferencia'] })
      toast.success('Matriz eliminada')
    },
    onError: () => {
      toast.error('No se pudo eliminar la matriz')
    },
  })

  // Solo personal Prisier puede gestionar matrices
  if (!puedeGestionar) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-p-gray">
        <Lock size={48} className="mb-4 opacity-40" aria-hidden />
        <p className="text-sm font-medium">Solo personal Prisier puede gestionar matrices de preferencia.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (isError) {
    return <QueryErrorState onRetry={refetch} message="No se pudo cargar las matrices de preferencia." />
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <p className="text-sm text-p-gray flex-1">
          Matrices del tenant <span className="font-medium text-p-dark">{tenantNombre}</span>.
          Cada matriz corresponde a una combinación (Facultad/Escuela · Nivel Educativo · Ciudad).
          Si ya existe una matriz para esa combinación, se reemplaza al subir una nueva.
        </p>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="btn-primary text-xs flex items-center gap-1.5 shrink-0"
        >
          <Upload size={13} aria-hidden /> Subir matriz
        </button>
      </div>

      {matrices.length === 0 ? (
        <div
          role="status"
          aria-label="Sin matrices cargadas"
          className="flex flex-col items-center justify-center py-14 border border-dashed border-p-border rounded-xl text-p-muted"
        >
          <GraduationCap size={40} className="mb-3 opacity-30" aria-hidden />
          <p className="text-sm font-medium">Sin matrices cargadas</p>
          <p className="text-xs mt-1 max-w-sm text-center">
            Sube una Matriz de Preferencia para habilitar el Simulador en el cliente.
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="text-left">Facultad / Escuela</th>
                <th className="text-left">Nivel Educativo</th>
                <th className="text-left">Ciudad</th>
                <th className="text-left">Fecha</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {matrices.map(m => (
                <tr key={m.id}>
                  <td>{m.facultadEscuela}</td>
                  <td>{m.nivelEducativo}</td>
                  <td>{m.ciudad}</td>
                  <td className="text-sm text-p-muted">
                    {m.fechaSubida ? new Date(m.fechaSubida).toLocaleDateString('es-CO') : '—'}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setDeletingId(m.id)}
                      className="text-p-muted hover:text-p-red transition-colors"
                      aria-label={`Eliminar matriz ${m.facultadEscuela} · ${m.nivelEducativo} · ${m.ciudad}`}
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de subida */}
      <UploadMatrizModal
        isOpen={modalOpen}
        tenantId={tenantId}
        tenantNombre={tenantNombre}
        onClose={() => setModalOpen(false)}
        onConfirmed={() => {
          void queryClient.invalidateQueries({ queryKey: ['reglas-matrices-preferencia'] })
          setModalOpen(false)
        }}
      />

      {/* Confirm eliminar */}
      {deletingId !== null && (
        <ConfirmModal
          title="Eliminar matriz de preferencia"
          message="Esta acción eliminará permanentemente la matriz. Los clientes perderán acceso al Simulador para esta combinación."
          onConfirm={() => {
            deleteMutation.mutate(deletingId)
            setDeletingId(null)
          }}
          onClose={() => setDeletingId(null)}
        />
      )}
    </div>
  )
}
