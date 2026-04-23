import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search } from 'lucide-react'

// ─── Combobox con filtro de texto ────────────────────────────────────────────

interface SearchableSelectProps {
  options: string[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

function SearchableSelect({ options, value, onChange, placeholder = 'Seleccionar…' }: SearchableSelectProps) {
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

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()))

  const select = (v: string) => {
    onChange(v)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={ref} className="relative min-w-56">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="form-input w-full flex items-center justify-between px-3 py-1.5 gap-2 cursor-pointer"
      >
        <span className={value ? 'text-p-dark' : 'text-p-muted'}>{value || placeholder}</span>
        <ChevronDown size={14} className={`text-p-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 w-full min-w-56 bg-white border border-p-border rounded-lg shadow-lg">
          <div className="p-2 border-b border-p-border">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-p-muted pointer-events-none" />
              <input
                autoFocus
                type="text"
                placeholder="Buscar categoría…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="form-input pl-7 pr-3 py-1.5 text-xs"
              />
            </div>
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-xs text-p-muted text-center">Sin resultados</li>
            )}
            {filtered.map(o => (
              <li key={o}>
                <button
                  onClick={() => select(o)}
                  className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                    o === value
                      ? 'bg-p-lime text-p-bg font-medium'
                      : 'text-p-dark hover:bg-p-lime-bg'
                  }`}
                >
                  {o}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default SearchableSelect
export type { SearchableSelectProps }
