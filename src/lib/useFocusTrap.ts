import { useEffect, useRef } from 'react'

const FOCUSEABLE_SELECTORS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Traps keyboard focus within `containerRef` while `isOpen` is true.
 * - On open: guarda activeElement previo y enfoca el primer elemento focuseable
 *   (o el container mismo si tiene tabIndex=-1).
 * - Tab / Shift+Tab cicla solo dentro del container.
 * - On close: restaura el foco al elemento previo.
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  isOpen: boolean,
) {
  const previousFocus = useRef<Element | null>(null)

  useEffect(() => {
    if (!isOpen) {
      // Restaurar foco al elemento que lo tenía antes de abrir
      if (previousFocus.current instanceof HTMLElement) {
        previousFocus.current.focus()
      }
      previousFocus.current = null
      return
    }

    // Guardar foco previo
    previousFocus.current = document.activeElement

    const container = containerRef.current
    if (!container) return

    // Enfocar primer elemento focuseable (o el container si tiene tabIndex=-1)
    const firstFocuseable = container.querySelector<HTMLElement>(FOCUSEABLE_SELECTORS)
    if (firstFocuseable) {
      firstFocuseable.focus()
    } else if (container.tabIndex === -1) {
      container.focus()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focuseables = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSEABLE_SELECTORS),
      ).filter(el => !el.closest('[hidden]') && el.offsetParent !== null)

      if (focuseables.length === 0) {
        e.preventDefault()
        return
      }

      const first = focuseables[0]
      const last = focuseables[focuseables.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, containerRef])
}
