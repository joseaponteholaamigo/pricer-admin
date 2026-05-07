import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Building2, Settings, FileText, LogOut, Database } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { isStaff, rolLabel } from '../lib/permissions'
import { useTenantActivo } from '../lib/TenantActivoContext'

const INDUSTRIA_LABEL: Record<string, string> = {
  consumo_masivo: 'Consumo Masivo',
  educacion: 'Educación',
  moda: 'Moda',
}

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/', staffOnly: true },
  { label: 'Tenants', icon: Building2, path: '/tenants', staffOnly: true },
  { label: 'Usuarios', icon: Users, path: '/usuarios', staffOnly: true },
  { label: 'Reglas', icon: Settings, path: '/reglas', staffOnly: false },
  { label: 'Scraper', icon: Database, path: '/scraper', staffOnly: false },
  { label: 'Auditoría', icon: FileText, path: '/auditoria', staffOnly: true },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const { tenantId, tenants, setTenantId, tenant } = useTenantActivo()
  const visibleItems = navItems.filter(i => !i.staffOnly || isStaff(user?.rol))
  const currentPage = visibleItems.find(i => i.path === location.pathname)

  return (
    <div className="flex h-screen bg-p-bg">
      {/* Sidebar */}
      <aside className="w-[220px] flex flex-col bg-p-sidebar border-r border-p-border">
        {/* Logo */}
        <div className="px-5 pt-6 pb-5">
          <div className="bg-white border border-p-border rounded-lg px-3 py-2 inline-block">
            <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Prisier" className="h-[36px] object-contain" />
          </div>
        </div>

        {/* Tenant selector */}
        <div className="px-4 mb-4">
          <label className="text-[10px] font-semibold text-p-gray uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Building2 size={11} />
            Tenant activo
          </label>
          <select
            value={tenantId}
            onChange={e => setTenantId(e.target.value)}
            disabled={tenants.length === 0}
            className="form-input py-1.5 text-sm w-full"
            aria-label="Seleccionar tenant activo"
          >
            {tenants.length === 0 && <option value="">Cargando…</option>}
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
          {tenant && (
            <p className="mt-1 text-[10px] text-p-muted truncate">
              {INDUSTRIA_LABEL[tenant.industria] ?? tenant.industria}
            </p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-item-active' : ''}`
              }
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-p-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-p-lime flex items-center justify-center text-p-dark font-bold text-xs">
              {user?.nombreCompleto?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-p-dark truncate">{user?.nombreCompleto}</p>
              <p className="text-xs text-p-gray truncate">{rolLabel(user?.rol)}</p>
            </div>
            <button
              onClick={logout}
              className="text-p-gray hover:text-p-red transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-8 py-5 flex items-center justify-between bg-white border-b border-p-border">
          <h1 className="text-xl font-bold text-p-dark">
            {currentPage?.label || 'Dashboard'}
          </h1>
          {tenant && (
            <span className="text-xs text-p-gray">
              <span className="text-p-muted">Operando como:</span>{' '}
              <span className="font-medium text-p-dark">{tenant.nombre}</span>{' '}
              <span className="badge badge-blue text-[10px] ml-1">{INDUSTRIA_LABEL[tenant.industria] ?? tenant.industria}</span>
            </span>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
