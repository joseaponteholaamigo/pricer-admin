import { useState } from 'react'
import { useUrlParam } from '../../lib/useUrlState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, FileDown } from 'lucide-react'
import api from '../../lib/api'
import { downloadTemplate } from '../../lib/downloadTemplate'
import type { CategoriaAtributos, AtributoCategoria } from '../../lib/types'
import Spinner from '../../components/Spinner'
import QueryErrorState from '../../components/QueryErrorState'
import SaveBar from '../../components/SaveBar'
import SearchableSelect from '../../components/SearchableSelect'
import { useToast } from '../../components/useToast'
import { atributosSchema } from '../../schemas/reglas'

// ─── AtributosTab (R-002 — parte a: atributos + pesos) ───────────────────────

function AtributosTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { data = [], isLoading, isError, refetch } = useQuery<CategoriaAtributos[]>({
    queryKey: ['reglas-atributos', tenantId],
    queryFn: () => api.get<CategoriaAtributos[]>(`reglas/atributos?tenantId=${tenantId}`).then(r => r.data),
  })

  const [selectedCat, setSelectedCat] = useUrlParam('cat')
  const [atributos, setAtributos] = useState<AtributoCategoria[] | null>(null)
  const dirty = atributos !== null

  // '' en URL significa "ninguna seleccionada" → usar la primera del listado
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

  // Validación al borde antes del PATCH
  const [zodError, setZodError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => api.put(`reglas/atributos?tenantId=${tenantId}`, { categoria, atributos: currentAtributos }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-atributos', tenantId] })
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
          Configura los 5 atributos de valor percibido por categoría. Los pesos deben sumar 100% (precisión 10 decimales).
        </p>
        <button
          onClick={() => downloadTemplate(
            'atributos.xlsx',
            'Atributos',
            ['Categoría', 'Atributo', 'Peso (%)'],
            { 'Categoría': 'Gaseosas', 'Atributo': 'Sabor', 'Peso (%)': 25 },
          )}
          aria-label="Descargar plantilla de atributos"
          className="btn-secondary text-xs flex items-center gap-1 py-1.5 flex-shrink-0"
        >
          <FileDown size={13} aria-hidden /> Descargar plantilla
        </button>
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
    </div>
  )
}

export default AtributosTab
