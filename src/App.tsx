import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './lib/auth'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './layouts/AdminLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TenantsPage from './pages/TenantsPage'
import UsersPage from './pages/UsersPage'
import ReglesPage from './pages/ReglesPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/pricer-admin/">
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute allowedRoles={['admin', 'consultor_pricer']} />}>
              <Route element={<AdminLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/tenants" element={<TenantsPage />} />
                <Route path="/usuarios" element={<UsersPage />} />
                <Route path="/reglas" element={<ReglesPage />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
