// ─── Mock data admin – basado en SeedData.cs ────────────────────────────────

import { CATEGORIAS } from '../shared/catalog'

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
    industria: 'consumo_masivo',
    plan: 'professional',
    estado: 'activo',
    createdAt: new Date(Date.now() - 60 * 86400_000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tenant-003',
    nombre: 'Lácteos Andes',
    industria: 'consumo_masivo',
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
    industria: 'consumo_masivo',
    plan: 'enterprise',
    estado: 'activo',
    createdAt: new Date(Date.now() - 20 * 86400_000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tenant-006',
    nombre: 'NutriPack S.A.S.',
    industria: 'consumo_masivo',
    plan: 'professional',
    estado: 'inactivo',
    createdAt: new Date(Date.now() - 10 * 86400_000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  // ── Vertical Educación ──
  {
    id: 'tenant-edu-001',
    nombre: 'Universidad CongrupoEdu',
    industria: 'educacion',
    plan: 'premium',
    estado: 'activo',
    createdAt: new Date(Date.now() - 5 * 86400_000).toISOString(),
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
    email: 'editor@congrupo.com',
    password: '123456',
    nombreCompleto: 'Editor ConGrupo',
    rol: 'cliente_editor',
    tenantId: 'tenant-001',
    estado: 'activo',
    invitadoPor: 'user-consultor-001',
    fechaInvitacion: new Date(Date.now() - 60 * 86400_000).toISOString(),
    createdAt: new Date(Date.now() - 60 * 86400_000).toISOString(),
  },
  {
    id: 'user-cliente-001b',
    email: 'visualizador@congrupo.com',
    password: '123456',
    nombreCompleto: 'Visualizador ConGrupo',
    rol: 'cliente_visualizador',
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
    rol: 'cliente_visualizador',
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
    rol: 'cliente_visualizador',
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
    rol: 'cliente_visualizador',
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
    rol: 'cliente_visualizador',
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
    rol: 'cliente_visualizador',
    tenantId: 'tenant-006',
    estado: 'activo',
    invitadoPor: 'user-consultor-001',
    fechaInvitacion: new Date(Date.now() - 8 * 86400_000).toISOString(),
    createdAt: new Date(Date.now() - 8 * 86400_000).toISOString(),
  },
  // ── Vertical Educación ──
  {
    id: 'user-edu-001',
    email: 'editor.edu@congrupo.com',
    password: '123456',
    nombreCompleto: 'Editor Edu ConGrupo',
    rol: 'cliente_editor',
    tenantId: 'tenant-edu-001',
    estado: 'activo',
    invitadoPor: 'user-consultor-001',
    fechaInvitacion: new Date(Date.now() - 5 * 86400_000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 86400_000).toISOString(),
  },
  {
    id: 'user-edu-002',
    email: 'viz.edu@congrupo.com',
    password: '123456',
    nombreCompleto: 'Visualizador Edu ConGrupo',
    rol: 'cliente_visualizador',
    tenantId: 'tenant-edu-001',
    estado: 'activo',
    invitadoPor: 'user-consultor-001',
    fechaInvitacion: new Date(Date.now() - 5 * 86400_000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 86400_000).toISOString(),
  },
  {
    id: 'user-consultor-edu-001',
    email: 'consultor.edu@prisier.com',
    password: '123456',
    nombreCompleto: 'Consultor Educación',
    rol: 'consultor_prisier',
    tenantId: null,
    estado: 'activo',
    invitadoPor: null,
    fechaInvitacion: null,
    createdAt: new Date(Date.now() - 7 * 86400_000).toISOString(),
  },
  {
    id: 'user-consultor-multi-001',
    email: 'consultor.multi@prisier.com',
    password: '123456',
    nombreCompleto: 'Consultor Multi-Vertical',
    rol: 'consultor_prisier',
    tenantId: null,
    estado: 'activo',
    invitadoPor: null,
    fechaInvitacion: null,
    createdAt: new Date(Date.now() - 7 * 86400_000).toISOString(),
  },
]


export const SEED_CONSULTOR_TENANTS: MockConsultorTenant[] = [
  { id: 'ct-001', userId: 'user-consultor-001', tenantId: 'tenant-001', createdAt: new Date(Date.now() - 90 * 86400_000).toISOString() },
  { id: 'ct-002', userId: 'user-consultor-001', tenantId: 'tenant-002', createdAt: new Date(Date.now() - 60 * 86400_000).toISOString() },
  { id: 'ct-003', userId: 'user-consultor-001', tenantId: 'tenant-003', createdAt: new Date(Date.now() - 45 * 86400_000).toISOString() },
  { id: 'ct-004', userId: 'user-consultor-001', tenantId: 'tenant-004', createdAt: new Date(Date.now() - 30 * 86400_000).toISOString() },
  { id: 'ct-005', userId: 'user-consultor-001', tenantId: 'tenant-005', createdAt: new Date(Date.now() - 20 * 86400_000).toISOString() },
  { id: 'ct-006', userId: 'user-consultor-001', tenantId: 'tenant-006', createdAt: new Date(Date.now() - 10 * 86400_000).toISOString() },
  { id: 'ct-edu-001', userId: 'user-consultor-001', tenantId: 'tenant-edu-001', createdAt: new Date(Date.now() - 5 * 86400_000).toISOString() },
  // Consultor exclusivo de educación (solo tenant-edu-001)
  { id: 'ct-edu-002', userId: 'user-consultor-edu-001', tenantId: 'tenant-edu-001', createdAt: new Date(Date.now() - 7 * 86400_000).toISOString() },
  // Consultor multi-vertical (FMCG ConGrupo + educación)
  { id: 'ct-multi-001', userId: 'user-consultor-multi-001', tenantId: 'tenant-001', createdAt: new Date(Date.now() - 7 * 86400_000).toISOString() },
  { id: 'ct-multi-002', userId: 'user-consultor-multi-001', tenantId: 'tenant-edu-001', createdAt: new Date(Date.now() - 7 * 86400_000).toISOString() },
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

// Categorías globales del sistema — derivadas del catálogo canónico
// (`shared/catalog.ts`). Todos los tenants comparten esta lista.
export const SEED_CATEGORIAS: MockCategoriaConfig[] = CATEGORIAS.map(c => ({
  nombre: c.label,
  iva: c.iva,
}))

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

// ─── Importaciones (legacy — mantenido para evitar romper store.ts) ──────────

/** @deprecated Usar MockImportacionRecord para nuevas importaciones */
export interface MockImportRecord {
  id: string
  fecha: string
  archivo: string
  totalSkus: number
  advertencias: number
  errores: string[]
  estado: 'exitoso' | 'con_advertencias' | 'fallido'
}

/** @deprecated No se usa en el nuevo flujo */
export const SEED_IMPORTACIONES: MockImportRecord[] = []

// ─── Importaciones v2 (nuevo flujo con preview + confirmación) ───────────────

export interface MockImportacionError {
  fila: number
  columna?: string
  mensaje: string
}

export interface MockImportacionRecord {
  id: string
  tenantId: string
  tipo: 'portafolio' | 'categorias' | 'competidores' | 'atributos' | 'calificaciones' | 'elasticidad' | 'canales' | 'competencia' | 'programas' | 'categorias_academicas' | 'facultades_escuelas' | 'niveles_educativos' | 'ciudades' | 'atributos_r010' | 'calificaciones_edu' | 'asignaciones_snies' | 'snies_update'
  usuarioNombre: string
  usuarioId: string
  archivo: string
  estado: 'procesando' | 'exitoso' | 'con_advertencias' | 'fallido'
  filasNuevas: number
  filasActualizadas: number
  filasOmitidas: number
  errores: MockImportacionError[]
  blobUrl: string | null
  createdAt: string
  finalizedAt?: string
}

export const SEED_IMPORTACIONES_V2: MockImportacionRecord[] = [
  {
    id: 'impv2-001',
    tenantId: 'tenant-001',
    tipo: 'portafolio',
    usuarioNombre: 'Admin Prisier',
    usuarioId: 'user-admin-001',
    archivo: 'portafolio-congrupo-abr2026.xlsx',
    estado: 'exitoso',
    filasNuevas: 218,
    filasActualizadas: 0,
    filasOmitidas: 0,
    errores: [],
    blobUrl: null,
    createdAt: new Date(Date.now() - 3 * 86400_000).toISOString(),
    finalizedAt: new Date(Date.now() - 3 * 86400_000 + 4000).toISOString(),
  },
  {
    id: 'impv2-002',
    tenantId: 'tenant-001',
    tipo: 'categorias',
    usuarioNombre: 'Admin Prisier',
    usuarioId: 'user-admin-001',
    archivo: 'categorias-congrupo-v3.xlsx',
    estado: 'con_advertencias',
    filasNuevas: 12,
    filasActualizadas: 45,
    filasOmitidas: 3,
    errores: [
      { fila: 23, mensaje: 'EAN duplicado: 7701234567890' },
      { fila: 47, columna: 'Nombre', mensaje: "Categoría 'Bebidas' no existe" },
      { fila: 51, mensaje: '% pesos suma 98, debe sumar 100' },
    ],
    blobUrl: null,
    createdAt: new Date(Date.now() - 2 * 86400_000).toISOString(),
    finalizedAt: new Date(Date.now() - 2 * 86400_000 + 3000).toISOString(),
  },
  {
    id: 'impv2-003',
    tenantId: 'tenant-001',
    tipo: 'atributos',
    usuarioNombre: 'Consultor Demo',
    usuarioId: 'user-consultor-001',
    archivo: 'atributos-congrupo-v1.xlsx',
    estado: 'fallido',
    filasNuevas: 0,
    filasActualizadas: 0,
    filasOmitidas: 7,
    errores: [
      { fila: 2, columna: 'Peso', mensaje: 'Peso fuera de rango (1.3); debe ser 0.0–1.0' },
      { fila: 3, columna: 'Peso', mensaje: 'Peso fuera de rango (1.2); debe ser 0.0–1.0' },
      { fila: 5, columna: 'Categoría', mensaje: "Categoría 'Bebidas Especiales' no existe" },
      { fila: 8, columna: 'Atributo', mensaje: 'Atributo vacío' },
      { fila: 12, columna: 'Peso', mensaje: 'Suma de pesos para Jugos = 1.05, debe ser 1.0' },
      { fila: 15, columna: 'Peso', mensaje: 'Suma de pesos para Agua = 0.95, debe ser 1.0' },
      { fila: 20, mensaje: 'Fila sin datos' },
    ],
    blobUrl: null,
    createdAt: new Date(Date.now() - 4 * 86400_000).toISOString(),
    finalizedAt: new Date(Date.now() - 4 * 86400_000 + 2000).toISOString(),
  },
  {
    id: 'impv2-004',
    tenantId: 'tenant-001',
    tipo: 'competidores',
    usuarioNombre: 'Consultor Demo',
    usuarioId: 'user-consultor-001',
    archivo: 'competidores-congrupo-mar2026.xlsx',
    estado: 'con_advertencias',
    filasNuevas: 85,
    filasActualizadas: 32,
    filasOmitidas: 4,
    errores: [
      { fila: 11, columna: 'EAN Propio', mensaje: 'EAN 7700000099999 no existe en portafolio. Fila ignorada' },
      { fila: 24, columna: 'EAN Propio', mensaje: 'EAN 7700000088888 no existe en portafolio. Fila ignorada' },
      { fila: 67, columna: 'Retailer', mensaje: 'Retailer vacío. Fila ignorada' },
      { fila: 98, columna: 'EAN Competidor', mensaje: 'EAN competidor inválido. Fila ignorada' },
    ],
    blobUrl: null,
    createdAt: new Date(Date.now() - 7 * 86400_000).toISOString(),
    finalizedAt: new Date(Date.now() - 7 * 86400_000 + 5000).toISOString(),
  },
  {
    id: 'impv2-005',
    tenantId: 'tenant-001',
    tipo: 'calificaciones',
    usuarioNombre: 'Admin Prisier',
    usuarioId: 'user-admin-001',
    archivo: 'calificaciones-congrupo-v2.xlsx',
    estado: 'exitoso',
    filasNuevas: 142,
    filasActualizadas: 28,
    filasOmitidas: 0,
    errores: [],
    blobUrl: null,
    createdAt: new Date(Date.now() - 10 * 86400_000).toISOString(),
    finalizedAt: new Date(Date.now() - 10 * 86400_000 + 3500).toISOString(),
  },
  {
    id: 'impv2-006',
    tenantId: 'tenant-001',
    tipo: 'elasticidad',
    usuarioNombre: 'Consultor Demo',
    usuarioId: 'user-consultor-001',
    archivo: 'elasticidad-congrupo-v1.xlsx',
    estado: 'con_advertencias',
    filasNuevas: 25,
    filasActualizadas: 0,
    filasOmitidas: 2,
    errores: [
      { fila: 14, columna: 'Coeficiente Elasticidad', mensaje: 'Valor 0.5 inválido: ε debe ser ≤ 0' },
      { fila: 22, columna: 'Coeficiente Elasticidad', mensaje: 'Valor 1.2 inválido: ε debe ser ≤ 0' },
    ],
    blobUrl: null,
    createdAt: new Date(Date.now() - 14 * 86400_000).toISOString(),
    finalizedAt: new Date(Date.now() - 14 * 86400_000 + 2000).toISOString(),
  },
  {
    id: 'impv2-007',
    tenantId: 'tenant-001',
    tipo: 'canales',
    usuarioNombre: 'Admin Prisier',
    usuarioId: 'user-admin-001',
    archivo: 'canales-congrupo-feb2026.xlsx',
    estado: 'exitoso',
    filasNuevas: 18,
    filasActualizadas: 6,
    filasOmitidas: 0,
    errores: [],
    blobUrl: null,
    createdAt: new Date(Date.now() - 21 * 86400_000).toISOString(),
    finalizedAt: new Date(Date.now() - 21 * 86400_000 + 1500).toISOString(),
  },
  {
    id: 'impv2-008',
    tenantId: 'tenant-001',
    tipo: 'portafolio',
    usuarioNombre: 'Admin Prisier',
    usuarioId: 'user-admin-001',
    archivo: 'portafolio-congrupo-mar2026.xlsx',
    estado: 'con_advertencias',
    filasNuevas: 8,
    filasActualizadas: 195,
    filasOmitidas: 1,
    errores: [
      { fila: 77, columna: 'Peso Profit Pool', mensaje: 'Suma de pesos = 1.005, debe ser 1.0. Fila omitida.' },
    ],
    blobUrl: null,
    createdAt: new Date(Date.now() - 28 * 86400_000).toISOString(),
    finalizedAt: new Date(Date.now() - 28 * 86400_000 + 6000).toISOString(),
  },
  {
    id: 'impv2-009',
    tenantId: 'tenant-001',
    tipo: 'competencia',
    usuarioNombre: 'Admin Prisier',
    usuarioId: 'user-admin-001',
    archivo: 'competencia-skus-congrupo-abr2026.xlsx',
    estado: 'exitoso',
    filasNuevas: 34,
    filasActualizadas: 0,
    filasOmitidas: 0,
    errores: [],
    blobUrl: null,
    createdAt: new Date(Date.now() - 1 * 86400_000).toISOString(),
    finalizedAt: new Date(Date.now() - 1 * 86400_000 + 2000).toISOString(),
  },
  {
    id: 'impv2-010',
    tenantId: 'tenant-001',
    tipo: 'competencia',
    usuarioNombre: 'Consultor Demo',
    usuarioId: 'user-consultor-001',
    archivo: 'competencia-skus-congrupo-mar2026.xlsx',
    estado: 'con_advertencias',
    filasNuevas: 28,
    filasActualizadas: 5,
    filasOmitidas: 2,
    errores: [
      { fila: 9,  columna: 'EAN',            mensaje: 'EAN duplicado: 7750232000156. Fila omitida' },
      { fila: 17, columna: 'Categoría',      mensaje: "Categoría 'Isotónicas' no existe en el sistema. Fila omitida" },
    ],
    blobUrl: null,
    createdAt: new Date(Date.now() - 35 * 86400_000).toISOString(),
    finalizedAt: new Date(Date.now() - 35 * 86400_000 + 3000).toISOString(),
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

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Seed Vertical Educación (tenant-edu-001) ─────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Interfaces propias del vertical educación ────────────────────────────────

export interface MockProgramaAcademico {
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

export interface MockSnies {
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

export interface MockAsignacionSnies {
  programaId: string
  sniesId: string
}

export interface MockFacultadEscuela {
  nombre: string
}

export interface MockNivelEducativo {
  nombre: string
}

export interface MockCiudadEdu {
  nombre: string
}

// ─── Seed Facultades/Escuelas (por tenant) ────────────────────────────────────

export const SEED_FACULTADES_ESCUELAS: MockFacultadEscuela[] = [
  { nombre: 'Ingeniería' },
  { nombre: 'Administración' },
  { nombre: 'Salud' },
  { nombre: 'Educación' },
]

// ─── Seed Niveles Educativos (POR TENANT, 2026-05-06 reemplaza P2 global) ────

export const SEED_NIVELES_EDUCATIVOS: MockNivelEducativo[] = [
  { nombre: 'Pregrado' },
  { nombre: 'Especialización' },
  { nombre: 'Maestría' },
  { nombre: 'Doctorado' },
]

// ─── Seed Ciudades Educación (por tenant) ────────────────────────────────────

export const SEED_CIUDADES_EDU: MockCiudadEdu[] = [
  { nombre: 'Bogotá' },
  { nombre: 'Medellín' },
  { nombre: 'Cali' },
]

// ─── Seed Programas Propios (tenant-edu-001) ──────────────────────────────────

export const SEED_PROGRAMAS_ACADEMICOS: MockProgramaAcademico[] = [
  // Facultad de Ingeniería
  { id: 'prog-001', codigo: 'UCE-001', nombre: 'Ingeniería de Sistemas', facultad: 'Ingeniería', nivel: 'Pregrado',       ciudad: 'Bogotá',    precioActual: 12500000, estudiantesBase: 280, tenantId: 'tenant-edu-001' },
  { id: 'prog-002', codigo: 'UCE-002', nombre: 'Ingeniería Industrial',  facultad: 'Ingeniería', nivel: 'Pregrado',       ciudad: 'Bogotá',    precioActual: 11800000, estudiantesBase: 220, tenantId: 'tenant-edu-001' },
  { id: 'prog-003', codigo: 'UCE-003', nombre: 'Ingeniería Civil',        facultad: 'Ingeniería', nivel: 'Pregrado',       ciudad: 'Medellín',  precioActual: 11200000, estudiantesBase: 190, tenantId: 'tenant-edu-001' },
  { id: 'prog-004', codigo: 'UCE-004', nombre: 'Maestría en IA',          facultad: 'Ingeniería', nivel: 'Maestría',       ciudad: 'Bogotá',    precioActual: 22000000, estudiantesBase:  80, tenantId: 'tenant-edu-001' },
  { id: 'prog-005', codigo: 'UCE-005', nombre: 'Maestría en Software',    facultad: 'Ingeniería', nivel: 'Maestría',       ciudad: 'Medellín',  precioActual: 21000000, estudiantesBase:  65, tenantId: 'tenant-edu-001' },
  // Facultad de Administración
  { id: 'prog-006', codigo: 'UCE-006', nombre: 'Administración de Empresas', facultad: 'Administración', nivel: 'Pregrado', ciudad: 'Bogotá',  precioActual: 10500000, estudiantesBase: 300, tenantId: 'tenant-edu-001' },
  { id: 'prog-007', codigo: 'UCE-007', nombre: 'Contaduría Pública',     facultad: 'Administración', nivel: 'Pregrado',    ciudad: 'Cali',      precioActual:  9800000, estudiantesBase: 250, tenantId: 'tenant-edu-001' },
  { id: 'prog-008', codigo: 'UCE-008', nombre: 'Economía',               facultad: 'Administración', nivel: 'Pregrado',    ciudad: 'Bogotá',    precioActual: 10200000, estudiantesBase: 180, tenantId: 'tenant-edu-001' },
  { id: 'prog-009', codigo: 'UCE-009', nombre: 'MBA',                    facultad: 'Administración', nivel: 'Maestría',    ciudad: 'Bogotá',    precioActual: 28000000, estudiantesBase: 120, tenantId: 'tenant-edu-001' },
  { id: 'prog-010', codigo: 'UCE-010', nombre: 'Maestría en Marketing',  facultad: 'Administración', nivel: 'Maestría',    ciudad: 'Medellín',  precioActual: 24000000, estudiantesBase:  90, tenantId: 'tenant-edu-001' },
  // Facultad de Salud
  { id: 'prog-011', codigo: 'UCE-011', nombre: 'Enfermería',             facultad: 'Salud', nivel: 'Pregrado',            ciudad: 'Bogotá',    precioActual: 13500000, estudiantesBase: 200, tenantId: 'tenant-edu-001' },
  { id: 'prog-012', codigo: 'UCE-012', nombre: 'Nutrición y Dietética',  facultad: 'Salud', nivel: 'Pregrado',            ciudad: 'Cali',      precioActual: 12000000, estudiantesBase: 150, tenantId: 'tenant-edu-001' },
  { id: 'prog-013', codigo: 'UCE-013', nombre: 'Fisioterapia',           facultad: 'Salud', nivel: 'Pregrado',            ciudad: 'Medellín',  precioActual: 13000000, estudiantesBase: 170, tenantId: 'tenant-edu-001' },
  { id: 'prog-014', codigo: 'UCE-014', nombre: 'Especialización en Gestión Hospitalaria', facultad: 'Salud', nivel: 'Especialización', ciudad: 'Bogotá', precioActual: 18000000, estudiantesBase:  60, tenantId: 'tenant-edu-001' },
  // Facultad de Educación
  { id: 'prog-015', codigo: 'UCE-015', nombre: 'Licenciatura en Matemáticas', facultad: 'Educación', nivel: 'Pregrado',  ciudad: 'Bogotá',    precioActual:  8500000, estudiantesBase: 130, tenantId: 'tenant-edu-001' },
  { id: 'prog-016', codigo: 'UCE-016', nombre: 'Licenciatura en Inglés',      facultad: 'Educación', nivel: 'Pregrado',  ciudad: 'Medellín',  precioActual:  8200000, estudiantesBase: 110, tenantId: 'tenant-edu-001' },
  { id: 'prog-017', codigo: 'UCE-017', nombre: 'Licenciatura en Biología',    facultad: 'Educación', nivel: 'Pregrado',  ciudad: 'Cali',      precioActual:  8000000, estudiantesBase: 100, tenantId: 'tenant-edu-001' },
  // Caso especial: sin competidores SNIES asignados
  { id: 'prog-018', codigo: 'UCE-018', nombre: 'Doctorado en Educación',       facultad: 'Educación', nivel: 'Doctorado', ciudad: 'Bogotá',   precioActual: 25000000, estudiantesBase:  30, tenantId: 'tenant-edu-001' },
]

// ─── Seed Base SNIES Global (compartida) ──────────────────────────────────────

export const SEED_SNIES_GLOBAL: MockSnies[] = [
  { id: 'snies-001', codigoSnies: '10101', programa: 'Ingeniería de Sistemas',    universidad: 'Universidad de Los Andes',     ciudad: 'Bogotá',   nivel: 'Pregrado',      modalidad: 'Presencial', precioActual: 23000000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-002', codigoSnies: '10102', programa: 'Ingeniería de Sistemas',    universidad: 'Universidad Javeriana',        ciudad: 'Bogotá',   nivel: 'Pregrado',      modalidad: 'Presencial', precioActual: 21500000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-003', codigoSnies: '10103', programa: 'Ingeniería Industrial',     universidad: 'Universidad Nacional',         ciudad: 'Bogotá',   nivel: 'Pregrado',      modalidad: 'Presencial', precioActual:  5200000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-004', codigoSnies: '10104', programa: 'Ingeniería Civil',          universidad: 'Universidad EAFIT',            ciudad: 'Medellín', nivel: 'Pregrado',      modalidad: 'Presencial', precioActual: 18500000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-005', codigoSnies: '10105', programa: 'Ingeniería de Sistemas',    universidad: 'Universidad del Rosario',      ciudad: 'Bogotá',   nivel: 'Pregrado',      modalidad: 'Presencial', precioActual: 18000000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-006', codigoSnies: '10201', programa: 'Maestría en IA',            universidad: 'Universidad de Los Andes',     ciudad: 'Bogotá',   nivel: 'Maestría',      modalidad: 'Presencial', precioActual: 35000000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-007', codigoSnies: '10202', programa: 'Maestría en Software',      universidad: 'Universidad Javeriana',        ciudad: 'Bogotá',   nivel: 'Maestría',      modalidad: 'Presencial', precioActual: 30000000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-008', codigoSnies: '10203', programa: 'Maestría en Ingeniería',    universidad: 'Universidad EAFIT',            ciudad: 'Medellín', nivel: 'Maestría',      modalidad: 'Presencial', precioActual: 28000000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-009', codigoSnies: '20101', programa: 'Administración de Empresas',universidad: 'Universidad de Los Andes',     ciudad: 'Bogotá',   nivel: 'Pregrado',      modalidad: 'Presencial', precioActual: 22000000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-010', codigoSnies: '20102', programa: 'Administración de Empresas',universidad: 'Universidad Externado',        ciudad: 'Bogotá',   nivel: 'Pregrado',      modalidad: 'Presencial', precioActual: 15000000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-011', codigoSnies: '20103', programa: 'Contaduría Pública',        universidad: 'Universidad Nacional',         ciudad: 'Bogotá',   nivel: 'Pregrado',      modalidad: 'Presencial', precioActual:  5000000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-012', codigoSnies: '20104', programa: 'Economía',                  universidad: 'Universidad del Rosario',      ciudad: 'Bogotá',   nivel: 'Pregrado',      modalidad: 'Presencial', precioActual: 17500000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-013', codigoSnies: '20201', programa: 'MBA',                       universidad: 'Universidad de Los Andes',     ciudad: 'Bogotá',   nivel: 'Maestría',      modalidad: 'Presencial', precioActual: 45000000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-014', codigoSnies: '20202', programa: 'MBA',                       universidad: 'Universidad EAFIT',            ciudad: 'Medellín', nivel: 'Maestría',      modalidad: 'Presencial', precioActual: 38000000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-015', codigoSnies: '20203', programa: 'Maestría en Marketing',     universidad: 'Universidad Externado',        ciudad: 'Bogotá',   nivel: 'Maestría',      modalidad: 'Presencial', precioActual: 28000000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-016', codigoSnies: '30101', programa: 'Enfermería',                universidad: 'Universidad Nacional',         ciudad: 'Bogotá',   nivel: 'Pregrado',      modalidad: 'Presencial', precioActual:  5500000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-017', codigoSnies: '30102', programa: 'Enfermería',                universidad: 'Universidad Javeriana',        ciudad: 'Bogotá',   nivel: 'Pregrado',      modalidad: 'Presencial', precioActual: 20000000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-018', codigoSnies: '30103', programa: 'Nutrición y Dietética',     universidad: 'Universidad de La Sabana',     ciudad: 'Bogotá',   nivel: 'Pregrado',      modalidad: 'Presencial', precioActual: 16500000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-019', codigoSnies: '30104', programa: 'Fisioterapia',              universidad: 'Universidad CES',              ciudad: 'Medellín', nivel: 'Pregrado',      modalidad: 'Presencial', precioActual: 15000000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-020', codigoSnies: '30201', programa: 'Especialización Gestión Hospitalaria', universidad: 'Universidad Javeriana', ciudad: 'Bogotá', nivel: 'Especialización', modalidad: 'Presencial', precioActual: 22000000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-021', codigoSnies: '40101', programa: 'Licenciatura en Matemáticas', universidad: 'Universidad Pedagógica',    ciudad: 'Bogotá',   nivel: 'Pregrado',      modalidad: 'Presencial', precioActual:  6000000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-022', codigoSnies: '40102', programa: 'Licenciatura en Inglés',    universidad: 'Universidad Libre',           ciudad: 'Bogotá',   nivel: 'Pregrado',      modalidad: 'Presencial', precioActual:  7500000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-023', codigoSnies: '40103', programa: 'Licenciatura en Inglés',    universidad: 'Universidad de Antioquia',    ciudad: 'Medellín', nivel: 'Pregrado',      modalidad: 'Presencial', precioActual:  5200000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-024', codigoSnies: '10106', programa: 'Ingeniería Industrial',     universidad: 'Universidad de La Sabana',    ciudad: 'Bogotá',   nivel: 'Pregrado',      modalidad: 'Presencial', precioActual: 19000000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-025', codigoSnies: '10107', programa: 'Ingeniería Civil',          universidad: 'Universidad del Norte',        ciudad: 'Barranquilla', nivel: 'Pregrado',  modalidad: 'Presencial', precioActual: 16000000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-026', codigoSnies: '20105', programa: 'Administración de Empresas',universidad: 'Universidad ICESI',           ciudad: 'Cali',     nivel: 'Pregrado',      modalidad: 'Presencial', precioActual: 18000000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-027', codigoSnies: '20106', programa: 'Contaduría Pública',        universidad: 'Universidad Libre',           ciudad: 'Bogotá',   nivel: 'Pregrado',      modalidad: 'Presencial', precioActual:  8500000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-028', codigoSnies: '20107', programa: 'Contaduría Pública',        universidad: 'Universidad del Valle',       ciudad: 'Cali',     nivel: 'Pregrado',      modalidad: 'Presencial', precioActual:  5100000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-029', codigoSnies: '10108', programa: 'Ingeniería de Sistemas',    universidad: 'Universidad Distrital',       ciudad: 'Bogotá',   nivel: 'Pregrado',      modalidad: 'Presencial', precioActual:  4800000, ultimaActualizacion: '2026-02-01' },
  { id: 'snies-030', codigoSnies: '30105', programa: 'Enfermería',                universidad: 'Universidad del Valle',       ciudad: 'Cali',     nivel: 'Pregrado',      modalidad: 'Presencial', precioActual:  5000000, ultimaActualizacion: '2026-02-01' },
]

// ─── Seed Asignaciones SNIES (programa propio → SNIES competidores) ───────────

export const SEED_ASIGNACIONES_SNIES: MockAsignacionSnies[] = [
  // Ingeniería de Sistemas (prog-001)
  { programaId: 'prog-001', sniesId: 'snies-001' },
  { programaId: 'prog-001', sniesId: 'snies-002' },
  { programaId: 'prog-001', sniesId: 'snies-005' },
  { programaId: 'prog-001', sniesId: 'snies-029' },
  // Ingeniería Industrial (prog-002)
  { programaId: 'prog-002', sniesId: 'snies-003' },
  { programaId: 'prog-002', sniesId: 'snies-024' },
  // Ingeniería Civil (prog-003)
  { programaId: 'prog-003', sniesId: 'snies-004' },
  { programaId: 'prog-003', sniesId: 'snies-025' },
  // Maestría en IA (prog-004)
  { programaId: 'prog-004', sniesId: 'snies-006' },
  { programaId: 'prog-004', sniesId: 'snies-007' },
  { programaId: 'prog-004', sniesId: 'snies-008' },
  // Maestría en Software (prog-005)
  { programaId: 'prog-005', sniesId: 'snies-007' },
  { programaId: 'prog-005', sniesId: 'snies-008' },
  // Administración de Empresas (prog-006)
  { programaId: 'prog-006', sniesId: 'snies-009' },
  { programaId: 'prog-006', sniesId: 'snies-010' },
  { programaId: 'prog-006', sniesId: 'snies-026' },
  // Contaduría (prog-007)
  { programaId: 'prog-007', sniesId: 'snies-011' },
  { programaId: 'prog-007', sniesId: 'snies-027' },
  { programaId: 'prog-007', sniesId: 'snies-028' },
  // Economía (prog-008)
  { programaId: 'prog-008', sniesId: 'snies-012' },
  // MBA (prog-009)
  { programaId: 'prog-009', sniesId: 'snies-013' },
  { programaId: 'prog-009', sniesId: 'snies-014' },
  // Maestría Marketing (prog-010)
  { programaId: 'prog-010', sniesId: 'snies-015' },
  // Enfermería (prog-011)
  { programaId: 'prog-011', sniesId: 'snies-016' },
  { programaId: 'prog-011', sniesId: 'snies-017' },
  { programaId: 'prog-011', sniesId: 'snies-030' },
  // Nutrición (prog-012)
  { programaId: 'prog-012', sniesId: 'snies-018' },
  // Fisioterapia (prog-013)
  { programaId: 'prog-013', sniesId: 'snies-019' },
  // Especialización Salud (prog-014)
  { programaId: 'prog-014', sniesId: 'snies-020' },
  // Licenciatura Matemáticas (prog-015)
  { programaId: 'prog-015', sniesId: 'snies-021' },
  // Licenciatura Inglés (prog-016)
  { programaId: 'prog-016', sniesId: 'snies-022' },
  { programaId: 'prog-016', sniesId: 'snies-023' },
  // Licenciatura Biología (prog-017)
  { programaId: 'prog-017', sniesId: 'snies-021' },
  // prog-018 (Doctorado): sin asignaciones SNIES — caso especial
]

// ─── Seed Atributos R-010 por categoría ──────────────────────────────────────

export const SEED_ATRIBUTOS_R010: MockCategoriaAtributos[] = [
  {
    categoria: 'Pregrado Ingeniería',
    atributos: [
      { nombre: 'Calidad Académica',    peso: 0.3000000000, orden: 1, calificacion: 4.2 },
      { nombre: 'Empleabilidad',        peso: 0.2500000000, orden: 2, calificacion: 4.0 },
      { nombre: 'Modalidad',            peso: 0.2000000000, orden: 3, calificacion: 3.8 },
      { nombre: 'Internacionalización', peso: 0.1500000000, orden: 4, calificacion: 3.5 },
      { nombre: 'Investigación',        peso: 0.1000000000, orden: 5, calificacion: 3.9 },
    ],
  },
  {
    categoria: 'Pregrado Administración',
    atributos: [
      { nombre: 'Calidad Académica',    peso: 0.3000000000, orden: 1, calificacion: 4.0 },
      { nombre: 'Empleabilidad',        peso: 0.3000000000, orden: 2, calificacion: 4.2 },
      { nombre: 'Modalidad',            peso: 0.2000000000, orden: 3, calificacion: 3.7 },
      { nombre: 'Acreditación',         peso: 0.1000000000, orden: 4, calificacion: 3.5 },
      { nombre: 'Convenios',            peso: 0.1000000000, orden: 5, calificacion: 3.8 },
    ],
  },
  {
    categoria: 'Pregrado Salud',
    atributos: [
      { nombre: 'Calidad Académica',    peso: 0.3500000000, orden: 1, calificacion: 4.3 },
      { nombre: 'Clínicas Afiliadas',   peso: 0.2500000000, orden: 2, calificacion: 4.0 },
      { nombre: 'Empleabilidad',        peso: 0.2000000000, orden: 3, calificacion: 4.1 },
      { nombre: 'Investigación',        peso: 0.1500000000, orden: 4, calificacion: 3.8 },
      { nombre: 'Acreditación',         peso: 0.0500000000, orden: 5, calificacion: 3.5 },
    ],
  },
  {
    categoria: 'Pregrado Educación',
    atributos: [
      { nombre: 'Calidad Académica',    peso: 0.3000000000, orden: 1, calificacion: 3.9 },
      { nombre: 'Empleabilidad',        peso: 0.2500000000, orden: 2, calificacion: 3.7 },
      { nombre: 'Modalidad',            peso: 0.2000000000, orden: 3, calificacion: 4.0 },
      { nombre: 'Convenios',            peso: 0.1500000000, orden: 4, calificacion: 3.5 },
      { nombre: 'Investigación',        peso: 0.1000000000, orden: 5, calificacion: 3.6 },
    ],
  },
  {
    categoria: 'Maestría Ingeniería',
    atributos: [
      { nombre: 'Calidad Académica',    peso: 0.3500000000, orden: 1, calificacion: 4.4 },
      { nombre: 'Investigación',        peso: 0.3000000000, orden: 2, calificacion: 4.2 },
      { nombre: 'Internacionalización', peso: 0.2000000000, orden: 3, calificacion: 3.8 },
      { nombre: 'Empleabilidad',        peso: 0.1000000000, orden: 4, calificacion: 4.0 },
      { nombre: 'Doble Titulación',     peso: 0.0500000000, orden: 5, calificacion: 3.2 },
    ],
  },
  {
    categoria: 'Maestría Administración',
    atributos: [
      { nombre: 'Calidad Académica',    peso: 0.3000000000, orden: 1, calificacion: 4.3 },
      { nombre: 'Empleabilidad',        peso: 0.3000000000, orden: 2, calificacion: 4.5 },
      { nombre: 'Red Alumni',           peso: 0.2000000000, orden: 3, calificacion: 4.0 },
      { nombre: 'Internacionalización', peso: 0.1000000000, orden: 4, calificacion: 3.7 },
      { nombre: 'Doble Titulación',     peso: 0.1000000000, orden: 5, calificacion: 3.5 },
    ],
  },
  {
    categoria: 'Especialización Salud',
    atributos: [
      { nombre: 'Calidad Académica',    peso: 0.4000000000, orden: 1, calificacion: 4.2 },
      { nombre: 'Clínicas Afiliadas',   peso: 0.3000000000, orden: 2, calificacion: 4.0 },
      { nombre: 'Docentes Especialistas',peso: 0.2000000000,orden: 3, calificacion: 4.1 },
      { nombre: 'Acreditación',         peso: 0.0500000000, orden: 4, calificacion: 3.8 },
      { nombre: 'Convenios',            peso: 0.0500000000, orden: 5, calificacion: 3.5 },
    ],
  },
  {
    categoria: 'Doctorado Educación',
    atributos: [
      { nombre: 'Investigación',        peso: 0.4000000000, orden: 1, calificacion: 4.3 },
      { nombre: 'Calidad Académica',    peso: 0.3000000000, orden: 2, calificacion: 4.2 },
      { nombre: 'Publicaciones',        peso: 0.1500000000, orden: 3, calificacion: 4.0 },
      { nombre: 'Internacionalización', peso: 0.1000000000, orden: 4, calificacion: 3.6 },
      { nombre: 'Financiación',         peso: 0.0500000000, orden: 5, calificacion: 3.8 },
    ],
  },
]

// ─── Seed Atributos R-010 por par (Facultad/Escuela × Ciudad) — edu P3 ────────
// Estructura: clave = `${facultad}|${ciudad}`, valor = atributos con peso
// Los nombres son EAFIT-canónicos: Empalme, Internacionalización, Modalidad, Homologación, Puntaje Universidad

export interface MockAtributoR010Par {
  nombre: string
  peso: number
  orden: number
}

export type MockAtributosR010Par = Record<string, MockAtributoR010Par[]>  // `${facultad}|${ciudad}` → atributos

export const SEED_ATRIBUTOS_R010_PAR: MockAtributosR010Par = {
  'Ingeniería|Bogotá': [
    { nombre: 'Empalme',             peso: 0.3000000000, orden: 1 },
    { nombre: 'Internacionalización', peso: 0.2500000000, orden: 2 },
    { nombre: 'Modalidad',           peso: 0.2000000000, orden: 3 },
    { nombre: 'Homologación',        peso: 0.1500000000, orden: 4 },
    { nombre: 'Puntaje Universidad', peso: 0.1000000000, orden: 5 },
  ],
  'Ingeniería|Medellín': [
    { nombre: 'Empalme',             peso: 0.2500000000, orden: 1 },
    { nombre: 'Internacionalización', peso: 0.3000000000, orden: 2 },
    { nombre: 'Modalidad',           peso: 0.2000000000, orden: 3 },
    { nombre: 'Homologación',        peso: 0.1500000000, orden: 4 },
    { nombre: 'Puntaje Universidad', peso: 0.1000000000, orden: 5 },
  ],
  'Administración|Bogotá': [
    { nombre: 'Empalme',             peso: 0.2000000000, orden: 1 },
    { nombre: 'Internacionalización', peso: 0.2000000000, orden: 2 },
    { nombre: 'Modalidad',           peso: 0.3000000000, orden: 3 },
    { nombre: 'Homologación',        peso: 0.1500000000, orden: 4 },
    { nombre: 'Puntaje Universidad', peso: 0.1500000000, orden: 5 },
  ],
  'Salud|Bogotá': [
    { nombre: 'Empalme',             peso: 0.3500000000, orden: 1 },
    { nombre: 'Internacionalización', peso: 0.1500000000, orden: 2 },
    { nombre: 'Modalidad',           peso: 0.1500000000, orden: 3 },
    { nombre: 'Homologación',        peso: 0.2000000000, orden: 4 },
    { nombre: 'Puntaje Universidad', peso: 0.1500000000, orden: 5 },
  ],
}

// ─── Seed Calificaciones R-010 (programa × atributo) ─────────────────────────

export interface MockCalificacionEdu {
  programaId: string
  atributo: string
  calificacionPropia: number
  calificacionesSnies: Record<string, number>  // sniesId → calificacion
}

function buildCalificacionesEdu(): MockCalificacionEdu[] {
  const out: MockCalificacionEdu[] = []
  for (const prog of SEED_PROGRAMAS_ACADEMICOS) {
    // Tras P1 2026-05-05, `programa` ya no tiene `categoria`. Reconstruimos la clave
    // legacy desde nivel+facultad para emparejar con SEED_ATRIBUTOS_R010 (formato
    // antiguo): "Pregrado Ingeniería", "Maestría Administración", etc.
    const catKey = `${prog.nivel} ${prog.facultad}`
    const catAttrs = SEED_ATRIBUTOS_R010.find(c => c.categoria === catKey)
    if (!catAttrs) continue
    const sniesAsignados = SEED_ASIGNACIONES_SNIES.filter(a => a.programaId === prog.id).map(a => a.sniesId)
    for (const atr of catAttrs.atributos) {
      const califsSnies: Record<string, number> = {}
      for (const sniesId of sniesAsignados) {
        califsSnies[sniesId] = Math.round((3 + Math.random() * 1.5) * 100) / 100
      }
      out.push({
        programaId: prog.id,
        atributo: atr.nombre,
        calificacionPropia: atr.calificacion ?? Math.round((3.5 + Math.random() * 1.2) * 100) / 100,
        calificacionesSnies: califsSnies,
      })
    }
  }
  return out
}

export const SEED_CALIFICACIONES_EDU: MockCalificacionEdu[] = buildCalificacionesEdu()

// ─── Seed Historial Importaciones Educación ─────────────────────────────────

export const SEED_IMPORTACIONES_EDU: MockImportacionRecord[] = [
  {
    id: 'impedu-001',
    tenantId: 'tenant-edu-001',
    tipo: 'programas',
    usuarioNombre: 'Admin Prisier',
    usuarioId: 'user-admin-001',
    archivo: 'programas-uce-2026.xlsx',
    estado: 'exitoso',
    filasNuevas: 18,
    filasActualizadas: 0,
    filasOmitidas: 0,
    errores: [],
    blobUrl: null,
    createdAt: new Date(Date.now() - 5 * 86400_000).toISOString(),
    finalizedAt: new Date(Date.now() - 5 * 86400_000 + 3500).toISOString(),
  },
  {
    id: 'impedu-002',
    tenantId: 'tenant-edu-001',
    tipo: 'asignaciones_snies',
    usuarioNombre: 'Consultor Educación',
    usuarioId: 'user-consultor-edu-001',
    archivo: 'asignaciones-snies-mar2026.xlsx',
    estado: 'con_advertencias',
    filasNuevas: 142,
    filasActualizadas: 8,
    filasOmitidas: 5,
    errores: [
      { fila: 14, columna: 'Código SNIES', mensaje: 'Código 9999 no existe en la base SNIES global; fila omitida.' },
      { fila: 27, columna: 'Código Programa', mensaje: 'UCE-099 no está en el portafolio del tenant; fila omitida.' },
      { fila: 53, mensaje: 'Asignación duplicada (UCE-005, 10202): se conservó la primera ocurrencia.' },
      { fila: 88, columna: 'Código SNIES', mensaje: 'Código 0000 no existe en la base SNIES global; fila omitida.' },
      { fila: 101, columna: 'Código SNIES', mensaje: 'Código 1234 no existe en la base SNIES global; fila omitida.' },
    ],
    blobUrl: null,
    createdAt: new Date(Date.now() - 3 * 86400_000).toISOString(),
    finalizedAt: new Date(Date.now() - 3 * 86400_000 + 4200).toISOString(),
  },
  {
    id: 'impedu-003',
    tenantId: 'tenant-edu-001',
    tipo: 'atributos_r010',
    usuarioNombre: 'Consultor Educación',
    usuarioId: 'user-consultor-edu-001',
    archivo: 'atributos-pares-uce.xlsx',
    estado: 'fallido',
    filasNuevas: 0,
    filasActualizadas: 0,
    filasOmitidas: 12,
    errores: [
      { fila: 2, columna: 'Peso (%)', mensaje: 'Suma de pesos del par (Ingeniería, Bogotá) = 95; debe ser 100.' },
      { fila: 7, columna: 'Facultad/Escuela', mensaje: 'Valor "Ingenierías" no existe en el catálogo del tenant. ¿Quisiste decir "Ingeniería"?' },
      { fila: 9, columna: 'Ciudad', mensaje: 'Valor "Bogota" no existe en el catálogo del tenant (esperado "Bogotá").' },
    ],
    blobUrl: null,
    createdAt: new Date(Date.now() - 1 * 86400_000).toISOString(),
    finalizedAt: new Date(Date.now() - 1 * 86400_000 + 1500).toISOString(),
  },
  {
    id: 'impedu-004',
    tenantId: 'tenant-edu-001',
    tipo: 'calificaciones_edu',
    usuarioNombre: 'Cliente Editor UCE',
    usuarioId: 'user-edu-001',
    archivo: 'calificaciones-uce-may2026.xlsx',
    estado: 'exitoso',
    filasNuevas: 0,
    filasActualizadas: 240,
    filasOmitidas: 0,
    errores: [],
    blobUrl: null,
    createdAt: new Date(Date.now() - 6 * 3600_000).toISOString(),
    finalizedAt: new Date(Date.now() - 6 * 3600_000 + 2800).toISOString(),
  },
]

// ─── Flag global lock SNIES update ───────────────────────────────────────────
// No es seed — vive en el store, inicializado en false.

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

// ─── Seed Matriz de Preferencia EAFIT (P5/P12 — tenant-edu-001) ──────────────
// Subset de 10 encuestados representativos del CSV administracion.csv de EAFIT.
// Columnas (25 total):
//   [0]  Opt-in
//   [1]  EAFIT (marca propia tenant)
//   [2]  EAN
//   [3]  Universidad Javeriana
//   [4]  Universidad de los Andes
//   [5]  Universidad de Medellín
//   [6]  UPB
//   [7]  CEIPA
//   [8]  Internacionalización · Sin opciones internacionales
//   [9]  Internacionalización · Con intercambio / pasantía en el exterior
//   [10] Internacionalización · Con profesores internacionales
//   [11] Internacionalización · Con doble titulación internacional
//   [12] Homologación · Sin homologación
//   [13] Homologación · Con admisión y homologación automáticas
//   [14] Modalidad · Presencial
//   [15] Modalidad · Virtual asincrónico
//   [16] Modalidad · Híbrida (Presencial + Virtual)
//   [17] $ 9.900.000
//   [18] $ 11.900.000
//   [19] $ 13.900.000
//   [20] $ 15.900.000
//   [21] $ 17.900.000
//   [22] $ 19.900.000
//   [23] $ 23.900.000
//   [24] $ 29.900.000
// Coeficientes generados con PRNG mulberry32(42) — NO Math.random()
// Rango marcas: propia +2..+5, competidores -5..-1
// Rango atributos: 0..+4
// Rango precios: decreciente, -1..-6

export interface MockMatrizPreferencia {
  id: string
  tenantId: string
  tenantNombre: string
  facultadEscuela: string
  nivelEducativo: string
  ciudad: string
  fechaSubida: string
  nombreArchivo: string
  columnas: Array<{
    kind: 'optin' | 'marca' | 'atributo' | 'precio'
    columnIndex: number
    nombre?: string
    esPropiaTenant?: boolean
    atributoNombre?: string
    nivelNombre?: string
    precio?: number
  }>
  encuestados: number[][]
  marcas: string[]
  marcaPropia: string
  atributos: Array<{ nombre: string; niveles: string[] }>
  precios: number[]
}

export const SEED_MATRIZ_EAFIT: MockMatrizPreferencia = {
  id: 'mp-seed-001',
  tenantId: 'tenant-edu-001',
  tenantNombre: 'EAFIT',
  facultadEscuela: 'Administración',
  nivelEducativo: 'Maestría',
  ciudad: 'Medellín',
  fechaSubida: '2026-04-15T10:30:00.000Z',
  nombreArchivo: 'administracion.csv',
  marcas: ['EAFIT', 'EAN', 'Universidad Javeriana', 'Universidad de los Andes', 'Universidad de Medellín', 'UPB', 'CEIPA'],
  marcaPropia: 'EAFIT',
  atributos: [
    { nombre: 'Internacionalización', niveles: ['Sin opciones internacionales', 'Con intercambio / pasantía en el exterior', 'Con profesores internacionales', 'Con doble titulación internacional'] },
    { nombre: 'Homologación', niveles: ['Sin homologación', 'Con admisión y homologación automáticas'] },
    { nombre: 'Modalidad', niveles: ['Presencial', 'Virtual asincrónico', 'Híbrida (Presencial + Virtual)'] },
  ],
  precios: [9_900_000, 11_900_000, 13_900_000, 15_900_000, 17_900_000, 19_900_000, 23_900_000, 29_900_000],
  columnas: [
    { kind: 'optin',    columnIndex: 0 },
    { kind: 'marca',    columnIndex: 1,  nombre: 'EAFIT',                      esPropiaTenant: true  },
    { kind: 'marca',    columnIndex: 2,  nombre: 'EAN',                         esPropiaTenant: false },
    { kind: 'marca',    columnIndex: 3,  nombre: 'Universidad Javeriana',       esPropiaTenant: false },
    { kind: 'marca',    columnIndex: 4,  nombre: 'Universidad de los Andes',    esPropiaTenant: false },
    { kind: 'marca',    columnIndex: 5,  nombre: 'Universidad de Medellín',     esPropiaTenant: false },
    { kind: 'marca',    columnIndex: 6,  nombre: 'UPB',                         esPropiaTenant: false },
    { kind: 'marca',    columnIndex: 7,  nombre: 'CEIPA',                       esPropiaTenant: false },
    { kind: 'atributo', columnIndex: 8,  atributoNombre: 'Internacionalización', nivelNombre: 'Sin opciones internacionales'                   },
    { kind: 'atributo', columnIndex: 9,  atributoNombre: 'Internacionalización', nivelNombre: 'Con intercambio / pasantía en el exterior'      },
    { kind: 'atributo', columnIndex: 10, atributoNombre: 'Internacionalización', nivelNombre: 'Con profesores internacionales'                 },
    { kind: 'atributo', columnIndex: 11, atributoNombre: 'Internacionalización', nivelNombre: 'Con doble titulación internacional'             },
    { kind: 'atributo', columnIndex: 12, atributoNombre: 'Homologación',         nivelNombre: 'Sin homologación'                              },
    { kind: 'atributo', columnIndex: 13, atributoNombre: 'Homologación',         nivelNombre: 'Con admisión y homologación automáticas'        },
    { kind: 'atributo', columnIndex: 14, atributoNombre: 'Modalidad',            nivelNombre: 'Presencial'                                    },
    { kind: 'atributo', columnIndex: 15, atributoNombre: 'Modalidad',            nivelNombre: 'Virtual asincrónico'                           },
    { kind: 'atributo', columnIndex: 16, atributoNombre: 'Modalidad',            nivelNombre: 'Híbrida (Presencial + Virtual)'                },
    { kind: 'precio',   columnIndex: 17, precio: 9_900_000  },
    { kind: 'precio',   columnIndex: 18, precio: 11_900_000 },
    { kind: 'precio',   columnIndex: 19, precio: 13_900_000 },
    { kind: 'precio',   columnIndex: 20, precio: 15_900_000 },
    { kind: 'precio',   columnIndex: 21, precio: 17_900_000 },
    { kind: 'precio',   columnIndex: 22, precio: 19_900_000 },
    { kind: 'precio',   columnIndex: 23, precio: 23_900_000 },
    { kind: 'precio',   columnIndex: 24, precio: 29_900_000 },
  ],
  // 10 encuestados × 25 columnas
  // Generados con mulberry32(42). Valores razonables y coherentes con modelo conjoint.
  encuestados: [
    // Enc 1 — prefiere EAFIT fuertemente, sensible al precio
    [ 1.2,  4.8, -1.2, -2.1, -3.4, -2.8, -1.5, -2.7,  0.0,  2.8,  1.6,  3.9,  0.0,  2.1,  2.4,  0.8,  1.6, -0.5, -1.1, -1.8, -2.5, -3.2, -4.0, -4.9, -5.8 ],
    // Enc 2 — moderada preferencia EAFIT, baja sensibilidad precio
    [ 0.8,  3.2, -0.8, -1.5, -2.2, -1.9, -1.0, -1.8,  0.2,  1.9,  1.2,  2.8,  0.1,  1.5,  1.8,  0.5,  1.1, -0.2, -0.5, -0.8, -1.1, -1.4, -1.8, -2.2, -2.7 ],
    // Enc 3 — prefiere Javeriana, alta sensibilidad precio
    [ 1.5, -0.5, -1.8,  4.2, -3.1, -2.5, -2.0, -3.1,  0.1,  3.1,  1.8,  4.2,  0.0,  2.4,  1.9,  1.0,  2.0, -0.8, -1.5, -2.3, -3.1, -3.9, -4.8, -5.8, -7.1 ],
    // Enc 4 — prefiere Andes, atributos internacionalización altos
    [ 0.9, -1.2, -2.1, -1.8,  5.1, -2.2, -1.7, -2.9,  0.3,  2.5,  1.5,  4.8,  0.2,  1.8,  2.1,  0.7,  1.5, -0.4, -0.9, -1.4, -1.9, -2.5, -3.1, -3.8, -4.6 ],
    // Enc 5 — sensible precio, neutral marcas, valora homologación
    [ 1.1,  2.1, -0.5, -0.9, -1.8, -0.8, -0.3, -1.2,  0.0,  1.5,  0.9,  2.1,  0.0,  3.2,  1.6,  0.9,  2.4, -1.2, -2.0, -2.9, -3.8, -4.8, -5.9, -7.1, -8.6 ],
    // Enc 6 — valora mucho modalidad híbrida
    [ 0.7,  3.5, -1.0, -1.7, -2.9, -2.1, -1.3, -2.4,  0.1,  2.2,  1.4,  3.2,  0.1,  2.0,  0.8,  0.4,  3.8, -0.3, -0.7, -1.1, -1.6, -2.0, -2.5, -3.1, -3.8 ],
    // Enc 7 — EAFIT vs UdeM, moderado precio
    [ 1.3,  4.1, -1.5, -2.5, -3.8,  2.8, -2.1, -3.2,  0.2,  1.8,  1.1,  2.9,  0.0,  1.7,  2.2,  0.6,  1.4, -0.6, -1.2, -1.9, -2.5, -3.2, -4.0, -4.9, -6.0 ],
    // Enc 8 — baja sensibilidad general, valora presencial
    [ 0.5,  2.8, -0.6, -1.1, -1.9, -1.4, -0.8, -1.6,  0.0,  1.2,  0.7,  1.9,  0.0,  1.4,  2.9,  0.2,  1.0, -0.1, -0.3, -0.5, -0.7, -0.9, -1.1, -1.4, -1.7 ],
    // Enc 9 — precio muy sensible, prefiere virtual
    [ 1.8,  3.9, -2.1, -3.2, -4.5, -3.1, -2.8, -4.0,  0.0,  2.0,  1.2,  3.5,  0.0,  2.8,  0.5,  1.8,  1.2, -1.5, -2.5, -3.6, -4.8, -6.1, -7.5, -9.1,-11.0 ],
    // Enc 10 — equilibrado, todas marcas similares
    [ 1.0,  1.5, -0.4, -0.7, -1.2, -0.9, -0.5, -1.0,  0.1,  1.4,  0.8,  2.2,  0.1,  1.6,  1.7,  0.7,  1.3, -0.3, -0.6, -0.9, -1.3, -1.6, -2.0, -2.5, -3.0 ],
  ],
}
