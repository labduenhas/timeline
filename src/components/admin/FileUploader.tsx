import React, { useState, useRef } from 'react'
import { UploadCloud, CheckCircle2, AlertCircle, FileText, X } from 'lucide-react'
import { api } from '@/lib/api'
import { formatBytes } from '@/lib/utils'

interface FileUploaderProps {
  onUploaded: (result: { file_key: string; public_url: string; filename: string }) => void
  label?: string
  accept?: string
}

export function FileUploader({
  onUploaded,
  label = 'Enviar Arquivo para o Cloudflare R2',
  accept,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File) => {
    setError(null)
    setIsUploading(true)
    setProgress(30)

    try {
      setProgress(60)
      const res = await api.uploadFile(file)
      setProgress(100)
      setUploadedFile({ name: file.name, size: file.size })
      onUploaded(res)
    } catch (err: any) {
      console.error('[Upload error]', err)
      setError(err.message || 'Falha ao realizar upload do arquivo')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0])
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0])
    }
  }

  return (
    <div className="space-y-2">
      {label && <label className="block text-xs font-medium text-gray-300">{label}</label>}

      {uploadedFile ? (
        <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-xs text-indigo-200">
          <div className="flex items-center gap-2 truncate">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="truncate font-medium">{uploadedFile.name}</span>
            <span className="text-gray-400 font-mono">({formatBytes(uploadedFile.size)})</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadedFile(null)}
            className="text-gray-400 hover:text-white ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
              : 'border-white/10 hover:border-indigo-500/50 bg-gray-900/50 hover:bg-gray-900/80'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={accept}
            onChange={handleFileChange}
          />
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">
                {isUploading ? 'Enviando arquivo...' : 'Clique ou arraste um arquivo até aqui'}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                PDF, Imagens, Áudio, Vídeo ou TXT (Limite de até 100MB)
              </p>
            </div>
          </div>

          {/* Progress bar */}
          {isUploading && (
            <div className="w-full bg-gray-800 rounded-full h-1.5 mt-4 overflow-hidden">
              <div
                className="bg-indigo-500 h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
