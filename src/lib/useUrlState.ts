import { useSearchParams } from 'react-router-dom'
import { useCallback } from 'react'

/**
 * Persiste un string en la URL. Guardar '' o el mismo valor que defaultValue
 * elimina el key para mantener URLs limpias.
 * Escribe con replace:true para no contaminar el historial en cambios de filtro.
 */
export function useUrlParam(
  key: string,
  defaultValue = '',
): [string, (v: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const value = searchParams.get(key) ?? defaultValue

  const setValue = useCallback(
    (v: string) => {
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev)
          if (v === '' || v === defaultValue) {
            next.delete(key)
          } else {
            next.set(key, v)
          }
          return next
        },
        { replace: true },
      )
    },
    [key, defaultValue, setSearchParams],
  )

  return [value, setValue]
}

/**
 * Persiste un número entero en la URL. Guardar defaultValue elimina el key.
 * Valores no-numéricos en la URL se tratan como defaultValue.
 */
export function useUrlNumber(
  key: string,
  defaultValue: number,
): [number, (v: number) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get(key)
  const parsed = raw !== null ? parseInt(raw, 10) : NaN
  const value = !isNaN(parsed) ? parsed : defaultValue

  const setValue = useCallback(
    (v: number) => {
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev)
          if (v === defaultValue) {
            next.delete(key)
          } else {
            next.set(key, String(v))
          }
          return next
        },
        { replace: true },
      )
    },
    [key, defaultValue, setSearchParams],
  )

  return [value, setValue]
}
