import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import type { Umbrales } from '../../lib/types'
import Spinner from '../../components/Spinner'
import SaveBar from '../../components/SaveBar'

// ─── UmbralesTab (R-008) ──────────────────────────────────────────────────────

function UmbralesTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery<Umbrales>({
    queryKey: ['reglas-umbrales', tenantId],
    queryFn: () => api.get<Umbrales>(`reglas/umbrales?tenantId=${tenantId}`).then(r => r.data),
  })

  const [form, setForm] = useState<Umbrales | null>(null)
  const dirty = form !== null
  const current = form ?? data ?? { umbralSuperior: 0.05, umbralInferior: 0.05 }

  const mutation = useMutation({
    mutationFn: () => api.put(`reglas/umbrales?tenantId=${tenantId}`, current),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-umbrales', tenantId] })

      setForm(null)
    },
  })

  if (isLoading) return <Spinner />

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Define el porcentaje de desviación que dispara una alerta. Se aplica a todos los SKUs del tenant.
      </p>
      <div className="card max-w-sm">
        <div className="space-y-5">
          {[
            { field: 'umbralSuperior' as const, label: 'Umbral superior', color: 'text-p-red', desc: 'Alerta cuando el precio sube más de X%' },
            { field: 'umbralInferior' as const, label: 'Umbral inferior', color: 'text-p-blue', desc: 'Alerta cuando el precio baja más de X%' },
          ].map(({ field, label, color, desc }) => (
            <div key={field}>
              <label className="form-label">{label}</label>
              <p className="text-xs text-p-muted mb-2">{desc}</p>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={1} max={30} step={0.5}
                  value={Math.round(current[field] * 100)}
                  onChange={e => setForm({ ...current, [field]: Number(e.target.value) / 100 })}
                  className="flex-1 accent-p-lime"
                />
                <span className={`text-xl font-bold tabular-nums w-16 text-right ${color}`}>
                  {(current[field] * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
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
      <SaveBar onSave={() => mutation.mutate()} saving={mutation.isPending} dirty={dirty} />
    </div>
  )
}

export default UmbralesTab
