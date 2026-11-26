import { useEffect } from 'react'
import {
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react'

export default function ToastNotification({
  message,
  type = 'success',
  onClose
}) {
  useEffect(() => {
    if (!message) return

    const timer = setTimeout(() => {
      onClose()
    }, 5000)

    return () => clearTimeout(timer)
  }, [message, onClose])

  if (!message) return null

  const isError = type === 'error'

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`fixed top-5 right-5 left-5 sm:left-auto
        z-[100] sm:max-w-sm p-4 rounded-xl shadow-xl
        border flex items-start gap-3
        ${isError
          ? 'bg-red-50 border-red-200 text-red-700'
          : 'bg-green-50 border-green-200 text-green-700'
        }`}
    >
      {isError ? (
        <AlertCircle size={24} className="shrink-0" />
      ) : (
        <CheckCircle size={24} className="shrink-0" />
      )}

      <div className="flex-1">
        <h3 className="font-bold">
          {isError ? 'Something went wrong' : 'Success'}
        </h3>

        <p className="text-sm mt-1">
          {message}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close notification"
        className="hover:opacity-60"
      >
        <X size={20} />
      </button>
    </div>
  )
}