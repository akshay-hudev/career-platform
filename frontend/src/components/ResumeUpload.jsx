import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Loader2, CheckCircle } from 'lucide-react'
import clsx from 'clsx'

export default function ResumeUpload({ onUpload, loading }) {
  const [fileName, setFileName] = useState(null)

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) {
      setFileName(accepted[0].name)
      onUpload(accepted[0])
    }
  }, [onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: loading,
  })

  return (
    <div
      {...getRootProps()}
      className={clsx(
        'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
        isDragActive ? 'border-brand-500 bg-brand-600/10' : 'border-gray-700 hover:border-gray-600 bg-gray-800/30',
        loading && 'pointer-events-none opacity-60'
      )}
    >
      <input {...getInputProps()} />

      {loading ? (
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 size={32} className="animate-spin text-brand-500" />
          <p className="text-sm font-medium">Parsing resume with AI...</p>
        </div>
      ) : fileName ? (
        <div className="flex flex-col items-center gap-3 text-emerald-400">
          <CheckCircle size={32} />
          <p className="text-sm font-medium">{fileName}</p>
          <p className="text-xs text-gray-500">Drop another PDF to replace</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-gray-400">
          {isDragActive
            ? <Upload size={32} className="text-brand-400" />
            : <FileText size={32} />
          }
          <div>
            <p className="text-sm font-medium text-gray-300">
              {isDragActive ? 'Drop your PDF here' : 'Drag & drop your resume'}
            </p>
            <p className="text-xs text-gray-600 mt-1">PDF only · Max 5MB</p>
          </div>
          <button className="btn-primary text-xs px-4 py-1.5 mt-1">
            Browse File
          </button>
        </div>
      )}
    </div>
  )
}
