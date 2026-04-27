import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import type { Umbrales } from '../../lib/types'
import Spinner from '../../components/Spinner'
import QueryErrorState from '../../components/QueryErrorState'
import SaveBar from '../../components/SaveBar'
import { useToast } from '../../components/useToast'
import { umbralesSchema, type UmbralesInput } from '../../schemas/reglas'

// ─── UmbralesTab (R-008) ──────────────────────────────────────────────────────
// RHF completo: dos campos con validación cruzada (superior > inferior) que
// debe mostrarse inline. El slider actualiza RHF a través de setValue.

function UmbralesTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { data, isLoading, isError, refetch } = useQuery<Umbrales>({
    queryKey: ['reglas-umbrales', tenantId],
    queryFn: () => api.get<Umbrales>(`reglas/umbrales?tenantId=${tenantId}`).then(r => r.data),
  })

  const {
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<UmbralesInput>({
    resolver: zodResolver(umbralesSchema),
    defaultValues: { umbralSuperior: 0.05, umbralInferior: 0.05 },
    mode: 'onChange',
  })

  // Sincronizar con datos del servidor cuando llegan
  useEffect(() => {
    if (data) {
      reset({ umbralSuperior: data.umbralSuperior, umbralInferior: data.umbralInferior })
    }
  }, [data, reset])

  const current = watch()

  const mutation = useMutation({
    mutationFn: (values: UmbralesInput) =>
      api.put(`reglas/umbrales?tenantId=${tenantId}`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-umbrales', tenantId] })
      toast.success('Cambios guardados')
    },
    onError: (err: unknown) => {
      toast.error('No se pudo guardar: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    },
  })

  const onSubmit = (values: UmbralesInput) => {
    mutation.mutate(values)
  }

  if (isError) return <QueryErrorState onRetry={refetch} />
  if (isLoading) return <Spinner />

  const FIELDS = [
    {
      field: 'umbralSuperior' as const,
      label: 'Umbral superior',
      color: 'text-p-red',
      desc: 'Alerta cuando el precio sube más de X%',
      errorId: 'umbral-superior-error',
    },
    {
      field: 'umbralInferior' as const,
      label: 'Umbral inferior',
      color: 'text-p-blue',
      desc: 'Alerta cuando el precio baja más de X%',
      errorId: 'umbral-inferior-error',
    },
  ] as const

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Define el porcentaje de desviación que dispara una alerta. Se aplica a todos los SKUs del tenant.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="card max-w-sm">
          <div className="space-y-5">
            {FIELDS.map(({ field, label, color, desc, errorId }) => (
              <div key={field}>
                <label htmlFor={`slider-${field}`} className="form-label">{label}</label>
                <p className="text-xs text-p-muted mb-2">{desc}</p>
                <div className="flex items-center gap-3">
                  <input
                    id={`slider-${field}`}
                    type="range"
                    min={1}
                    max={30}
                    step={0.5}
                    value={Math.round(current[field] * 100 * 10) / 10}
                    onChange={e =>
                      setValue(field, Number(e.target.value) / 100, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    aria-invalid={!!errors[field]}
                    aria-describedby={errors[field] ? errorId : undefined}
                    className="flex-1 accent-p-lime"
                  />
                  <span className={`text-xl font-bold tabular-nums w-16 text-right ${color}`}>
                    {(current[field] * 100).toFixed(1)}%
                  </span>
                </div>
                {errors[field] && (
                  <p id={errorId} className="text-xs text-p-red mt-1" role="alert">
                    {errors[field]!.message}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Error de validación cruzada (superior > inferior) */}
          {errors.umbralSuperior?.message?.includes('mayor') && (
            <p className="text-xs text-p-red mt-3" role="alert">
              {errors.umbralSuperior.message}
            </p>
          )}

          <div className="mt-5 p-3 rounded-lg bg-p-bg border border-p-border">
            <p className="text-xs text-p-muted mb-2">Zona de alerta visualizada</p>
            <div className="relative h-6 rounded-full bg-gradient-to-r from-p-red via-p-lime to-p-red overflow-hidden opacity-70" />
            <div className="flex justify-between text-[10px] text-p-muted mt-1">
              <span>-{(current.umbralInferior * 100).toFixed(1)}%</span>
              <span className="text-p-lime text-xs font-medium">Precio actual</span>
              <span>+{(current.umbralSuperior * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <SaveBar
          onSave={() => handleSubmit(onSubmit)()}
          saving={isSubmitting || mutation.isPending}
          dirty={isDirty}
        />
      </form>
    </div>
  )
}

export default UmbralesTab
