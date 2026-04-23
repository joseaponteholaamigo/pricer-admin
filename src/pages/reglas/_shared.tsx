import { useState, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'
import type { CompetidorItem } from '../../lib/types'

// ─── Filtros estándar para tablas de SKUs ────────────────────────────────────


export interface SkuTableFiltersProps {
  categorias: string[]
  filterCategoria: string
  filterSku: string
  onChange: (categoria: string, sku: string) => void
}

export function SkuTableFilters({ categorias, filterCategoria, filterSku, onChange }: SkuTableFiltersProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={filterCategoria}
        onChange={e => onChange(e.target.value, filterSku)}
        className="form-select py-1.5 min-w-44"
      >
        <option value="">Todas las categorías</option>
        {categorias.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-p-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar SKU o nombre…"
          value={filterSku}
          onChange={e => onChange(filterCategoria, e.target.value)}
          className="form-input pl-8 pr-4 py-1.5 min-w-52"
        />
      </div>
      {(filterCategoria || filterSku) && (
        <button
          onClick={() => onChange('', '')}
          className="text-xs text-p-muted hover:text-p-dark transition-colors underline underline-offset-2"
        >
          Limpiar
        </button>
      )}
    </div>
  )
}

// ─── Multi-select de competidores por SKU ────────────────────────────────────

export interface CompetidoresCellProps {
  skuId: string
  asignados: string[]
  competidores: CompetidorItem[]
  onChange: (skuId: string, ids: string[]) => void
}

export function CompetidoresCell({ skuId, asignados, competidores, onChange }: CompetidoresCellProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const VISIBLE = 2
  const MAX_CHARS = 10

  const asignadosItems = asignados
    .map(id => competidores.find(c => c.id === id))
    .filter((c): c is CompetidorItem => !!c)

  const visible = asignadosItems.slice(0, VISIBLE)
  const extra = asignadosItems.length - VISIBLE

  const filtrados = competidores.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase())
  )
  const asignadosFiltrados = filtrados.filter(c => asignados.includes(c.id))
  const disponiblesFiltrados = filtrados.filter(c => !asignados.includes(c.id))

  const toggle = (id: string) => {
    if (asignados.includes(id)) onChange(skuId, asignados.filter(a => a !== id))
    else { onChange(skuId, [...asignados, id]); setSearch('') }
  }

  const truncate = (s: string) => s.length > MAX_CHARS ? s.slice(0, MAX_CHARS) + '…' : s

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-1 flex-wrap">
        {asignados.length === 0 && (
          <span className="text-xs text-p-muted">Sin asignar</span>
        )}
        {visible.map(c => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                       bg-p-lime-bg border border-p-lime-border text-p-dark max-w-[160px]"
          >
            <span className="truncate">{truncate(c.nombre)}</span>
            <button
              onClick={e => { e.stopPropagation(); toggle(c.id) }}
              className="hover:text-p-red leading-none shrink-0"
            >×</button>
          </span>
        ))}
        {extra > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs
                           bg-p-border text-p-gray font-medium cursor-default">
            +{extra}
          </span>
        )}
        <button
          onClick={() => setOpen(o => !o)}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-p-border
                     text-p-gray hover:border-p-lime hover:text-p-lime transition-colors text-sm font-bold"
        >
          +
        </button>
      </div>

      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 w-56 bg-white border border-p-border
                        rounded-lg shadow-lg">
          <div className="p-2 border-b border-p-border">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-p-muted pointer-events-none" />
              <input
                autoFocus
                type="text"
                placeholder="Buscar competidor…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="form-input pl-7 pr-3 py-1.5 text-xs"
              />
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {asignadosFiltrados.length > 0 && (
              <>
                <li className="px-3 pt-2 pb-1">
                  <span className="text-[10px] font-semibold text-p-muted uppercase tracking-wider">
                    Vinculados
                  </span>
                </li>
                {asignadosFiltrados.map(c => (
                  <li key={c.id}>
                    <button
                      onClick={() => toggle(c.id)}
                      className="w-full text-left px-3 py-1.5 text-xs text-p-dark hover:bg-red-50
                                 transition-colors flex items-center justify-between group"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full bg-p-lime flex items-center justify-center shrink-0">
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                        {c.nombre}
                      </span>
                      <span className="text-p-muted group-hover:text-p-red transition-colors">Quitar</span>
                    </button>
                  </li>
                ))}
              </>
            )}
            {disponiblesFiltrados.length > 0 && (
              <>
                <li className={`px-3 pb-1 ${asignadosFiltrados.length > 0 ? 'pt-2 border-t border-p-border mt-1' : 'pt-2'}`}>
                  <span className="text-[10px] font-semibold text-p-muted uppercase tracking-wider">
                    Disponibles
                  </span>
                </li>
                {disponiblesFiltrados.map(c => (
                  <li key={c.id}>
                    <button
                      onClick={() => toggle(c.id)}
                      className="w-full text-left px-3 py-1.5 text-xs text-p-dark hover:bg-p-lime-bg
                                 transition-colors flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full border border-p-border shrink-0" />
                        {c.nombre}
                      </span>
                      <span className="text-p-muted">{c.pais}</span>
                    </button>
                  </li>
                ))}
              </>
            )}
            {filtrados.length === 0 && (
              <li className="px-3 py-3 text-xs text-p-muted text-center">Sin resultados</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
