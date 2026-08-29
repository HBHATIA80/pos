'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  Edit3,
  KeyRound,
  Loader2,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'

type Member = {
  id: string
  full_name: string
  phone: string | null
  role: 'admin' | 'staff' | 'user'
  is_active: boolean
  created_at: string
  permission_codes: string[]
}

type Permission = {
  code: string
  name: string
  module: string
  description: string | null
  sort_order?: number
}

const roleLabel: Record<Member['role'], string> = {
  admin: 'Admin',
  staff: 'Staff',
  user: 'Customer / User',
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
  const [editing, setEditing] = useState<Member | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingRole, setEditingRole] = useState<'staff' | 'user'>('staff')
  const [editingPermissions, setEditingPermissions] = useState<string[]>([])
  const [editingSaving, setEditingSaving] = useState(false)
  const [deleting, setDeleting] = useState<Member | null>(null)
  const [deleteSaving, setDeleteSaving] = useState(false)

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

  function togglePermission(code: string, setter: (value: string[]) => void) {
    setter((current) => current.includes(code)
      ? current.filter((item) => item !== code)
      : [...current, code])
  }

  async function createMember(event: FormEvent) {
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

    toast.success(data.message ?? 'Team member updated.')
    await loadTeam()
  }

  function openEdit(member: Member) {
    setEditing(member)
    setEditingName(member.full_name)
    setEditingRole(member.role === 'user' ? 'user' : 'staff')
    setEditingPermissions(member.permission_codes ?? [])
  }

  async function saveName(event: FormEvent) {
    event.preventDefault()
    if (!editing) return
    setEditingSaving(true)

    const nameResponse = await fetch('/api/admin/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: editing.id, action: 'name', fullName: editingName }),
    })
    const nameData = await nameResponse.json().catch(() => ({}))
    if (!nameResponse.ok) {
      setEditingSaving(false)
      toast.error(nameData.error ?? 'Unable to update name.')
      return
    }

    const accessResponse = await fetch('/api/admin/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: editing.id, action: 'role', role: editingRole }),
    })
    const accessData = await accessResponse.json().catch(() => ({}))
    if (!accessResponse.ok) {
      setEditingSaving(false)
      toast.error(accessData.error ?? 'Unable to update role.')
      await loadTeam()
      return
    }

    const permissionResponse = await fetch('/api/admin/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: editing.id, action: 'permissions', permissions: editingPermissions }),
    })
    const permissionData = await permissionResponse.json().catch(() => ({}))
    setEditingSaving(false)

    if (!permissionResponse.ok) {
      toast.error(permissionData.error ?? 'Unable to update access rights.')
      await loadTeam()
      return
    }

    toast.success('Account name, role and access rights updated.')
    setEditing(null)
    await loadTeam()
  }

  async function deleteMember() {
    if (!deleting) return
    setDeleteSaving(true)
    const response = await fetch('/api/admin/team', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: deleting.id }),
    })
    const data = await response.json().catch(() => ({}))
    setDeleteSaving(false)

    if (!response.ok) {
      toast.error(data.error ?? 'Unable to delete account.')
      return
    }

    toast.success(data.message ?? 'Login account deleted.')
    setDeleting(null)
    await loadTeam()
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-emerald-700">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ShieldCheck className="h-4 w-4 text-emerald-700" /> Admin
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Team & access</span>
            <h1 className="mt-3 text-3xl font-bold text-slate-950">Admin & Staff Management</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Create accounts, change staff/customer access, deactivate logins, or permanently remove a login account without changing your accounting records.
            </p>
          </div>
          <button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800">
            <UserPlus className="h-4 w-4" /> Add staff / user
          </button>
        </div>

        {showForm && (
          <form onSubmit={createMember} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><UserPlus className="h-5 w-5" /></div>
              <div><h2 className="text-lg font-semibold text-slate-900">Create account</h2><p className="mt-1 text-sm text-slate-500">The account is created inside your current business.</p></div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Full name<input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
              <label className="text-sm font-medium text-slate-700">Mobile number<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919876543210" required className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
              <label className="text-sm font-medium text-slate-700">Password<input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
              <label className="text-sm font-medium text-slate-700">Account type<select value={role} onChange={(e) => setRole(e.target.value as 'staff' | 'user')} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"><option value="staff">Staff</option><option value="user">Customer / User</option></select></label>
            </div>
            <PermissionPicker permissions={permissions} groupedPermissions={groupedPermissions} selected={selected} onToggle={(code) => togglePermission(code, setSelected)} />
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowForm(false)} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button disabled={saving} type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Create account</button></div>
          </form>
        )}

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2 font-semibold text-slate-900"><Users className="h-5 w-5 text-emerald-700" /> Team <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{members.length}</span></div>
          </div>
          {loading ? <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading team...</div> : <div className="divide-y divide-slate-100">
            {members.map((member) => <div key={member.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">{member.full_name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${member.role === 'admin' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{roleLabel[member.role]}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${member.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{member.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{member.phone ?? 'No mobile number'}</p>
                {member.role !== 'admin' && <p className="mt-2 text-xs text-slate-500">{member.permission_codes.length} access right{member.permission_codes.length === 1 ? '' : 's'} assigned</p>}
              </div>
              {member.role !== 'admin' && <div className="flex flex-wrap gap-2 sm:justify-end">
                <button type="button" onClick={() => openEdit(member)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-400 hover:text-emerald-700"><KeyRound className="h-4 w-4" /> Edit access</button>
                <button type="button" onClick={() => openEdit(member)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-400 hover:text-emerald-700"><Edit3 className="h-4 w-4" /> Edit name</button>
                <button type="button" onClick={() => void updateMember(member.id, member.is_active ? 'deactivate' : 'activate')} className="min-h-10 rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-400 hover:text-emerald-700">{member.is_active ? 'Deactivate' : 'Activate'}</button>
                <button type="button" onClick={() => setDeleting(member)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 px-3.5 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Delete</button>
              </div>}
            </div>)}
            {members.length === 0 && <div className="p-10 text-center text-sm text-slate-500">No team members found.</div>}
          </div>}
        </div>
      </section>

      {editing && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-3 sm:p-5">
        <form onSubmit={saveName} className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
            <div><div className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-emerald-700" /><h2 className="text-lg font-bold text-slate-900">Manage account access</h2></div><p className="mt-1 text-xs text-slate-500">Change the display name, account type and individual permissions.</p></div>
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
          <div className="overflow-y-auto px-5 py-5 sm:px-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">Name<input value={editingName} onChange={(e) => setEditingName(e.target.value)} required minLength={2} maxLength={120} className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
              <label className="text-sm font-semibold text-slate-700">Account type<select value={editingRole} onChange={(e) => setEditingRole(e.target.value as 'staff' | 'user')} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"><option value="staff">Staff</option><option value="user">Customer / User</option></select></label>
            </div>
            <PermissionPicker permissions={permissions} groupedPermissions={groupedPermissions} selected={editingPermissions} onToggle={(code) => togglePermission(code, setEditingPermissions)} />
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6"><button type="button" onClick={() => setEditing(null)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">Cancel</button><button disabled={editingSaving} type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{editingSaving && <Loader2 className="h-4 w-4 animate-spin" />}Save changes</button></div>
        </form>
      </div>}

      {deleting && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-700"><AlertTriangle className="h-5 w-5" /></div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">Delete login account?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">This permanently removes <strong>{deleting.full_name}</strong> from the login/team accounts. This cannot be undone.</p>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Business transactions and the linked customer/party record are not deleted by this action, so accounting history remains intact. The person will no longer be able to sign in.</div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setDeleting(null)} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700">Cancel</button><button type="button" disabled={deleteSaving} onClick={() => void deleteMember()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50">{deleteSaving && <Loader2 className="h-4 w-4 animate-spin" />}Delete permanently</button></div>
        </div>
      </div>}
    </main>
  )
}

function PermissionPicker({
  permissions,
  groupedPermissions,
  selected,
  onToggle,
}: {
  permissions: Permission[]
  groupedPermissions: Record<string, Permission[]>
  selected: string[]
  onToggle: (code: string) => void
}) {
  if (permissions.length === 0) return null

  return <div className="mt-6">
    <div className="flex items-end justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-900">Permissions</h3><p className="mt-1 text-xs text-slate-500">Select exactly what this account can access. Admins always retain full access.</p></div><span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">{selected.length} selected</span></div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(groupedPermissions).map(([module, modulePermissions]) => <div key={module} className="rounded-xl border border-slate-200 p-3">
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{module}</div>
        <div className="space-y-2">{modulePermissions.map((permission) => <label key={permission.code} className="flex cursor-pointer items-start gap-2 rounded-lg px-1 py-1 text-sm text-slate-700 hover:bg-slate-50"><input type="checkbox" checked={selected.includes(permission.code)} onChange={() => onToggle(permission.code)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500" /><span><span className="font-medium">{permission.name}</span>{permission.description && <span className="mt-0.5 block text-[11px] leading-4 text-slate-400">{permission.description}</span>}</span></label>)}</div>
      </div>)}
    </div>
  </div>
}
