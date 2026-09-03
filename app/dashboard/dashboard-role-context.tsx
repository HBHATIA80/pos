'use client'

import { createContext, useContext } from 'react'

type DashboardRole = 'admin' | 'staff' | 'user'

const DashboardRoleContext = createContext<DashboardRole>('admin')

export function DashboardRoleProvider({ role, children }: { role: DashboardRole; children: React.ReactNode }) {
  return <DashboardRoleContext.Provider value={role}>{children}</DashboardRoleContext.Provider>
}

export function useDashboardRole() {
  return useContext(DashboardRoleContext)
}
