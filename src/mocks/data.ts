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
}

export interface MockCompetidor {
  id: string
  nombre: string
  pais: string
  tenantId: string
}

export interface MockAtributo {
  nombre: string
  peso: number
  calificacion: number
  orden: number
}

export interface MockCategoriaVP {
  categoria: string
  atributos: MockAtributo[]
}

export interface MockElasticidad {
  skuId: string
  coeficiente: number
  confianza: number
  r2: number
}

export interface MockColConfig {
  ean: string
  nombreProducto: string
  costoVariableOPvp: string
  fechaVigenciaOCanal: string
}

export interface MockCanal {
  nombre: string
  margen: number
}

export interface MockCanalesMargenes {
  iva: number
  canales: MockCanal[]
}

export interface MockUmbrales {
  umbralSuperior: number
  umbralInferior: number
}

export interface MockPesoItem {
  skuId: string
  peso: number
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
    rol: 'consultor_pricer',
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
]

export const SEED_CONSULTOR_TENANTS: MockConsultorTenant[] = [
  {
    id: 'ct-001',
    userId: 'user-consultor-001',
    tenantId: 'tenant-001',
    createdAt: new Date(Date.now() - 90 * 86400_000).toISOString(),
  },
]

// ─── Seed SKUs ────────────────────────────────────────────────────────────────

export const SEED_SKUS: MockSku[] = [
  { id: 'sku-001', ean: '7701234000001', nombre: 'Energética 250ml', categoria: 'Bebidas Energéticas', marca: 'PowerUp', tenantId: 'tenant-001' },
  { id: 'sku-002', ean: '7701234000002', nombre: 'Energética 500ml', categoria: 'Bebidas Energéticas', marca: 'PowerUp', tenantId: 'tenant-001' },
  { id: 'sku-003', ean: '7701234000003', nombre: 'Energética 250ml Zero', categoria: 'Bebidas Energéticas', marca: 'PowerUp', tenantId: 'tenant-001' },
  { id: 'sku-004', ean: '7701234000004', nombre: 'Energética 500ml Tropical', categoria: 'Bebidas Energéticas', marca: 'PowerUp', tenantId: 'tenant-001' },
  { id: 'sku-005', ean: '7701234000005', nombre: 'Jugo Naranja 1L', categoria: 'Jugos', marca: 'FruttaViva', tenantId: 'tenant-001' },
  { id: 'sku-006', ean: '7701234000006', nombre: 'Jugo Manzana 1L', categoria: 'Jugos', marca: 'FruttaViva', tenantId: 'tenant-001' },
  { id: 'sku-007', ean: '7701234000007', nombre: 'Jugo Multifrutas 500ml', categoria: 'Jugos', marca: 'FruttaViva', tenantId: 'tenant-001' },
  { id: 'sku-008', ean: '7701234000008', nombre: 'Agua Natural 600ml', categoria: 'Agua', marca: 'AquaPura', tenantId: 'tenant-001' },
  { id: 'sku-009', ean: '7701234000009', nombre: 'Agua Natural 1.5L', categoria: 'Agua', marca: 'AquaPura', tenantId: 'tenant-001' },
  { id: 'sku-010', ean: '7701234000010', nombre: 'Hidratante Limón 750ml', categoria: 'Hidratantes', marca: 'SportPro', tenantId: 'tenant-001' },
]

// ─── Seed Competidores ────────────────────────────────────────────────────────

