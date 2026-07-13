"use client"

import { useState, useRef } from "react"
import { Upload, FileText, X } from "lucide-react"
import { useUploadDrawing } from "@/features/drawings/hooks/use-drawings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils/cn"

interface DrawingUploaderProps {
  projectId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function DrawingUploader({ projectId, onSuccess, onCancel }: DrawingUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState("")
  const [progress, setProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { mutate: upload, isPending, error } = useUploadDrawing(projectId)

  function handleFileSelect(selected: File) {
    if (!selected.name.toLowerCase().endsWith(".pdf")) return
    setFile(selected)
    // Pre-fill name from filename, stripping extension
    if (!name) setName(selected.name.replace(/\.pdf$/i, ""))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !name.trim()) return

    upload(
      { projectId, file, name: name.trim(), onProgress: setProgress },
      {
        onSuccess: () => {
          setFile(null)
          setName("")
          setProgress(0)
          onSuccess?.()
        },
      },
    )
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
      <h3 className="text-base font-semibold text-slate-900 mb-4">Upload drawing set</h3>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error instanceof Error ? error.message : "Upload failed. Please try again."}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Drop zone */}
        <div
          className={cn(
            "relative rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
            isDragging
              ? "border-blue-500 bg-blue-100"
              : file
                ? "border-green-400 bg-green-50"
                : "border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50",
          )}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
          />

          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="text-green-600 shrink-0" size={24} />
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); setName("") }}
                className="ml-auto text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <Upload className="mx-auto mb-2 text-slate-400" size={32} />
              <p className="text-sm font-medium text-slate-700">Drop a PDF here or click to browse</p>
              <p className="mt-1 text-xs text-slate-400">Only PDF files are supported</p>
            </>
          )}
        </div>

        {/* Set name */}
        <div className="space-y-1.5">
          <Label htmlFor="set-name">Drawing set name</Label>
          <Input
            id="set-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Fire Alarm — Issued for Construction"
            required
          />
        </div>

        {/* Upload progress */}
        {isPending && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>{progress < 100 ? "Uploading…" : "Processing PDF…"}</span>
              {progress < 100 && <span>{progress}%</span>}
            </div>
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-200 rounded-full"
                style={{ width: `${progress < 100 ? progress : 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={!file || !name.trim() || isPending} size="sm">
            {isPending ? "Uploading…" : "Upload"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
