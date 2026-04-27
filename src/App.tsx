import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './lib/auth'
import { ToastProvider } from './components/ToastProvider'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './layouts/AdminLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TenantsPage from './pages/TenantsPage'
import UsersPage from './pages/UsersPage'
import ReglesPage from './pages/ReglesPage'
import MonitoreoScraperPage from './pages/MonitoreoScraperPage'
import AuditLogsPage from './pages/AuditLogsPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
      <BrowserRouter basename="/prisier-admin/">
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute allowedRoles={['admin', 'consultor_prisier']} />}>
              <Route element={<AdminLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/tenants" element={<TenantsPage />} />
                <Route path="/usuarios" element={<UsersPage />} />
                <Route path="/reglas" element={<ReglesPage />} />
                <Route path="/scraper" element={<MonitoreoScraperPage />} />
                <Route path="/auditoria" element={<AuditLogsPage />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default App
