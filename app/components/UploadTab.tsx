'use client'
import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { supabase } from '@/lib/supabase'

interface UploadTabProps {
  patientId: string
}

export default function UploadTab({ patientId }: UploadTabProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'success' | 'error' | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [documents, setDocuments] = useState<any[]>([])

  useEffect(() => {
    // Load previously uploaded documents
    const loadDocs = async () => {
      const { data } = await supabase.from('documents').select('*')
        .eq('patient_id', patientId).order('created_at', { ascending: false })
      setDocuments(data || [])
    }
    loadDocs()
  }, [patientId, status])

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setStatus(null); setError('')
    if (rejectedFiles.length > 0) {
      const code = rejectedFiles[0].errors[0].code
      if (code === 'file-too-large') setError('File too large. Max 10MB.')
      else if (code === 'file-invalid-type') setError('Invalid type. Only PDF, JPG, PNG allowed.')
      else setError('File not accepted.')
      return
    }
    if (acceptedFiles.length > 0) setFile(acceptedFiles[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  })

  const handleUpload = async () => {
    if (!file) return
    setUploading(true); setProgress(0); setStatus(null); setError('')

    const interval = setInterval(() => {
      setProgress(prev => prev < 85 ? prev + 10 : prev)
    }, 200)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('patient_id', patientId)

      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await response.json()
      clearInterval(interval)

      if (response.ok && data.success) {
        setProgress(100); setStatus('success')
        setMessage('Document uploaded! OCR processing started.')
        setFile(null)
      } else {
        setProgress(0); setStatus('error')
        setError(data.error || 'Upload failed.')
      }
    } catch {
      clearInterval(interval); setProgress(0); setStatus('error')
      setError('Network error. Please try again.')
    } finally { setUploading(false) }
  }

  const handleReset = () => { setFile(null); setStatus(null); setMessage(''); setError(''); setProgress(0) }

  return (
    <div className="space-y-5">
      {/* Upload Box */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-violet-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-lg">📄</span>
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Upload Medical Report</h2>
            <p className="text-slate-500 text-sm">PDF or image — OCR extracts & saves data automatically</p>
          </div>
        </div>

        {!status && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
              ${isDragActive ? 'border-violet-500 bg-violet-50' : 'border-slate-300 hover:border-violet-400 hover:bg-slate-50'}
              ${file ? 'border-emerald-400 bg-emerald-50' : ''}`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div>
                <p className="text-4xl mb-3">📄</p>
                <p className="font-semibold text-slate-700">{file.name}</p>
                <p className="text-sm text-slate-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <p className="text-xs text-emerald-600 mt-2 font-medium">Ready to upload</p>
              </div>
            ) : isDragActive ? (
              <div><p className="text-4xl mb-3">📂</p><p className="text-violet-600 font-semibold">Drop it here!</p></div>
            ) : (
              <div>
                <p className="text-4xl mb-3">☁️</p>
                <p className="text-slate-600 font-medium">Drag & drop your file here</p>
                <p className="text-slate-400 text-sm mt-1">or click to browse</p>
                <p className="text-slate-300 text-xs mt-3">PDF, JPG, PNG — max 10MB</p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-sm">❌ {error}</p>
          </div>
        )}

        {uploading && (
          <div className="mt-5">
            <div className="flex justify-between text-sm text-slate-500 mb-2">
              <span>Uploading...</span><span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5">
              <div className="bg-violet-500 h-2.5 rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="mt-5 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center fade-in">
            <p className="text-4xl mb-2">✅</p>
            <p className="text-emerald-700 font-semibold">{message}</p>
            <button onClick={handleReset} className="mt-3 text-sm text-violet-600 underline hover:text-violet-800">
              Upload another document
            </button>
          </div>
        )}

        {!status && (
          <button onClick={handleUpload} disabled={!file || uploading}
            className="mt-5 w-full py-3 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        )}
      </div>

      {/* Previous Documents */}
      {documents.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">Uploaded Documents ({documents.length})</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {documents.map((doc, i) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600">📄</div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 truncate max-w-xs">{doc.file_url?.split('/').pop()}</p>
                    <p className="text-xs text-slate-400">{new Date(doc.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-violet-600 hover:text-violet-800 font-semibold border border-violet-200 px-3 py-1.5 rounded-xl hover:bg-violet-50 transition-colors">
                  View
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
