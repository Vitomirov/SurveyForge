import { useState } from 'react'
import { Layers, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { login } from '@/utils/authStore'

export function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username || !password) { setError('Please enter both username and password.'); return }
    setLoading(true)
    setError('')
    const result = await login(username, password)
    setLoading(false)
    if (result.ok) {
      onLogin(result.session)
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-md">
            <Layers size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink-900 tracking-tight">SurveyForge</h1>
            <p className="text-xs text-ink-400">Research Platform</p>
          </div>
        </div>

        {/* Card */}
        <div className="card p-6">
          <h2 className="text-base font-bold text-ink-800 mb-1">Sign in</h2>
          <p className="text-sm text-ink-400 mb-5">Enter your credentials to access the dashboard.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-ink-500 block mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                placeholder="admin"
                className="input-base"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-500 block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input-base pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-2.5 text-ink-400 hover:text-ink-600 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <AlertCircle size={14} className="text-rose-500 shrink-0" />
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2.5 justify-center disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Default credential hint */}
        <p className="text-center text-xs text-ink-300 mt-4">
          Default: <span className="font-mono">admin</span> / <span className="font-mono">admin123</span>
        </p>
      </div>
    </div>
  )
}
