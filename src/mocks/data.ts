// ─── Mock data admin – basado en SeedData.cs ────────────────────────────────

export interface MockUser {
  id: string
  email: string
  password: string
  nombreCompleto: string
  rol: string
  tenantId: string | null
  estado: string
  invitadoPor: string | null
  fechaInvitacion: string | null
  createdAt: string
}

export interface MockTenant {
  id: string
  nombre: string
  industria: string
  plan: string
  estado: string
  createdAt: string
  updatedAt: string
}

export interface MockConsultorTenant {
  id: string
  userId: string
  tenantId: string
  createdAt: string
}

// ─── Reglas ───────────────────────────────────────────────────────────────────

export interface MockSku {
  id: string
  ean: string
  nombre: string
  categoria: string
  marca: string
  tenantId: string
  pvpSugerido: number
  costoVariable: number
  pesoProfitPool: number
}

export interface MockCompetidor {
  id: string
  nombre: string
  pais: string
  tenantId: string
}

// R-002 — Atributos por categoría
export interface MockAtributoCategoria {
  nombre: string
  peso: number
  orden: number
  calificacion?: number
}

export interface MockCategoriaAtributos {
  categoria: string
  atributos: MockAtributoCategoria[]
}

// R-002 — Calificaciones por SKU × atributo × {propio, competidor}
export interface MockCalificacion {
  skuId: string
  atributo: string
  calificacionPropia: number
  calificacionesCompetidor: Record<string, number>
}

// R-004 — sin confianza ni R²
export interface MockElasticidad {
  skuId: string
  coeficiente: number
}

// R-005/R-006 — Config estructuras
export interface MockColConfig {
  iva?: number
  tipoEstructura?: string
}

// R-007 — canales con margen simple
export interface MockCanalSimple {
  nombre: string
  margen: number
}

export interface MockCanalesMargenes {
  iva: number
  canales: MockCanalSimple[]
}

export interface MockUmbrales {
  umbralSuperior: number
  umbralInferior: number
}

// R-005/R-006 — Portafolio unificado (SKUs)
export interface MockPortafolio {
  iva: number // mantenido para compatibilidad
}

// Categorías con IVA por categoría
export interface MockCategoriaConfig {
  nombre: string
  iva: number
}

// R-009 — Peso profit pool por SKU
export interface MockPesoItem {
  skuId: string
  peso: number
}

// R-010 — Retailers
export interface MockRetailer {
  id: string
  nombre: string
  activo: boolean
  tenantId: string
}

// ─── Seed Tenants ─────────────────────────────────────────────────────────────

