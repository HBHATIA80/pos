'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, ShieldCheck, UserPlus, Users } from 'lucide-react'
import toast from 'react-hot-toast'

type Member = {
  id: string
  full_name: string
  phone: string | null
  role: 'admin' | 'staff' | 'user'
  is_active: boolean
  created_at: string
}

type Permission = {
  code: string
  name: string
  module: string
  description: string | null
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'staff' | 'user'>('staff')
  const [selected, setSelected] = useState<string[]>([])

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, Permission[]>>((groups, permission) => {
      groups[permission.module] ??= []
      groups[permission.module].push(permission)
      return groups
    }, {})
  }, [permissions])

  async function loadTeam() {
    setLoading(true)
    const [teamResponse, permissionResponse] = await Promise.all([
      fetch('/api/admin/team', { cache: 'no-store' }),
      fetch('/api/admin/permissions', { cache: 'no-store' }),
    ])

    if (!teamResponse.ok) {
      const data = await teamResponse.json().catch(() => ({}))
      toast.error(data.error ?? 'Unable to load team.')
    } else {
      const data = await teamResponse.json()
      setMembers(data.members ?? [])
    }

    if (permissionResponse.ok) {
      const data = await permissionResponse.json()
      setPermissions(data.permissions ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    void loadTeam()
  }, [])

  function togglePermission(code: string) {
    setSelected((current) => current.includes(code)
      ? current.filter((item) => item !== code)
      : [...current, code])
  }

  async function createMember(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)

    const response = await fetch('/api/admin/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, phone, password, role, permissions: selected }),
    })
    const data = await response.json().catch(() => ({}))

    setSaving(false)

    if (!response.ok) {
      toast.error(data.error ?? 'Unable to create account.')
      return
    }

    toast.success(data.message ?? 'Account created.')
    setFullName('')
    setPhone('')
    setPassword('')
    setRole('staff')
    setSelected([])
    setShowForm(false)
    await loadTeam()
  }

  async function updateMember(profileId: string, action: 'activate' | 'deactivate') {
    const response = await fetch('/api/admin/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, action }),
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      toast.error(data.error ?? 'Unable to update team member.')
      return
    }

    toast.success('Team member updated.')
    await loadTeam()
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-600">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ShieldCheck className="h-4 w-4 text-blue-600" /> Admin
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              Phase 3 · Team
            </span>
            <h1 className="mt-3 text-3xl font-bold text-slate-950">Admin & Staff Management</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Create staff and user accounts for this shop and control their access without changing the future POS data model.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4" /> Add staff / user
          </button>
        </div>

        {showForm && (
          <form onSubmit={createMember} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">Create account</h2>
            <p className="mt-1 text-sm text-slate-500">The account is created inside your current business.</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Full name
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Mobile number
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919876543210" required className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Password
                <input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Account type
                <select value={role} onChange={(e) => setRole(e.target.value as 'staff' | 'user')} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                  <option value="staff">Staff</option>
                  <option value="user">User</option>
                </select>
              </label>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-900">Permissions</h3>
              <p className="mt-1 text-xs text-slate-500">Admins always have full access. These permissions apply to staff/user accounts.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                  <div key={module} className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{module}</div>
                    <div className="space-y-2">
                      {modulePermissions.map((permission) => (
                        <label key={permission.code} className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
                          <input type="checkbox" checked={selected.includes(permission.code)} onChange={() => togglePermission(permission.code)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600" />
                          <span>{permission.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
              <button disabled={saving} type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Create account
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2 font-semibold text-slate-900"><Users className="h-5 w-5 text-blue-600" /> Team</div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading team...</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {members.map((member) => (
                <div key={member.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{member.full_name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${member.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{member.role}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${member.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{member.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{member.phone ?? 'No mobile number'}</p>
                  </div>
                  {member.role !== 'admin' && (
                    <button
                      type="button"
                      onClick={() => void updateMember(member.id, member.is_active ? 'deactivate' : 'activate')}
                      className="min-h-10 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-600"
                    >
                      {member.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </div>
              ))}
              {members.length === 0 && <div className="p-10 text-center text-sm text-slate-500">No team members found.</div>}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
