import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import api from '../lib/api'
import { useAuth } from '../lib/auth'
import type { UserListItem, TenantListItem } from '../lib/types'
import { ROLES, labelOf } from '../shared/catalog'

interface UserForm {
  email: string
  nombreCompleto: string
  password: string
  rol: string
  tenantId: string
  estado: string
}

export default function UsersPage() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const isAdmin = currentUser?.rol === 'admin'
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterTenant, setFilterTenant] = useState('')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', filterTenant],
    queryFn: () => {
      const params = filterTenant ? `?tenantId=${filterTenant}` : ''
      return api.get<UserListItem[]>(`/users${params}`).then(r => r.data)
    },
  })

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get<TenantListItem[]>('/tenants').then(r => r.data),
  })

  const { register, handleSubmit, reset, setValue } = useForm<UserForm>({
    defaultValues: { rol: 'cliente', estado: 'activo', tenantId: '' },
  })

  const saveMutation = useMutation({
    mutationFn: (data: UserForm) => {
      const payload = {
        ...data,
        tenantId: data.tenantId || null,
      }
      return editingId
        ? api.put(`/users/${editingId}`, { nombreCompleto: data.nombreCompleto, rol: data.rol, estado: data.estado })
        : api.post('/users', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      closeForm()
    },
  })

  const openCreate = () => {
    setEditingId(null)
    reset({ email: '', nombreCompleto: '', password: '', rol: 'cliente', tenantId: '', estado: 'activo' })
    setShowForm(true)
  }

  const openEdit = (u: UserListItem) => {
    setEditingId(u.id)
    setValue('nombreCompleto', u.nombreCompleto)
    setValue('email', u.email)
    setValue('rol', u.rol)
    setValue('estado', u.estado)
    setValue('tenantId', u.tenantId || '')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    reset()
  }

  const onSubmit = (data: UserForm) => saveMutation.mutate(data)

  const rolLabel = (rol: string) => labelOf(ROLES, rol)

  const estadoBadge = (estado: string) => {
    const cls = estado === 'activo' ? 'badge-green' : 'badge-yellow'
    return <span className={`badge ${cls}`}>{estado}</span>
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-p-lime border-t-transparent" /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <select
            value={filterTenant}
            onChange={(e) => setFilterTenant(e.target.value)}
            className="form-input w-auto"
          >
            <option value="">Todos los tenants</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={18} /> Nuevo Usuario
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-p-dark">{editingId ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
              <button onClick={closeForm}><X size={20} className="text-p-gray" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {!editingId && (
                <>
                  <div>
                    <label className="form-label">Email</label>
                    <input type="email" {...register('email', { required: true })} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Contraseña</label>
                    <input type="password" {...register('password', { required: !editingId })} className="form-input" />
                  </div>
                </>
              )}
              <div>
                <label className="form-label">Nombre Completo</label>
                <input {...register('nombreCompleto', { required: true })} className="form-input" />
              </div>
              <div>
                <label className="form-label">Rol</label>
                <select {...register('rol')} className="form-input">
                  {ROLES
                    .filter(r => isAdmin || r.value === 'cliente')
                    .map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              {!editingId && (
                <div>
                  <label className="form-label">Tenant</label>
                  <select {...register('tenantId')} className="form-input">
                    <option value="">Sin tenant</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
              {editingId && (
                <div>
                  <label className="form-label">Estado</label>
                  <select {...register('estado')} className="form-input">
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm} className="btn-secondary flex-1 justify-center">Cancelar</button>
                <button type="submit" disabled={saveMutation.isPending} className="btn-primary flex-1 justify-center disabled:opacity-50">
                  {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
              {saveMutation.isError && (
                <p className="text-p-red text-sm">Error al guardar el usuario</p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Tenant</th>
              <th>Estado</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium text-p-dark">{u.nombreCompleto}</td>
                <td className="text-p-gray">{u.email}</td>
                <td className="text-p-gray">{rolLabel(u.rol)}</td>
                <td className="text-p-gray">{u.tenantNombre || <span className="text-p-muted">—</span>}</td>
                <td>{estadoBadge(u.estado)}</td>
                <td className="text-right">
                  <button onClick={() => openEdit(u)} className="p-2 text-p-gray hover:text-p-lime rounded-lg hover:bg-p-lime-bg transition-colors" title="Editar">
                    <Pencil size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-p-muted">No hay usuarios</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
