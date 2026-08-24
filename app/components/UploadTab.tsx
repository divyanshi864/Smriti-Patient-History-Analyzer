import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { supabase } from '@/lib/supabase'
import { UploadCloud, FileText, CheckCircle2, AlertCircle, FileImage, File } from 'lucide-react'

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
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Upload Box */}
      <div className="bg-white rounded-2xl p-8 border border-slate-200/60">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200/50 shadow-sm">
            <FileText className="w-6 h-6 text-slate-600" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Upload Medical Report</h2>
            <p className="text-slate-500 text-sm mt-0.5 font-medium">Auto-extract details from PDF or image</p>
          </div>
        </div>

        {!status && (
          <div
            {...getRootProps()}
            className={`group relative border border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors duration-200 overflow-hidden
              ${isDragActive ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/50'}
              ${file ? 'border-emerald-300 bg-emerald-50/30' : ''}`}
          >
            <input {...getInputProps()} />
            <div className="relative z-10 flex flex-col items-center">
              {file ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-white rounded-xl border border-emerald-100 flex items-center justify-center mb-4 text-emerald-500">
                    <File className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <p className="text-base font-semibold text-slate-800">{file.name}</p>
                  <p className="text-sm text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <div className="mt-4 text-emerald-600 text-sm font-medium flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Ready to upload
                  </div>
                </div>
              ) : isDragActive ? (
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 text-indigo-500">
                        <UploadCloud className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <p className="text-base text-indigo-600 font-medium">Drop it here!</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-4 text-slate-400 group-hover:text-slate-600 transition-colors duration-200">
                    <UploadCloud className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <p className="text-base text-slate-700 font-medium">Drag & drop your file</p>
                  <p className="text-slate-500 text-sm mt-1">or click to browse from your computer</p>
                  <p className="text-slate-400 text-xs mt-4 uppercase tracking-wide">PDF, JPG, PNG up to 10MB</p>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" strokeWidth={2} />
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {uploading && (
          <div className="mt-8">
            <div className="flex justify-between text-sm mb-3">
              <span className="text-slate-600 font-medium tracking-tight">Uploading document...</span>
              <span className="text-slate-900 font-semibold">{progress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-[#1a1a1a] h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }} 
              />
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="mt-8 p-8 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-emerald-100 mb-4 text-emerald-500">
                <CheckCircle2 className="w-6 h-6" strokeWidth={2} />
            </div>
            <p className="text-emerald-800 text-base font-semibold mb-1">{message}</p>
            <p className="text-emerald-600 text-sm mb-6">Your file is safely stored and being processed.</p>
            <button 
                onClick={handleReset} 
                className="text-sm font-medium text-emerald-700 hover:text-emerald-800 px-4 py-2 hover:bg-emerald-100/50 rounded-lg transition-colors"
            >
              Upload another file
            </button>
          </div>
        )}

        {!status && (
          <button 
            onClick={handleUpload} 
            disabled={!file || uploading}
            className="mt-6 w-full py-3 rounded-xl font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {uploading ? (
                 <span className="flex items-center justify-center gap-2">
                     <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></span>
                     Processing...
                 </span>
            ) : (
                'Upload Document'
            )}
          </button>
        )}
      </div>

      {/* Previous Documents */}
      {documents.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200/60 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Previous Uploads</h2>
            <span className="text-sm text-slate-500">{documents.length} files</span>
          </div>
          <div className="divide-y divide-slate-100">
            {documents.map((doc, i) => (
              <div key={i} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors duration-200">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                      <FileImage className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate max-w-[200px] sm:max-w-xs">{doc.file_url?.split('/').pop()}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
                <a 
                  href={doc.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="shrink-0 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg transition-colors"
                >
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
