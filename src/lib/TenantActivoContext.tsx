import { createContext, useContext, useEffect, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from './api'
import type { TenantListItem, Industria } from './types'

interface TenantActivoContextValue {
  tenantId: string
  tenant: TenantListItem | null
  tenants: TenantListItem[]
  industria: Industria | null
  isLoading: boolean
  setTenantId: (id: string) => void
}

const Ctx = createContext<TenantActivoContextValue | null>(null)

const STORAGE_KEY = 'prisier-admin:tenant-activo'

export function TenantActivoProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlTenant = searchParams.get('tenant') ?? ''

  const { data: tenants = [], isLoading } = useQuery<TenantListItem[]>({
    queryKey: ['tenants'],
    queryFn: () => api.get<TenantListItem[]>('tenants').then(r => r.data),
  })

  const tenantId = useMemo(() => {
    if (urlTenant && tenants.some(t => t.id === urlTenant)) return urlTenant
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (stored && tenants.some(t => t.id === stored)) return stored
    return tenants[0]?.id ?? ''
  }, [urlTenant, tenants])

  useEffect(() => {
    if (tenantId && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, tenantId)
    }
  }, [tenantId])

  const setTenantId = useCallback((id: string) => {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('tenant', id)
    else next.delete('tenant')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const tenant = useMemo(
    () => tenants.find(t => t.id === tenantId) ?? null,
    [tenants, tenantId],
  )

  const value: TenantActivoContextValue = {
    tenantId,
    tenant,
    tenants,
    industria: (tenant?.industria as Industria | undefined) ?? null,
    isLoading,
    setTenantId,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTenantActivo() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTenantActivo must be used within TenantActivoProvider')
  return ctx
}
