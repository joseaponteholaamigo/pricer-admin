// Helpers de roles. Centralizan la lógica de permisos para que los componentes
// no comparen strings directamente. Si el catálogo cambia, solo se ajusta aquí.

export type Rol =
  | 'admin'
  | 'consultor_prisier'
  | 'cliente_editor'
  | 'cliente_visualizador'

type RolInput = string | null | undefined

export function isAdmin(rol: RolInput): boolean {
  return rol === 'admin'
}

export function isConsultorPrisier(rol: RolInput): boolean {
  return rol === 'consultor_prisier'
}

export function isClienteEditor(rol: RolInput): boolean {
  return rol === 'cliente_editor'
}

export function isClienteVisualizador(rol: RolInput): boolean {
  return rol === 'cliente_visualizador'
}

export function isCliente(rol: RolInput): boolean {
  return isClienteEditor(rol) || isClienteVisualizador(rol)
}

export function isStaff(rol: RolInput): boolean {
  return isAdmin(rol) || isConsultorPrisier(rol)
}

const ROL_LABELS: Record<string, string> = {
  admin: 'Admin',
  consultor_prisier: 'Consultor Prisier',
  cliente_editor: 'Cliente — Editor',
  cliente_visualizador: 'Cliente — Visualizador',
}

export function rolLabel(rol: RolInput): string {
  if (!rol) return ''
  return ROL_LABELS[rol] ?? rol
}