export const SEED_TENANTS: MockTenant[] = [
  {
    id: 'tenant-001',
    nombre: 'ConGrupo',
    industria: 'consumo_masivo',
    plan: 'enterprise',
    estado: 'activo',
    createdAt: new Date(Date.now() - 90 * 86400_000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tenant-002',
    nombre: 'BevMax S.A.',
    industria: 'bebidas',
    plan: 'professional',
    estado: 'activo',
    createdAt: new Date(Date.now() - 60 * 86400_000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tenant-003',
    nombre: 'Lácteos Andes',
    industria: 'lacteos',
    plan: 'enterprise',
    estado: 'activo',
    createdAt: new Date(Date.now() - 45 * 86400_000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tenant-004',
    nombre: 'GranoSelect Ltda.',
    industria: 'consumo_masivo',
    plan: 'starter',
    estado: 'activo',
    createdAt: new Date(Date.now() - 30 * 86400_000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tenant-005',
    nombre: 'FreshMart Corp.',
    industria: 'retail',
    plan: 'enterprise',
    estado: 'activo',
    createdAt: new Date(Date.now() - 20 * 86400_000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tenant-006',
    nombre: 'NutriPack S.A.S.',
    industria: 'alimentos',
    plan: 'professional',
    estado: 'inactivo',
    createdAt: new Date(Date.now() - 10 * 86400_000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// ─── Seed Users ───────────────────────────────────────────────────────────────

export const SEED_USERS: MockUser[] = [
  {
    id: 'user-admin-001',
    email: 'admin@prisier.com',
    password: '123456',
    nombreCompleto: 'Admin Prisier',
    rol: 'admin',
    tenantId: null,
    estado: 'activo',
    invitadoPor: null,
    fechaInvitacion: null,
    createdAt: new Date(Date.now() - 90 * 86400_000).toISOString(),
  },
  {
    id: 'user-consultor-001',
    email: 'consultor@prisier.com',
    password: '123456',
    nombreCompleto: 'Consultor Demo',
    rol: 'consultor_prisier',
    tenantId: null,
    estado: 'activo',
    invitadoPor: null,
    fechaInvitacion: null,
    createdAt: new Date(Date.now() - 90 * 86400_000).toISOString(),
  },
  {
    id: 'user-cliente-001',
    email: 'cliente@congrupo.com',
    password: '123456',
    nombreCompleto: 'Cliente ConGrupo',
    rol: 'cliente_comercial',
    tenantId: 'tenant-001',
    estado: 'activo',
    invitadoPor: 'user-consultor-001',
    fechaInvitacion: new Date(Date.now() - 60 * 86400_000).toISOString(),
    createdAt: new Date(Date.now() - 60 * 86400_000).toISOString(),
  },
  {
    id: 'user-cliente-002',
    email: 'cliente@bevmax.com',
    password: '123456',
    nombreCompleto: 'Cliente BevMax',
    rol: 'cliente_comercial',
    tenantId: 'tenant-002',
    estado: 'activo',
    invitadoPor: 'user-consultor-001',
    fechaInvitacion: new Date(Date.now() - 55 * 86400_000).toISOString(),
    createdAt: new Date(Date.now() - 55 * 86400_000).toISOString(),
  },
  {
    id: 'user-cliente-003',
    email: 'cliente@lacteosandes.com',
    password: '123456',
    nombreCompleto: 'Cliente Lácteos Andes',
    rol: 'cliente_comercial',
    tenantId: 'tenant-003',
    estado: 'activo',
    invitadoPor: 'user-consultor-001',
    fechaInvitacion: new Date(Date.now() - 40 * 86400_000).toISOString(),
    createdAt: new Date(Date.now() - 40 * 86400_000).toISOString(),
  },
  {
    id: 'user-cliente-004',
    email: 'cliente@granoselect.com',
    password: '123456',
    nombreCompleto: 'Cliente GranoSelect',
    rol: 'cliente_comercial',
    tenantId: 'tenant-004',
    estado: 'activo',
    invitadoPor: 'user-consultor-001',
    fechaInvitacion: new Date(Date.now() - 25 * 86400_000).toISOString(),
    createdAt: new Date(Date.now() - 25 * 86400_000).toISOString(),
  },
  {
    id: 'user-cliente-005',
    email: 'cliente@freshmart.com',
    password: '123456',
    nombreCompleto: 'Cliente FreshMart',
    rol: 'cliente_comercial',
    tenantId: 'tenant-005',
    estado: 'activo',
    invitadoPor: 'user-consultor-001',
    fechaInvitacion: new Date(Date.now() - 15 * 86400_000).toISOString(),
    createdAt: new Date(Date.now() - 15 * 86400_000).toISOString(),
  },
  {
    id: 'user-cliente-006',
    email: 'cliente@nutripack.com',
    password: '123456',
    nombreCompleto: 'Cliente NutriPack',
    rol: 'cliente_comercial',
    tenantId: 'tenant-006',
    estado: 'activo',
    invitadoPor: 'user-consultor-001',
    fechaInvitacion: new Date(Date.now() - 8 * 86400_000).toISOString(),
    createdAt: new Date(Date.now() - 8 * 86400_000).toISOString(),
  },
]

export const SEED_CONSULTOR_TENANTS: MockConsultorTenant[] = [
  { id: 'ct-001', userId: 'user-consultor-001', tenantId: 'tenant-001', createdAt: new Date(Date.now() - 90 * 86400_000).toISOString() },
  { id: 'ct-002', userId: 'user-consultor-001', tenantId: 'tenant-002', createdAt: new Date(Date.now() - 60 * 86400_000).toISOString() },
  { id: 'ct-003', userId: 'user-consultor-001', tenantId: 'tenant-003', createdAt: new Date(Date.now() - 45 * 86400_000).toISOString() },
  { id: 'ct-004', userId: 'user-consultor-001', tenantId: 'tenant-004', createdAt: new Date(Date.now() - 30 * 86400_000).toISOString() },
  { id: 'ct-005', userId: 'user-consultor-001', tenantId: 'tenant-005', createdAt: new Date(Date.now() - 20 * 86400_000).toISOString() },
  { id: 'ct-006', userId: 'user-consultor-001', tenantId: 'tenant-006', createdAt: new Date(Date.now() - 10 * 86400_000).toISOString() },
]

// ─── Seed SKUs (incluye PVP, costo, peso profit pool) ───────────────────────

export const SEED_SKUS: MockSku[] = [
  // Bebidas Energéticas — PowerUp
  { id: 'sku-001', ean: '7701234000001', nombre: 'Energética 250ml',          categoria: 'Bebidas Energéticas', marca: 'PowerUp',    tenantId: 'tenant-001', pvpSugerido:  5500, costoVariable: 2200, pesoProfitPool: 0.04 },
  { id: 'sku-002', ean: '7701234000002', nombre: 'Energética 500ml',          categoria: 'Bebidas Energéticas', marca: 'PowerUp',    tenantId: 'tenant-001', pvpSugerido:  9500, costoVariable: 3800, pesoProfitPool: 0.04 },
  { id: 'sku-003', ean: '7701234000003', nombre: 'Energética 250ml Zero',     categoria: 'Bebidas Energéticas', marca: 'PowerUp',    tenantId: 'tenant-001', pvpSugerido:  5500, costoVariable: 2300, pesoProfitPool: 0.04 },
  { id: 'sku-004', ean: '7701234000004', nombre: 'Energética 500ml Tropical', categoria: 'Bebidas Energéticas', marca: 'PowerUp',    tenantId: 'tenant-001', pvpSugerido:  9800, costoVariable: 3900, pesoProfitPool: 0.04 },
  { id: 'sku-005', ean: '7701234000005', nombre: 'Energética 355ml Mora',     categoria: 'Bebidas Energéticas', marca: 'PowerUp',    tenantId: 'tenant-001', pvpSugerido:  6800, costoVariable: 2700, pesoProfitPool: 0.04 },
  // Jugos — FruttaViva
  { id: 'sku-006', ean: '7701234000006', nombre: 'Jugo Naranja 1L',           categoria: 'Jugos',               marca: 'FruttaViva', tenantId: 'tenant-001', pvpSugerido:  8200, costoVariable: 3400, pesoProfitPool: 0.04 },
  { id: 'sku-007', ean: '7701234000007', nombre: 'Jugo Manzana 1L',           categoria: 'Jugos',               marca: 'FruttaViva', tenantId: 'tenant-001', pvpSugerido:  8200, costoVariable: 3500, pesoProfitPool: 0.04 },
  { id: 'sku-008', ean: '7701234000008', nombre: 'Jugo Multifrutas 500ml',    categoria: 'Jugos',               marca: 'FruttaViva', tenantId: 'tenant-001', pvpSugerido:  4600, costoVariable: 1900, pesoProfitPool: 0.04 },
  { id: 'sku-009', ean: '7701234000009', nombre: 'Jugo Uva 1L',               categoria: 'Jugos',               marca: 'FruttaViva', tenantId: 'tenant-001', pvpSugerido:  8500, costoVariable: 3600, pesoProfitPool: 0.04 },
  { id: 'sku-010', ean: '7701234000010', nombre: 'Jugo Mango 500ml',          categoria: 'Jugos',               marca: 'FruttaViva', tenantId: 'tenant-001', pvpSugerido:  4800, costoVariable: 2000, pesoProfitPool: 0.04 },
  // Agua — AquaPura
  { id: 'sku-011', ean: '7701234000011', nombre: 'Agua Natural 300ml',        categoria: 'Agua',                marca: 'AquaPura',   tenantId: 'tenant-001', pvpSugerido:  1500, costoVariable:  500, pesoProfitPool: 0.04 },
  { id: 'sku-012', ean: '7701234000012', nombre: 'Agua Natural 600ml',        categoria: 'Agua',                marca: 'AquaPura',   tenantId: 'tenant-001', pvpSugerido:  2200, costoVariable:  800, pesoProfitPool: 0.04 },
  { id: 'sku-013', ean: '7701234000013', nombre: 'Agua Natural 1.5L',         categoria: 'Agua',                marca: 'AquaPura',   tenantId: 'tenant-001', pvpSugerido:  3800, costoVariable: 1400, pesoProfitPool: 0.04 },
  { id: 'sku-014', ean: '7701234000014', nombre: 'Agua Saborizada Limón 600ml',categoria: 'Agua',               marca: 'AquaPura',   tenantId: 'tenant-001', pvpSugerido:  2800, costoVariable: 1100, pesoProfitPool: 0.04 },
  { id: 'sku-015', ean: '7701234000015', nombre: 'Agua Saborizada Fresa 600ml',categoria: 'Agua',               marca: 'AquaPura',   tenantId: 'tenant-001', pvpSugerido:  2800, costoVariable: 1100, pesoProfitPool: 0.04 },
  // Hidratantes — SportPro
  { id: 'sku-016', ean: '7701234000016', nombre: 'Hidratante Limón 750ml',    categoria: 'Hidratantes',         marca: 'SportPro',   tenantId: 'tenant-001', pvpSugerido:  6500, costoVariable: 2800, pesoProfitPool: 0.04 },
  { id: 'sku-017', ean: '7701234000017', nombre: 'Hidratante Naranja 750ml',  categoria: 'Hidratantes',         marca: 'SportPro',   tenantId: 'tenant-001', pvpSugerido:  6500, costoVariable: 2800, pesoProfitPool: 0.04 },
  { id: 'sku-018', ean: '7701234000018', nombre: 'Hidratante Uva 500ml',      categoria: 'Hidratantes',         marca: 'SportPro',   tenantId: 'tenant-001', pvpSugerido:  4900, costoVariable: 2100, pesoProfitPool: 0.04 },
  // Tés — TeaLeaf
  { id: 'sku-019', ean: '7701234000019', nombre: 'Té Verde Limón 500ml',      categoria: 'Tés',                 marca: 'TeaLeaf',    tenantId: 'tenant-001', pvpSugerido:  3900, costoVariable: 1500, pesoProfitPool: 0.04 },
  { id: 'sku-020', ean: '7701234000020', nombre: 'Té Negro Durazno 500ml',    categoria: 'Tés',                 marca: 'TeaLeaf',    tenantId: 'tenant-001', pvpSugerido:  3900, costoVariable: 1500, pesoProfitPool: 0.04 },
  { id: 'sku-021', ean: '7701234000021', nombre: 'Té de Hierbas 500ml',       categoria: 'Tés',                 marca: 'TeaLeaf',    tenantId: 'tenant-001', pvpSugerido:  4200, costoVariable: 1700, pesoProfitPool: 0.04 },
  // Gaseosas — FizzUp
  { id: 'sku-022', ean: '7701234000022', nombre: 'Gaseosa Cola 350ml',        categoria: 'Gaseosas',            marca: 'FizzUp',     tenantId: 'tenant-001', pvpSugerido:  2500, costoVariable:  900, pesoProfitPool: 0.04 },
  { id: 'sku-023', ean: '7701234000023', nombre: 'Gaseosa Cola 1.5L',         categoria: 'Gaseosas',            marca: 'FizzUp',     tenantId: 'tenant-001', pvpSugerido:  5200, costoVariable: 1800, pesoProfitPool: 0.04 },
  { id: 'sku-024', ean: '7701234000024', nombre: 'Gaseosa Naranja 350ml',     categoria: 'Gaseosas',            marca: 'FizzUp',     tenantId: 'tenant-001', pvpSugerido:  2500, costoVariable:  900, pesoProfitPool: 0.04 },
  { id: 'sku-025', ean: '7701234000025', nombre: 'Gaseosa Lima-Limón 1.5L',   categoria: 'Gaseosas',            marca: 'FizzUp',     tenantId: 'tenant-001', pvpSugerido:  5200, costoVariable: 1800, pesoProfitPool: 0.04 },
]

// ─── Seed Competidores ────────────────────────────────────────────────────────

export const SEED_COMPETIDORES: MockCompetidor[] = [
  { id: 'comp-001', nombre: 'Red Bull',       pais: 'Austria',  tenantId: 'tenant-001' },
  { id: 'comp-002', nombre: 'Monster Energy', pais: 'USA',      tenantId: 'tenant-001' },
  { id: 'comp-003', nombre: 'Speed',          pais: 'Colombia', tenantId: 'tenant-001' },
  { id: 'comp-004', nombre: 'Hit',            pais: 'Colombia', tenantId: 'tenant-001' },
  { id: 'comp-005', nombre: 'Tutti Frutti',   pais: 'Colombia', tenantId: 'tenant-001' },
  { id: 'comp-006', nombre: 'Cristal',        pais: 'Colombia', tenantId: 'tenant-001' },
  { id: 'comp-007', nombre: 'Brisa',          pais: 'Colombia', tenantId: 'tenant-001' },
  { id: 'comp-008', nombre: 'Gatorade',       pais: 'USA',      tenantId: 'tenant-001' },
]

// ─── Seed R-001: Mapeo competidores ──────────────────────────────────────────
// Record<skuId, competidorId[]>

export const SEED_R001: Record<string, string[]> = {
  'sku-001': ['comp-001', 'comp-002', 'comp-003'],
  'sku-002': ['comp-001', 'comp-002', 'comp-003'],
  'sku-003': ['comp-001', 'comp-002'],
  'sku-004': ['comp-001', 'comp-003'],
  'sku-005': ['comp-004', 'comp-005'],
  'sku-006': ['comp-004', 'comp-005'],
  'sku-007': ['comp-004'],
  'sku-008': ['comp-006', 'comp-007'],
  'sku-009': ['comp-006', 'comp-007'],
  'sku-010': ['comp-008'],
}

// ─── Seed R-002a: Atributos por categoría (sin calificaciones) ───────────────

export const SEED_R002_ATRIBUTOS: MockCategoriaAtributos[] = [
  {
    categoria: 'Bebidas Energéticas',
    atributos: [
      { nombre: 'Sabor',           peso: 0.3000000000, orden: 1, calificacion: 4.0 },
      { nombre: 'Precio',          peso: 0.2500000000, orden: 2, calificacion: 4.0 },
      { nombre: 'Empaque',         peso: 0.2000000000, orden: 3, calificacion: 4.0 },
      { nombre: 'Disponibilidad',  peso: 0.1500000000, orden: 4, calificacion: 4.0 },
      { nombre: 'Marca',           peso: 0.1000000000, orden: 5, calificacion: 4.0 },
    ],
  },
  {
    categoria: 'Jugos',
    atributos: [
      { nombre: 'Sabor',              peso: 0.3500000000, orden: 1, calificacion: 4.0 },
      { nombre: 'Contenido de fruta', peso: 0.2500000000, orden: 2, calificacion: 4.0 },
      { nombre: 'Precio',             peso: 0.2000000000, orden: 3, calificacion: 4.0 },
      { nombre: 'Empaque',            peso: 0.1200000000, orden: 4, calificacion: 4.0 },
      { nombre: 'Disponibilidad',     peso: 0.0800000000, orden: 5, calificacion: 4.0 },
    ],
  },
  {
    categoria: 'Agua',
    atributos: [
      { nombre: 'Precio',          peso: 0.4000000000, orden: 1, calificacion: 4.0 },
      { nombre: 'Disponibilidad',  peso: 0.3000000000, orden: 2, calificacion: 4.0 },
      { nombre: 'Empaque',         peso: 0.1500000000, orden: 3, calificacion: 4.0 },
      { nombre: 'Pureza',          peso: 0.1000000000, orden: 4, calificacion: 4.0 },
      { nombre: 'Marca',           peso: 0.0500000000, orden: 5, calificacion: 4.0 },
    ],
  },
  {
    categoria: 'Hidratantes',
    atributos: [
      { nombre: 'Sabor',           peso: 0.3000000000, orden: 1, calificacion: 4.0 },
      { nombre: 'Precio',          peso: 0.2500000000, orden: 2, calificacion: 4.0 },
      { nombre: 'Electrolitos',    peso: 0.2500000000, orden: 3, calificacion: 4.0 },
      { nombre: 'Disponibilidad',  peso: 0.1200000000, orden: 4, calificacion: 4.0 },
      { nombre: 'Marca',           peso: 0.0800000000, orden: 5, calificacion: 4.0 },
    ],
  },
  {
    categoria: 'Tés',
    atributos: [
      { nombre: 'Sabor',           peso: 0.3500000000, orden: 1, calificacion: 4.0 },
      { nombre: 'Precio',          peso: 0.2500000000, orden: 2, calificacion: 4.0 },
      { nombre: 'Variedad',        peso: 0.1500000000, orden: 3, calificacion: 4.0 },
      { nombre: 'Empaque',         peso: 0.1500000000, orden: 4, calificacion: 4.0 },
      { nombre: 'Disponibilidad',  peso: 0.1000000000, orden: 5, calificacion: 4.0 },
    ],
  },
  {
    categoria: 'Gaseosas',
    atributos: [
      { nombre: 'Sabor',           peso: 0.3000000000, orden: 1, calificacion: 4.0 },
      { nombre: 'Precio',          peso: 0.3000000000, orden: 2, calificacion: 4.0 },
      { nombre: 'Disponibilidad',  peso: 0.2000000000, orden: 3, calificacion: 4.0 },
      { nombre: 'Empaque',         peso: 0.1000000000, orden: 4, calificacion: 4.0 },
      { nombre: 'Marca',           peso: 0.1000000000, orden: 5, calificacion: 4.0 },
    ],
  },
]

// ─── Seed R-002b: Calificaciones por SKU × atributo × {propio, competidor} ───

function buildDefaultCalificaciones(): MockCalificacion[] {
  const out: MockCalificacion[] = []
  for (const sku of SEED_SKUS) {
    const catAttrs = SEED_R002_ATRIBUTOS.find(c => c.categoria === sku.categoria)
    if (!catAttrs) continue
    const competidoresAsignados = SEED_R001[sku.id] ?? []
    for (const atr of catAttrs.atributos) {
      const califsComp: Record<string, number> = {}
      for (const compId of competidoresAsignados) {
        // semilla simple: valores en [3.0, 4.5] con 2 decimales
        califsComp[compId] = Math.round((3 + Math.random() * 1.5) * 100) / 100
      }
      out.push({
        skuId: sku.id,
        atributo: atr.nombre,
        calificacionPropia: Math.round((3.5 + Math.random() * 1.2) * 100) / 100,
        calificacionesCompetidor: califsComp,
      })
    }
  }
  return out
}

export const SEED_R002_CALIFICACIONES: MockCalificacion[] = buildDefaultCalificaciones()

// ─── Seed R-004: Elasticidades (sin confianza, sin R²) ────────────────────────

export const SEED_R004: MockElasticidad[] = [
  { skuId: 'sku-001', coeficiente: -1.82 },
  { skuId: 'sku-002', coeficiente: -1.65 },
  { skuId: 'sku-003', coeficiente: -1.45 },
  { skuId: 'sku-004', coeficiente: -1.78 },
  { skuId: 'sku-005', coeficiente: -2.10 },
  { skuId: 'sku-006', coeficiente: -2.05 },
  { skuId: 'sku-007', coeficiente: -1.95 },
  { skuId: 'sku-008', coeficiente: -0.85 },
  { skuId: 'sku-009', coeficiente: -0.78 },
  { skuId: 'sku-010', coeficiente: -1.55 },
]

// ─── Seed R-005/R-006: Portafolio (IVA) ──────────────────────────────────────

export const SEED_PORTAFOLIO: MockPortafolio = {
  iva: 0.19,
}

// ─── Seed Categorías con IVA ──────────────────────────────────────────────────

// Categorías globales del sistema — compartidas por todos los tenants
export const SEED_CATEGORIAS: MockCategoriaConfig[] = [
  { nombre: 'Aceites',             iva: 0.00 },
  { nombre: 'Agua',                iva: 0.00 },
  { nombre: 'Arroz',               iva: 0.00 },
  { nombre: 'Bebidas Energéticas', iva: 0.19 },
  { nombre: 'Gaseosas',            iva: 0.19 },
  { nombre: 'Hidratantes',         iva: 0.19 },
  { nombre: 'Jugos',               iva: 0.00 },
  { nombre: 'Lácteos',             iva: 0.00 },
  { nombre: 'Pastas',              iva: 0.00 },
  { nombre: 'Tés',                 iva: 0.19 },
]

// ─── Seed R-007: Canales × Categorías (sin IVA) ──────────────────────────────

export const SEED_R007: MockCanalesMargenes = {
  iva: 0.19,
  canales: [
    { nombre: 'Mayorista', margen: 0.80 },
    { nombre: 'Retail', margen: 0.65 },
    { nombre: 'TAT', margen: 0.85 },
  ],
}

// ─── Seed R-008: Umbrales de alerta ──────────────────────────────────────────

export const SEED_R008: MockUmbrales = {
  umbralSuperior: 0.05,
  umbralInferior: 0.05,
}

// ─── Seed R-010: Retailers ───────────────────────────────────────────────────

export const SEED_R010: MockRetailer[] = [
  { id: 'ret-001', nombre: 'Éxito',     activo: true,  tenantId: 'tenant-001' },
  { id: 'ret-002', nombre: 'Carulla',   activo: true,  tenantId: 'tenant-001' },
  { id: 'ret-003', nombre: 'Olímpica',  activo: true,  tenantId: 'tenant-001' },
  { id: 'ret-004', nombre: 'D1',        activo: true,  tenantId: 'tenant-001' },
  { id: 'ret-005', nombre: 'Ara',       activo: true,  tenantId: 'tenant-001' },
  { id: 'ret-006', nombre: 'Jumbo',     activo: true,  tenantId: 'tenant-001' },
  { id: 'ret-007', nombre: 'Makro',     activo: false, tenantId: 'tenant-001' },
]

// ─── Seed R-005: Config estructura costos ───────────────────────────────────

export const SEED_R005: MockColConfig = {
  iva: 0.19,
  tipoEstructura: 'costo_variable',
}

// ─── Seed R-006: Config estructura SKUs/PVP ────────────────────────────────

export const SEED_R006: MockColConfig = {
  iva: 0.19,
  tipoEstructura: 'pvp_sugerido',
}

// ─── Importaciones de portafolio ─────────────────────────────────────────────

export interface MockImportRecord {
  id: string
  fecha: string
  archivo: string
  totalSkus: number
  advertencias: number
  errores: string[]
  estado: 'exitoso' | 'con_advertencias' | 'fallido'
}

export const SEED_IMPORTACIONES: MockImportRecord[] = [
  {
    id: 'imp-001',
    fecha: new Date(Date.now() - 30 * 86400_000).toISOString(),
    archivo: 'portafolio-congrupo-v1.xlsx',
    totalSkus: 20,
    advertencias: 0,
    errores: [],
    estado: 'exitoso',
  },
  {
    id: 'imp-002',
    fecha: new Date(Date.now() - 15 * 86400_000).toISOString(),
    archivo: 'portafolio-congrupo-v2.xlsx',
    totalSkus: 23,
    advertencias: 2,
    errores: [
      'Fila 8: Peso Profit Pool fuera de rango (1.5%) — se normalizó a 1.0%',
      'Fila 15: Categoría "Bebidas Deportivas" no reconocida — asignada a Hidratantes',
    ],
    estado: 'con_advertencias',
  },
  {
    id: 'imp-003',
    fecha: new Date(Date.now() - 3 * 86400_000).toISOString(),
    archivo: 'portafolio-congrupo-oct2025.xlsx',
    totalSkus: 25,
    advertencias: 0,
    errores: [],
    estado: 'exitoso',
  },
]

// ─── Seed Vinculaciones SKU propio → SKUs competidores ───────────────────────

export interface MockVinculacion {
  tipo: 'propio' | 'competencia'
  id: string
}

export const SEED_VINCULACIONES: Record<string, MockVinculacion[]> = {
  // Bebidas Energéticas
  'sku-001': [{ tipo: 'competencia', id: 'sc-001' }, { tipo: 'competencia', id: 'sc-002' }, { tipo: 'competencia', id: 'sc-003' }],
  'sku-002': [{ tipo: 'competencia', id: 'sc-001' }, { tipo: 'competencia', id: 'sc-002' }, { tipo: 'competencia', id: 'sc-003' }],
  'sku-003': [{ tipo: 'competencia', id: 'sc-001' }, { tipo: 'competencia', id: 'sc-002' }],
  'sku-004': [{ tipo: 'competencia', id: 'sc-001' }, { tipo: 'competencia', id: 'sc-003' }],
  'sku-005': [{ tipo: 'competencia', id: 'sc-002' }, { tipo: 'competencia', id: 'sc-003' }],
  // Jugos
  'sku-006': [{ tipo: 'competencia', id: 'sc-004' }, { tipo: 'competencia', id: 'sc-005' }],
  'sku-007': [{ tipo: 'competencia', id: 'sc-004' }, { tipo: 'competencia', id: 'sc-005' }],
  'sku-008': [{ tipo: 'competencia', id: 'sc-004' }],
  'sku-009': [{ tipo: 'competencia', id: 'sc-005' }],
  'sku-010': [{ tipo: 'competencia', id: 'sc-004' }],
  // Agua
  'sku-011': [{ tipo: 'competencia', id: 'sc-006' }, { tipo: 'competencia', id: 'sc-007' }],
  'sku-012': [{ tipo: 'competencia', id: 'sc-006' }, { tipo: 'competencia', id: 'sc-007' }],
  'sku-013': [{ tipo: 'competencia', id: 'sc-006' }],
  'sku-014': [{ tipo: 'competencia', id: 'sc-007' }],
  'sku-015': [{ tipo: 'competencia', id: 'sc-007' }],
  // Hidratantes
  'sku-016': [{ tipo: 'competencia', id: 'sc-008' }],
  'sku-017': [{ tipo: 'competencia', id: 'sc-008' }],
  'sku-018': [{ tipo: 'competencia', id: 'sc-008' }],
  // Tés
  'sku-019': [{ tipo: 'competencia', id: 'sc-011' }],
  'sku-020': [{ tipo: 'competencia', id: 'sc-011' }],
  'sku-021': [{ tipo: 'competencia', id: 'sc-011' }],
  // Gaseosas
  'sku-022': [{ tipo: 'competencia', id: 'sc-009' }, { tipo: 'competencia', id: 'sc-010' }],
  'sku-023': [{ tipo: 'competencia', id: 'sc-009' }, { tipo: 'competencia', id: 'sc-010' }],
  'sku-024': [{ tipo: 'competencia', id: 'sc-009' }],
  'sku-025': [{ tipo: 'competencia', id: 'sc-010' }],
}

// ─── Seed SKUs Competencia ────────────────────────────────────────────────────

export interface MockSkuCompetencia {
  id: string
  ean: string
  nombre: string
  marca: string
  categoria: string
  pvpReferencia: number
  tenantId: string
}

export const SEED_SKUS_COMPETENCIA: MockSkuCompetencia[] = [
  { id: 'sc-001', ean: '9001234000001', nombre: 'Energy Drink 250ml',      marca: 'Red Bull',      categoria: 'Bebidas Energéticas', pvpReferencia:  6200, tenantId: 'tenant-001' },
  { id: 'sc-002', ean: '9001234000002', nombre: 'Monster Original 473ml',  marca: 'Monster Energy', categoria: 'Bebidas Energéticas', pvpReferencia:  8500, tenantId: 'tenant-001' },
  { id: 'sc-003', ean: '9001234000003', nombre: 'Speed 250ml',             marca: 'Speed',          categoria: 'Bebidas Energéticas', pvpReferencia:  4800, tenantId: 'tenant-001' },
  { id: 'sc-004', ean: '9001234000004', nombre: 'Hit Naranja 1L',          marca: 'Hit',            categoria: 'Jugos',               pvpReferencia:  7800, tenantId: 'tenant-001' },
  { id: 'sc-005', ean: '9001234000005', nombre: 'Hit Manzana 1L',          marca: 'Hit',            categoria: 'Jugos',               pvpReferencia:  7800, tenantId: 'tenant-001' },
  { id: 'sc-006', ean: '9001234000006', nombre: 'Cristal 600ml',           marca: 'Cristal',        categoria: 'Agua',                pvpReferencia:  2100, tenantId: 'tenant-001' },
  { id: 'sc-007', ean: '9001234000007', nombre: 'Brisa 600ml',             marca: 'Brisa',          categoria: 'Agua',                pvpReferencia:  2000, tenantId: 'tenant-001' },
  { id: 'sc-008', ean: '9001234000008', nombre: 'Gatorade Limón 750ml',    marca: 'Gatorade',       categoria: 'Hidratantes',         pvpReferencia:  6800, tenantId: 'tenant-001' },
  { id: 'sc-009', ean: '9001234000009', nombre: 'Coca-Cola 350ml',         marca: 'Coca-Cola',      categoria: 'Gaseosas',            pvpReferencia:  2800, tenantId: 'tenant-001' },
  { id: 'sc-010', ean: '9001234000010', nombre: 'Pepsi 350ml',             marca: 'Pepsi',          categoria: 'Gaseosas',            pvpReferencia:  2600, tenantId: 'tenant-001' },
  { id: 'sc-011', ean: '9001234000011', nombre: 'Fuze Tea Limón 500ml',    marca: 'Fuze Tea',       categoria: 'Tés',                 pvpReferencia:  4100, tenantId: 'tenant-001' },
]

// ─── Seed R-009: Peso profit pool por SKU ───────────────────────────────────

export const SEED_R009: MockPesoItem[] = [
  { skuId: 'sku-001', peso: 0.15 },
  { skuId: 'sku-002', peso: 0.12 },
  { skuId: 'sku-003', peso: 0.08 },
  { skuId: 'sku-004', peso: 0.10 },
  { skuId: 'sku-005', peso: 0.12 },
  { skuId: 'sku-006', peso: 0.10 },
  { skuId: 'sku-007', peso: 0.08 },
  { skuId: 'sku-008', peso: 0.10 },
  { skuId: 'sku-009', peso: 0.10 },
  { skuId: 'sku-010', peso: 0.05 },
]

// ════════════════════════════════════════════════════════════════════════════
// DATOS POR TENANT — tenant-002 al tenant-006
// ════════════════════════════════════════════════════════════════════════════

// ─── Atributos de valor percibido para las categorías nuevas ─────────────────
export const SEED_R002_EXTRA: MockCategoriaAtributos[] = [
  {
    categoria: 'Lácteos',
    atributos: [
      { nombre: 'Frescura',      peso: 0.35, orden: 1, calificacion: 4.0 },
      { nombre: 'Precio',        peso: 0.25, orden: 2, calificacion: 4.0 },
      { nombre: 'Sabor',         peso: 0.20, orden: 3, calificacion: 4.0 },
      { nombre: 'Empaque',       peso: 0.12, orden: 4, calificacion: 4.0 },
      { nombre: 'Disponibilidad',peso: 0.08, orden: 5, calificacion: 4.0 },
    ],
  },
  {
    categoria: 'Arroz',
    atributos: [
      { nombre: 'Calidad grano', peso: 0.30, orden: 1, calificacion: 4.0 },
      { nombre: 'Precio',        peso: 0.30, orden: 2, calificacion: 4.0 },
      { nombre: 'Tiempo cocción',peso: 0.20, orden: 3, calificacion: 4.0 },
      { nombre: 'Empaque',       peso: 0.12, orden: 4, calificacion: 4.0 },
      { nombre: 'Disponibilidad',peso: 0.08, orden: 5, calificacion: 4.0 },
    ],
  },
  {
    categoria: 'Aceites',
    atributos: [
      { nombre: 'Precio',        peso: 0.40, orden: 1, calificacion: 4.0 },
      { nombre: 'Tipo extracción',peso: 0.20, orden: 2, calificacion: 4.0 },
      { nombre: 'Sabor',         peso: 0.20, orden: 3, calificacion: 4.0 },
      { nombre: 'Empaque',       peso: 0.12, orden: 4, calificacion: 4.0 },
      { nombre: 'Disponibilidad',peso: 0.08, orden: 5, calificacion: 4.0 },
    ],
  },
  {
    categoria: 'Pastas',
    atributos: [
      { nombre: 'Precio',        peso: 0.35, orden: 1, calificacion: 4.0 },
      { nombre: 'Calidad',       peso: 0.25, orden: 2, calificacion: 4.0 },
      { nombre: 'Tiempo cocción',peso: 0.20, orden: 3, calificacion: 4.0 },
      { nombre: 'Empaque',       peso: 0.12, orden: 4, calificacion: 4.0 },
      { nombre: 'Disponibilidad',peso: 0.08, orden: 5, calificacion: 4.0 },
    ],
  },
]

// ─── tenant-002: BevMax S.A. (bebidas / professional) ────────────────────────
export const SEED_SKUS_T002: MockSku[] = [
  { id: 'bvx-001', ean: '7702001000001', nombre: 'BevMax Energy 250ml',      categoria: 'Bebidas Energéticas', marca: 'BevMax',   tenantId: 'tenant-002', pvpSugerido:  5200, costoVariable: 2100, pesoProfitPool: 0.15 },
  { id: 'bvx-002', ean: '7702001000002', nombre: 'BevMax Energy 500ml',      categoria: 'Bebidas Energéticas', marca: 'BevMax',   tenantId: 'tenant-002', pvpSugerido:  9800, costoVariable: 4000, pesoProfitPool: 0.15 },
  { id: 'bvx-003', ean: '7702001000003', nombre: 'BevMax Energy Zero 355ml', categoria: 'Bebidas Energéticas', marca: 'BevMax',   tenantId: 'tenant-002', pvpSugerido:  6200, costoVariable: 2500, pesoProfitPool: 0.12 },
  { id: 'bvx-004', ean: '7702001000004', nombre: 'BevWater Natural 600ml',   categoria: 'Agua',                marca: 'BevWater', tenantId: 'tenant-002', pvpSugerido:  2000, costoVariable:  700, pesoProfitPool: 0.10 },
  { id: 'bvx-005', ean: '7702001000005', nombre: 'BevWater Natural 1.5L',    categoria: 'Agua',                marca: 'BevWater', tenantId: 'tenant-002', pvpSugerido:  3500, costoVariable: 1200, pesoProfitPool: 0.10 },
  { id: 'bvx-006', ean: '7702001000006', nombre: 'BevSport Limón 750ml',     categoria: 'Hidratantes',         marca: 'BevSport', tenantId: 'tenant-002', pvpSugerido:  6800, costoVariable: 2900, pesoProfitPool: 0.18 },
  { id: 'bvx-007', ean: '7702001000007', nombre: 'BevSport Naranja 750ml',   categoria: 'Hidratantes',         marca: 'BevSport', tenantId: 'tenant-002', pvpSugerido:  6800, costoVariable: 2900, pesoProfitPool: 0.12 },
  { id: 'bvx-008', ean: '7702001000008', nombre: 'BevFresh Jugo Naranja 1L', categoria: 'Jugos',               marca: 'BevFresh', tenantId: 'tenant-002', pvpSugerido:  7800, costoVariable: 3200, pesoProfitPool: 0.08 },
]
export const SEED_SKUS_COMP_T002: MockSkuCompetencia[] = [
  { id: 'sc-t2-001', ean: '9002001000001', nombre: 'Red Bull 250ml',          marca: 'Red Bull',      categoria: 'Bebidas Energéticas', pvpReferencia: 6200, tenantId: 'tenant-002' },
  { id: 'sc-t2-002', ean: '9002001000002', nombre: 'Monster Energy 500ml',    marca: 'Monster Energy',categoria: 'Bebidas Energéticas', pvpReferencia: 8500, tenantId: 'tenant-002' },
  { id: 'sc-t2-003', ean: '9002001000003', nombre: 'Cristal 600ml',           marca: 'Cristal',       categoria: 'Agua',                pvpReferencia: 2100, tenantId: 'tenant-002' },
  { id: 'sc-t2-004', ean: '9002001000004', nombre: 'Gatorade Limón 750ml',    marca: 'Gatorade',      categoria: 'Hidratantes',         pvpReferencia: 6800, tenantId: 'tenant-002' },
  { id: 'sc-t2-005', ean: '9002001000005', nombre: 'Hit Naranja 1L',          marca: 'Hit',           categoria: 'Jugos',               pvpReferencia: 7800, tenantId: 'tenant-002' },
]
export const SEED_R001_T002: Record<string, string[]> = {
  'bvx-001': ['sc-t2-001', 'sc-t2-002'], 'bvx-002': ['sc-t2-001', 'sc-t2-002'],
  'bvx-003': ['sc-t2-001'],              'bvx-004': ['sc-t2-003'],
  'bvx-005': ['sc-t2-003'],             'bvx-006': ['sc-t2-004'],
  'bvx-007': ['sc-t2-004'],             'bvx-008': ['sc-t2-005'],
}
export const SEED_VINCULACIONES_T002: Record<string, MockVinculacion[]> = {
  'bvx-001': [{ tipo: 'competencia', id: 'sc-t2-001' }, { tipo: 'competencia', id: 'sc-t2-002' }],
  'bvx-002': [{ tipo: 'competencia', id: 'sc-t2-001' }, { tipo: 'competencia', id: 'sc-t2-002' }],
  'bvx-003': [{ tipo: 'competencia', id: 'sc-t2-001' }],
  'bvx-004': [{ tipo: 'competencia', id: 'sc-t2-003' }],
  'bvx-005': [{ tipo: 'competencia', id: 'sc-t2-003' }],
  'bvx-006': [{ tipo: 'competencia', id: 'sc-t2-004' }],
  'bvx-007': [{ tipo: 'competencia', id: 'sc-t2-004' }],
  'bvx-008': [{ tipo: 'competencia', id: 'sc-t2-005' }],
}
export const SEED_R004_T002: MockElasticidad[] = [
  { skuId: 'bvx-001', coeficiente: -1.75 }, { skuId: 'bvx-002', coeficiente: -1.60 },
  { skuId: 'bvx-003', coeficiente: -1.50 }, { skuId: 'bvx-004', coeficiente: -0.90 },
  { skuId: 'bvx-005', coeficiente: -0.85 }, { skuId: 'bvx-006', coeficiente: -1.40 },
  { skuId: 'bvx-007', coeficiente: -1.35 }, { skuId: 'bvx-008', coeficiente: -1.95 },
]
export const SEED_R009_T002: MockPesoItem[] = [
  { skuId: 'bvx-001', peso: 0.15 }, { skuId: 'bvx-002', peso: 0.15 },
  { skuId: 'bvx-003', peso: 0.12 }, { skuId: 'bvx-004', peso: 0.10 },
  { skuId: 'bvx-005', peso: 0.10 }, { skuId: 'bvx-006', peso: 0.18 },
  { skuId: 'bvx-007', peso: 0.12 }, { skuId: 'bvx-008', peso: 0.08 },
]
export const SEED_R007_T002: MockCanalesMargenes = {
  iva: 0.19,
  canales: [
    { nombre: 'Mayorista', margen: 0.78 },
    { nombre: 'Retail',    margen: 0.62 },
    { nombre: 'TAT',       margen: 0.82 },
  ],
}

// ─── tenant-003: Lácteos Andes (lacteos / enterprise) ────────────────────────
export const SEED_SKUS_T003: MockSku[] = [
  { id: 'lan-001', ean: '7703001000001', nombre: 'AndesLeche Entera 1L',        categoria: 'Lácteos', marca: 'AndesLeche',  tenantId: 'tenant-003', pvpSugerido:  4200, costoVariable: 2600, pesoProfitPool: 0.15 },
  { id: 'lan-002', ean: '7703001000002', nombre: 'AndesLeche Semidescremada 1L',categoria: 'Lácteos', marca: 'AndesLeche',  tenantId: 'tenant-003', pvpSugerido:  4500, costoVariable: 2800, pesoProfitPool: 0.12 },
  { id: 'lan-003', ean: '7703001000003', nombre: 'AndesLeche Deslactosada 1L',  categoria: 'Lácteos', marca: 'AndesLeche',  tenantId: 'tenant-003', pvpSugerido:  4800, costoVariable: 3000, pesoProfitPool: 0.12 },
  { id: 'lan-004', ean: '7703001000004', nombre: 'AndesYogurt Natural 200g',    categoria: 'Lácteos', marca: 'AndesYogurt', tenantId: 'tenant-003', pvpSugerido:  2200, costoVariable: 1300, pesoProfitPool: 0.10 },
  { id: 'lan-005', ean: '7703001000005', nombre: 'AndesYogurt Griego 200g',     categoria: 'Lácteos', marca: 'AndesYogurt', tenantId: 'tenant-003', pvpSugerido:  3600, costoVariable: 2000, pesoProfitPool: 0.13 },
  { id: 'lan-006', ean: '7703001000006', nombre: 'AndesYogurt Fresa 200g',      categoria: 'Lácteos', marca: 'AndesYogurt', tenantId: 'tenant-003', pvpSugerido:  2200, costoVariable: 1300, pesoProfitPool: 0.10 },
  { id: 'lan-007', ean: '7703001000007', nombre: 'AndesQueso Campesino 500g',   categoria: 'Lácteos', marca: 'AndesQueso',  tenantId: 'tenant-003', pvpSugerido:  8500, costoVariable: 5200, pesoProfitPool: 0.18 },
  { id: 'lan-008', ean: '7703001000008', nombre: 'AndesMantequilla 250g',       categoria: 'Lácteos', marca: 'AndesLeche',  tenantId: 'tenant-003', pvpSugerido:  6500, costoVariable: 3800, pesoProfitPool: 0.10 },
]
export const SEED_SKUS_COMP_T003: MockSkuCompetencia[] = [
  { id: 'sc-t3-001', ean: '9003001000001', nombre: 'Alquería Leche Entera 1L',   marca: 'Alquería', categoria: 'Lácteos', pvpReferencia: 4400, tenantId: 'tenant-003' },
  { id: 'sc-t3-002', ean: '9003001000002', nombre: 'Colanta Leche Entera 1L',    marca: 'Colanta',  categoria: 'Lácteos', pvpReferencia: 4100, tenantId: 'tenant-003' },
  { id: 'sc-t3-003', ean: '9003001000003', nombre: 'Alpina Yogurt Natural 200g', marca: 'Alpina',   categoria: 'Lácteos', pvpReferencia: 2400, tenantId: 'tenant-003' },
]
export const SEED_R001_T003: Record<string, string[]> = {
  'lan-001': ['sc-t3-001', 'sc-t3-002'], 'lan-002': ['sc-t3-001'],
  'lan-003': ['sc-t3-002'],              'lan-004': ['sc-t3-003'],
  'lan-005': ['sc-t3-003'],             'lan-006': ['sc-t3-003'],
}
export const SEED_VINCULACIONES_T003: Record<string, MockVinculacion[]> = {
  'lan-001': [{ tipo: 'competencia', id: 'sc-t3-001' }, { tipo: 'competencia', id: 'sc-t3-002' }],
  'lan-002': [{ tipo: 'competencia', id: 'sc-t3-001' }],
  'lan-003': [{ tipo: 'competencia', id: 'sc-t3-002' }],
  'lan-004': [{ tipo: 'competencia', id: 'sc-t3-003' }],
  'lan-005': [{ tipo: 'competencia', id: 'sc-t3-003' }],
  'lan-006': [{ tipo: 'competencia', id: 'sc-t3-003' }],
}
export const SEED_R004_T003: MockElasticidad[] = [
  { skuId: 'lan-001', coeficiente: -1.10 }, { skuId: 'lan-002', coeficiente: -0.95 },
  { skuId: 'lan-003', coeficiente: -0.85 }, { skuId: 'lan-004', coeficiente: -1.30 },
  { skuId: 'lan-005', coeficiente: -1.20 }, { skuId: 'lan-006', coeficiente: -1.25 },
  { skuId: 'lan-007', coeficiente: -0.70 }, { skuId: 'lan-008', coeficiente: -0.80 },
]
export const SEED_R009_T003: MockPesoItem[] = [
  { skuId: 'lan-001', peso: 0.15 }, { skuId: 'lan-002', peso: 0.12 },
  { skuId: 'lan-003', peso: 0.12 }, { skuId: 'lan-004', peso: 0.10 },
  { skuId: 'lan-005', peso: 0.13 }, { skuId: 'lan-006', peso: 0.10 },
  { skuId: 'lan-007', peso: 0.18 }, { skuId: 'lan-008', peso: 0.10 },
]
export const SEED_R007_T003: MockCanalesMargenes = {
  iva: 0.00,
  canales: [
    { nombre: 'Mayorista',      margen: 0.75 },
    { nombre: 'Retail',         margen: 0.60 },
    { nombre: 'Distribuidores', margen: 0.70 },
  ],
}

// ─── tenant-004: GranoSelect Ltda. (consumo_masivo / starter) ────────────────
export const SEED_SKUS_T004: MockSku[] = [
  { id: 'grs-001', ean: '7704001000001', nombre: 'GranoStar Arroz Blanco 1kg',  categoria: 'Arroz',   marca: 'GranoStar',  tenantId: 'tenant-004', pvpSugerido:  3800, costoVariable: 2200, pesoProfitPool: 0.20 },
  { id: 'grs-002', ean: '7704001000002', nombre: 'GranoStar Arroz Integral 1kg',categoria: 'Arroz',   marca: 'GranoStar',  tenantId: 'tenant-004', pvpSugerido:  4500, costoVariable: 2700, pesoProfitPool: 0.18 },
  { id: 'grs-003', ean: '7704001000003', nombre: 'GranoStar Arroz Premium 500g',categoria: 'Arroz',   marca: 'GranoStar',  tenantId: 'tenant-004', pvpSugerido:  2500, costoVariable: 1400, pesoProfitPool: 0.12 },
  { id: 'grs-004', ean: '7704001000004', nombre: 'GranoPasta Spaghetti 500g',   categoria: 'Pastas',  marca: 'GranoPasta', tenantId: 'tenant-004', pvpSugerido:  3200, costoVariable: 1700, pesoProfitPool: 0.20 },
  { id: 'grs-005', ean: '7704001000005', nombre: 'GranoPasta Penne 500g',       categoria: 'Pastas',  marca: 'GranoPasta', tenantId: 'tenant-004', pvpSugerido:  3400, costoVariable: 1800, pesoProfitPool: 0.18 },
  { id: 'grs-006', ean: '7704001000006', nombre: 'GranoAceite Vegetal 1L',      categoria: 'Aceites', marca: 'GranoAceite',tenantId: 'tenant-004', pvpSugerido:  8500, costoVariable: 5200, pesoProfitPool: 0.12 },
]
export const SEED_SKUS_COMP_T004: MockSkuCompetencia[] = [
  { id: 'sc-t4-001', ean: '9004001000001', nombre: 'Arroz Diana 1kg',        marca: 'Diana',     categoria: 'Arroz',   pvpReferencia: 4200, tenantId: 'tenant-004' },
  { id: 'sc-t4-002', ean: '9004001000002', nombre: 'Arroz Roa 1kg',          marca: 'Roa',       categoria: 'Arroz',   pvpReferencia: 3600, tenantId: 'tenant-004' },
  { id: 'sc-t4-003', ean: '9004001000003', nombre: 'Pasta La Muñeca 500g',   marca: 'La Muñeca', categoria: 'Pastas',  pvpReferencia: 2800, tenantId: 'tenant-004' },
  { id: 'sc-t4-004', ean: '9004001000004', nombre: 'Aceite Premier 1L',      marca: 'Premier',   categoria: 'Aceites', pvpReferencia: 8800, tenantId: 'tenant-004' },
]
export const SEED_R001_T004: Record<string, string[]> = {
  'grs-001': ['sc-t4-001', 'sc-t4-002'], 'grs-002': ['sc-t4-001'],
  'grs-003': ['sc-t4-002'],              'grs-004': ['sc-t4-003'],
  'grs-005': ['sc-t4-003'],             'grs-006': ['sc-t4-004'],
}
export const SEED_VINCULACIONES_T004: Record<string, MockVinculacion[]> = {
  'grs-001': [{ tipo: 'competencia', id: 'sc-t4-001' }, { tipo: 'competencia', id: 'sc-t4-002' }],
  'grs-002': [{ tipo: 'competencia', id: 'sc-t4-001' }],
  'grs-003': [{ tipo: 'competencia', id: 'sc-t4-002' }],
  'grs-004': [{ tipo: 'competencia', id: 'sc-t4-003' }],
  'grs-005': [{ tipo: 'competencia', id: 'sc-t4-003' }],
  'grs-006': [{ tipo: 'competencia', id: 'sc-t4-004' }],
}
export const SEED_R004_T004: MockElasticidad[] = [
  { skuId: 'grs-001', coeficiente: -1.50 }, { skuId: 'grs-002', coeficiente: -1.30 },
  { skuId: 'grs-003', coeficiente: -0.95 }, { skuId: 'grs-004', coeficiente: -1.40 },
  { skuId: 'grs-005', coeficiente: -1.35 }, { skuId: 'grs-006', coeficiente: -0.70 },
]
export const SEED_R009_T004: MockPesoItem[] = [
  { skuId: 'grs-001', peso: 0.20 }, { skuId: 'grs-002', peso: 0.18 },
  { skuId: 'grs-003', peso: 0.12 }, { skuId: 'grs-004', peso: 0.20 },
  { skuId: 'grs-005', peso: 0.18 }, { skuId: 'grs-006', peso: 0.12 },
]
export const SEED_R007_T004: MockCanalesMargenes = {
  iva: 0.00,
  canales: [
    { nombre: 'Mayorista',    margen: 0.82 },
    { nombre: 'Retail',       margen: 0.68 },
    { nombre: 'TAT',          margen: 0.88 },
  ],
}

// ─── tenant-005: FreshMart Corp. (retail / enterprise) ───────────────────────
export const SEED_SKUS_T005: MockSku[] = [
  { id: 'frm-001', ean: '7705001000001', nombre: 'FreshJuice Naranja 1L',    categoria: 'Jugos',               marca: 'FreshJuice',  tenantId: 'tenant-005', pvpSugerido:  7500, costoVariable: 3100, pesoProfitPool: 0.18 },
  { id: 'frm-002', ean: '7705001000002', nombre: 'FreshJuice Mango 1L',      categoria: 'Jugos',               marca: 'FreshJuice',  tenantId: 'tenant-005', pvpSugerido:  7500, costoVariable: 3100, pesoProfitPool: 0.15 },
  { id: 'frm-003', ean: '7705001000003', nombre: 'FreshJuice Tropical 500ml',categoria: 'Jugos',               marca: 'FreshJuice',  tenantId: 'tenant-005', pvpSugerido:  4200, costoVariable: 1700, pesoProfitPool: 0.12 },
  { id: 'frm-004', ean: '7705001000004', nombre: 'FreshWater 500ml',         categoria: 'Agua',                marca: 'FreshWater',  tenantId: 'tenant-005', pvpSugerido:  1800, costoVariable:  600, pesoProfitPool: 0.12 },
  { id: 'frm-005', ean: '7705001000005', nombre: 'FreshWater 1.5L',          categoria: 'Agua',                marca: 'FreshWater',  tenantId: 'tenant-005', pvpSugerido:  3200, costoVariable: 1100, pesoProfitPool: 0.10 },
  { id: 'frm-006', ean: '7705001000006', nombre: 'FreshEnergy 250ml',        categoria: 'Bebidas Energéticas', marca: 'FreshEnergy', tenantId: 'tenant-005', pvpSugerido:  5800, costoVariable: 2400, pesoProfitPool: 0.18 },
  { id: 'frm-007', ean: '7705001000007', nombre: 'FreshEnergy 500ml',        categoria: 'Bebidas Energéticas', marca: 'FreshEnergy', tenantId: 'tenant-005', pvpSugerido:  9200, costoVariable: 3900, pesoProfitPool: 0.15 },
]
export const SEED_SKUS_COMP_T005: MockSkuCompetencia[] = [
  { id: 'sc-t5-001', ean: '9005001000001', nombre: 'Hit Naranja 1L',          marca: 'Hit',           categoria: 'Jugos',               pvpReferencia: 7800, tenantId: 'tenant-005' },
  { id: 'sc-t5-002', ean: '9005001000002', nombre: 'Tutti Frutti Naranja 1L', marca: 'Tutti Frutti',  categoria: 'Jugos',               pvpReferencia: 7200, tenantId: 'tenant-005' },
  { id: 'sc-t5-003', ean: '9005001000003', nombre: 'Brisa 500ml',             marca: 'Brisa',         categoria: 'Agua',                pvpReferencia: 1900, tenantId: 'tenant-005' },
  { id: 'sc-t5-004', ean: '9005001000004', nombre: 'Speed Energy 250ml',      marca: 'Speed',         categoria: 'Bebidas Energéticas', pvpReferencia: 4800, tenantId: 'tenant-005' },
]
export const SEED_R001_T005: Record<string, string[]> = {
  'frm-001': ['sc-t5-001', 'sc-t5-002'], 'frm-002': ['sc-t5-002'],
  'frm-003': ['sc-t5-001'],              'frm-004': ['sc-t5-003'],
  'frm-005': ['sc-t5-003'],             'frm-006': ['sc-t5-004'],
  'frm-007': ['sc-t5-004'],
}
export const SEED_VINCULACIONES_T005: Record<string, MockVinculacion[]> = {
  'frm-001': [{ tipo: 'competencia', id: 'sc-t5-001' }, { tipo: 'competencia', id: 'sc-t5-002' }],
  'frm-002': [{ tipo: 'competencia', id: 'sc-t5-002' }],
  'frm-003': [{ tipo: 'competencia', id: 'sc-t5-001' }],
  'frm-004': [{ tipo: 'competencia', id: 'sc-t5-003' }],
  'frm-005': [{ tipo: 'competencia', id: 'sc-t5-003' }],
  'frm-006': [{ tipo: 'competencia', id: 'sc-t5-004' }],
  'frm-007': [{ tipo: 'competencia', id: 'sc-t5-004' }],
}
export const SEED_R004_T005: MockElasticidad[] = [
  { skuId: 'frm-001', coeficiente: -2.05 }, { skuId: 'frm-002', coeficiente: -1.95 },
  { skuId: 'frm-003', coeficiente: -1.60 }, { skuId: 'frm-004', coeficiente: -0.88 },
  { skuId: 'frm-005', coeficiente: -0.82 }, { skuId: 'frm-006', coeficiente: -1.80 },
  { skuId: 'frm-007', coeficiente: -1.65 },
]
export const SEED_R009_T005: MockPesoItem[] = [
  { skuId: 'frm-001', peso: 0.18 }, { skuId: 'frm-002', peso: 0.15 },
  { skuId: 'frm-003', peso: 0.12 }, { skuId: 'frm-004', peso: 0.12 },
  { skuId: 'frm-005', peso: 0.10 }, { skuId: 'frm-006', peso: 0.18 },
  { skuId: 'frm-007', peso: 0.15 },
]
export const SEED_R007_T005: MockCanalesMargenes = {
  iva: 0.19,
  canales: [
    { nombre: 'Retail',         margen: 0.60 },
    { nombre: 'Canal Directo',  margen: 0.75 },
    { nombre: 'Online',         margen: 0.55 },
  ],
}

// ─── tenant-006: NutriPack S.A.S. (alimentos / professional / inactivo) ──────
export const SEED_SKUS_T006: MockSku[] = [
  { id: 'nup-001', ean: '7706001000001', nombre: 'NutriGrain Arroz Blanco 1kg', categoria: 'Arroz',   marca: 'NutriGrain', tenantId: 'tenant-006', pvpSugerido:  3600, costoVariable: 2100, pesoProfitPool: 0.20 },
  { id: 'nup-002', ean: '7706001000002', nombre: 'NutriGrain Arroz Premium 2kg',categoria: 'Arroz',   marca: 'NutriGrain', tenantId: 'tenant-006', pvpSugerido:  6800, costoVariable: 4000, pesoProfitPool: 0.18 },
  { id: 'nup-003', ean: '7706001000003', nombre: 'NutriOil Aceite Vegetal 1L',  categoria: 'Aceites', marca: 'NutriOil',   tenantId: 'tenant-006', pvpSugerido:  8200, costoVariable: 5000, pesoProfitPool: 0.20 },
  { id: 'nup-004', ean: '7706001000004', nombre: 'NutriOil Aceite de Maíz 1L', categoria: 'Aceites', marca: 'NutriOil',   tenantId: 'tenant-006', pvpSugerido:  9500, costoVariable: 5800, pesoProfitPool: 0.18 },
  { id: 'nup-005', ean: '7706001000005', nombre: 'NutriPasta Spaghetti 400g',   categoria: 'Pastas',  marca: 'NutriPasta', tenantId: 'tenant-006', pvpSugerido:  2800, costoVariable: 1500, pesoProfitPool: 0.12 },
  { id: 'nup-006', ean: '7706001000006', nombre: 'NutriPasta Tornillo 400g',    categoria: 'Pastas',  marca: 'NutriPasta', tenantId: 'tenant-006', pvpSugerido:  2800, costoVariable: 1500, pesoProfitPool: 0.12 },
]
export const SEED_SKUS_COMP_T006: MockSkuCompetencia[] = [
  { id: 'sc-t6-001', ean: '9006001000001', nombre: 'Arroz Diana 1kg',      marca: 'Diana',     categoria: 'Arroz',   pvpReferencia: 4200, tenantId: 'tenant-006' },
  { id: 'sc-t6-002', ean: '9006001000002', nombre: 'Aceite Premier 1L',    marca: 'Premier',   categoria: 'Aceites', pvpReferencia: 8800, tenantId: 'tenant-006' },
  { id: 'sc-t6-003', ean: '9006001000003', nombre: 'Pasta La Muñeca 400g', marca: 'La Muñeca', categoria: 'Pastas',  pvpReferencia: 2600, tenantId: 'tenant-006' },
]
export const SEED_R001_T006: Record<string, string[]> = {
  'nup-001': ['sc-t6-001'], 'nup-002': ['sc-t6-001'],
  'nup-003': ['sc-t6-002'], 'nup-004': ['sc-t6-002'],
  'nup-005': ['sc-t6-003'], 'nup-006': ['sc-t6-003'],
}
export const SEED_VINCULACIONES_T006: Record<string, MockVinculacion[]> = {
  'nup-001': [{ tipo: 'competencia', id: 'sc-t6-001' }],
  'nup-002': [{ tipo: 'competencia', id: 'sc-t6-001' }],
  'nup-003': [{ tipo: 'competencia', id: 'sc-t6-002' }],
  'nup-004': [{ tipo: 'competencia', id: 'sc-t6-002' }],
  'nup-005': [{ tipo: 'competencia', id: 'sc-t6-003' }],
  'nup-006': [{ tipo: 'competencia', id: 'sc-t6-003' }],
}
export const SEED_R004_T006: MockElasticidad[] = [
  { skuId: 'nup-001', coeficiente: -1.45 }, { skuId: 'nup-002', coeficiente: -1.20 },
  { skuId: 'nup-003', coeficiente: -0.75 }, { skuId: 'nup-004', coeficiente: -0.70 },
  { skuId: 'nup-005', coeficiente: -1.35 }, { skuId: 'nup-006', coeficiente: -1.30 },
]
export const SEED_R009_T006: MockPesoItem[] = [
  { skuId: 'nup-001', peso: 0.20 }, { skuId: 'nup-002', peso: 0.18 },
  { skuId: 'nup-003', peso: 0.20 }, { skuId: 'nup-004', peso: 0.18 },
  { skuId: 'nup-005', peso: 0.12 }, { skuId: 'nup-006', peso: 0.12 },
]
export const SEED_R007_T006: MockCanalesMargenes = {
  iva: 0.00,
  canales: [
    { nombre: 'Mayorista', margen: 0.80 },
    { nombre: 'Retail',    margen: 0.65 },
  ],
}

// ─── Retailers adicionales por tenant ────────────────────────────────────────
export const SEED_R010_EXTRA: MockRetailer[] = [
  { id: 'ret-t2-001', nombre: 'Éxito',      activo: true,  tenantId: 'tenant-002' },
  { id: 'ret-t2-002', nombre: 'Jumbo',      activo: true,  tenantId: 'tenant-002' },
  { id: 'ret-t2-003', nombre: 'D1',         activo: true,  tenantId: 'tenant-002' },
  { id: 'ret-t2-004', nombre: 'Alkosto',    activo: false, tenantId: 'tenant-002' },

  { id: 'ret-t3-001', nombre: 'Éxito',      activo: true,  tenantId: 'tenant-003' },
  { id: 'ret-t3-002', nombre: 'Carulla',    activo: true,  tenantId: 'tenant-003' },
  { id: 'ret-t3-003', nombre: 'Olímpica',   activo: true,  tenantId: 'tenant-003' },
  { id: 'ret-t3-004', nombre: 'Metro',      activo: true,  tenantId: 'tenant-003' },

  { id: 'ret-t4-001', nombre: 'D1',         activo: true,  tenantId: 'tenant-004' },
  { id: 'ret-t4-002', nombre: 'Ara',        activo: true,  tenantId: 'tenant-004' },
  { id: 'ret-t4-003', nombre: 'Éxito',      activo: true,  tenantId: 'tenant-004' },
  { id: 'ret-t4-004', nombre: 'Colsubsidio',activo: false, tenantId: 'tenant-004' },

  { id: 'ret-t5-001', nombre: 'Éxito',      activo: true,  tenantId: 'tenant-005' },
  { id: 'ret-t5-002', nombre: 'Jumbo',      activo: true,  tenantId: 'tenant-005' },
  { id: 'ret-t5-003', nombre: 'Carulla',    activo: true,  tenantId: 'tenant-005' },
  { id: 'ret-t5-004', nombre: 'Cencosud',   activo: true,  tenantId: 'tenant-005' },

  { id: 'ret-t6-001', nombre: 'D1',         activo: true,  tenantId: 'tenant-006' },
  { id: 'ret-t6-002', nombre: 'Olímpica',   activo: true,  tenantId: 'tenant-006' },
  { id: 'ret-t6-003', nombre: 'Éxito',      activo: false, tenantId: 'tenant-006' },
]