export const SEED_COMPETIDORES: MockCompetidor[] = [
  { id: 'comp-001', nombre: 'Red Bull', pais: 'Austria', tenantId: 'tenant-001' },
  { id: 'comp-002', nombre: 'Monster Energy', pais: 'USA', tenantId: 'tenant-001' },
  { id: 'comp-003', nombre: 'Speed', pais: 'Colombia', tenantId: 'tenant-001' },
  { id: 'comp-004', nombre: 'Hit', pais: 'Colombia', tenantId: 'tenant-001' },
  { id: 'comp-005', nombre: 'Tutti Frutti', pais: 'Colombia', tenantId: 'tenant-001' },
  { id: 'comp-006', nombre: 'Cristal', pais: 'Colombia', tenantId: 'tenant-001' },
  { id: 'comp-007', nombre: 'Brisa', pais: 'Colombia', tenantId: 'tenant-001' },
  { id: 'comp-008', nombre: 'Gatorade', pais: 'USA', tenantId: 'tenant-001' },
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

// ─── Seed R-002/R-003: Valor percibido ───────────────────────────────────────

export const SEED_R002: MockCategoriaVP[] = [
  {
    categoria: 'Bebidas Energéticas',
    atributos: [
      { nombre: 'Sabor', peso: 0.30, calificacion: 4, orden: 1 },
      { nombre: 'Precio', peso: 0.25, calificacion: 3, orden: 2 },
      { nombre: 'Empaque', peso: 0.20, calificacion: 4, orden: 3 },
      { nombre: 'Disponibilidad', peso: 0.15, calificacion: 5, orden: 4 },
      { nombre: 'Marca', peso: 0.10, calificacion: 4, orden: 5 },
    ],
  },
  {
    categoria: 'Jugos',
    atributos: [
      { nombre: 'Sabor', peso: 0.35, calificacion: 4, orden: 1 },
      { nombre: 'Contenido de fruta', peso: 0.25, calificacion: 3, orden: 2 },
      { nombre: 'Precio', peso: 0.20, calificacion: 4, orden: 3 },
      { nombre: 'Empaque', peso: 0.12, calificacion: 3, orden: 4 },
      { nombre: 'Disponibilidad', peso: 0.08, calificacion: 5, orden: 5 },
    ],
  },
  {
    categoria: 'Agua',
    atributos: [
      { nombre: 'Precio', peso: 0.40, calificacion: 4, orden: 1 },
      { nombre: 'Disponibilidad', peso: 0.30, calificacion: 5, orden: 2 },
      { nombre: 'Empaque', peso: 0.15, calificacion: 3, orden: 3 },
      { nombre: 'Pureza', peso: 0.10, calificacion: 4, orden: 4 },
      { nombre: 'Marca', peso: 0.05, calificacion: 3, orden: 5 },
    ],
  },
  {
    categoria: 'Hidratantes',
    atributos: [
      { nombre: 'Sabor', peso: 0.30, calificacion: 4, orden: 1 },
      { nombre: 'Precio', peso: 0.25, calificacion: 3, orden: 2 },
      { nombre: 'Electrolitos', peso: 0.25, calificacion: 4, orden: 3 },
      { nombre: 'Disponibilidad', peso: 0.12, calificacion: 4, orden: 4 },
      { nombre: 'Marca', peso: 0.08, calificacion: 5, orden: 5 },
    ],
  },
]

// ─── Seed R-004: Elasticidades ────────────────────────────────────────────────

export const SEED_R004: MockElasticidad[] = [
  { skuId: 'sku-001', coeficiente: -1.82, confianza: 0.92, r2: 0.87 },
  { skuId: 'sku-002', coeficiente: -1.65, confianza: 0.89, r2: 0.84 },
  { skuId: 'sku-003', coeficiente: -1.45, confianza: 0.85, r2: 0.79 },
  { skuId: 'sku-004', coeficiente: -1.78, confianza: 0.91, r2: 0.86 },
  { skuId: 'sku-005', coeficiente: -2.10, confianza: 0.94, r2: 0.91 },
  { skuId: 'sku-006', coeficiente: -2.05, confianza: 0.93, r2: 0.90 },
  { skuId: 'sku-007', coeficiente: -1.95, confianza: 0.88, r2: 0.83 },
  { skuId: 'sku-008', coeficiente: -2.45, confianza: 0.96, r2: 0.94 },
  { skuId: 'sku-009', coeficiente: -2.38, confianza: 0.95, r2: 0.92 },
  { skuId: 'sku-010', coeficiente: -1.55, confianza: 0.87, r2: 0.81 },
]

// ─── Seed R-005: Config columnas costos ──────────────────────────────────────

export const SEED_R005: MockColConfig = {
  ean: 'A',
  nombreProducto: 'B',
  costoVariableOPvp: 'C',
  fechaVigenciaOCanal: 'D',
}

// ─── Seed R-006: Config columnas SKUs/PVP ────────────────────────────────────

export const SEED_R006: MockColConfig = {
  ean: 'A',
  nombreProducto: 'B',
  costoVariableOPvp: 'C',
  fechaVigenciaOCanal: 'D',
}

// ─── Seed R-007: Canales y márgenes ──────────────────────────────────────────

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

// ─── Seed R-009: Pesos profit pool ───────────────────────────────────────────

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
