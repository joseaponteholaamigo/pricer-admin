import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import type { Umbrales, UmbralesEdu } from '../../lib/types'
import Spinner from '../../components/Spinner'
import QueryErrorState from '../../components/QueryErrorState'
import SaveBar from '../../components/SaveBar'
import { useToast } from '../../components/useToast'
import { umbralesSchema, type UmbralesInput } from '../../schemas/reglas'

// ─── verticalKey: 'r002' = FMCG (default), 'r010' = Educación ────────────────

type VerticalKey = 'r002' | 'r010'

// ─── UmbralesTab (R-008 FMCG / Educación con campos extra) ───────────────────

function UmbralesTab({ tenantId, verticalKey = 'r002' }: { tenantId: string; verticalKey?: VerticalKey }) {
  const isEdu = verticalKey === 'r010'
  const queryClient = useQueryClient()
  const toast = useToast()

  // Estado local para campos edu adicionales
  const [vpMaximo, setVpMaximo] = useState(5.0)
  const [sensibilidadMinima, setSensibilidadMinima] = useState(0.01)
  const [mercadoOverrides, setMercadoOverrides] = useState<{ categoria: string; valor: number }[]>([])
  const [eduFieldsDirty, setEduFieldsDirty] = useState(false)

  const queryKeyBase = isEdu ? 'reglas-umbrales-edu' : 'reglas-umbrales'

  const { data, isLoading, isError, refetch } = useQuery<Umbrales | UmbralesEdu>({
    queryKey: [queryKeyBase, tenantId],
    queryFn: () => isEdu
      ? api.get<UmbralesEdu>(`reglas/umbrales-edu?tenantId=${tenantId}`).then(r => r.data)
      : api.get<Umbrales>(`reglas/umbrales?tenantId=${tenantId}`).then(r => r.data),
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
      if (isEdu && 'mercadoTotalOverride' in data) {
        const eduData = data as UmbralesEdu
        setVpMaximo(eduData.vpMaximo)
        setSensibilidadMinima(eduData.sensibilidadMinima)
        setMercadoOverrides(eduData.mercadoTotalOverride)
        setEduFieldsDirty(false)
      }
    }
  }, [data, reset, isEdu])

  const current = watch()

  const mutation = useMutation({
    mutationFn: (values: UmbralesInput) => {
      if (isEdu) {
        const payload: UmbralesEdu = {
          umbralSuperior: values.umbralSuperior,
          umbralInferior: values.umbralInferior,
          vpMaximo,
          sensibilidadMinima,
          mercadoTotalOverride: mercadoOverrides,
        }
        return api.put(`reglas/umbrales-edu?tenantId=${tenantId}`, payload)
      }
      return api.put(`reglas/umbrales?tenantId=${tenantId}`, values)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyBase, tenantId] })
      setEduFieldsDirty(false)
      toast.success('Cambios guardados')
    },
    onError: (err: unknown) => {
      toast.error('No se pudo guardar: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    },
  })

  const onSubmit = (values: UmbralesInput) => {
    mutation.mutate(values)
  }

  const updateMercado = (idx: number, valor: number) => {
    setMercadoOverrides(prev => prev.map((o, i) => i === idx ? { ...o, valor } : o))
    setEduFieldsDirty(true)
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

  const isFormDirty = isDirty || eduFieldsDirty

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        {isEdu
          ? 'Define umbrales de alerta y parámetros de mercado para el modelo de precios educativos.'
          : 'Define el porcentaje de desviación que dispara una alerta. Se aplica a todos los SKUs del tenant.'}
      </p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="card max-w-sm">
          {/* Sliders umbral superior/inferior (iguales en ambos verticales) */}
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

        {/* ── Campos exclusivos del vertical educación ─────────────────────── */}
        {isEdu && (
          <div className="card max-w-sm mt-4">
            <h3 className="text-sm font-semibold text-p-dark mb-4">Parámetros de modelo educativo</h3>

            {/* VP Máximo */}
            <div className="mb-4">
              <label htmlFor="vp-maximo" className="form-label">VP Máximo de escala</label>
              <p className="text-xs text-p-muted mb-2">Valor percibido máximo posible en la escala del modelo (ej. 5.0)</p>
              <div className="flex items-center gap-3">
                <input
                  id="vp-maximo"
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={vpMaximo}
                  onChange={e => { setVpMaximo(Number(e.target.value)); setEduFieldsDirty(true) }}
                  className="flex-1 accent-p-lime"
                  aria-label="VP Máximo"
                />
                <span className="text-xl font-bold tabular-nums w-16 text-right text-p-lime">
                  {vpMaximo.toFixed(1)}
                </span>
              </div>
            </div>

            {/* Sensibilidad Mínima */}
            <div>
              <label htmlFor="sensibilidad-minima" className="form-label">Sensibilidad mínima</label>
              <p className="text-xs text-p-muted mb-2">
                Variación de precio por debajo de la cual no se recalibra el modelo (en decimales, ej. 0,01 = 1%)
              </p>
              <input
                id="sensibilidad-minima"
                type="text"
                inputMode="decimal"
                value={sensibilidadMinima}
                onChange={e => {
                  const v = parseFloat(e.target.value)
                  if (!isNaN(v) && v > 0 && v < 1) {
                    setSensibilidadMinima(v)
                    setEduFieldsDirty(true)
                  }
                }}
                className="form-input py-1.5 text-sm w-32 font-mono"
                aria-label="Sensibilidad mínima del modelo"
              />
            </div>
          </div>
        )}

        {/* ── Mercado total override por categoría (solo edu) ───────────────── */}
        {isEdu && mercadoOverrides.length > 0 && (
          <div className="card mt-4">
            <h3 className="text-sm font-semibold text-p-dark mb-1">Override de mercado total por categoría</h3>
            <p className="text-xs text-p-muted mb-4">
              Sobreescribe el tamaño de mercado usado en el cálculo de participación.
              Dejar en 0 para usar el calculado automáticamente.
            </p>
            <div className="overflow-x-auto">
              <table className="data-table w-full min-w-[380px]">
                <thead>
                  <tr>
                    <th className="text-left">Categoría</th>
                    <th className="text-center w-48">Mercado total (estudiantes)</th>
                  </tr>
                </thead>
                <tbody>
                  {mercadoOverrides.map((o, idx) => (
                    <tr key={o.categoria}>
                      <td className="text-sm text-p-dark">{o.categoria}</td>
                      <td className="text-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={o.valor === 0 ? '' : String(o.valor)}
                          onChange={e => {
                            const v = parseInt(e.target.value, 10)
                            updateMercado(idx, isNaN(v) ? 0 : Math.max(0, v))
                          }}
                          placeholder="auto"
                          aria-label={`Override mercado total para ${o.categoria}`}
                          className="form-input py-1 text-sm text-center w-36 mx-auto font-mono"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <SaveBar
          onSave={() => handleSubmit(onSubmit)()}
          saving={isSubmitting || mutation.isPending}
          dirty={isFormDirty}
        />
      </form>
    </div>
  )
}

export default UmbralesTab
