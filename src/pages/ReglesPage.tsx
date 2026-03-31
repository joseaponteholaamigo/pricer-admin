import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock, Lock, Plus, Trash2, Save, AlertTriangle } from 'lucide-react'
import api from '../lib/api'
import type {
  TenantListItem,
  ReglaResumenItem,
  CompetidoresData,
  CategoriaVP,
  AtributoVP,
  ElasticidadItem,
  ColConfig,
  CanalesMargenes,
  Umbrales,
  PesoItem,
} from '../lib/types'

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'resumen',    label: 'Resumen' },
  { id: 'r001',       label: 'R-001 Competidores' },
  { id: 'r002',       label: 'R-002 Valor Percibido' },
  { id: 'r004',       label: 'R-004 Elasticidad' },
  { id: 'r005',       label: 'R-005 Costos' },
  { id: 'r006',       label: 'R-006 SKUs/PVP' },
  { id: 'r007',       label: 'R-007 Canales' },
  { id: 'r008',       label: 'R-008 Umbrales' },
  { id: 'r009',       label: 'R-009 Profit Pool' },
]

// ─── Shared helpers ───────────────────────────────────────────────────────────

function SaveBar({ onSave, saving, dirty }: { onSave: () => void; saving: boolean; dirty: boolean }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-4 border-t border-p-border mt-6">
      {dirty && (
        <span className="text-xs text-p-yellow flex items-center gap-1">
          <AlertTriangle size={13} /> Cambios sin guardar
        </span>
      )}
      <button onClick={onSave} disabled={saving || !dirty} className="btn-primary flex items-center gap-2 disabled:opacity-40">
        <Save size={15} />
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  )
}

function SoloPricerBadge() {
  return (
    <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}>
      <Lock size={10} className="mr-1" /> Solo Pricer
    </span>
  )
}

// ─── ResumenTab ───────────────────────────────────────────────────────────────

