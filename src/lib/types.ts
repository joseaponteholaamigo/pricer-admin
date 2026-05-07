export type Industria = 'consumo_masivo' | 'educacion' | 'moda'

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

// R-008 + extras edu (vertical Educación)
export interface UmbralesEdu extends Umbrales {
  vpMaximo: number
  sensibilidadMinima: number
  mercadoTotalOverride: Array<{ categoria: string; valor: number }>
}

// R-010 — Retailers
export interface RetailerItem {
  id: string
  nombre: string
  activo: boolean
}

// ─── Importaciones ────────────────────────────────────────────────────────────

export type TipoPlantilla =
  | 'portafolio'
  | 'categorias'
  | 'competidores'
  | 'atributos'
  | 'calificaciones'
  | 'elasticidad'
  | 'canales'
  | 'competencia'
  // Educación
  | 'programas'
  | 'facultades_escuelas'
  | 'niveles_educativos'
  | 'ciudades'
  | 'atributos_r010'
  | 'calificaciones_edu'
  | 'asignaciones_snies'
  | 'snies_update'

// ─── Educación — Portafolio ───────────────────────────────────────────────────

export interface ProgramaAcademicoItem {
  id: string
  codigo: string
  nombre: string
  facultad: string
  nivel: 'Pregrado' | 'Especialización' | 'Maestría' | 'Doctorado'
  ciudad: string
  precioActual: number
  estudiantesBase: number
  tenantId: string
}

export interface SniesItem {
  id: string
  codigoSnies: string
  programa: string
  universidad: string
  ciudad: string
  nivel: 'Pregrado' | 'Especialización' | 'Maestría' | 'Doctorado'
  modalidad: 'Presencial' | 'Virtual' | 'Híbrido'
  precioActual: number
  ultimaActualizacion: string
}

export interface AsignacionSnies {
  programaId: string
  sniesId: string
}

export interface PortafolioEduData {
  programas: ProgramaAcademicoItem[]
  asignaciones: AsignacionSnies[]
}

// ─── Educación — Facultad/Escuela (P1 2026-05-05) ────────────────────────────

export interface FacultadEscuela {
  nombre: string
}

// ─── Educación — Atributos R-010 (reutiliza CategoriaAtributos y AtributoCategoria) ─

// ─── Educación — Calificaciones (reutiliza SkuCalificaciones con programaId) ──

export interface ProgramaCalificaciones {
  programaId: string
  programaNombre: string
  categoria: string
  atributos: {
    nombre: string
    peso: number
    calificacionPropia: number
    calificacionesSnies: Record<string, number>   // sniesId → calificacion
  }[]
  vpPropio: number
  vpSnies: Record<string, number>
}

// ─── Educación — Niveles Educativos (catálogo POR TENANT, 2026-05-06 reemplaza P2)

export interface NivelEducativo {
  nombre: string
}

// ─── Educación — Ciudades (catálogo por tenant, 2026-05-05) ──────────────────

export interface CiudadEdu {
  nombre: string
}

// ─── Matrices de Preferencia (P5/P12 2026-05-05) ─────────────────────────────

export interface MatrizPreferenciaColumnaOptin {
  kind: 'optin'
  columnIndex: 0
}

export interface MatrizPreferenciaColumnaMarca {
  kind: 'marca'
  nombre: string
  esPropiaTenant: boolean
  columnIndex: number
}

export interface MatrizPreferenciaColumnaAtributoNivel {
  kind: 'atributo'
  atributoNombre: string
  nivelNombre: string
  columnIndex: number
}

export interface MatrizPreferenciaColumnaPrecio {
  kind: 'precio'
  precio: number
  columnIndex: number
}

export type MatrizPreferenciaColumna =
  | MatrizPreferenciaColumnaOptin
  | MatrizPreferenciaColumnaMarca
  | MatrizPreferenciaColumnaAtributoNivel
  | MatrizPreferenciaColumnaPrecio

export interface MatrizPreferencia {
  id: string
  tenantId: string
  tenantNombre: string
  facultadEscuela: string
  nivelEducativo: string
  ciudad: string
  fechaSubida: string
  nombreArchivo: string
  columnas: MatrizPreferenciaColumna[]
  encuestados: number[][]
  marcas: string[]
  marcaPropia: string
  atributos: Array<{ nombre: string; niveles: string[] }>
  precios: number[]
}

export type EstadoImportacion = 'procesando' | 'exitoso' | 'con_advertencias' | 'fallido'

export interface ImportacionError {
  fila: number
  columna?: string
  mensaje: string
}

export interface ImportacionRecord {
  id: string
  tenantId: string
  tipo: TipoPlantilla
  usuarioNombre: string
  usuarioId: string
  archivo: string
  estado: EstadoImportacion
  filasNuevas: number
  filasActualizadas: number
  filasOmitidas: number
  errores: ImportacionError[]
  blobUrl: string | null   // solo prod, en mock siempre null
  createdAt: string
  finalizedAt?: string
}

export interface ImportacionPreview {
  previewId: string
  tipo: TipoPlantilla
  resumen: { nuevas: number; actualizadas: number; omitidas: number }
  errores: ImportacionError[]
}

export interface ImportacionesListResponse {
  items: ImportacionRecord[]
  total: number
  page: number
  pageSize: number
}

// ─── Monitoreo Scraper ────────────────────────────────────────────────────────

export interface ScraperStatus {
  estado: 'activo' | 'error' | 'sin_datos'
  ultimaCarga: string | null
  registrosProcesados: number
  erroresUltimas24h: number
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
  errores: { fila: number; columna: string | null; valor: string | null; mensaje: string }[]
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
