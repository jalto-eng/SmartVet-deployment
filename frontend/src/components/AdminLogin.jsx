import { useState } from 'react'
import {
  X,
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react'

function AdminLogin({ onClose, onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(
        '/api/admin/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username,
            password
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Invalid login credentials.')
        return
      }

      onLogin(data)

    } catch (err) {
      setError('Unable to connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">

      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-teal-600 text-white p-6 relative">

          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-teal-700"
          >
            <X size={22} />
          </button>

          <ShieldCheck size={48} className="mx-auto mb-3" />

          <h2 className="text-2xl font-bold text-center">
            Admin Login
          </h2>

          <p className="text-teal-50 text-sm text-center mt-2">
            Access the SmartVet management dashboard.
          </p>

        </div>

        {/* Login Form */}
        <form
          onSubmit={handleLogin}
          className="p-6 space-y-5"
        >

          {error && (
            <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* Username */}
          <div>
            <label className="block font-medium mb-2">
              Username
            </label>

            <div className="relative">

              <User
                size={20}
                className="absolute left-3 top-3.5 text-slate-400"
              />

              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                className="w-full border border-slate-300 rounded-lg pl-11 pr-4 py-3 outline-none focus:border-teal-500"
                required
              />

            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block font-medium mb-2">
              Password
            </label>

            <div className="relative">

              <Lock
                size={20}
                className="absolute left-3 top-3.5 text-slate-400"
              />

              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                className="w-full border border-slate-300 rounded-lg pl-11 pr-12 py-3 outline-none focus:border-teal-500"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-slate-500"
              >
                {showPassword
                  ? <EyeOff size={20} />
                  : <Eye size={20} />
                }
              </button>

            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-center text-xs text-slate-500">
            SmartVet • Authorized Personnel Only
          </p>

        </form>
      </div>
    </div>
  )
}

export default AdminLogin