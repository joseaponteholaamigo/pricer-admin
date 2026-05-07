// ─── Mock API admin – reemplaza axios en modo VITE_MOCK_MODE=true ─────────────
import * as XLSX from 'xlsx'
import { store } from './store'
import { SEED_USERS } from './data'
import type { MockImportacionRecord } from './data'

// ─── Utilidades ──────────────────────────────────────────────────────────────
function ok<T>(data: T, headers: Record<string, string> = {}): Promise<{ data: T; headers: Record<string, string> }> {
  return Promise.resolve({ data, headers })
}

function parseUrl(url: string): { path: string; params: URLSearchParams } {
  const [path, qs = ''] = url.split('?')
  return { path: path.replace(/^\//, ''), params: new URLSearchParams(qs) }
}

function newId(): string {
  return `gen-${++store._idCounter}-${Date.now()}`
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function handleAuth(method: string, path: string, body: unknown) {
  if (method === 'POST' && path === 'auth/login') {
    const { email, password } = body as { email: string; password: string }
    const user = SEED_USERS.find(u => u.email === email && u.password === password)
    if (!user) return Promise.reject({ response: { status: 401, data: { message: 'Credenciales inválidas' } } })
    // admin, consultor y cliente_editor pueden entrar al admin portal
    if (user.rol !== 'admin' && user.rol !== 'consultor_prisier' && user.rol !== 'cliente_editor') {
      return Promise.reject({ response: { status: 403, data: { message: 'Acceso no autorizado' } } })
    }
    const token = `mock_${user.id}`
    return ok({
      accessToken: token,
      refreshToken: `refresh_${user.id}`,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      user: { id: user.id, email: user.email, nombreCompleto: user.nombreCompleto, rol: user.rol, tenantId: user.tenantId },
    })
  }
  if (method === 'GET' && path === 'auth/me') {
    const token = localStorage.getItem('access_token') ?? ''
    const userId = token.replace('mock_', '')
    const user = SEED_USERS.find(u => u.id === userId)
    if (!user) return Promise.reject({ response: { status: 401 } })
    return ok({ id: user.id, email: user.email, nombreCompleto: user.nombreCompleto, rol: user.rol, tenantId: user.tenantId })
  }
  if (method === 'POST' && path === 'auth/logout') {
    return ok({ message: 'ok' })
  }
  return null
}

// ─── Helpers tenant → response shape ─────────────────────────────────────────
function toTenantListItem(tenant: typeof store.tenants[0]) {
  const consultores = store.consultorTenants
    .filter(ct => ct.tenantId === tenant.id)
    .map(ct => {
      const u = store.users.find(u => u.id === ct.userId)
      return u ? { userId: u.id, nombreCompleto: u.nombreCompleto, email: u.email } : null
    })
    .filter(Boolean)

  const usuariosCount = store.users.filter(u => u.tenantId === tenant.id).length

  return {
    id: tenant.id,
    nombre: tenant.nombre,
    industria: tenant.industria,
    plan: tenant.plan,
    estado: tenant.estado,
    usuariosCount,
    consultores,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
  }
}

// ─── Tenants ──────────────────────────────────────────────────────────────────
function handleTenants(method: string, path: string, body: unknown) {
  // DELETE /tenants/{id}/consultores/{userId}
  const deleteConsultorMatch = path.match(/^tenants\/([\w-]+)\/consultores\/([\w-]+)$/)
  if (method === 'DELETE' && deleteConsultorMatch) {
    const [, tenantId, userId] = deleteConsultorMatch
    store.consultorTenants = store.consultorTenants.filter(
      ct => !(ct.tenantId === tenantId && ct.userId === userId)
    )
    return ok({ message: 'ok' })
  }

  // POST /tenants/{id}/consultores
  const assignConsultorMatch = path.match(/^tenants\/([\w-]+)\/consultores$/)
  if (method === 'POST' && assignConsultorMatch) {
    const [, tenantId] = assignConsultorMatch
    const { consultorUserId } = body as { consultorUserId: string }
    const already = store.consultorTenants.find(ct => ct.tenantId === tenantId && ct.userId === consultorUserId)
    if (!already) {
      store.consultorTenants.push({ id: newId(), userId: consultorUserId, tenantId, createdAt: new Date().toISOString() })
    }
    const tenant = store.tenants.find(t => t.id === tenantId)!
    return ok(toTenantListItem(tenant))
  }

  // GET /tenants/{id}
  const getOneMatch = path.match(/^tenants\/([\w-]+)$/)
  if (method === 'GET' && getOneMatch) {
    const tenant = store.tenants.find(t => t.id === getOneMatch[1])
    if (!tenant) return Promise.reject({ response: { status: 404 } })
    return ok(toTenantListItem(tenant))
  }

  // PUT /tenants/{id}
  if (method === 'PUT' && getOneMatch) {
    const idx = store.tenants.findIndex(t => t.id === getOneMatch[1])
    if (idx === -1) return Promise.reject({ response: { status: 404 } })
    const req = body as { nombre: string; industria: string; plan: string; estado: string }
    store.tenants[idx] = { ...store.tenants[idx], ...req, updatedAt: new Date().toISOString() }
    return ok(toTenantListItem(store.tenants[idx]))
  }

  // GET /tenants
  if (method === 'GET' && path === 'tenants') {
    return ok(store.tenants.map(toTenantListItem))
  }

  // POST /tenants
  if (method === 'POST' && path === 'tenants') {
    const req = body as { nombre: string; industria: string; plan: string }
    const now = new Date().toISOString()
    const newTenant = { id: newId(), nombre: req.nombre, industria: req.industria, plan: req.plan, estado: 'activo', createdAt: now, updatedAt: now }
    store.tenants.push(newTenant)
    return ok(toTenantListItem(newTenant))
  }

  return null
}

// ─── Users ────────────────────────────────────────────────────────────────────
function toUserListItem(user: typeof store.users[0]) {
  const tenant = user.tenantId ? store.tenants.find(t => t.id === user.tenantId) : null
  return {
    id: user.id,
    email: user.email,
    nombreCompleto: user.nombreCompleto,
    rol: user.rol,
    estado: user.estado,
    tenantId: user.tenantId,
    tenantNombre: tenant?.nombre ?? null,
    invitadoPor: user.invitadoPor,
    fechaInvitacion: user.fechaInvitacion,
    createdAt: user.createdAt,
  }
}

function handleUsers(method: string, path: string, body: unknown) {
  // POST /users/{id}/activate|deactivate|reset-password
  const actionMatch = path.match(/^users\/([\w-]+)\/(activate|deactivate|reset-password)$/)
  if (method === 'POST' && actionMatch) {
    const [, userId, action] = actionMatch
    const idx = store.users.findIndex(u => u.id === userId)
    if (idx === -1) return Promise.reject({ response: { status: 404 } })
    if (action === 'activate') store.users[idx].estado = 'activo'
    if (action === 'deactivate') store.users[idx].estado = 'inactivo'
    return ok(toUserListItem(store.users[idx]))
  }

  // GET /users/{id}
  const getOneMatch = path.match(/^users\/([\w-]+)$/)
  if (method === 'GET' && getOneMatch) {
    const user = store.users.find(u => u.id === getOneMatch[1])
    if (!user) return Promise.reject({ response: { status: 404 } })
    return ok(toUserListItem(user))
  }

  // PUT /users/{id}
  if (method === 'PUT' && getOneMatch) {
    const idx = store.users.findIndex(u => u.id === getOneMatch[1])
    if (idx === -1) return Promise.reject({ response: { status: 404 } })
    const req = body as { nombreCompleto?: string; rol?: string; estado?: string }
    store.users[idx] = { ...store.users[idx], ...req }
    return ok(toUserListItem(store.users[idx]))
  }

  // GET /users?tenantId=
  if (method === 'GET' && path === 'users') {
    return ok(store.users.map(toUserListItem))
  }

  // POST /users
  if (method === 'POST' && path === 'users') {
    const req = body as { email: string; nombreCompleto: string; password?: string; rol: string; tenantId?: string | null }
    const now = new Date().toISOString()
    const newUser = {
      id: newId(),
      email: req.email,
      password: req.password ?? '123456',
      nombreCompleto: req.nombreCompleto,
      rol: req.rol,
      tenantId: req.tenantId ?? null,
      estado: 'activo',
      invitadoPor: null,
      fechaInvitacion: null,
      createdAt: now,
    }
    store.users.push(newUser)
    return ok(toUserListItem(newUser))
  }

  return null
}

// ─── Reglas ───────────────────────────────────────────────────────────────────
function handleReglas(method: string, path: string, body: unknown, params: URLSearchParams = new URLSearchParams()) {
  const tid = params.get('tenantId') ?? 'tenant-001'

  // Per-tenant data with empty defaults for tenants without configuration
  const skus        = store.skus.filter(s => s.tenantId === tid)
  const r001        = store.r001[tid] ?? {}
  const r002        = store.r002[tid] ?? []
  const r002_cals   = store.r002_calificaciones[tid] ?? []
  const r004        = store.r004[tid] ?? []
  const r005        = store.r005[tid] ?? { iva: 0.19, tipoEstructura: 'costo_variable' }
  const r006        = store.r006[tid] ?? { iva: 0.19, tipoEstructura: 'pvp_sugerido' }
  const r007        = store.r007[tid] ?? { iva: 0.19, canales: [] as typeof store.r007['tenant-001']['canales'] }
  const r008        = store.r008[tid] ?? { umbralSuperior: 0.05, umbralInferior: 0.05 }
  const r009        = store.r009[tid] ?? []
  const categorias  = store.categorias
  const importaciones = store.importaciones[tid] ?? []
  const vinculaciones = store.vinculaciones[tid] ?? {}

  // GET reglas/resumen
  if (method === 'GET' && path === 'reglas/resumen') {
    return ok([
      { tipo: 'Portafolio',      descripcion: 'SKUs y precios del portafolio',          configurada: skus.length > 0,          actualizadaEn: '2025-11-10T08:00:00Z', actualizadaPor: 'Admin Prisier' },
      { tipo: 'Importaciones',   descripcion: 'Historial de cargas de portafolio',       configurada: importaciones.length > 0, actualizadaEn: '2025-11-12T09:00:00Z', actualizadaPor: 'Admin Prisier' },
      { tipo: 'Atributos',       descripcion: 'Atributos de valor percibido',            configurada: r002.length > 0,          actualizadaEn: '2025-11-20T14:00:00Z', actualizadaPor: 'Consultor Demo' },
      { tipo: 'Calificaciones',  descripcion: 'Calificaciones por SKU y competidor',     configurada: r002_cals.length > 0,     actualizadaEn: '2025-11-21T10:00:00Z', actualizadaPor: 'Consultor Demo' },
      { tipo: 'Elasticidad',     descripcion: 'Coeficientes de elasticidad por SKU',     configurada: r004.length > 0,          actualizadaEn: '2025-11-18T09:00:00Z', actualizadaPor: 'Admin Prisier' },
      { tipo: 'Canales',         descripcion: 'Canales de venta y márgenes',             configurada: r007.canales.length > 0,  actualizadaEn: '2025-11-22T16:00:00Z', actualizadaPor: 'Admin Prisier' },
      { tipo: 'Umbrales',        descripcion: 'Umbrales de alerta de precios',           configurada: r008.umbralSuperior > 0,  actualizadaEn: '2025-11-22T16:00:00Z', actualizadaPor: 'Consultor Demo' },
      { tipo: 'Retailers',       descripcion: 'Retailers activos del tenant',            configurada: store.r010.some(r => r.tenantId === tid), actualizadaEn: '2025-11-19T11:00:00Z', actualizadaPor: 'Consultor Demo' },
    ])
  }

  // GET reglas/competidores
  if (method === 'GET' && path === 'reglas/competidores') {
    return ok({ skus, competidores: store.competidores, mapeo: r001 })
  }

  // PUT reglas/competidores
  if (method === 'PUT' && path === 'reglas/competidores') {
    const { mapeo } = body as { mapeo: Record<string, string[]> }
    store.r001[tid] = mapeo
    return ok({ mapeo: store.r001[tid] })
  }

  // GET reglas/atributos
  if (method === 'GET' && path === 'reglas/atributos') {
    return ok(r002.map(cat => ({ categoria: cat.categoria, atributos: cat.atributos })))
  }

  // PUT reglas/atributos
  if (method === 'PUT' && path === 'reglas/atributos') {
    const { categoria, atributos } = body as { categoria: string; atributos: typeof r002[0]['atributos'] }
    if (!store.r002[tid]) store.r002[tid] = []
    const idx = store.r002[tid].findIndex(c => c.categoria === categoria)
    if (idx === -1) store.r002[tid].push({ categoria, atributos })
    else store.r002[tid][idx].atributos = atributos
    return ok({ categoria, atributos })
  }

  // GET reglas/valor-percibido
  if (method === 'GET' && path === 'reglas/valor-percibido') {
    return ok(r002.map(cat => ({
      categoria: cat.categoria,
      atributos: cat.atributos,
      vp: Math.round(cat.atributos.reduce((acc, a) => acc + a.peso * (a.calificacion ?? 0), 0) * 100) / 100,
    })))
  }

  // PUT reglas/valor-percibido
  if (method === 'PUT' && path === 'reglas/valor-percibido') {
    const { categoria, atributos } = body as { categoria: string; atributos: typeof r002[0]['atributos'] }
    if (!store.r002[tid]) store.r002[tid] = []
    const idx = store.r002[tid].findIndex(c => c.categoria === categoria)
    if (idx === -1) store.r002[tid].push({ categoria, atributos })
    else store.r002[tid][idx].atributos = atributos
    const cat = store.r002[tid].find(c => c.categoria === categoria)!
    return ok({
      categoria,
      atributos: cat.atributos,
      vp: Math.round(cat.atributos.reduce((acc, a) => acc + a.peso * (a.calificacion ?? 0), 0) * 100) / 100,
    })
  }

  // GET reglas/elasticidad
  if (method === 'GET' && path === 'reglas/elasticidad') {
    return ok(r004.map(e => ({ ...e, skuNombre: skus.find(s => s.id === e.skuId)?.nombre ?? e.skuId })))
  }

  // PUT reglas/elasticidad
  if (method === 'PUT' && path === 'reglas/elasticidad') {
    store.r004[tid] = body as typeof r004
    return ok(store.r004[tid])
  }

  // GET reglas/costos-config
  if (method === 'GET' && path === 'reglas/costos-config') {
    return ok(r005)
  }

  // PUT reglas/costos-config
  if (method === 'PUT' && path === 'reglas/costos-config') {
    store.r005[tid] = body as typeof r005
    return ok(store.r005[tid])
  }

  // GET reglas/skus-config
  if (method === 'GET' && path === 'reglas/skus-config') {
    return ok(r006)
  }

  // PUT reglas/skus-config
  if (method === 'PUT' && path === 'reglas/skus-config') {
    store.r006[tid] = body as typeof r006
    return ok(store.r006[tid])
  }

  // GET reglas/canales-margenes
  if (method === 'GET' && path === 'reglas/canales-margenes') {
    return ok(r007)
  }

  // PUT reglas/canales-margenes
  if (method === 'PUT' && path === 'reglas/canales-margenes') {
    store.r007[tid] = body as typeof r007
    return ok(store.r007[tid])
  }

  // GET reglas/umbrales
  if (method === 'GET' && path === 'reglas/umbrales') {
    return ok(r008)
  }

  // PUT reglas/umbrales
  if (method === 'PUT' && path === 'reglas/umbrales') {
    store.r008[tid] = body as typeof r008
    return ok(store.r008[tid])
  }

  // GET reglas/profit-pool
  if (method === 'GET' && path === 'reglas/profit-pool') {
    return ok(r009.map(p => ({ ...p, skuNombre: skus.find(s => s.id === p.skuId)?.nombre ?? p.skuId })))
  }

  // PUT reglas/profit-pool
  if (method === 'PUT' && path === 'reglas/profit-pool') {
    store.r009[tid] = body as typeof r009
    return ok(store.r009[tid])
  }

  // GET reglas/calificaciones
  if (method === 'GET' && path === 'reglas/calificaciones') {
    const skuId = params.get('skuId')
    if (!skuId) return Promise.reject({ response: { status: 400 } })
    const sku = skus.find(s => s.id === skuId)
    if (!sku) return Promise.reject({ response: { status: 404 } })
    const catAttrs = r002.find(c => c.categoria === sku.categoria)
    if (!catAttrs) return ok(null)
    const competidoresDelSku = r001[skuId] ?? []
    const atributos = catAttrs.atributos.map(a => {
      const calRow = r002_cals.find(c => c.skuId === skuId && c.atributo === a.nombre)
      const calComp: Record<string, number> = {}
      for (const compId of competidoresDelSku) {
        calComp[compId] = calRow?.calificacionesCompetidor[compId] ?? 0
      }
      return { nombre: a.nombre, peso: a.peso, calificacionPropia: calRow?.calificacionPropia ?? 0, calificacionesCompetidor: calComp }
    })
    const vpPropio = atributos.reduce((s, a) => s + a.peso * a.calificacionPropia, 0)
    const vpCompetidor: Record<string, number> = {}
    for (const compId of competidoresDelSku) {
      vpCompetidor[compId] = atributos.reduce((s, a) => s + a.peso * (a.calificacionesCompetidor[compId] ?? 0), 0)
    }
    return ok({ skuId, skuNombre: sku.nombre, categoria: sku.categoria, atributos, vpPropio, vpCompetidor })
  }

  // PUT reglas/calificaciones
  if (method === 'PUT' && path === 'reglas/calificaciones') {
    const { skuId, modo, competidorId, calificaciones } = body as {
      skuId: string; modo: 'propio' | 'competidor'; competidorId: string | null
      calificaciones: Record<string, number>
    }
    if (!store.r002_calificaciones[tid]) store.r002_calificaciones[tid] = []
    for (const [atributo, valor] of Object.entries(calificaciones)) {
      const idx = store.r002_calificaciones[tid].findIndex(c => c.skuId === skuId && c.atributo === atributo)
      if (idx === -1) {
        store.r002_calificaciones[tid].push({
          skuId, atributo,
          calificacionPropia: modo === 'propio' ? valor : 0,
          calificacionesCompetidor: modo === 'competidor' && competidorId ? { [competidorId]: valor } : {},
        })
      } else {
        if (modo === 'propio') {
          store.r002_calificaciones[tid][idx].calificacionPropia = valor
        } else if (competidorId) {
          store.r002_calificaciones[tid][idx].calificacionesCompetidor = {
            ...store.r002_calificaciones[tid][idx].calificacionesCompetidor,
            [competidorId]: valor,
          }
        }
      }
    }
    return ok({ ok: true })
  }

  // GET reglas/portafolio/importaciones
  if (method === 'GET' && path === 'reglas/portafolio/importaciones') {
    return ok([...importaciones].reverse())
  }

  // GET reglas/portafolio/plantilla — descarga template xlsx estático
  if (method === 'GET' && path === 'reglas/portafolio/plantilla') {
    return fetch('/prisier-admin/plantillas/plantilla-portafolio.xlsx')
      .then(r => r.blob())
      .then(blob => ({ data: blob })) as ReturnType<typeof ok>
  }

  // GET reglas/vinculaciones
  if (method === 'GET' && path === 'reglas/vinculaciones') {
    return ok(vinculaciones)
  }

  // PUT reglas/vinculaciones
  if (method === 'PUT' && path === 'reglas/vinculaciones') {
    const { mapeo } = body as { mapeo: Record<string, Array<{ tipo: 'propio' | 'competencia'; id: string }>> }
    store.vinculaciones[tid] = mapeo
    return ok(store.vinculaciones[tid])
  }

  // GET reglas/skus-competencia
  if (method === 'GET' && path === 'reglas/skus-competencia') {
    return ok(store.skusCompetencia.filter(s => s.tenantId === tid))
  }

  // PUT reglas/skus-competencia
  if (method === 'PUT' && path === 'reglas/skus-competencia') {
    const { items } = body as { items: Array<{ id: string; ean: string; nombre: string; marca: string; categoria: string; pvpReferencia: number }> }
    store.skusCompetencia = [
      ...store.skusCompetencia.filter(s => s.tenantId !== tid),
      ...items.map(i => ({ ...i, tenantId: tid })),
    ]
    return ok(store.skusCompetencia.filter(s => s.tenantId === tid))
  }

  // GET reglas/categorias — global list, same for all tenants
  if (method === 'GET' && path === 'reglas/categorias') {
    return ok(categorias)
  }

  // PUT reglas/categorias — updates the global list
  if (method === 'PUT' && path === 'reglas/categorias') {
    const { categorias: cats } = body as { categorias: Array<{ nombre: string; iva: number }> }
    store.categorias = cats
    return ok(store.categorias)
  }

  // GET reglas/portafolio
  if (method === 'GET' && path === 'reglas/portafolio') {
    return ok({
      items: skus.map(s => ({
        skuId: s.id, ean: s.ean, nombre: s.nombre, marca: s.marca,
        categoria: s.categoria, pvpSugerido: s.pvpSugerido,
        costoVariable: s.costoVariable, pesoProfitPool: s.pesoProfitPool,
      })),
    })
  }

  // PUT reglas/portafolio
  if (method === 'PUT' && path === 'reglas/portafolio') {
    const { items } = body as { items: Array<{ skuId: string; pvpSugerido: number; costoVariable: number; pesoProfitPool: number }> }
    items.forEach(item => {
      const sku = store.skus.find(s => s.id === item.skuId && s.tenantId === tid)
      if (sku) { sku.pvpSugerido = item.pvpSugerido; sku.costoVariable = item.costoVariable; sku.pesoProfitPool = item.pesoProfitPool }
    })
    return ok({ items })
  }

  // POST reglas/portafolio/upload — simula parsing de xlsx y registra historial
  if (method === 'POST' && path === 'reglas/portafolio/upload') {
    const items = skus.map(s => ({
      skuId: s.id, ean: s.ean, nombre: s.nombre, marca: s.marca,
      categoria: s.categoria, pvpSugerido: s.pvpSugerido,
      costoVariable: s.costoVariable, pesoProfitPool: s.pesoProfitPool,
    }))
    const record = {
      id: newId(), fecha: new Date().toISOString(), archivo: 'portafolio.xlsx',
      totalSkus: items.length, advertencias: 0, errores: [] as string[], estado: 'exitoso' as const,
    }
    if (!store.importaciones[tid]) store.importaciones[tid] = []
    store.importaciones[tid].push(record)
    return ok({ items, totalProcesados: items.length, errores: [], importacionId: record.id })
  }

  // GET reglas/retailers
  if (method === 'GET' && path === 'reglas/retailers') {
    return ok(store.r010.filter(r => r.tenantId === tid).map(({ id, nombre, activo }) => ({ id, nombre, activo })))
  }

  // PUT reglas/retailers
  if (method === 'PUT' && path === 'reglas/retailers') {
    const items = body as Array<{ id: string; nombre: string; activo: boolean }>
    store.r010 = store.r010.filter(r => r.tenantId !== tid)
    items.forEach(item => store.r010.push({ ...item, tenantId: tid }))
    return ok(items)
  }

  return null
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

const MOCK_AUDIT_LOGS = (() => {
  const users = [
    { nombre: 'Admin Prisier', tenantId: 'tenant-001', tenantNombre: 'ConGrupo', ip: '192.168.1.1' },
    { nombre: 'Consultor Demo', tenantId: 'tenant-001', tenantNombre: 'ConGrupo', ip: '10.0.0.5' },
    { nombre: 'Cliente ConGrupo', tenantId: 'tenant-001', tenantNombre: 'ConGrupo', ip: '201.244.12.8' },
  ]
  const combos: Array<[string, string, string | null, string | null]> = [
    ['login', 'sesion', null, null],
    ['cambio_regla', 'regla', '{"umbral": 0.05}', '{"umbral": 0.10}'],
    ['upload_archivo', 'sku', null, '{"archivo": "skus_v2.xlsx"}'],
    ['creacion_usuario', 'usuario', null, '{"email": "nuevo@test.com"}'],
    ['edicion_tenant', 'tenant', '{"plan": "basic"}', '{"plan": "enterprise"}'],
    ['exportacion', 'sku', null, null],
    ['logout', 'sesion', null, null],
    ['cambio_regla', 'competidor', '{"margen": 0.15}', '{"margen": 0.20}'],
  ]
  return Array.from({ length: 60 }, (_, i) => {
    const u = users[i % users.length]
    const [accion, entidad, valorAnterior, valorNuevo] = combos[i % combos.length]
    return {
      id: `audit-${String(i + 1).padStart(3, '0')}`,
      fecha: new Date(Date.now() - (60 - i) * 6 * 3600_000).toISOString(),
      usuario: u.nombre,
      tenantId: u.tenantId,
      tenantNombre: u.tenantNombre,
      accion,
      entidad,
      valorAnterior,
      valorNuevo,
      ip: u.ip,
    }
  }).reverse()
})()

function handleAuditLogs(method: string, path: string, params: URLSearchParams) {
  // Export
  const exportMatch = path.match(/^audit-logs\/export\/(excel|csv)$/)
  if (method === 'GET' && exportMatch) {
    const fmt = exportMatch[1]
    const csvContent = 'Fecha,Usuario,Tenant,Acción,Entidad\n' +
      MOCK_AUDIT_LOGS.slice(0, 100).map(r =>
        `${r.fecha},${r.usuario},${r.tenantNombre},${r.accion},${r.entidad}`
      ).join('\n')
    const blob = new Blob([csvContent], { type: fmt === 'csv' ? 'text/csv' : 'application/octet-stream' })
    return ok(blob)
  }

  if (method === 'GET' && path === 'audit-logs') {
    let logs = [...MOCK_AUDIT_LOGS]

    const tenantId = params.get('tenantId')
    const accion = params.get('accion')
    const entidad = params.get('entidad')
    const fechaDesde = params.get('fechaDesde')
    const fechaHasta = params.get('fechaHasta')
    const usuario = params.get('usuario')
    const busqueda = params.get('busqueda')

    if (tenantId) logs = logs.filter(l => l.tenantId === tenantId)
    if (accion) logs = logs.filter(l => l.accion === accion)
    if (entidad) logs = logs.filter(l => l.entidad === entidad)
    if (fechaDesde) logs = logs.filter(l => l.fecha >= fechaDesde)
    if (fechaHasta) logs = logs.filter(l => l.fecha <= fechaHasta + 'T23:59:59')
    if (usuario) logs = logs.filter(l => l.usuario.toLowerCase().includes(usuario.toLowerCase()))
    if (busqueda) {
      const q = busqueda.toLowerCase()
      logs = logs.filter(l =>
        l.usuario.toLowerCase().includes(q) ||
        l.accion.includes(q) ||
        l.entidad.includes(q) ||
        (l.tenantNombre ?? '').toLowerCase().includes(q)
      )
    }

    const total = logs.length
    const page = Math.max(1, parseInt(params.get('page') ?? '1'))
    const pageSize = Math.min(100, parseInt(params.get('pageSize') ?? '25'))
    const paged = logs.slice((page - 1) * pageSize, page * pageSize)

    return ok(paged, { 'x-total-count': String(total) })
  }

  return null
}

// ─── Admin Scraper ────────────────────────────────────────────────────────────

const MOCK_CARGAS = [
  {
    id: 'carga-001',
    fecha: new Date(Date.now() - 2 * 86400_000).toISOString(),
    tipo: 'competidores',
    tenantNombre: 'ConGrupo',
    nombreArchivo: 'precios_mercado_oct.xlsx',
    registrosRecibidos: 450,
    registrosProcesados: 445,
    totalErrores: 5,
    estado: 'completado_con_errores',
    subidoPor: 'admin@prisier.com',
    errores: [
      { fila: 23, columna: 'Precio', valor: '-5.00', mensaje: 'Precio inválido (negativo)' },
      { fila: 87, columna: 'Retailer', valor: '', mensaje: 'Retailer vacío' },
      { fila: 102, columna: 'Código SKU Cliente', valor: 'XYZ-999', mensaje: 'SKU no existe en portafolio' },
      { fila: 145, columna: 'Precio', valor: '0', mensaje: 'Precio inválido (cero)' },
      { fila: 312, columna: 'Nombre Competidor', valor: '', mensaje: 'Nombre competidor vacío' },
    ],
  },
  {
    id: 'carga-002',
    fecha: new Date(Date.now() - 5 * 86400_000).toISOString(),
    tipo: 'skus',
    tenantNombre: 'ConGrupo',
    nombreArchivo: 'portafolio_v2.xlsx',
    registrosRecibidos: 120,
    registrosProcesados: 120,
    totalErrores: 0,
    estado: 'completado',
    subidoPor: 'consultor@prisier.com',
    errores: [],
  },
  {
    id: 'carga-003',
    fecha: new Date(Date.now() - 10 * 86400_000).toISOString(),
    tipo: 'competidores',
    tenantNombre: 'ConGrupo',
    nombreArchivo: 'precios_sep_v1.xlsx',
    registrosRecibidos: 0,
    registrosProcesados: 0,
    totalErrores: 1,
    estado: 'error',
    subidoPor: 'admin@prisier.com',
    errores: [{ fila: 1, columna: null, valor: null, mensaje: 'Columnas faltantes: nombre competidor' }],
  },
  {
    id: 'carga-004',
    fecha: new Date(Date.now() - 15 * 86400_000).toISOString(),
    tipo: 'skus',
    tenantNombre: 'ConGrupo',
    nombreArchivo: 'portafolio_v1.xlsx',
    registrosRecibidos: 95,
    registrosProcesados: 95,
    totalErrores: 0,
    estado: 'completado',
    subidoPor: 'consultor@prisier.com',
    errores: [],
  },
]

function handleAdminScraper(method: string, path: string, params: URLSearchParams) {
  const tenantId = params.get('tenantId') ?? 'tenant-001'

  if (method === 'GET' && path === 'admin/scraper/status') {
    const last = MOCK_CARGAS[0]
    const estado = !last ? 'sin_datos'
      : last.estado === 'completado' || last.estado === 'completado_con_errores' ? 'activo'
      : 'error'
    const cutoff24h = Date.now() - 24 * 3600_000
    const erroresUltimas24h = MOCK_CARGAS
      .filter(c => new Date(c.fecha).getTime() >= cutoff24h)
      .reduce((sum, c) => sum + c.totalErrores, 0)
    return ok({ estado, ultimaCarga: last?.fecha ?? null, registrosProcesados: last?.registrosProcesados ?? 0, erroresUltimas24h, tenantId })
  }

  if (method === 'GET' && path === 'admin/scraper/historial') {
    return ok(MOCK_CARGAS)
  }

  if (method === 'POST' && path === 'admin/scraper/upload') {
    return ok({ procesados: 42, errores: [] })
  }

  return null
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

const MOCK_TENANT_ACTIVIDAD = [
  {
    tenantId: 'tenant-001',
    tenantNombre: 'ConGrupo',
    tenantEstado: 'activo',
    ultimaCargaScraper: {
      fecha: new Date(Date.now() - 2 * 86400_000).toISOString(),
      tipo: 'competidores',
      estado: 'completado_con_errores' as const,
      nombreArchivo: 'precios_mercado_oct.xlsx',
    },
    ultimaActualizacionReglas: {
      fecha: new Date(Date.now() - 1 * 86400_000).toISOString(),
      tipo: 'Canales',
      actualizadaPor: 'Admin Prisier',
    },
    ultimaActividad: new Date(Date.now() - 1 * 86400_000).toISOString(),
  },
  {
    tenantId: 'tenant-002',
    tenantNombre: 'BevMax S.A.',
    tenantEstado: 'activo',
    ultimaCargaScraper: {
      fecha: new Date(Date.now() - 3 * 86400_000).toISOString(),
      tipo: 'skus',
      estado: 'completado' as const,
      nombreArchivo: 'portafolio_bevmax_v3.xlsx',
    },
    ultimaActualizacionReglas: {
      fecha: new Date(Date.now() - 4 * 86400_000).toISOString(),
      tipo: 'Umbrales',
      actualizadaPor: 'Consultor Demo',
    },
    ultimaActividad: new Date(Date.now() - 3 * 86400_000).toISOString(),
  },
  {
    tenantId: 'tenant-003',
    tenantNombre: 'Lácteos Andes',
    tenantEstado: 'activo',
    ultimaCargaScraper: {
      fecha: new Date(Date.now() - 6 * 86400_000).toISOString(),
      tipo: 'competidores',
      estado: 'completado' as const,
      nombreArchivo: 'competidores_lacteos_nov.xlsx',
    },
    ultimaActualizacionReglas: {
      fecha: new Date(Date.now() - 5 * 86400_000).toISOString(),
      tipo: 'Atributos',
      actualizadaPor: 'Consultor Demo',
    },
    ultimaActividad: new Date(Date.now() - 5 * 86400_000).toISOString(),
  },
  {
    tenantId: 'tenant-004',
    tenantNombre: 'GranoSelect Ltda.',
    tenantEstado: 'activo',
    ultimaCargaScraper: null,
    ultimaActualizacionReglas: {
      fecha: new Date(Date.now() - 8 * 86400_000).toISOString(),
      tipo: 'Portafolio',
      actualizadaPor: 'Admin Prisier',
    },
    ultimaActividad: new Date(Date.now() - 8 * 86400_000).toISOString(),
  },
  {
    tenantId: 'tenant-005',
    tenantNombre: 'FreshMart Corp.',
    tenantEstado: 'activo',
    ultimaCargaScraper: {
      fecha: new Date(Date.now() - 12 * 86400_000).toISOString(),
      tipo: 'competidores',
      estado: 'error' as const,
      nombreArchivo: 'precios_freshmart_oct.xlsx',
    },
    ultimaActualizacionReglas: null,
    ultimaActividad: new Date(Date.now() - 12 * 86400_000).toISOString(),
  },
  {
    tenantId: 'tenant-006',
    tenantNombre: 'NutriPack S.A.S.',
    tenantEstado: 'inactivo',
    ultimaCargaScraper: null,
    ultimaActualizacionReglas: null,
    ultimaActividad: new Date(Date.now() - 30 * 86400_000).toISOString(),
  },
]

function handleDashboard(method: string, path: string) {
  if (method === 'GET' && path === 'admin/dashboard/actividad-tenants') {
    return ok([...MOCK_TENANT_ACTIVIDAD])
  }
  return null
}

// ─── Importaciones v2 ────────────────────────────────────────────────────────

const TIPO_LABELS: Record<MockImportacionRecord['tipo'], string> = {
  portafolio: 'Portafolio',
  categorias: 'Categorías',
  competidores: 'Competidores',
  atributos: 'Atributos',
  calificaciones: 'Calificaciones',
  elasticidad: 'Elasticidad',
  canales: 'Canales',
  competencia: 'Competencia (SKUs)',
  categorias_academicas: 'Categorías Académicas (deprecado)',
  // Educación
  programas: 'Programas',
  facultades_escuelas: 'Facultades/Escuelas',
  niveles_educativos: 'Niveles Educativos',
  ciudades: 'Ciudades',
  atributos_r010: 'Atributos de Valor Percibido',
  calificaciones_edu: 'Calificaciones Edu',
  asignaciones_snies: 'Asignaciones SNIES',
  snies_update: 'Actualizar Base SNIES',
}

/** Datos de preview simulados con variación por tipo */
function buildPreviewResumen(tipo: MockImportacionRecord['tipo'], hasErrors: boolean): {
  resumen: { nuevas: number; actualizadas: number; omitidas: number }
  errores: Array<{ fila: number; columna?: string; mensaje: string }>
} {
  const baseData: Record<MockImportacionRecord['tipo'], { n: number; a: number }> = {
    portafolio:           { n: 15, a: 8 },
    categorias:           { n: 3,  a: 12 },
    competidores:         { n: 42, a: 18 },
    atributos:            { n: 8,  a: 4 },
    calificaciones:       { n: 30, a: 10 },
    elasticidad:          { n: 12, a: 0 },
    canales:              { n: 5,  a: 3 },
    competencia:          { n: 20, a: 6 },
    categorias_academicas:{ n: 0,  a: 0 },
    // Educación
    programas:            { n: 18, a: 0 },
    facultades_escuelas:  { n: 4,  a: 0 },
    niveles_educativos:   { n: 4,  a: 0 },
    ciudades:             { n: 3,  a: 0 },
    atributos_r010:       { n: 40, a: 0 },
    calificaciones_edu:   { n: 90, a: 0 },
    asignaciones_snies:   { n: 17, a: 0 },
    snies_update:         { n: 52, a: 0 },
  }
  const { n, a } = baseData[tipo]
  if (hasErrors) {
    return {
      resumen: { nuevas: n, actualizadas: a, omitidas: 3 },
      errores: [
        { fila: 5, columna: 'EAN', mensaje: 'EAN duplicado: 7701234000099' },
        { fila: 12, mensaje: 'Valor fuera de rango en columna Peso' },
        { fila: 23, columna: 'Categoría', mensaje: "Categoría 'Desconocida' no existe en el sistema" },
      ],
    }
  }
  return {
    resumen: { nuevas: n, actualizadas: a, omitidas: 0 },
    errores: [],
  }
}

function handleImportaciones(method: string, path: string, body: unknown, params: URLSearchParams) {
  // Obtener tenantId del token mockeado
  const token = typeof window !== 'undefined' ? (localStorage.getItem('access_token') ?? '') : ''
  const userId = token.replace('mock_', '')
  const user = SEED_USERS.find(u => u.id === userId)
  const tenantId = params.get('tenantId') ?? 'tenant-001'

  // POST /api/admin/importaciones/{tipo}/preview (FMCG y Edu)
  const previewMatch = path.match(/^admin\/importaciones\/(portafolio|categorias|competidores|atributos|calificaciones|elasticidad|canales|competencia|programas|facultades_escuelas|niveles_educativos|ciudades|atributos_r010|calificaciones_edu|asignaciones_snies)\/preview$/)
  if (method === 'POST' && previewMatch) {
    const tipo = previewMatch[1] as MockImportacionRecord['tipo']

    // Simular lock: si ya hay un procesando del mismo tipo para este tenant
    const locked = (store.importacionesV2[tenantId] ?? []).some(
      r => r.tipo === tipo && r.estado === 'procesando'
    )
    if (locked) {
      return Promise.reject({
        response: {
          status: 409,
          data: { error: `Hay una importación de ${TIPO_LABELS[tipo]} en curso, esperá a que termine.` },
        },
      })
    }

    // Simular error según nombre del archivo en FormData (no accesible en mock, usamos flag en body)
    const fileName = body instanceof FormData
      ? (body.get('file') as File | null)?.name ?? ''
      : ''
    const hasErrors = fileName.includes('error')
    const isLockTest = fileName.includes('lock')

    if (isLockTest) {
      return Promise.reject({
        response: {
          status: 409,
          data: { error: `Hay una importación de ${TIPO_LABELS[tipo]} en curso, esperá a que termine.` },
        },
      })
    }

    const previewId = `prev-${newId()}`
    // Registrar preview en memoria para poder confirmarlo
    store.importacionPreviews[previewId] = { tipo, tenantId }

    const { resumen, errores } = buildPreviewResumen(tipo, hasErrors)

    // Simular delay de backend (300ms)
    return new Promise(resolve => setTimeout(() => resolve({
      data: { previewId, tipo, resumen, errores },
      headers: {},
    }), 300))
  }

  // POST /api/admin/importaciones/{previewId}/confirmar
  const confirmarMatch = path.match(/^admin\/importaciones\/(prev-[\w-]+)\/confirmar$/)
  if (method === 'POST' && confirmarMatch) {
    const previewId = confirmarMatch[1]
    const preview = store.importacionPreviews[previewId]

    if (!preview) {
      return Promise.reject({ response: { status: 410, data: { error: 'Preview expirado o no existe. Volvé a subir el archivo.' } } })
    }

    const { tipo, tenantId: pTenantId } = preview

    // Tipos edu usan store.importacionesEdu; el resto usa store.importacionesV2
    const EDU_TIPOS = new Set(['programas', 'facultades_escuelas', 'niveles_educativos', 'ciudades', 'atributos_r010', 'calificaciones_edu', 'asignaciones_snies'])
    const isEduTipo = EDU_TIPOS.has(tipo)

    // Verificar lock según store correcto
    const locked = isEduTipo
      ? (store.importacionesEdu[pTenantId] ?? []).some(
          (r: { tipo: string; estado: string }) => r.tipo === tipo && r.estado === 'procesando'
        )
      : (store.importacionesV2[pTenantId] ?? []).some(
          r => r.tipo === tipo && r.estado === 'procesando'
        )
    if (locked) {
      return Promise.reject({
        response: {
          status: 409,
          data: { error: `Hay una importación de ${TIPO_LABELS[tipo]} en curso, esperá a que termine.` },
        },
      })
    }

    const importId = newId()
    const now = new Date().toISOString()
    const record: MockImportacionRecord = {
      id: importId,
      tenantId: pTenantId,
      tipo,
      usuarioNombre: user?.nombreCompleto ?? 'Admin Prisier',
      usuarioId: user?.id ?? 'user-admin-001',
      archivo: `${tipo}-upload.xlsx`,
      estado: 'procesando',
      filasNuevas: 0,
      filasActualizadas: 0,
      filasOmitidas: 0,
      errores: [],
      blobUrl: null,
      createdAt: now,
    }

    if (isEduTipo) {
      if (!store.importacionesEdu[pTenantId]) store.importacionesEdu[pTenantId] = []
      store.importacionesEdu[pTenantId].push(record as never)
    } else {
      if (!store.importacionesV2[pTenantId]) store.importacionesV2[pTenantId] = []
      store.importacionesV2[pTenantId].push(record)
    }

    // Eliminar preview usado
    delete store.importacionPreviews[previewId]

    // Simular transición procesando → estado final en 2.5 segundos
    const { resumen, errores } = buildPreviewResumen(tipo, false)
    setTimeout(() => {
      if (isEduTipo) {
        const idx = store.importacionesEdu[pTenantId].findIndex((r: { id: string }) => r.id === importId)
        if (idx !== -1) {
          const { nuevas, actualizadas, omitidas } = resumen
          const estadoFinal: 'exitoso' | 'con_advertencias' = omitidas > 0 ? 'con_advertencias' : 'exitoso'
          ;(store.importacionesEdu[pTenantId] as unknown as Record<string, unknown>[])[idx] = {
            ...(store.importacionesEdu[pTenantId] as unknown as Record<string, unknown>[])[idx],
            estado: estadoFinal, filasNuevas: nuevas, filasActualizadas: actualizadas,
            filasOmitidas: omitidas, errores, finalizedAt: new Date().toISOString(),
          }
        }
        return
      }
      const idx = store.importacionesV2[pTenantId].findIndex(r => r.id === importId)
      if (idx !== -1) {
        const { nuevas, actualizadas, omitidas } = resumen
        let estadoFinal: 'exitoso' | 'con_advertencias' | 'fallido'
        if ((nuevas + actualizadas) === 0) {
          estadoFinal = 'fallido'
        } else if (omitidas > 0) {
          estadoFinal = 'con_advertencias'
        } else {
          estadoFinal = 'exitoso'
        }
        store.importacionesV2[pTenantId][idx] = {
          ...store.importacionesV2[pTenantId][idx],
          estado: estadoFinal,
          filasNuevas: nuevas,
          filasActualizadas: actualizadas,
          filasOmitidas: omitidas,
          errores,
          finalizedAt: new Date().toISOString(),
        }
      }
    }, 2500)

    return ok({ importId })
  }

  // DELETE /api/admin/importaciones/{previewId} — cancelar preview
  const deletePreviewMatch = path.match(/^admin\/importaciones\/(prev-[\w-]+)$/)
  if (method === 'DELETE' && deletePreviewMatch) {
    const previewId = deletePreviewMatch[1]
    if (store.importacionPreviews[previewId]) {
      delete store.importacionPreviews[previewId]
    }
    return ok(null, {})
  }

  // GET /api/admin/importaciones/{id}/errores.xlsx — Excel anotado al vuelo
  const erroresXlsxMatch = path.match(/^admin\/importaciones\/([\w-]+)\/errores\.xlsx$/)
  if (method === 'GET' && erroresXlsxMatch) {
    const id = erroresXlsxMatch[1]
    let record: MockImportacionRecord | undefined
    for (const recs of Object.values(store.importacionesV2)) {
      record = recs.find(r => r.id === id)
      if (record) break
    }
    if (!record) return Promise.reject({ response: { status: 404 } })

    const wsData = [
      ['Fila', 'Columna', 'Mensaje de error'],
      ...record.errores.map(e => [e.fila, e.columna ?? '', e.mensaje]),
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Errores')
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    return ok(blob)
  }

  // GET /api/admin/importaciones/{id} — detalle de un registro
  const getOneMatch = path.match(/^admin\/importaciones\/([\w-]+)$/)
  if (method === 'GET' && getOneMatch) {
    const id = getOneMatch[1]
    let record: MockImportacionRecord | undefined
    for (const recs of Object.values(store.importacionesV2)) {
      record = recs.find(r => r.id === id)
      if (record) break
    }
    if (!record) return Promise.reject({ response: { status: 404 } })
    return ok({
      id: record.id,
      tenantId: record.tenantId,
      tipo: record.tipo,
      usuarioId: record.usuarioId,
      usuarioNombre: record.usuarioNombre,
      estado: record.estado,
      archivo: record.archivo,
      filasNuevas: record.filasNuevas,
      filasActualizadas: record.filasActualizadas,
      filasOmitidas: record.filasOmitidas,
      errores: record.errores,
      blobUrl: null,
      createdAt: record.createdAt,
      finalizedAt: record.finalizedAt,
    })
  }

  // GET /api/admin/importaciones?tenantId=&tipo=&estado=&desde=&hasta=&usuario=&page=&page_size=
  if (method === 'GET' && path === 'admin/importaciones') {
    const tid = params.get('tenantId') ?? 'tenant-001'
    let items = [...(store.importacionesV2[tid] ?? [])].reverse()

    const tipo = params.get('tipo')
    const estado = params.get('estado')
    const desde = params.get('desde')
    const hasta = params.get('hasta')
    const usuario = params.get('usuario')

    if (tipo) items = items.filter(r => r.tipo === tipo)
    if (estado) items = items.filter(r => r.estado === estado)
    if (desde) items = items.filter(r => r.createdAt >= desde)
    if (hasta) items = items.filter(r => r.createdAt <= hasta + 'T23:59:59')
    if (usuario) items = items.filter(r => r.usuarioNombre.toLowerCase().includes(usuario.toLowerCase()))

    const total = items.length
    const page = Math.max(1, parseInt(params.get('page') ?? '1'))
    const pageSize = Math.min(100, parseInt(params.get('page_size') ?? '20'))
    const paged = items.slice((page - 1) * pageSize, page * pageSize)

    return ok({ items: paged, total, page, pageSize })
  }

  return null
}

// ─── Educación — Reglas ───────────────────────────────────────────────────────

function handleReglasEdu(method: string, path: string, body: unknown, params: URLSearchParams) {
  const tid = params.get('tenantId') ?? 'tenant-edu-001'

  // ── Portafolio Edu ──────────────────────────────────────────────────────────
  if (method === 'GET' && path === 'reglas/portafolio-edu') {
    const programas = store.programasAcademicos[tid] ?? []
    const asignaciones = store.asignacionesSnies[tid] ?? []
    return ok({ programas, asignaciones })
  }

  if (method === 'PUT' && path === 'reglas/portafolio-edu') {
    const { programas, asignaciones } = body as {
      programas: typeof store.programasAcademicos['tenant-edu-001']
      asignaciones: typeof store.asignacionesSnies['tenant-edu-001']
    }
    store.programasAcademicos[tid] = programas
    store.asignacionesSnies[tid] = asignaciones
    return ok({ programas: store.programasAcademicos[tid], asignaciones: store.asignacionesSnies[tid] })
  }

  // PUT solo asignaciones
  if (method === 'PUT' && path === 'reglas/asignaciones-snies') {
    const { asignaciones } = body as { asignaciones: typeof store.asignacionesSnies['tenant-edu-001'] }
    store.asignacionesSnies[tid] = asignaciones
    return ok(store.asignacionesSnies[tid])
  }

  // ── Categorías Académicas (DEPRECADO P1 2026-05-05 — reemplazado por
  //    Facultades/Escuelas, ver `reglas/facultades-escuelas`). Handler 410
  //    para detectar callers stale en dev sin romper la build.
  if (path === 'reglas/categorias-academicas') {
    return Promise.reject({ response: { status: 410, data: { error: 'Categorías Académicas fue reemplazado por Facultad/Escuela en la decisión P1 2026-05-05.' } } })
  }

  // ── Competidores SNIES (read-only base global) ──────────────────────────────
  if (method === 'GET' && path === 'reglas/competidores-snies') {
    const q = params.get('q')?.toLowerCase() ?? ''
    const nivel = params.get('nivel') ?? ''
    const ciudad = params.get('ciudad') ?? ''
    let items = [...store.sniesGlobal]
    if (q) items = items.filter(s => s.programa.toLowerCase().includes(q) || s.universidad.toLowerCase().includes(q))
    if (nivel) items = items.filter(s => s.nivel === nivel)
    if (ciudad) items = items.filter(s => s.ciudad === ciudad)
    const page = Math.max(1, parseInt(params.get('page') ?? '1'))
    const pageSize = Math.min(1000, parseInt(params.get('page_size') ?? '50'))
    const paged = items.slice((page - 1) * pageSize, page * pageSize)
    return ok({ items: paged, total: items.length })
  }

  // ── Atributos R-010 — edu (por par Facultad × Ciudad, P3 2026-05-05) ────────
  if (method === 'GET' && path === 'reglas/atributos-r010') {
    const facultad = params.get('facultad') ?? ''
    const ciudad   = params.get('ciudad')   ?? ''
    if (facultad && ciudad) {
      // Edu: devolver atributos del par
      const par = `${facultad}|${ciudad}`
      const parMap = store.r010AtributosPar[tid] ?? {}
      return ok(parMap[par] ?? [])
    }
    // FMCG fallback (sin facultad ni ciudad): devolver estructura por categoría
    return ok(store.r010Atributos[tid] ?? [])
  }

  if (method === 'PUT' && path === 'reglas/atributos-r010') {
    const b = body as { facultad?: string; ciudad?: string; categoria?: string; atributos: Array<{ nombre: string; peso: number; orden: number }> }
    if (b.facultad && b.ciudad) {
      // Edu: guardar atributos del par
      const par = `${b.facultad}|${b.ciudad}`
      if (!store.r010AtributosPar[tid]) store.r010AtributosPar[tid] = {}
      store.r010AtributosPar[tid][par] = b.atributos
      return ok({ facultad: b.facultad, ciudad: b.ciudad, atributos: b.atributos })
    }
    // FMCG fallback
    const { categoria, atributos } = b as { categoria: string; atributos: typeof b.atributos }
    if (!store.r010Atributos[tid]) store.r010Atributos[tid] = []
    const idx = store.r010Atributos[tid].findIndex(c => c.categoria === categoria)
    if (idx === -1) store.r010Atributos[tid].push({ categoria, atributos })
    else store.r010Atributos[tid][idx].atributos = atributos
    return ok({ categoria, atributos })
  }

  // ── Matrices de Preferencia (P12 2026-05-05 — por tenant, admin Prisier + consultor_prisier) ──
  if (method === 'GET' && path === 'reglas/matrices-preferencia') {
    return ok(store.matricesPreferencia)
  }

  if (method === 'POST' && path === 'reglas/matrices-preferencia') {
    const m = body as typeof store.matricesPreferencia[0]
    const id = `mp-${Date.now()}`
    // upsert por lock 4-tupla: (tenantId, facultadEscuela, nivelEducativo, ciudad)
    const idx = store.matricesPreferencia.findIndex(x =>
      x.tenantId === m.tenantId &&
      x.facultadEscuela === m.facultadEscuela &&
      x.nivelEducativo === m.nivelEducativo &&
      x.ciudad === m.ciudad
    )
    const stored = { ...m, id, fechaSubida: new Date().toISOString() }
    if (idx === -1) store.matricesPreferencia.push(stored)
    else store.matricesPreferencia[idx] = stored
    return ok(stored)
  }

  if (method === 'DELETE' && path.startsWith('reglas/matrices-preferencia/')) {
    const id = path.split('/').pop()!
    store.matricesPreferencia = store.matricesPreferencia.filter(x => x.id !== id)
    return ok({ deleted: id })
  }

  // ── Calificaciones Edu ──────────────────────────────────────────────────────
  if (method === 'GET' && path === 'reglas/calificaciones-edu') {
    const programaId = params.get('programaId')
    if (!programaId) return Promise.reject({ response: { status: 400 } })
    const programa = (store.programasAcademicos[tid] ?? []).find(p => p.id === programaId)
    if (!programa) return Promise.reject({ response: { status: 404 } })
    const par = `${programa.facultad}|${programa.ciudad}`
    const parAtributos = (store.r010AtributosPar[tid] ?? {})[par] ?? []
    if (parAtributos.length === 0) return ok(null)
    const catAttrs = { atributos: parAtributos }
    const sniesAsignados = (store.asignacionesSnies[tid] ?? []).filter(a => a.programaId === programaId).map(a => a.sniesId)
    const cals = store.r010Calificaciones[tid] ?? []
    const atributos = catAttrs.atributos.map(a => {
      const row = cals.find(c => c.programaId === programaId && c.atributo === a.nombre)
      const califsSnies: Record<string, number> = {}
      for (const sniesId of sniesAsignados) {
        califsSnies[sniesId] = row?.calificacionesSnies[sniesId] ?? 0
      }
      return { nombre: a.nombre, peso: a.peso, calificacionPropia: row?.calificacionPropia ?? 0, calificacionesSnies: califsSnies }
    })
    const vpPropio = atributos.reduce((s, a) => s + a.peso * a.calificacionPropia, 0)
    const vpSnies: Record<string, number> = {}
    for (const sniesId of sniesAsignados) {
      vpSnies[sniesId] = atributos.reduce((s, a) => s + a.peso * (a.calificacionesSnies[sniesId] ?? 0), 0)
    }
    return ok({ programaId, programaNombre: programa.nombre, atributos, vpPropio, vpSnies })
  }

  if (method === 'PUT' && path === 'reglas/calificaciones-edu') {
    const { programaId, modo, sniesId, calificaciones } = body as {
      programaId: string; modo: 'propio' | 'competidor'; sniesId: string | null
      calificaciones: Record<string, number>
    }
    if (!store.r010Calificaciones[tid]) store.r010Calificaciones[tid] = []
    for (const [atributo, valor] of Object.entries(calificaciones)) {
      const idx = store.r010Calificaciones[tid].findIndex(c => c.programaId === programaId && c.atributo === atributo)
      if (idx === -1) {
        store.r010Calificaciones[tid].push({
          programaId, atributo,
          calificacionPropia: modo === 'propio' ? valor : 0,
          calificacionesSnies: modo === 'competidor' && sniesId ? { [sniesId]: valor } : {},
        })
      } else {
        if (modo === 'propio') {
          store.r010Calificaciones[tid][idx].calificacionPropia = valor
        } else if (sniesId) {
          store.r010Calificaciones[tid][idx].calificacionesSnies = {
            ...store.r010Calificaciones[tid][idx].calificacionesSnies,
            [sniesId]: valor,
          }
        }
      }
    }
    return ok({ ok: true })
  }

  // ── Facultades/Escuelas ─────────────────────────────────────────────────────
  if (method === 'GET' && path === 'reglas/facultades-escuelas') {
    return ok(store.facultadesEscuelas[tid] ?? [])
  }

  if (method === 'PUT' && path === 'reglas/facultades-escuelas') {
    const { facultades } = body as { facultades: typeof store.facultadesEscuelas['tenant-edu-001'] }
    store.facultadesEscuelas[tid] = facultades
    return ok(store.facultadesEscuelas[tid])
  }

  // ── Niveles Educativos (POR TENANT, 2026-05-06 reemplaza P2 global) ──────────
  if (method === 'GET' && path === 'reglas/niveles-educativos') {
    return ok(store.nivelesEducativos[tid] ?? [])
  }

  if (method === 'PUT' && path === 'reglas/niveles-educativos') {
    const { niveles } = body as { niveles: typeof store.nivelesEducativos['tenant-edu-001'] }
    store.nivelesEducativos[tid] = niveles
    return ok(store.nivelesEducativos[tid])
  }

  // ── Ciudades ────────────────────────────────────────────────────────────────
  if (method === 'GET' && path === 'reglas/ciudades') {
    return ok(store.ciudadesEdu[tid] ?? [])
  }

  if (method === 'PUT' && path === 'reglas/ciudades') {
    const { ciudades } = body as { ciudades: typeof store.ciudadesEdu['tenant-edu-001'] }
    store.ciudadesEdu[tid] = ciudades
    return ok(store.ciudadesEdu[tid])
  }

  return null
}

// ─── Importaciones Educación ──────────────────────────────────────────────────

const TIPO_LABELS_EDU: Record<string, string> = {
  programas: 'Programas',
  facultades_escuelas: 'Facultades/Escuelas',
  niveles_educativos: 'Niveles Educativos',
  ciudades: 'Ciudades',
  atributos_r010: 'Atributos de Valor Percibido',
  calificaciones_edu: 'Calificaciones Edu',
  asignaciones_snies: 'Asignaciones SNIES',
  snies_update: 'Actualización SNIES',
}

function buildPreviewResumenEdu(tipo: string): {
  resumen: { nuevas: number; actualizadas: number; omitidas: number }
  errores: Array<{ fila: number; columna?: string; mensaje: string }>
} {
  const base: Record<string, { n: number; a: number }> = {
    programas:            { n: 5,  a: 3 },
    facultades_escuelas:  { n: 4,  a: 0 },
    niveles_educativos:   { n: 4,  a: 0 },
    ciudades:             { n: 3,  a: 0 },
    atributos_r010:       { n: 8,  a: 2 },
    calificaciones_edu:   { n: 20, a: 5 },
    asignaciones_snies:   { n: 12, a: 0 },
    snies_update:         { n: 50, a: 15 },
  }
  const { n, a } = base[tipo] ?? { n: 5, a: 0 }
  return { resumen: { nuevas: n, actualizadas: a, omitidas: 0 }, errores: [] }
}

function handleImportacionesEdu(method: string, path: string, _body: unknown, params: URLSearchParams) {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('access_token') ?? '') : ''
  const userId = token.replace('mock_', '')
  const user = SEED_USERS.find(u => u.id === userId)
  const tenantId = params.get('tenantId') ?? 'tenant-edu-001'

  // POST /api/admin/importaciones/snies-update/preview — lock global, solo admin
  if (method === 'POST' && path === 'admin/importaciones/snies-update/preview') {
    if (user?.rol !== 'admin') {
      return Promise.reject({ response: { status: 403, data: { error: 'Solo el rol admin puede actualizar la base SNIES.' } } })
    }
    if (store.sniesUpdateLocked) {
      return Promise.reject({ response: { status: 409, data: { error: 'Hay una importación de SNIES en curso a nivel plataforma, esperá a que termine.' } } })
    }
    const previewId = `prev-snies-${newId()}`
    store.importacionPreviews[previewId] = { tipo: 'snies_update' as typeof store.importacionPreviews[string]['tipo'], tenantId: '__global__' }
    const { resumen, errores } = buildPreviewResumenEdu('snies_update')
    return new Promise(resolve => setTimeout(() => resolve({ data: { previewId, tipo: 'snies_update', resumen, errores }, headers: {} }), 300))
  }

  // POST /api/admin/importaciones/snies-update/{previewId}/confirmar
  const sniesConfirmarMatch = path.match(/^admin\/importaciones\/snies-update\/(prev-[\w-]+)\/confirmar$/)
  if (method === 'POST' && sniesConfirmarMatch) {
    if (user?.rol !== 'admin') {
      return Promise.reject({ response: { status: 403, data: { error: 'Solo el rol admin puede confirmar actualizaciones SNIES.' } } })
    }
    const previewId = sniesConfirmarMatch[1]
    if (!store.importacionPreviews[previewId]) {
      return Promise.reject({ response: { status: 410, data: { error: 'Preview expirado. Volvé a subir el archivo.' } } })
    }
    if (store.sniesUpdateLocked) {
      return Promise.reject({ response: { status: 409, data: { error: 'Hay una importación de SNIES en curso a nivel plataforma, esperá a que termine.' } } })
    }
    store.sniesUpdateLocked = true
    delete store.importacionPreviews[previewId]
    const importId = newId()
    const now = new Date().toISOString()
    const record = {
      id: importId, tenantId: '__global__', tipo: 'snies_update' as 'competencia',
      usuarioNombre: user?.nombreCompleto ?? 'Admin Prisier', usuarioId: user?.id ?? 'user-admin-001',
      archivo: 'snies-update.xlsx', estado: 'procesando' as const,
      filasNuevas: 0, filasActualizadas: 0, filasOmitidas: 0, errores: [], blobUrl: null, createdAt: now,
    }
    if (!store.importacionesV2['__global__']) store.importacionesV2['__global__'] = []
    store.importacionesV2['__global__'].push(record)
    const { resumen } = buildPreviewResumenEdu('snies_update')
    setTimeout(() => {
      store.sniesUpdateLocked = false
      const idx = store.importacionesV2['__global__'].findIndex(r => r.id === importId)
      if (idx !== -1) {
        store.importacionesV2['__global__'][idx] = {
          ...store.importacionesV2['__global__'][idx],
          estado: 'exitoso', filasNuevas: resumen.nuevas, filasActualizadas: resumen.actualizadas,
          filasOmitidas: resumen.omitidas, finalizedAt: new Date().toISOString(),
        }
      }
    }, 2500)
    return ok({ importId })
  }

  // POST /api/admin/importaciones/edu/{tipo}/preview
  const eduPreviewMatch = path.match(/^admin\/importaciones\/edu\/(programas|facultades_escuelas|niveles_educativos|ciudades|atributos_r010|calificaciones_edu|asignaciones_snies)\/preview$/)
  if (method === 'POST' && eduPreviewMatch) {
    const tipo = eduPreviewMatch[1]
    const locked = (store.importacionesEdu[tenantId] ?? []).some(
      (r: { tipo: string; estado: string }) => r.tipo === tipo && r.estado === 'procesando'
    )
    if (locked) {
      return Promise.reject({ response: { status: 409, data: { error: `Hay una importación de ${TIPO_LABELS_EDU[tipo]} en curso, esperá a que termine.` } } })
    }
    const previewId = `prev-edu-${newId()}`
    store.importacionPreviews[previewId] = { tipo: tipo as typeof store.importacionPreviews[string]['tipo'], tenantId }
    const { resumen, errores } = buildPreviewResumenEdu(tipo)
    return new Promise(resolve => setTimeout(() => resolve({ data: { previewId, tipo, resumen, errores }, headers: {} }), 300))
  }

  // POST /api/admin/importaciones/edu/{previewId}/confirmar
  const eduConfirmarMatch = path.match(/^admin\/importaciones\/edu\/(prev-[\w-]+)\/confirmar$/)
  if (method === 'POST' && eduConfirmarMatch) {
    const previewId = eduConfirmarMatch[1]
    const preview = store.importacionPreviews[previewId]
    if (!preview) return Promise.reject({ response: { status: 410, data: { error: 'Preview expirado. Volvé a subir el archivo.' } } })
    const { tipo, tenantId: pTenantId } = preview
    delete store.importacionPreviews[previewId]
    const importId = newId()
    const now = new Date().toISOString()
    const record = {
      id: importId, tenantId: pTenantId, tipo: tipo as 'competencia',
      usuarioNombre: user?.nombreCompleto ?? 'Admin Prisier', usuarioId: user?.id ?? 'user-admin-001',
      archivo: `${tipo}-upload.xlsx`, estado: 'procesando' as const,
      filasNuevas: 0, filasActualizadas: 0, filasOmitidas: 0, errores: [], blobUrl: null, createdAt: now,
    }
    if (!store.importacionesEdu[pTenantId]) store.importacionesEdu[pTenantId] = []
    store.importacionesEdu[pTenantId].push(record as never)
    const { resumen, errores } = buildPreviewResumenEdu(tipo)
    setTimeout(() => {
      const idx = store.importacionesEdu[pTenantId].findIndex((r: { id: string }) => r.id === importId)
      if (idx !== -1) {
        const estadoFinal = errores.length > 0 ? 'con_advertencias' : 'exitoso'
        ;(store.importacionesEdu[pTenantId] as unknown as Record<string, unknown>[])[idx] = {
          ...(store.importacionesEdu[pTenantId] as unknown as Record<string, unknown>[])[idx],
          estado: estadoFinal, filasNuevas: resumen.nuevas, filasActualizadas: resumen.actualizadas,
          filasOmitidas: resumen.omitidas, errores, finalizedAt: new Date().toISOString(),
        }
      }
    }, 2500)
    return ok({ importId })
  }

  // GET /api/admin/importaciones/edu?tenantId=
  if (method === 'GET' && path === 'admin/importaciones/edu') {
    const items = [...(store.importacionesEdu[tenantId] ?? [])].reverse()
    const total = items.length
    const page = Math.max(1, parseInt(params.get('page') ?? '1'))
    const pageSize = Math.min(50, parseInt(params.get('page_size') ?? '20'))
    return ok({ items: items.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize })
  }

  return null
}

// ─── Router principal ─────────────────────────────────────────────────────────
function route<T>(method: string, rawUrl: string, body?: unknown): Promise<{ data: T; headers: Record<string, string> }> {
  const { path, params } = parseUrl(rawUrl)

  const authResult = handleAuth(method, path, body)
  if (authResult) return authResult as Promise<{ data: T; headers: Record<string, string> }>

  if (path === 'tenants' || path.startsWith('tenants/')) {
    const r = handleTenants(method, path, body)
    if (r) return r as Promise<{ data: T; headers: Record<string, string> }>
  }

  if (path === 'users' || path.startsWith('users/')) {
    const r = handleUsers(method, path, body)
    if (r) return r as Promise<{ data: T; headers: Record<string, string> }>
  }

  if (path === 'reglas' || path.startsWith('reglas/')) {
    const r = handleReglas(method, path, body, params)
    if (r) return r as Promise<{ data: T; headers: Record<string, string> }>
  }

  if (path === 'audit-logs' || path.startsWith('audit-logs/')) {
    const r = handleAuditLogs(method, path, params)
    if (r) return r as Promise<{ data: T; headers: Record<string, string> }>
  }

  if (path.startsWith('admin/dashboard')) {
    const r = handleDashboard(method, path)
    if (r) return r as Promise<{ data: T; headers: Record<string, string> }>
  }

  if (path.startsWith('admin/scraper')) {
    const r = handleAdminScraper(method, path, params)
    if (r) return r as Promise<{ data: T; headers: Record<string, string> }>
  }

  // IMPORTANTE: las rutas edu deben evaluarse ANTES que las FMCG porque la regex
  // genérica `getOneMatch` de handleImportaciones (`admin/importaciones/{id}`)
  // matchearía `admin/importaciones/edu` y devolvería 404.
  if (path.startsWith('admin/importaciones/edu') || path.startsWith('admin/importaciones/snies-update')) {
    const r = handleImportacionesEdu(method, path, body, params)
    if (r) return r as Promise<{ data: T; headers: Record<string, string> }>
  }

  if (path === 'admin/importaciones' || path.startsWith('admin/importaciones/')) {
    const r = handleImportaciones(method, path, body, params)
    if (r) return r as Promise<{ data: T; headers: Record<string, string> }>
  }

  if (path.startsWith('reglas/portafolio-edu') || path.startsWith('reglas/asignaciones-snies') ||
      path.startsWith('reglas/facultades-escuelas') || path.startsWith('reglas/niveles-educativos') ||
      path.startsWith('reglas/ciudades') || path.startsWith('reglas/competidores-snies') ||
      path.startsWith('reglas/atributos-r010') || path.startsWith('reglas/calificaciones-edu') ||
      path.startsWith('reglas/matrices-preferencia')) {
    const r = handleReglasEdu(method, path, body, params)
    if (r) return r as Promise<{ data: T; headers: Record<string, string> }>
  }

  console.warn(`[mockApi admin] Unhandled: ${method} /${path}`)
  return Promise.reject({ response: { status: 404, data: { message: `Mock: ruta no encontrada: ${method} /${path}` } } })
}

// ─── Interfaz pública (compatible con axios) ──────────────────────────────────

export interface ApiClient {
  get<T = unknown>(url: string, config?: Record<string, unknown>): Promise<{ data: T; headers: Record<string, string> }>
  post<T = unknown>(url: string, body?: unknown, config?: Record<string, unknown>): Promise<{ data: T; headers: Record<string, string> }>
  put<T = unknown>(url: string, body?: unknown): Promise<{ data: T; headers: Record<string, string> }>
  delete<T = unknown>(url: string): Promise<{ data: T; headers: Record<string, string> }>
  patch<T = unknown>(url: string, body?: unknown): Promise<{ data: T; headers: Record<string, string> }>
}

const mockApi: ApiClient = {
  get: <T>(url: string, _config?: Record<string, unknown>) => route<T>('GET', url),
  post: <T>(url: string, body?: unknown) => route<T>('POST', url, body),
  put: <T>(url: string, body?: unknown) => route<T>('PUT', url, body),
  delete: <T>(url: string) => route<T>('DELETE', url),
  patch: <T>(url: string, body?: unknown) => route<T>('PATCH', url, body),
}

export default mockApi
