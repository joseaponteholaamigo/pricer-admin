import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Toast } from './Toast'

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface ToastItem {
  id: string
  kind: 'success' | 'error' | 'info'
  message: string
  duration: number
}

interface ToastContextValue {
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

// ─── Context ─────────────────────────────────────────────────────────────────

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}

// ─── Provider ────────────────────────────────────────────────────────────────

let counter = 0
const nextId = () => `toast-${++counter}`

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // ESC cierra el toast más reciente
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setToasts(prev => {
          if (prev.length === 0) return prev
          return prev.slice(0, -1)
        })
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const push = useCallback(
    (kind: ToastItem['kind'], message: string, duration: number) => {
      setToasts(prev => [...prev, { id: nextId(), kind, message, duration }])
    },
    [],
  )

  const value: ToastContextValue = {
    success: useCallback((msg, dur = 4000) => push('success', msg, dur), [push]),
    error: useCallback((msg, dur = 7000) => push('error', msg, dur), [push]),
    info: useCallback((msg, dur = 4000) => push('info', msg, dur), [push]),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Viewport */}
      <div
        aria-label="Notificaciones"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-xs pointer-events-none"
      >
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <Toast item={t} onClose={remove} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// Alias de re-export para el hook (evita importar desde dos archivos)
export { useToastContext as useToast }
