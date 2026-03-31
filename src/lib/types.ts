export interface TenantListItem {
  id: string
  nombre: string
  industria: string
  plan: string
  estado: string
  usuariosCount: number
  consultores: ConsultorInfo[]
}

export interface TenantResponse extends TenantListItem {
  createdAt: string
  updatedAt: string
}

export interface ConsultorInfo {
  userId: string
  nombreCompleto: string
  email: string
}

export interface UserListItem {
  id: string
  email: string
  nombreCompleto: string
  rol: string
  estado: string
  tenantId: string | null
  tenantNombre: string | null
}

export interface UserResponse extends UserListItem {
  invitadoPor: string | null
  fechaInvitacion: string | null
  createdAt: string
}

// ─── Reglas ───────────────────────────────────────────────────────────────────

export interface SkuItem {
  id: string
  ean: string
  nombre: string
  categoria: string
  marca: string
  tenantId: string
}

export interface CompetidorItem {
  id: string
  nombre: string
  pais: string
  tenantId: string
}

export interface ReglaResumenItem {
  tipo: string
  descripcion: string
  configurada: boolean
  actualizadaEn: string | null
  actualizadaPor: string | null
}

// R-001
export interface CompetidoresData {
  skus: SkuItem[]
  competidores: CompetidorItem[]
  mapeo: Record<string, string[]>
}

// R-002/R-003
export interface AtributoVP {
  nombre: string
  peso: number
  calificacion: number
  orden: number
}

export interface CategoriaVP {
  categoria: string
  atributos: AtributoVP[]
  vp: number
}

// R-004
export interface ElasticidadItem {
  skuId: string
  skuNombre: string
  coeficiente: number
  confianza: number
  r2: number
}

// R-005 / R-006
export interface ColConfig {
  ean: string
  nombreProducto: string
  costoVariableOPvp: string
  fechaVigenciaOCanal: string
}

// R-007
export interface CanalMargen {
  nombre: string
  margen: number
}

export interface CanalesMargenes {
  iva: number
  canales: CanalMargen[]
}

// R-008
export interface Umbrales {
  umbralSuperior: number
  umbralInferior: number
}

// R-009
export interface PesoItem {
  skuId: string
  skuNombre: string
  peso: number
}
