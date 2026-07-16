"use client"

import { useState } from "react"
import { UserPlus, X, AlertCircle, Wrench, Eye, ShieldCheck } from "lucide-react"
import type { ProjectMemberItem } from "@/features/projects/lib/service"
import type { TeamMember } from "@/features/team/lib/service"
import { cn } from "@/lib/utils/cn"

// ─── Config ───────────────────────────────────────────────────────────────────

const PROJECT_ROLE_CONFIG: Record<string, { label: string; badge: string; icon: React.ElementType }> = {
  MANAGER:    { label: "Manager",    badge: "bg-blue-100 text-blue-700",   icon: ShieldCheck },
  TECHNICIAN: { label: "Technician", badge: "bg-slate-100 text-slate-700", icon: Wrench },
  VIEWER:     { label: "Viewer",     badge: "bg-gray-100 text-gray-600",   icon: Eye },
}

const ASSIGNABLE_PROJECT_ROLES = [
  { value: "TECHNICIAN", label: "Technician" },
  { value: "MANAGER",    label: "Manager" },
  { value: "VIEWER",     label: "Viewer" },
]

// ─── Add Member Form ──────────────────────────────────────────────────────────

function AddMemberForm({
  projectId,
  existingUserIds,
  onAdded,
}: {
  projectId: string
  existingUserIds: Set<string>
  onAdded: (member: ProjectMemberItem) => void
}) {
  const [open, setOpen] = useState(false)
  const [companyUsers, setCompanyUsers] = useState<TeamMember[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [role, setRole] = useState("TECHNICIAN")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleOpen() {
    setOpen(true)
    setLoadingUsers(true)
    try {
      const res = await fetch("/api/team")
      const json = await res.json()
      if (json.success) setCompanyUsers(json.data)
    } finally {
      setLoadingUsers(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUserId) return
    setError(null)
    setPending(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, role }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? "Failed to add member")
      onAdded(json.data)
      setOpen(false)
      setSelectedUserId("")
      setRole("TECHNICIAN")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setPending(false)
    }
  }

  const availableUsers = companyUsers.filter(
    (u) => u.status === "ACTIVE" && !existingUserIds.has(u.id),
  )

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        <UserPlus size={16} /> Add Member
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
      <p className="text-sm font-semibold text-slate-900 mb-4">Add Project Member</p>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Team member</label>
          {loadingUsers ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : availableUsers.length === 0 ? (
            <p className="text-sm text-slate-500">All active team members are already on this project.</p>
          ) : (
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a person…</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Project role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ASSIGNABLE_PROJECT_ROLES.map((r) => (
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
            type="submit"
            disabled={pending || !selectedUserId}
            className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {pending ? "Adding…" : "Add to project"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-slate-300 text-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Member Row ───────────────────────────────────────────────────────────────

function MemberRow({
  member,
  projectId,
  isAdmin,
  onRemoved,
}: {
  member: ProjectMemberItem
  projectId: string
  isAdmin: boolean
  onRemoved: (id: string) => void
}) {
  const [pending, setPending] = useState(false)
  const cfg = PROJECT_ROLE_CONFIG[member.role] ?? PROJECT_ROLE_CONFIG.VIEWER
  const RoleIcon = cfg.icon

  async function handleRemove() {
    setPending(true)
    try {
      await fetch(`/api/projects/${projectId}/members/${member.id}`, { method: "DELETE" })
      onRemoved(member.id)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 bg-white">
      <div className="flex-none w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 uppercase">
        {member.user.name.charAt(0)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{member.user.name}</p>
        <p className="text-xs text-slate-500 truncate">{member.user.email}</p>
      </div>

      <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", cfg.badge)}>
        <RoleIcon size={11} />
        {cfg.label}
      </span>

      {isAdmin && (
        <button
          disabled={pending}
          onClick={handleRemove}
          title="Remove from project"
          className="flex-none flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          <X size={15} />
        </button>
      )}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface ProjectMembersPanelProps {
  projectId: string
  initialMembers: ProjectMemberItem[]
  isAdmin: boolean
}

export function ProjectMembersPanel({ projectId, initialMembers, isAdmin }: ProjectMembersPanelProps) {
  const [members, setMembers] = useState(initialMembers)

  const existingUserIds = new Set(members.map((m) => m.userId))

  function handleAdded(member: ProjectMemberItem) {
    setMembers((prev) => {
      const without = prev.filter((m) => m.userId !== member.userId)
      return [...without, member]
    })
  }

  function handleRemoved(memberId: string) {
    setMembers((prev) => prev.filter((m) => m.id !== memberId))
  }

  return (
    <div className="space-y-3">
      {isAdmin && (
        <AddMemberForm
          projectId={projectId}
          existingUserIds={existingUserIds}
          onAdded={handleAdded}
        />
      )}

      {members.length === 0 ? (
        <p className="text-sm text-slate-400">No members added yet.</p>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              projectId={projectId}
              isAdmin={isAdmin}
              onRemoved={handleRemoved}
            />
          ))}
        </div>
      )}
    </div>
  )
}
