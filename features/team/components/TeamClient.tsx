"use client"

import { useState } from "react"
import { UserPlus, ShieldCheck, Wrench, Eye, Crown, UserX, UserCheck, AlertCircle } from "lucide-react"
import type { TeamMember } from "@/features/team/lib/service"
import { cn } from "@/lib/utils/cn"

// ─── Role display config ───────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; badge: string; icon: React.ElementType }> = {
  SUPER_ADMIN:     { label: "Super Admin",     badge: "bg-purple-100 text-purple-700", icon: Crown },
  COMPANY_ADMIN:   { label: "Admin",           badge: "bg-blue-100 text-blue-700",     icon: ShieldCheck },
  PROJECT_MANAGER: { label: "Project Manager", badge: "bg-orange-100 text-orange-700", icon: ShieldCheck },
  TECHNICIAN:      { label: "Technician",      badge: "bg-slate-100 text-slate-700",   icon: Wrench },
  VIEWER:          { label: "Viewer",          badge: "bg-gray-100 text-gray-600",     icon: Eye },
}

const ASSIGNABLE_ROLES = [
  { value: "COMPANY_ADMIN",   label: "Admin" },
  { value: "PROJECT_MANAGER", label: "Project Manager" },
  { value: "TECHNICIAN",      label: "Technician" },
  { value: "VIEWER",          label: "Viewer" },
]

// ─── Add User Form ─────────────────────────────────────────────────────────────

function AddUserForm({ onCreated }: { onCreated: (m: TeamMember) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("TECHNICIAN")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? "Failed to create user")
      onCreated(json.data)
      setOpen(false)
      setName(""); setEmail(""); setPassword(""); setRole("TECHNICIAN")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setPending(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        <UserPlus size={16} /> Add User
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
      <p className="text-sm font-semibold text-slate-900 mb-4">New Team Member</p>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Full name</label>
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            required placeholder="Jane Smith"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            required placeholder="jane@example.com"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Temporary password</label>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            required placeholder="Min. 8 characters"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
          <select
            value={role} onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="sm:col-span-2 flex items-center gap-2 text-sm text-red-600">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="sm:col-span-2 flex gap-2 pt-1">
          <button
            type="submit" disabled={pending}
            className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create user"}
          </button>
          <button
            type="button" onClick={() => setOpen(false)}
            className="rounded-md border border-slate-300 text-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── User row ──────────────────────────────────────────────────────────────────

function UserRow({
  member,
  currentUserId,
  isAdmin,
  onUpdate,
}: {
  member: TeamMember
  currentUserId: string
  isAdmin: boolean
  onUpdate: (updated: TeamMember) => void
}) {
  const [pending, setPending] = useState(false)
  const isSelf = member.id === currentUserId
  const cfg = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.VIEWER
  const RoleIcon = cfg.icon

  async function patch(data: Record<string, string>) {
    setPending(true)
    try {
      const res = await fetch(`/api/team/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.success) onUpdate(json.data)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={cn(
      "flex items-center gap-3 p-4 rounded-lg border bg-white",
      member.status === "INACTIVE" ? "border-slate-200 opacity-60" : "border-slate-200",
    )}>
      {/* Avatar */}
      <div className="flex-none w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 uppercase">
        {member.name.charAt(0)}
      </div>

      {/* Name + email */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">
          {member.name}
          {isSelf && <span className="ml-2 text-xs text-slate-400 font-normal">(you)</span>}
        </p>
        <p className="text-xs text-slate-500 truncate">{member.email}</p>
      </div>

      {/* Role badge / selector */}
      {isAdmin && !isSelf ? (
        <select
          value={member.role}
          disabled={pending || member.role === "SUPER_ADMIN"}
          onChange={(e) => patch({ role: e.target.value })}
          className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
        >
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      ) : (
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", cfg.badge)}>
          <RoleIcon size={11} />
          {cfg.label}
        </span>
      )}

      {/* Status toggle */}
      {isAdmin && !isSelf && member.role !== "SUPER_ADMIN" && (
        <button
          disabled={pending}
          onClick={() => patch({ status: member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })}
          title={member.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
          className={cn(
            "flex-none flex items-center justify-center w-8 h-8 rounded-md transition-colors disabled:opacity-50",
            member.status === "ACTIVE"
              ? "text-slate-400 hover:bg-red-50 hover:text-red-500"
              : "text-slate-400 hover:bg-green-50 hover:text-green-600",
          )}
        >
          {member.status === "ACTIVE" ? <UserX size={16} /> : <UserCheck size={16} />}
        </button>
      )}
    </div>
  )
}

// ─── Main export ───────────────────────────────────────────────────────────────

interface TeamClientProps {
  initialMembers: TeamMember[]
  currentUserId: string
  isAdmin: boolean
}

export function TeamClient({ initialMembers, currentUserId, isAdmin }: TeamClientProps) {
  const [members, setMembers] = useState(initialMembers)

  function handleCreated(m: TeamMember) {
    setMembers((prev) => [...prev, m])
  }

  function handleUpdate(updated: TeamMember) {
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
  }

  const active   = members.filter((m) => m.status === "ACTIVE")
  const inactive = members.filter((m) => m.status === "INACTIVE")

  return (
    <div className="space-y-6">
      {isAdmin && <AddUserForm onCreated={handleCreated} />}

      <div className="space-y-2">
        {active.map((m) => (
          <UserRow key={m.id} member={m} currentUserId={currentUserId} isAdmin={isAdmin} onUpdate={handleUpdate} />
        ))}
      </div>

      {inactive.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Inactive</p>
          <div className="space-y-2">
            {inactive.map((m) => (
              <UserRow key={m.id} member={m} currentUserId={currentUserId} isAdmin={isAdmin} onUpdate={handleUpdate} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
