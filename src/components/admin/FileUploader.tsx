import React, { useState, useRef } from 'react'
import { UploadCloud, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { api } from '@/lib/api'
import { formatBytes } from '@/lib/utils'

interface FileUploaderProps {
  onUploaded: (result: { file_key: string; public_url: string; filename: string }) => void
  label?: string
  accept?: string
  multiple?: boolean
}

export function FileUploader({
  onUploaded,
  label = 'Enviar arquivo',
  accept,
  multiple = false,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: number }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return
    setError(null)
    setIsUploading(true)
    setProgress(10)
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        setProgress(Math.round(((index + 0.4) / files.length) * 100))
        const res = await api.uploadFile(file)
        setUploadedFiles((prev) => [...prev, { name: file.name, size: file.size }])
        onUploaded(res)
        setProgress(Math.round(((index + 1) / files.length) * 100))
      }
    } catch (err: any) {
      console.error('[Upload error]', err)
      setError(err.message || 'Falha ao realizar upload do arquivo')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const takeFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return
    const files = multiple ? Array.from(list) : [list[0]]
    handleUpload(files)
  }

  const showDropzone = multiple || uploadedFiles.length === 0

  return (
    <div className="space-y-2">
      {label && <label className="block text-xs font-medium text-on-surface-variant">{label}</label>}

      {uploadedFiles.length > 0 && (
        <ul className="space-y-2">
          {uploadedFiles.map((file) => (
            <li
              key={`${file.name}-${file.size}`}
              className="flex items-center justify-between p-3 rounded-xl bg-surface-container border border-outline-variant text-on-surface"
            >
              <div className="flex items-center gap-2 truncate">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="truncate font-medium">{file.name}</span>
                <span className="text-outline font-mono">({formatBytes(file.size)})</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showDropzone && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            takeFiles(e.dataTransfer.files)
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-primary bg-surface-container scale-[1.01]'
              : 'border-outline-variant hover:border-primary bg-surface-container-low hover:bg-surface-container'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={accept}
            multiple={multiple}
            onChange={(e) => takeFiles(e.target.files)}
          />
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-surface-container border border-outline-variant flex items-center justify-center text-on-surface">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-on-surface">
                {isUploading
                  ? 'Enviando arquivo...'
                  : multiple
                    ? 'Clique ou arraste um ou mais arquivos'
                    : 'Clique ou arraste um arquivo até aqui'}
              </p>
              <p className="text-[11px] text-outline mt-0.5">
                PDF, imagens, áudio, vídeo ou TXT (até 100MB cada)
              </p>
            </div>
          </div>

          {isUploading && (
            <div className="w-full bg-surface-container-high rounded-full h-1.5 mt-4 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {!multiple && uploadedFiles.length > 0 && (
        <button
          type="button"
          onClick={() => setUploadedFiles([])}
          className="inline-flex items-center gap-1 text-xs text-outline hover:text-on-surface"
        >
          <X className="w-3.5 h-3.5" />
          Enviar outro arquivo
        </button>
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
