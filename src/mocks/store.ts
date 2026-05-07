import {
  SEED_TENANTS,
  SEED_USERS,
  SEED_CONSULTOR_TENANTS,
  SEED_SKUS,
  SEED_COMPETIDORES,
  SEED_R001,
  SEED_R002_ATRIBUTOS,
  SEED_R002_CALIFICACIONES,
  SEED_R002_EXTRA,
  SEED_R004,
  SEED_R005,
  SEED_R006,
  SEED_PORTAFOLIO,
  SEED_R007,
  SEED_R008,
  SEED_R009,
  SEED_R010,
  SEED_R010_EXTRA,
  SEED_IMPORTACIONES,
  SEED_IMPORTACIONES_V2,
  SEED_CATEGORIAS,
  SEED_SKUS_COMPETENCIA,
  SEED_VINCULACIONES,
  // educacion
  SEED_PROGRAMAS_ACADEMICOS,
  SEED_SNIES_GLOBAL,
  SEED_ASIGNACIONES_SNIES,
  SEED_FACULTADES_ESCUELAS,
  SEED_NIVELES_EDUCATIVOS,
  SEED_CIUDADES_EDU,
  SEED_ATRIBUTOS_R010,
  SEED_ATRIBUTOS_R010_PAR,
  SEED_CALIFICACIONES_EDU,
  SEED_IMPORTACIONES_EDU,
  SEED_MATRIZ_EAFIT,
  type MockMatrizPreferencia,
  type MockProgramaAcademico,
  type MockSnies,
  type MockAsignacionSnies,
  type MockFacultadEscuela,
  type MockNivelEducativo,
  type MockCiudadEdu,
  type MockCalificacionEdu,
  type MockAtributosR010Par,
  // tenant-002
  SEED_SKUS_T002,
  SEED_SKUS_COMP_T002,
  SEED_R001_T002,
  SEED_VINCULACIONES_T002,
  SEED_R004_T002,
  SEED_R009_T002,
  SEED_R007_T002,
  // tenant-003
  SEED_SKUS_T003,
  SEED_SKUS_COMP_T003,
  SEED_R001_T003,
  SEED_VINCULACIONES_T003,
  SEED_R004_T003,
  SEED_R009_T003,
  SEED_R007_T003,
  // tenant-004
  SEED_SKUS_T004,
  SEED_SKUS_COMP_T004,
  SEED_R001_T004,
  SEED_VINCULACIONES_T004,
  SEED_R004_T004,
  SEED_R009_T004,
  SEED_R007_T004,
  // tenant-005
  SEED_SKUS_T005,
  SEED_SKUS_COMP_T005,
  SEED_R001_T005,
  SEED_VINCULACIONES_T005,
  SEED_R004_T005,
  SEED_R009_T005,
  SEED_R007_T005,
  // tenant-006
  SEED_SKUS_T006,
  SEED_SKUS_COMP_T006,
  SEED_R001_T006,
  SEED_VINCULACIONES_T006,
  SEED_R004_T006,
  SEED_R009_T006,
  SEED_R007_T006,
  type MockTenant,
  type MockUser,
  type MockConsultorTenant,
  type MockSku,
  type MockCompetidor,
  type MockCategoriaAtributos,
  type MockCalificacion,
  type MockElasticidad,
  type MockColConfig,
  type MockCanalesMargenes,
  type MockUmbrales,
  type MockPesoItem,
  type MockRetailer,
  type MockPortafolio,
  type MockImportRecord,
  type MockImportacionRecord,
  type MockCategoriaConfig,
  type MockSkuCompetencia,
  type MockVinculacion,
} from './data'

function buildCalificaciones(atributos: MockCategoriaAtributos[], skus: MockSku[]): MockCalificacion[] {
  const result: MockCalificacion[] = []
  for (const cat of atributos) {
    for (const sku of skus) {
      if (sku.categoria !== cat.categoria) continue
      for (const attr of cat.atributos) {
        result.push({
          skuId: sku.id,
          atributo: attr.nombre,
          calificacionPropia: 3,
          calificacionesCompetidor: {},
        })
      }
    }
  }
  return result
}

const allAtributos = [...structuredClone(SEED_R002_ATRIBUTOS), ...structuredClone(SEED_R002_EXTRA)]

