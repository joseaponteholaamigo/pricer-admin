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
  pvpSugerido?: number
  costoVariable?: number
  pesoProfitPool?: number
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

// R-002 — Atributos por categoría
export interface AtributoCategoria {
  nombre: string
  peso: number // 0.0 – 1.0, 10 decimales
  orden: number
}

export interface CategoriaAtributos {
  categoria: string
  atributos: AtributoCategoria[]
}

// R-002 — Calificaciones por SKU × atributo × {propio, competidor}
export interface CalificacionSkuAtributo {
  skuId: string
  atributo: string
  calificacionPropia: number           // 10 decimales
  calificacionesCompetidor: Record<string, number> // competidorId → calificación
}

// Vista agregada para la UI
export interface SkuCalificaciones {
  skuId: string
  skuNombre: string
  categoria: string
  atributos: {
    nombre: string
    peso: number
    calificacionPropia: number
    calificacionesCompetidor: Record<string, number>
  }[]
  vpPropio: number
  vpCompetidor: Record<string, number>
}

// R-004 — sin confianza ni R²
export interface ElasticidadItem {
  skuId: string
  skuNombre: string
  coeficiente: number
}

// R-005 / R-006 — Carga Portafolio unificada
export interface PortafolioItem {
  skuId: string
  ean: string
  nombre: string
  marca: string
  categoria: string
  pvpSugerido: number
  costoVariable: number
  pesoProfitPool: number  // 0.0 – 1.0
}

export interface PortafolioData {
  items: PortafolioItem[]
}

// Categorías con IVA por categoría
export interface CategoriaConfig {
  nombre: string
  iva: number // 0.0 – 1.0
}

// Vinculación de SKU propio → SKUs competidores (propios o de competencia)
export interface SkuVinculacion {
  tipo: 'propio' | 'competencia'
  id: string
}

export type VinculacionesMapeo = Record<string, SkuVinculacion[]>

// SKUs de la competencia (productos individuales)
export interface SkuCompetencia {
  id: string
  ean: string
  nombre: string
  marca: string
  categoria: string
  pvpReferencia: number
}

// R-007 — Canales × Categorías (sin IVA)
export interface CanalMargenCategoria {
  categoria: string
  margen: number          // 0.0 – 1.0
}

export interface CanalSimple {
  nombre: string
  margenes: Record<string, number>  // categoria → margen (0.0–1.0)
}

export interface CanalesMargenes {
  iva: number
  canales: CanalSimple[]
  updatedAt?: string
  actualizadoPor?: string
}

// R-008
export interface Umbrales {
  umbralSuperior: number
  umbralInferior: number
}

// R-010 — Retailers
export interface RetailerItem {
  id: string
  nombre: string
  activo: boolean
}

// Importaciones de portafolio
export interface ImportacionRecord {
  id: string
  fecha: string
  archivo: string
  totalSkus: number
  advertencias: number
  errores: string[]
  estado: 'exitoso' | 'con_advertencias' | 'fallido'
}

// ─── Monitoreo Scraper ────────────────────────────────────────────────────────

export interface ScraperStatus {
  estado: 'activo' | 'error' | 'sin_datos'
  ultimaCarga: string | null
  registrosProcesados: number
  tenantId: string
}

export interface ScraperHistorialRow {
  id: string
  fecha: string
  tipo: string
  tenantNombre?: string
  nombreArchivo: string | null
  registrosRecibidos?: number
  registrosProcesados: number
  totalErrores: number
  estado: 'completado' | 'completado_con_errores' | 'error' | 'procesando'
  subidoPor?: string | null
  errores: { fila: number; columna: string | null; mensaje: string }[]
}

// ─── Auditoría ────────────────────────────────────────────────────────────────

export interface AuditLogRow {
  id: string
  fecha: string
  usuario: string
  tenantId: string | null
  tenantNombre: string | null
  accion: string
  entidad: string
  valorAnterior: string | null
  valorNuevo: string | null
  ip: string | null
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface TenantActividadItem {
  tenantId: string
  tenantNombre: string
  tenantEstado: string
  ultimaCargaScraper: {
    fecha: string
    tipo: string
    estado: 'completado' | 'completado_con_errores' | 'error' | 'procesando'
    nombreArchivo: string | null
  } | null
  ultimaActualizacionReglas: {
    fecha: string
    tipo: string
    actualizadaPor: string | null
  } | null
  ultimaActividad: string
}
