// ─── Skeleton primitivo ───────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string
}

function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-p-surface rounded ${className}`}
    />
  )
}

export default Skeleton

// ─── Fila de tabla skeleton ───────────────────────────────────────────────────

export function SkeletonRow({ columns }: { columns: number }) {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-2.5 px-4">
          <Skeleton className="h-4 w-3/4" />
        </td>
      ))}
    </tr>
  )
}

// ─── Tabla completa skeleton ──────────────────────────────────────────────────

export function SkeletonTable({ rows = 5, columns }: { rows?: number; columns: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} columns={columns} />
      ))}
    </>
  )
}
