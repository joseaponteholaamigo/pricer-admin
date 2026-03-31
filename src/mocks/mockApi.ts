// ─── Mock API admin – reemplaza axios en modo VITE_MOCK_MODE=true ─────────────
import { store } from './store'
import { SEED_USERS } from './data'

// ─── Utilidades ──────────────────────────────────────────────────────────────
function ok<T>(data: T): Promise<{ data: T }> {
  return Promise.resolve({ data })
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
    // admin y consultor pueden entrar al admin portal
    if (user.rol !== 'admin' && user.rol !== 'consultor_pricer') {
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
function handleReglas(method: string, path: string, body: unknown) {
  // GET reglas/resumen
  if (method === 'GET' && path === 'reglas/resumen') {
    const r001Ok = Object.values(store.r001).some(v => v.length > 0)
    const r002Ok = store.r002.length > 0
    const r004Ok = store.r004.length > 0
    const r007Ok = store.r007.canales.length > 0
    const r008Ok = store.r008.umbralSuperior > 0
    const r009Ok = store.r009.length > 0
    return ok([
      { tipo: 'R-001', descripcion: 'Mapeo de competidores', configurada: r001Ok, actualizadaEn: '2025-11-15T10:30:00Z', actualizadaPor: 'Consultor Demo' },
      { tipo: 'R-002', descripcion: 'Valor percibido por categoría', configurada: r002Ok, actualizadaEn: '2025-11-20T14:00:00Z', actualizadaPor: 'Consultor Demo' },
      { tipo: 'R-004', descripcion: 'Coeficientes de elasticidad', configurada: r004Ok, actualizadaEn: '2025-11-18T09:00:00Z', actualizadaPor: 'Admin Prisier' },
      { tipo: 'R-005', descripcion: 'Estructura archivo costos', configurada: true, actualizadaEn: '2025-11-10T08:00:00Z', actualizadaPor: 'Admin Prisier' },
      { tipo: 'R-006', descripcion: 'Estructura archivo SKUs/PVP', configurada: true, actualizadaEn: '2025-11-10T08:00:00Z', actualizadaPor: 'Admin Prisier' },
      { tipo: 'R-007', descripcion: 'Canales y márgenes', configurada: r007Ok, actualizadaEn: '2025-11-22T16:00:00Z', actualizadaPor: 'Admin Prisier' },
      { tipo: 'R-008', descripcion: 'Umbrales de alerta', configurada: r008Ok, actualizadaEn: '2025-11-22T16:00:00Z', actualizadaPor: 'Consultor Demo' },
      { tipo: 'R-009', descripcion: 'Peso importancia económica', configurada: r009Ok, actualizadaEn: '2025-11-19T11:00:00Z', actualizadaPor: 'Consultor Demo' },
    ])
  }

  // GET reglas/competidores
  if (method === 'GET' && path === 'reglas/competidores') {
    return ok({
      skus: store.skus,
      competidores: store.competidores,
      mapeo: store.r001,
    })
  }

  // PUT reglas/competidores
  if (method === 'PUT' && path === 'reglas/competidores') {
    const { mapeo } = body as { mapeo: Record<string, string[]> }
    store.r001 = mapeo
    return ok({ mapeo: store.r001 })
  }

  // GET reglas/valor-percibido
  if (method === 'GET' && path === 'reglas/valor-percibido') {
    return ok(store.r002.map(cat => ({
      categoria: cat.categoria,
      atributos: cat.atributos,
      vp: Math.round(cat.atributos.reduce((acc, a) => acc + a.peso * a.calificacion, 0) * 100) / 100,
    })))
  }

  // PUT reglas/valor-percibido
  if (method === 'PUT' && path === 'reglas/valor-percibido') {
    const { categoria, atributos } = body as { categoria: string; atributos: typeof store.r002[0]['atributos'] }
    const idx = store.r002.findIndex(c => c.categoria === categoria)
    if (idx === -1) {
      store.r002.push({ categoria, atributos })
    } else {
      store.r002[idx].atributos = atributos
    }
    const cat = store.r002.find(c => c.categoria === categoria)!
    return ok({
      categoria,
      atributos: cat.atributos,
      vp: Math.round(cat.atributos.reduce((acc, a) => acc + a.peso * a.calificacion, 0) * 100) / 100,
    })
  }

  // GET reglas/elasticidad
  if (method === 'GET' && path === 'reglas/elasticidad') {
    return ok(store.r004.map(e => ({
      ...e,
      skuNombre: store.skus.find(s => s.id === e.skuId)?.nombre ?? e.skuId,
    })))
  }

  // PUT reglas/elasticidad
  if (method === 'PUT' && path === 'reglas/elasticidad') {
    const items = body as typeof store.r004
    store.r004 = items
    return ok(store.r004)
  }

  // GET reglas/costos-config
  if (method === 'GET' && path === 'reglas/costos-config') {
    return ok(store.r005)
  }

  // PUT reglas/costos-config
  if (method === 'PUT' && path === 'reglas/costos-config') {
    store.r005 = body as typeof store.r005
    return ok(store.r005)
  }

  // GET reglas/skus-config
  if (method === 'GET' && path === 'reglas/skus-config') {
    return ok(store.r006)
  }

  // PUT reglas/skus-config
  if (method === 'PUT' && path === 'reglas/skus-config') {
    store.r006 = body as typeof store.r006
    return ok(store.r006)
  }

  // GET reglas/canales-margenes
  if (method === 'GET' && path === 'reglas/canales-margenes') {
    return ok(store.r007)
  }

  // PUT reglas/canales-margenes
  if (method === 'PUT' && path === 'reglas/canales-margenes') {
    store.r007 = body as typeof store.r007
    return ok(store.r007)
  }

  // GET reglas/umbrales
  if (method === 'GET' && path === 'reglas/umbrales') {
    return ok(store.r008)
  }

  // PUT reglas/umbrales
  if (method === 'PUT' && path === 'reglas/umbrales') {
    store.r008 = body as typeof store.r008
    return ok(store.r008)
  }

  // GET reglas/profit-pool
  if (method === 'GET' && path === 'reglas/profit-pool') {
    return ok(store.r009.map(p => ({
      ...p,
      skuNombre: store.skus.find(s => s.id === p.skuId)?.nombre ?? p.skuId,
    })))
  }

  // PUT reglas/profit-pool
  if (method === 'PUT' && path === 'reglas/profit-pool') {
    store.r009 = body as typeof store.r009
    return ok(store.r009)
  }

  return null
}

// ─── Router principal ─────────────────────────────────────────────────────────
function route<T>(method: string, rawUrl: string, body?: unknown): Promise<{ data: T }> {
  const { path, params: _params } = parseUrl(rawUrl)

  const authResult = handleAuth(method, path, body)
  if (authResult) return authResult as Promise<{ data: T }>

  if (path === 'tenants' || path.startsWith('tenants/')) {
    const r = handleTenants(method, path, body)
    if (r) return r as Promise<{ data: T }>
  }

  if (path === 'users' || path.startsWith('users/')) {
    const r = handleUsers(method, path, body)
    if (r) return r as Promise<{ data: T }>
  }

  if (path === 'reglas' || path.startsWith('reglas/')) {
    const r = handleReglas(method, path, body)
    if (r) return r as Promise<{ data: T }>
  }

  console.warn(`[mockApi admin] Unhandled: ${method} /${path}`)
  return Promise.reject({ response: { status: 404, data: { message: `Mock: ruta no encontrada: ${method} /${path}` } } })
}

// ─── Interfaz pública (compatible con axios) ──────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockApi: any = {
  get: <T>(url: string) => route<T>('GET', url),
  post: <T>(url: string, body?: unknown) => route<T>('POST', url, body),
  put: <T>(url: string, body?: unknown) => route<T>('PUT', url, body),
  delete: <T>(url: string) => route<T>('DELETE', url),
  patch: <T>(url: string, body?: unknown) => route<T>('PATCH', url, body),
}

export default mockApi
