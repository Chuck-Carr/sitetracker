"use client"

import { useState } from "react"
import { CheckCircle2, AlertCircle, KeyRound } from "lucide-react"
import { cn } from "@/lib/utils/cn"

export default function AccountPage() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters")
      return
    }

    setPending(true)
    try {
      const res = await fetch("/api/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? "Failed to update password")
      setSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setPending(false)
    }
  }

  const inputClass = cn(
    "w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
    "placeholder:text-slate-400",
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-8 max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Account</h1>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-5">
            <KeyRound size={18} className="text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">Change Password</h2>
          </div>

          {success && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              <CheckCircle2 size={16} />
              Password updated successfully
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Current password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-md bg-blue-600 text-white py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {pending ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