function ResumenTab({ tenantId }: { tenantId: string }) {
  const { data = [], isLoading } = useQuery<ReglaResumenItem[]>({
    queryKey: ['reglas-resumen', tenantId],
    queryFn: () => api.get<ReglaResumenItem[]>(`reglas/resumen?tenantId=${tenantId}`).then(r => r.data),
  })

  const soloPricer = ['R-004', 'R-007']

  if (isLoading) return <Spinner />

  return (
    <div className="grid grid-cols-1 gap-3">
      {data.map(item => (
        <div key={item.tipo} className="card flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {item.configurada
              ? <CheckCircle2 size={20} className="text-p-lime shrink-0" />
              : <Clock size={20} className="text-p-yellow shrink-0" />
            }
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-p-dark">{item.tipo}</span>
                {soloPricer.includes(item.tipo) && <SoloPricerBadge />}
                <span className={`badge ${item.configurada ? 'badge-green' : 'badge-yellow'}`}>
                  {item.configurada ? 'Configurada' : 'Pendiente'}
                </span>
              </div>
              <p className="text-xs text-p-gray mt-0.5">{item.descripcion}</p>
            </div>
          </div>
          {item.actualizadaEn && (
            <div className="text-right shrink-0">
              <p className="text-xs text-p-gray">{new Date(item.actualizadaEn).toLocaleDateString('es-CO')}</p>
              <p className="text-xs text-p-muted">{item.actualizadaPor}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── CompetidoresTab (R-001) ──────────────────────────────────────────────────

function CompetidoresTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery<CompetidoresData>({
    queryKey: ['reglas-r001', tenantId],
    queryFn: () => api.get<CompetidoresData>(`reglas/competidores?tenantId=${tenantId}`).then(r => r.data),
  })

  const [mapeo, setMapeo] = useState<Record<string, string[]> | null>(null)
  const dirty = mapeo !== null

  const currentMapeo = mapeo ?? data?.mapeo ?? {}

  const toggle = (skuId: string, compId: string) => {
    const current = currentMapeo[skuId] ?? []
    const updated = current.includes(compId)
      ? current.filter(id => id !== compId)
      : [...current, compId]
    setMapeo({ ...currentMapeo, [skuId]: updated })
  }

  const mutation = useMutation({
    mutationFn: () => api.put(`reglas/competidores?tenantId=${tenantId}`, { mapeo: currentMapeo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-r001', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['reglas-resumen', tenantId] })
      setMapeo(null)
    },
  })

  if (isLoading || !data) return <Spinner />

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Selecciona los competidores que aplican para cada SKU. Solo se comparan precios con los competidores asignados.
      </p>
      <div className="card overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th className="text-left">SKU</th>
              <th className="text-left">Categoría</th>
              {data.competidores.map(c => (
                <th key={c.id} className="text-center text-xs" style={{ minWidth: 90 }}>{c.nombre}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.skus.map(sku => (
              <tr key={sku.id}>
                <td className="font-medium text-p-dark text-sm">{sku.nombre}</td>
                <td className="text-xs text-p-gray">{sku.categoria}</td>
                {data.competidores.map(comp => {
                  const checked = (currentMapeo[sku.id] ?? []).includes(comp.id)
                  return (
                    <td key={comp.id} className="text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(sku.id, comp.id)}
                        className="w-4 h-4 accent-p-lime cursor-pointer"
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SaveBar onSave={() => mutation.mutate()} saving={mutation.isPending} dirty={dirty} />
    </div>
  )
}

// ─── ValorPercibidoTab (R-002/R-003) ─────────────────────────────────────────

function ValorPercibidoTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const { data = [], isLoading } = useQuery<CategoriaVP[]>({
    queryKey: ['reglas-r002', tenantId],
    queryFn: () => api.get<CategoriaVP[]>(`reglas/valor-percibido?tenantId=${tenantId}`).then(r => r.data),
  })

  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [atributos, setAtributos] = useState<AtributoVP[] | null>(null)
  const dirty = atributos !== null

  const categoria = selectedCat ?? data[0]?.categoria ?? ''
  const currentAtributos = atributos ?? data.find(d => d.categoria === categoria)?.atributos ?? []

  const selectCat = (cat: string) => {
    setSelectedCat(cat)
    setAtributos(null)
  }

  const updateAtributo = (idx: number, field: keyof AtributoVP, value: string | number) => {
    const copy = currentAtributos.map((a, i) => i === idx ? { ...a, [field]: value } : a)
    setAtributos(copy)
  }

  const sumaPesos = currentAtributos.reduce((acc, a) => acc + Number(a.peso), 0)
  const vpActual = Math.round(currentAtributos.reduce((acc, a) => acc + Number(a.peso) * Number(a.calificacion), 0) * 100) / 100

  const mutation = useMutation({
    mutationFn: () => api.put(`reglas/valor-percibido?tenantId=${tenantId}`, {
      categoria,
      atributos: currentAtributos,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-r002', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['reglas-resumen', tenantId] })
      setAtributos(null)
    },
  })

  if (isLoading) return <Spinner />

  const pesoError = Math.abs(sumaPesos - 1.0) > 0.01

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Configura los 5 atributos de valor percibido por categoría. Los pesos deben sumar 100%.
      </p>

      {/* Selector categoría */}
      <div className="flex gap-2 flex-wrap mb-5">
        {data.map(d => (
          <button
            key={d.categoria}
            onClick={() => selectCat(d.categoria)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              (selectedCat ?? data[0]?.categoria) === d.categoria
                ? 'bg-p-lime text-p-bg border-p-lime'
                : 'border-p-border text-p-gray hover:border-p-lime hover:text-p-dark'
            }`}
          >
            {d.categoria}
          </button>
        ))}
      </div>

      {currentAtributos.length > 0 && (
        <div className="card">
          {/* VP summary */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-p-gray">Valor Percibido calculado</span>
            <div className="flex items-center gap-3">
              {pesoError && (
                <span className="text-xs text-p-red flex items-center gap-1">
                  <AlertTriangle size={13} /> Pesos suman {(sumaPesos * 100).toFixed(0)}% (deben ser 100%)
                </span>
              )}
              <span className="text-2xl font-bold text-p-lime">{vpActual.toFixed(2)}</span>
              <span className="text-sm text-p-gray">/ 5.00</span>
            </div>
          </div>

          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="text-left">#</th>
                <th className="text-left">Atributo</th>
                <th className="text-center">Peso (%)</th>
                <th className="text-center">Calificación (1–5)</th>
                <th className="text-center">Contribución</th>
              </tr>
            </thead>
            <tbody>
              {currentAtributos.map((a, idx) => (
                <tr key={idx}>
                  <td className="text-xs text-p-muted w-6">{idx + 1}</td>
                  <td>
                    <input
                      value={a.nombre}
                      onChange={e => updateAtributo(idx, 'nombre', e.target.value)}
                      className="form-input py-1 text-sm w-full"
                    />
                  </td>
                  <td className="text-center">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      step={1}
                      value={Math.round(Number(a.peso) * 100)}
                      onChange={e => updateAtributo(idx, 'peso', Number(e.target.value) / 100)}
                      className="form-input py-1 text-sm text-center w-20 mx-auto"
                    />
                  </td>
                  <td className="text-center">
                    <input
                      type="number"
                      min={1}
                      max={5}
                      step={0.5}
                      value={a.calificacion}
                      onChange={e => updateAtributo(idx, 'calificacion', Number(e.target.value))}
                      className="form-input py-1 text-sm text-center w-20 mx-auto"
                    />
                  </td>
                  <td className="text-center text-sm font-medium text-p-lime">
                    {(Number(a.peso) * Number(a.calificacion)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} />
                <td className={`text-center text-sm font-bold ${pesoError ? 'text-p-red' : 'text-p-lime'}`}>
                  {(sumaPesos * 100).toFixed(0)}%
                </td>
                <td />
                <td className="text-center text-sm font-bold text-p-lime">{vpActual.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <SaveBar
        onSave={() => mutation.mutate()}
        saving={mutation.isPending}
        dirty={dirty && !pesoError}
      />
    </div>
  )
}

// ─── ElasticidadTab (R-004) ───────────────────────────────────────────────────

function ElasticidadTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const { data = [], isLoading } = useQuery<ElasticidadItem[]>({
    queryKey: ['reglas-r004', tenantId],
    queryFn: () => api.get<ElasticidadItem[]>(`reglas/elasticidad?tenantId=${tenantId}`).then(r => r.data),
  })

  const [items, setItems] = useState<ElasticidadItem[] | null>(null)
  const dirty = items !== null
  const current = items ?? data

  const update = (idx: number, field: keyof ElasticidadItem, value: number) => {
    setItems(current.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }

  const mutation = useMutation({
    mutationFn: () => api.put(`reglas/elasticidad?tenantId=${tenantId}`, current),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-r004', tenantId] })
      setItems(null)
    },
  })

  if (isLoading) return <Spinner />

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <p className="text-sm text-p-gray flex-1">
          Coeficientes de elasticidad precio-demanda por SKU. Valores negativos indican relación inversa (precio sube → demanda baja).
        </p>
        <SoloPricerBadge />
      </div>
      <div className="card overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th className="text-left">SKU</th>
              <th className="text-center">Coeficiente (ε)</th>
              <th className="text-center">Confianza</th>
              <th className="text-center">R²</th>
              <th className="text-center">Interpretación</th>
            </tr>
          </thead>
          <tbody>
            {current.map((e, idx) => (
              <tr key={e.skuId}>
                <td className="text-sm font-medium text-p-dark">{e.skuNombre}</td>
                <td className="text-center">
                  <input
                    type="number"
                    step={0.01}
                    value={e.coeficiente}
                    onChange={ev => update(idx, 'coeficiente', Number(ev.target.value))}
                    className="form-input py-1 text-sm text-center w-24 mx-auto"
                  />
                </td>
                <td className="text-center">
                  <input
                    type="number"
                    min={0} max={1} step={0.01}
                    value={e.confianza}
                    onChange={ev => update(idx, 'confianza', Number(ev.target.value))}
                    className="form-input py-1 text-sm text-center w-20 mx-auto"
                  />
                </td>
                <td className="text-center">
                  <input
                    type="number"
                    min={0} max={1} step={0.01}
                    value={e.r2}
                    onChange={ev => update(idx, 'r2', Number(ev.target.value))}
                    className="form-input py-1 text-sm text-center w-20 mx-auto"
                  />
                </td>
                <td className="text-center text-xs">
                  <span className={`badge ${e.coeficiente < -2 ? 'badge-red' : e.coeficiente < -1.5 ? 'badge-yellow' : 'badge-green'}`}>
                    {e.coeficiente < -2 ? 'Muy elástico' : e.coeficiente < -1.5 ? 'Elástico' : 'Poco elástico'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SaveBar onSave={() => mutation.mutate()} saving={mutation.isPending} dirty={dirty} />
    </div>
  )
}

// ─── ColConfigTab (R-005 y R-006) ────────────────────────────────────────────

function ColConfigTab({
  tenantId,
  regla,
  titulo,
  colLabel,
  colLabel2,
}: {
  tenantId: string
  regla: 'r005' | 'r006'
  titulo: string
  colLabel: string
  colLabel2: string
}) {
  const queryClient = useQueryClient()
  const endpoint = regla === 'r005' ? 'costos-config' : 'skus-config'

  const { data, isLoading } = useQuery<ColConfig>({
    queryKey: [`reglas-${regla}`, tenantId],
    queryFn: () => api.get<ColConfig>(`reglas/${endpoint}?tenantId=${tenantId}`).then(r => r.data),
  })

  const [form, setForm] = useState<ColConfig | null>(null)
  const dirty = form !== null
  const current = form ?? data ?? { ean: 'A', nombreProducto: 'B', costoVariableOPvp: 'C', fechaVigenciaOCanal: 'D' }

  const update = (field: keyof ColConfig, val: string) => setForm({ ...current, [field]: val.toUpperCase().slice(0, 2) })

  const mutation = useMutation({
    mutationFn: () => api.put(`reglas/${endpoint}?tenantId=${tenantId}`, current),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`reglas-${regla}`, tenantId] })
      setForm(null)
    },
  })

  if (isLoading) return <Spinner />

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Indica en qué columna de la plantilla Excel se encuentra cada campo. Usa letras (A, B, C…).
      </p>
      <div className="card max-w-md">
        <h3 className="text-sm font-semibold text-p-dark mb-4">{titulo}</h3>
        <div className="space-y-3">
          {[
            { field: 'ean' as const, label: 'EAN / Código' },
            { field: 'nombreProducto' as const, label: 'Nombre del producto' },
            { field: 'costoVariableOPvp' as const, label: colLabel },
            { field: 'fechaVigenciaOCanal' as const, label: colLabel2 },
          ].map(({ field, label }) => (
            <div key={field} className="flex items-center justify-between gap-4">
              <label className="form-label mb-0 flex-1">{label}</label>
              <input
                value={current[field]}
                onChange={e => update(field, e.target.value)}
                className="form-input py-1 text-center w-16 uppercase"
                maxLength={2}
              />
            </div>
          ))}
        </div>

        {/* Preview */}
        <div className="mt-5 p-3 rounded-lg bg-p-bg border border-p-border">
          <p className="text-xs text-p-muted mb-2 font-medium">Vista previa — fila ejemplo</p>
          <div className="flex gap-1 text-xs">
            {['A','B','C','D','E'].map(col => {
              const field = Object.entries(current).find(([, v]) => v === col)?.[0]
              return (
                <div
                  key={col}
                  className={`px-2 py-1.5 rounded border text-center min-w-[52px] ${
                    field ? 'border-p-lime bg-p-lime-bg text-p-dark font-medium' : 'border-p-border text-p-muted'
                  }`}
                >
                  <div className="font-bold">{col}</div>
                  {field && <div className="text-[10px] mt-0.5 truncate">{fieldLabel(field)}</div>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <SaveBar onSave={() => mutation.mutate()} saving={mutation.isPending} dirty={dirty} />
    </div>
  )
}

function fieldLabel(f: string) {
  const m: Record<string, string> = {
    ean: 'EAN',
    nombreProducto: 'Nombre',
    costoVariableOPvp: 'Costo/PVP',
    fechaVigenciaOCanal: 'Fecha/Canal',
  }
  return m[f] ?? f
}

// ─── CanalesTab (R-007) ───────────────────────────────────────────────────────

function CanalesTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery<CanalesMargenes>({
    queryKey: ['reglas-r007', tenantId],
    queryFn: () => api.get<CanalesMargenes>(`reglas/canales-margenes?tenantId=${tenantId}`).then(r => r.data),
  })

  const [form, setForm] = useState<CanalesMargenes | null>(null)
  const dirty = form !== null
  const current = form ?? data ?? { iva: 0.19, canales: [] }

  const setIva = (v: number) => setForm({ ...current, iva: v })
  const updateCanal = (idx: number, field: 'nombre' | 'margen', value: string | number) =>
    setForm({ ...current, canales: current.canales.map((c, i) => i === idx ? { ...c, [field]: value } : c) })
  const addCanal = () => setForm({ ...current, canales: [...current.canales, { nombre: '', margen: 0.70 }] })
  const removeCanal = (idx: number) => setForm({ ...current, canales: current.canales.filter((_, i) => i !== idx) })

  const mutation = useMutation({
    mutationFn: () => api.put(`reglas/canales-margenes?tenantId=${tenantId}`, current),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-r007', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['reglas-resumen', tenantId] })
      setForm(null)
    },
  })

  if (isLoading) return <Spinner />

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <p className="text-sm text-p-gray flex-1">
          Define el IVA nacional y los canales de distribución con sus márgenes. El precio al consumidor se calcula dividiendo el precio de lista por el margen del canal.
        </p>
        <SoloPricerBadge />
      </div>

      {/* IVA */}
      <div className="card max-w-xs mb-4">
        <label className="form-label">IVA nacional</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0} max={100} step={0.5}
            value={Math.round(current.iva * 100)}
            onChange={e => setIva(Number(e.target.value) / 100)}
            className="form-input py-1 text-center w-20"
          />
          <span className="text-sm text-p-gray">%</span>
        </div>
      </div>

      {/* Canales */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-p-dark">Canales de distribución</h3>
          <button onClick={addCanal} className="btn-secondary text-xs flex items-center gap-1 py-1">
            <Plus size={13} /> Agregar canal
          </button>
        </div>
        <table className="data-table w-full">
          <thead>
            <tr>
              <th className="text-left">Canal</th>
              <th className="text-center">Margen (%)</th>
              <th className="text-center">PVP = lista ÷ margen</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {current.canales.map((canal, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    value={canal.nombre}
                    onChange={e => updateCanal(idx, 'nombre', e.target.value)}
                    placeholder="Nombre del canal"
                    className="form-input py-1 text-sm w-full"
                  />
                </td>
                <td className="text-center">
                  <input
                    type="number"
                    min={1} max={100} step={0.5}
                    value={Math.round(canal.margen * 100)}
                    onChange={e => updateCanal(idx, 'margen', Number(e.target.value) / 100)}
                    className="form-input py-1 text-sm text-center w-20 mx-auto"
                  />
                </td>
                <td className="text-center text-xs text-p-gray">
                  lista ÷ {(canal.margen * 100).toFixed(0)}% = {(1 / canal.margen).toFixed(2)}×
                </td>
                <td className="text-center">
                  <button onClick={() => removeCanal(idx)} className="text-p-muted hover:text-p-red transition-colors">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SaveBar onSave={() => mutation.mutate()} saving={mutation.isPending} dirty={dirty} />
    </div>
  )
}

// ─── UmbralesTab (R-008) ──────────────────────────────────────────────────────

function UmbralesTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery<Umbrales>({
    queryKey: ['reglas-r008', tenantId],
    queryFn: () => api.get<Umbrales>(`reglas/umbrales?tenantId=${tenantId}`).then(r => r.data),
  })

  const [form, setForm] = useState<Umbrales | null>(null)
  const dirty = form !== null
  const current = form ?? data ?? { umbralSuperior: 0.05, umbralInferior: 0.05 }

  const mutation = useMutation({
    mutationFn: () => api.put(`reglas/umbrales?tenantId=${tenantId}`, current),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-r008', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['reglas-resumen', tenantId] })
      setForm(null)
    },
  })

  if (isLoading) return <Spinner />

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Define el porcentaje de desviación del precio que dispara una alerta. Se aplica a todos los SKUs del tenant.
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
                  type="range"
                  min={1} max={30} step={0.5}
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

        {/* Visual */}
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

// ─── ProfitPoolTab (R-009) ────────────────────────────────────────────────────

function ProfitPoolTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const { data = [], isLoading } = useQuery<PesoItem[]>({
    queryKey: ['reglas-r009', tenantId],
    queryFn: () => api.get<PesoItem[]>(`reglas/profit-pool?tenantId=${tenantId}`).then(r => r.data),
  })

  const [items, setItems] = useState<PesoItem[] | null>(null)
  const dirty = items !== null
  const current = items ?? data

  const update = (idx: number, peso: number) =>
    setItems(current.map((p, i) => i === idx ? { ...p, peso } : p))

  const sumaPesos = current.reduce((acc, p) => acc + Number(p.peso), 0)
  const pesoError = Math.abs(sumaPesos - 1.0) > 0.01

  const mutation = useMutation({
    mutationFn: () => api.put(`reglas/profit-pool?tenantId=${tenantId}`, current),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-r009', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['reglas-resumen', tenantId] })
      setItems(null)
    },
  })

  if (isLoading) return <Spinner />

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Define el peso de cada SKU en el cálculo del profit pool total. Los pesos deben sumar 100%.
      </p>

      {pesoError && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-lg border border-p-yellow bg-p-yellow/10 text-p-yellow text-sm">
          <AlertTriangle size={15} />
          Los pesos actuales suman {(sumaPesos * 100).toFixed(1)}% — deben ser exactamente 100%.
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th className="text-left">SKU</th>
              <th className="text-center">Peso (%)</th>
              <th className="text-left w-48">Distribución</th>
            </tr>
          </thead>
          <tbody>
            {current.map((p, idx) => (
              <tr key={p.skuId}>
                <td className="text-sm font-medium text-p-dark">{p.skuNombre}</td>
                <td className="text-center">
                  <input
                    type="number"
                    min={0} max={100} step={0.5}
                    value={Math.round(Number(p.peso) * 1000) / 10}
                    onChange={e => update(idx, Number(e.target.value) / 100)}
                    className="form-input py-1 text-sm text-center w-20 mx-auto"
                  />
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-p-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-p-lime rounded-full transition-all"
                        style={{ width: `${Math.min(Number(p.peso) * 100 / 0.3, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-p-gray w-10 text-right">{(Number(p.peso) * 100).toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="text-sm font-semibold text-p-dark">Total</td>
              <td className={`text-center text-sm font-bold ${pesoError ? 'text-p-red' : 'text-p-lime'}`}>
                {(sumaPesos * 100).toFixed(1)}%
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <SaveBar onSave={() => mutation.mutate()} saving={mutation.isPending} dirty={dirty && !pesoError} />
    </div>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-p-lime border-t-transparent" />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReglesPage() {
  const [tenantId, setTenantId] = useState('tenant-001')
  const [tab, setTab] = useState('resumen')

  const { data: tenants = [] } = useQuery<TenantListItem[]>({
    queryKey: ['tenants'],
    queryFn: () => api.get<TenantListItem[]>('tenants').then(r => r.data),
  })

  return (
    <div>
      {/* Tenant selector */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm text-p-gray font-medium">Tenant:</span>
        <select
          value={tenantId}
          onChange={e => setTenantId(e.target.value)}
          className="form-input py-1.5 text-sm w-48"
        >
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.nombre}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap border-b border-p-border mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? 'border-p-lime text-p-lime'
                : 'border-transparent text-p-gray hover:text-p-dark'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'resumen' && <ResumenTab tenantId={tenantId} />}
      {tab === 'r001'    && <CompetidoresTab tenantId={tenantId} />}
      {tab === 'r002'    && <ValorPercibidoTab tenantId={tenantId} />}
      {tab === 'r004'    && <ElasticidadTab tenantId={tenantId} />}
      {tab === 'r005'    && <ColConfigTab tenantId={tenantId} regla="r005" titulo="Archivo de Costos Variables" colLabel="Costo variable unitario" colLabel2="Fecha de vigencia" />}
      {tab === 'r006'    && <ColConfigTab tenantId={tenantId} regla="r006" titulo="Archivo SKUs / PVP" colLabel="PVP sugerido" colLabel2="Canal" />}
      {tab === 'r007'    && <CanalesTab tenantId={tenantId} />}
      {tab === 'r008'    && <UmbralesTab tenantId={tenantId} />}
      {tab === 'r009'    && <ProfitPoolTab tenantId={tenantId} />}
    </div>
  )
}
