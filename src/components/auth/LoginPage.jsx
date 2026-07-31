import { useState } from 'react'
import { Layers, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { login, signup, DEFAULT_CREDENTIALS } from '@/utils/authStore'
import { AUTH_COPY, AUTH_VALIDATION } from '@/constants/authCopy'
import { APP_NAME, APP_TAGLINE } from '@/constants/branding'

export function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup'

  const [organizationName, setOrganizationName] = useState('')
  const [name,     setName]     = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const isSignup = mode === 'signup'

  const switchMode = (next) => {
    setMode(next)
    setError('')
    setPassword('')
    setConfirm('')
    setShowPass(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (isSignup) {
      if (!organizationName.trim()) { setError(AUTH_VALIDATION.orgRequired); return }
      if (!name.trim())            { setError(AUTH_VALIDATION.nameRequired); return }
      if (!username.trim() || !password) { setError(AUTH_VALIDATION.credentialsRequired); return }
      if (password.length < 8)     { setError(AUTH_VALIDATION.passwordMinLength); return }
      if (password !== confirm)    { setError(AUTH_VALIDATION.passwordsMismatch); return }

      setLoading(true)
      const result = await signup({ organizationName, name, username, password })
      setLoading(false)
      if (result.ok) onLogin(result.session)
      else setError(result.error)
      return
    }

    if (!username || !password) { setError(AUTH_VALIDATION.loginRequired); return }
    setLoading(true)
    const result = await login(username, password)
    setLoading(false)
    if (result.ok) onLogin(result.session)
    else setError(result.error)
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
            <h1 className="text-xl font-bold text-ink-900 tracking-tight">{APP_NAME}</h1>
            <p className="text-xs text-ink-400">{APP_TAGLINE}</p>
          </div>
        </div>

        {/* Card */}
        <div className="card p-6">
          <h2 className="text-base font-bold text-ink-800 mb-1">
            {isSignup ? AUTH_COPY.createOrgHeading : AUTH_COPY.signIn}
          </h2>
          <p className="text-sm text-ink-400 mb-5">
            {isSignup
              ? 'Set up a new workspace and your admin account.'
              : 'Enter your credentials to access the dashboard.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <>
                <div>
                  <label className="text-xs font-semibold text-ink-500 block mb-1.5">Organization name</label>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={e => setOrganizationName(e.target.value)}
                    autoFocus
                    placeholder="Acme Research"
                    className="input-base"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink-500 block mb-1.5">Your full name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoComplete="name"
                    placeholder="Jane Smith"
                    className="input-base"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-semibold text-ink-500 block mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus={!isSignup}
                autoComplete="username"
                placeholder={isSignup ? 'jsmith' : DEFAULT_CREDENTIALS.username}
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
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  placeholder={isSignup ? 'At least 8 characters' : '••••••••'}
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

            {isSignup && (
              <div>
                <label className="text-xs font-semibold text-ink-500 block mb-1.5">Confirm password</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  className="input-base"
                />
              </div>
            )}

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
              {loading
                ? (isSignup ? AUTH_COPY.creating : AUTH_COPY.signingIn)
                : (isSignup ? AUTH_COPY.createOrgButton : AUTH_COPY.signIn)}
            </button>
          </form>
        </div>

        {/* Mode toggle */}
        <p className="text-center text-sm text-ink-400 mt-4">
          {isSignup ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="font-semibold text-brand-600 hover:text-brand-700"
              >
                {AUTH_COPY.signIn}
              </button>
            </>
          ) : (
            <>
              New here?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="font-semibold text-brand-600 hover:text-brand-700"
              >
                {AUTH_COPY.createOrgLink}
              </button>
            </>
          )}
        </p>

        {/* Default credential hint — sign-in only */}
        {!isSignup && (
          <p className="text-center text-xs text-ink-300 mt-2">
            Default: <span className="font-mono">{DEFAULT_CREDENTIALS.username}</span> / <span className="font-mono">{DEFAULT_CREDENTIALS.password}</span>
          </p>
        )}
      </div>
    </div>
  )
}
