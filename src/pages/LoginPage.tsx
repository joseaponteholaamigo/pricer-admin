import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true'

type DemoUser = {
  label: string
  description: string
  email: string
  password: string
}

const DEMO_USER_GROUPS: { title: string; users: DemoUser[] }[] = [
  {
    title: 'Administración Prisier',
    users: [
      {
        label: 'Administrador',
        description: 'Acceso total a la plataforma',
        email: 'admin@prisier.com',
        password: '123456',
      },
    ],
  },
  {
    title: 'Consultores Prisier',
    users: [
      {
        label: 'Consultor Consumo Masivo + Educación',
        description: 'Acceso a ambas verticales',
        email: 'consultor@prisier.com',
        password: '123456',
      },
      {
        label: 'Consultor Educación',
        description: 'Acceso solo a la vertical de Educación',
        email: 'consultor.edu@prisier.com',
        password: '123456',
      },
      {
        label: 'Consultor Multi-Vertical',
        description: 'Acceso a todas las verticales',
        email: 'consultor.multi@prisier.com',
        password: '123456',
      },
    ],
  },
  {
    title: 'Clientes (Congrupo)',
    users: [
      {
        label: 'Cliente Consumo Masivo — Editor',
        description: 'Editor de la vertical Consumo Masivo',
        email: 'editor@congrupo.com',
        password: '123456',
      },
      {
        label: 'Cliente Educación — Editor',
        description: 'Editor de la vertical Educación',
        email: 'editor.edu@congrupo.com',
        password: '123456',
      },
    ],
  },
]

export default function LoginPage() {
  const { user, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch {
      setError('Email o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-p-bg flex items-center justify-center">
      <div className="card p-8 w-full max-w-md shadow-lg">
        <div className="text-center mb-8">
          <div className="inline-block bg-white border border-p-border rounded-xl px-4 py-2 mb-4">
            <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Prisier" className="h-10 object-contain" />
          </div>
          <p className="text-p-gray text-sm">Backoffice Administrativo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-p-red p-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}
          <div>
            <label className="form-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <div>
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        {MOCK_MODE && (
          <div className="mt-6 pt-5 border-t border-p-border">
            <p className="text-xs font-semibold text-p-gray uppercase tracking-wider mb-3">
              Acceso rápido (modo demo)
            </p>
            <div className="space-y-4">
              {DEMO_USER_GROUPS.map((group) => (
                <div key={group.title} className="space-y-2">
                  <p className="text-[11px] font-semibold text-p-gray uppercase tracking-wider">
                    {group.title}
                  </p>
                  <div className="space-y-2">
                    {group.users.map((u) => (
                      <button
                        key={u.email}
                        type="button"
                        onClick={() => { setEmail(u.email); setPassword(u.password) }}
                        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-p-bg hover:bg-p-border border border-p-border transition-colors text-left"
                      >
                        <span className="flex flex-col min-w-0">
                          <span className="text-sm text-p-text font-medium truncate">{u.label}</span>
                          <span className="text-xs text-p-gray truncate">{u.description}</span>
                        </span>
                        <span className="text-xs text-p-gray whitespace-nowrap">{u.email}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