export const store = {
  tenants:          structuredClone(SEED_TENANTS)          as MockTenant[],
  users:            structuredClone(SEED_USERS)            as MockUser[],
  consultorTenants: structuredClone(SEED_CONSULTOR_TENANTS) as MockConsultorTenant[],

  // Global categories (shared across all tenants)
  categorias: structuredClone(SEED_CATEGORIAS) as MockCategoriaConfig[],

  // Flat arrays — each item carries tenantId
  skus: [
    ...structuredClone(SEED_SKUS),
    ...structuredClone(SEED_SKUS_T002),
    ...structuredClone(SEED_SKUS_T003),
    ...structuredClone(SEED_SKUS_T004),
    ...structuredClone(SEED_SKUS_T005),
    ...structuredClone(SEED_SKUS_T006),
  ] as MockSku[],

  competidores: structuredClone(SEED_COMPETIDORES) as MockCompetidor[],

  skusCompetencia: [
    ...structuredClone(SEED_SKUS_COMPETENCIA),
    ...structuredClone(SEED_SKUS_COMP_T002),
    ...structuredClone(SEED_SKUS_COMP_T003),
    ...structuredClone(SEED_SKUS_COMP_T004),
    ...structuredClone(SEED_SKUS_COMP_T005),
    ...structuredClone(SEED_SKUS_COMP_T006),
  ] as MockSkuCompetencia[],

  r010: [
    ...structuredClone(SEED_R010),
    ...structuredClone(SEED_R010_EXTRA),
  ] as MockRetailer[],

  // Singleton config
  portafolio: structuredClone(SEED_PORTAFOLIO) as MockPortafolio,

  // Per-tenant maps — keyed by tenantId
  r001: {
    'tenant-001': structuredClone(SEED_R001),
    'tenant-002': structuredClone(SEED_R001_T002),
    'tenant-003': structuredClone(SEED_R001_T003),
    'tenant-004': structuredClone(SEED_R001_T004),
    'tenant-005': structuredClone(SEED_R001_T005),
    'tenant-006': structuredClone(SEED_R001_T006),
  } as Record<string, Record<string, string[]>>,

  r002: {
    'tenant-001': structuredClone(SEED_R002_ATRIBUTOS),
    'tenant-002': allAtributos.filter(a => ['Bebidas Energéticas','Agua','Hidratantes','Jugos'].includes(a.categoria)),
    'tenant-003': allAtributos.filter(a => ['Lácteos'].includes(a.categoria)),
    'tenant-004': allAtributos.filter(a => ['Arroz','Pastas','Aceites'].includes(a.categoria)),
    'tenant-005': allAtributos.filter(a => ['Jugos','Agua','Bebidas Energéticas'].includes(a.categoria)),
    'tenant-006': allAtributos.filter(a => ['Arroz','Aceites','Pastas'].includes(a.categoria)),
  } as Record<string, MockCategoriaAtributos[]>,

  r002_calificaciones: {
    'tenant-001': structuredClone(SEED_R002_CALIFICACIONES),
    'tenant-002': buildCalificaciones(
      allAtributos.filter(a => ['Bebidas Energéticas','Agua','Hidratantes','Jugos'].includes(a.categoria)),
      structuredClone(SEED_SKUS_T002),
    ),
    'tenant-003': buildCalificaciones(
      allAtributos.filter(a => ['Lácteos'].includes(a.categoria)),
      structuredClone(SEED_SKUS_T003),
    ),
    'tenant-004': buildCalificaciones(
      allAtributos.filter(a => ['Arroz','Pastas','Aceites'].includes(a.categoria)),
      structuredClone(SEED_SKUS_T004),
    ),
    'tenant-005': buildCalificaciones(
      allAtributos.filter(a => ['Jugos','Agua','Bebidas Energéticas'].includes(a.categoria)),
      structuredClone(SEED_SKUS_T005),
    ),
    'tenant-006': buildCalificaciones(
      allAtributos.filter(a => ['Arroz','Aceites','Pastas'].includes(a.categoria)),
      structuredClone(SEED_SKUS_T006),
    ),
  } as Record<string, MockCalificacion[]>,

  r004: {
    'tenant-001': structuredClone(SEED_R004),
    'tenant-002': structuredClone(SEED_R004_T002),
    'tenant-003': structuredClone(SEED_R004_T003),
    'tenant-004': structuredClone(SEED_R004_T004),
    'tenant-005': structuredClone(SEED_R004_T005),
    'tenant-006': structuredClone(SEED_R004_T006),
  } as Record<string, MockElasticidad[]>,

  r005: {
    'tenant-001': structuredClone(SEED_R005),
    'tenant-002': structuredClone(SEED_R005),
    'tenant-003': structuredClone(SEED_R005),
    'tenant-004': structuredClone(SEED_R005),
    'tenant-005': structuredClone(SEED_R005),
    'tenant-006': structuredClone(SEED_R005),
  } as Record<string, MockColConfig>,

  r006: {
    'tenant-001': structuredClone(SEED_R006),
    'tenant-002': structuredClone(SEED_R006),
    'tenant-003': structuredClone(SEED_R006),
    'tenant-004': structuredClone(SEED_R006),
    'tenant-005': structuredClone(SEED_R006),
    'tenant-006': structuredClone(SEED_R006),
  } as Record<string, MockColConfig>,

  r007: {
    'tenant-001': structuredClone(SEED_R007),
    'tenant-002': structuredClone(SEED_R007_T002),
    'tenant-003': structuredClone(SEED_R007_T003),
    'tenant-004': structuredClone(SEED_R007_T004),
    'tenant-005': structuredClone(SEED_R007_T005),
    'tenant-006': structuredClone(SEED_R007_T006),
  } as Record<string, MockCanalesMargenes>,

  r008: {
    'tenant-001': structuredClone(SEED_R008),
    'tenant-002': structuredClone(SEED_R008),
    'tenant-003': structuredClone(SEED_R008),
    'tenant-004': structuredClone(SEED_R008),
    'tenant-005': structuredClone(SEED_R008),
    'tenant-006': structuredClone(SEED_R008),
  } as Record<string, MockUmbrales>,

  r009: {
    'tenant-001': structuredClone(SEED_R009),
    'tenant-002': structuredClone(SEED_R009_T002),
    'tenant-003': structuredClone(SEED_R009_T003),
    'tenant-004': structuredClone(SEED_R009_T004),
    'tenant-005': structuredClone(SEED_R009_T005),
    'tenant-006': structuredClone(SEED_R009_T006),
  } as Record<string, MockPesoItem[]>,

  importaciones: {
    'tenant-001': structuredClone(SEED_IMPORTACIONES),
    'tenant-002': [],
    'tenant-003': [],
    'tenant-004': [],
    'tenant-005': [],
    'tenant-006': [],
  } as Record<string, MockImportRecord[]>,

  // Importaciones v2 — nuevo flujo con preview + confirmación
  importacionesV2: {
    'tenant-001': structuredClone(SEED_IMPORTACIONES_V2),
    'tenant-002': [],
    'tenant-003': [],
    'tenant-004': [],
    'tenant-005': [],
    'tenant-006': [],
  } as Record<string, MockImportacionRecord[]>,

  // Previews en memoria: previewId → { tipo, tenantId }
  importacionPreviews: {} as Record<string, { tipo: MockImportacionRecord['tipo']; tenantId: string }>,

  vinculaciones: {
    'tenant-001': structuredClone(SEED_VINCULACIONES),
    'tenant-002': structuredClone(SEED_VINCULACIONES_T002),
    'tenant-003': structuredClone(SEED_VINCULACIONES_T003),
    'tenant-004': structuredClone(SEED_VINCULACIONES_T004),
    'tenant-005': structuredClone(SEED_VINCULACIONES_T005),
    'tenant-006': structuredClone(SEED_VINCULACIONES_T006),
  } as Record<string, Record<string, MockVinculacion[]>>,

  _idCounter: 100,

  // ─── Vertical Educación ─────────────────────────────────────────────────────

  /** Programas propios por tenant */
  programasAcademicos: {
    'tenant-edu-001': structuredClone(SEED_PROGRAMAS_ACADEMICOS),
  } as Record<string, MockProgramaAcademico[]>,

  /** Base global SNIES (sin RLS) */
  sniesGlobal: structuredClone(SEED_SNIES_GLOBAL) as MockSnies[],

  /** Asignaciones programa → SNIES por tenant */
  asignacionesSnies: {
    'tenant-edu-001': structuredClone(SEED_ASIGNACIONES_SNIES),
  } as Record<string, MockAsignacionSnies[]>,

  /** Facultades/Escuelas por tenant (P1 2026-05-05) */
  facultadesEscuelas: {
    'tenant-edu-001': structuredClone(SEED_FACULTADES_ESCUELAS),
  } as Record<string, MockFacultadEscuela[]>,

  /** Niveles Educativos por tenant (2026-05-06 reemplaza P2 global) */
  nivelesEducativos: {
    'tenant-edu-001': structuredClone(SEED_NIVELES_EDUCATIVOS),
  } as Record<string, MockNivelEducativo[]>,

  /** Ciudades por tenant (2026-05-05) */
  ciudadesEdu: {
    'tenant-edu-001': structuredClone(SEED_CIUDADES_EDU),
  } as Record<string, MockCiudadEdu[]>,

  /** Atributos R-010 por tenant (misma estructura que r002 FMCG — solo FMCG) */
  r010Atributos: {
    'tenant-edu-001': structuredClone(SEED_ATRIBUTOS_R010),
  } as Record<string, MockCategoriaAtributos[]>,

  /**
   * Atributos R-010 por par (Facultad/Escuela × Ciudad) — educación P3 2026-05-05.
   * Key: `${tenantId}` → `Record<\`${facultad}|${ciudad}\`, MockAtributoR010Par[]>`
   */
  r010AtributosPar: {
    'tenant-edu-001': structuredClone(SEED_ATRIBUTOS_R010_PAR),
  } as Record<string, MockAtributosR010Par>,

  /** Matrices de Preferencia por tenant (P12 2026-05-05 — lock 4-tupla: tenant+facultad+nivel+ciudad) */
  matricesPreferencia: [structuredClone(SEED_MATRIZ_EAFIT)] as MockMatrizPreferencia[],

  /** Calificaciones R-010 por tenant */
  r010Calificaciones: {
    'tenant-edu-001': structuredClone(SEED_CALIFICACIONES_EDU),
  } as Record<string, MockCalificacionEdu[]>,

  /** Importaciones educación (reutiliza importacionesV2 con tenantId edu) */
  importacionesEdu: {
    'tenant-edu-001': structuredClone(SEED_IMPORTACIONES_EDU),
  } as Record<string, typeof SEED_IMPORTACIONES_EDU>,

  /** Lock global para upload SNIES (no por tenant) */
  sniesUpdateLocked: false,
}
