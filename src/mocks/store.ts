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
  SEED_CATEGORIAS,
  SEED_SKUS_COMPETENCIA,
  SEED_VINCULACIONES,
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
  type MockCategoriaConfig,
  type MockSkuCompetencia,
  type MockVinculacion,
} from './data'

function buildCalificaciones(atributos: MockCategoriaAtributos[], skus: MockSku[]): MockCalificacion[] {
  const result: MockCalificacion[] = []
  for (const cat of atributos) {
    for (const sku of skus) {
      for (const attr of cat.atributos) {
        result.push({ skuId: sku.id, categoriaId: cat.categoria, atributo: attr, valor: 3 })
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

  vinculaciones: {
    'tenant-001': structuredClone(SEED_VINCULACIONES),
    'tenant-002': structuredClone(SEED_VINCULACIONES_T002),
    'tenant-003': structuredClone(SEED_VINCULACIONES_T003),
    'tenant-004': structuredClone(SEED_VINCULACIONES_T004),
    'tenant-005': structuredClone(SEED_VINCULACIONES_T005),
    'tenant-006': structuredClone(SEED_VINCULACIONES_T006),
  } as Record<string, Record<string, MockVinculacion[]>>,

  _idCounter: 100,
}
