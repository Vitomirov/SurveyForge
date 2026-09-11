import { useState, useEffect } from 'react'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { AppLogo } from '@/components/shared/branding/AppLogo.jsx'
import { login, signup, DEFAULT_CREDENTIALS } from '@/utils/data/authStore'
import { prefetchForRoute } from '@/utils/routing/routePrefetch'
import { AUTH_COPY, AUTH_VALIDATION } from '@/constants/authCopy'
import { APP_TAGLINE } from '@/constants/branding'
import { SignupPlanPanelAside, SignupPlanPanelCompact } from '@/components/auth/SignupPlanPanel.jsx'
import { PricingCompareLink } from '@/website/components/Pricing.jsx'
import { nav } from '@/utils/routing/appRoute'
import { normalizeSignupPlanId } from '@shared/planCatalog.js'

export function LoginPage({ onLogin, initialMode = 'login', onGoHome, signupPlanId = 'free_trial' }) {
  const [mode, setMode] = useState(initialMode)

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  const [organizationName, setOrganizationName] = useState('')
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
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
    if (next === 'signup') {
      nav('signup', null, { plan: normalizeSignupPlanId(signupPlanId) })
    } else if (initialMode === 'signup' || signupPlanId) {
      nav('login')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (isSignup) {
      if (!organizationName.trim()) { setError(AUTH_VALIDATION.orgRequired); return }
      if (!name.trim())            { setError(AUTH_VALIDATION.nameRequired); return }
      if (!email.trim() || !password) { setError(AUTH_VALIDATION.credentialsRequired); return }
      if (password.length < 8)     { setError(AUTH_VALIDATION.passwordMinLength); return }
      if (password !== confirm)    { setError(AUTH_VALIDATION.passwordsMismatch); return }

      setLoading(true)
      const result = await signup({
        organizationName,
        name,
        email,
        password,
        intendedPlanId: normalizeSignupPlanId(signupPlanId),
      })
      setLoading(false)
      if (result.ok) {
        prefetchForRoute({ session: result.session })
        onLogin(result.session)
      } else setError(result.error)
      return
    }

    if (!email || !password) { setError(AUTH_VALIDATION.loginRequired); return }
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result.ok) {
      prefetchForRoute({ session: result.session })
      onLogin(result.session)
    } else setError(result.error)
  }


  const modeToggle = (
    <p className="text-sm text-ink-500 mt-5">
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
  )

  const authForm = (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {isSignup && (
        <>
          <div>
            <label className="text-xs font-semibold text-ink-600 block mb-1">Organization name</label>
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
            <label className="text-xs font-semibold text-ink-600 block mb-1">Your full name</label>
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
        <label className="text-xs font-semibold text-ink-600 block mb-1">
          {isSignup ? 'Work email' : 'Email'}
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoFocus={!isSignup}
          autoComplete="email"
          placeholder={isSignup ? 'jane@company.com' : (import.meta.env.DEV ? DEFAULT_CREDENTIALS.email : 'you@company.com')}
          className="input-base"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-ink-600 block mb-1">Password</label>
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
            aria-label={showPass ? 'Hide password' : 'Show password'}
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {isSignup && (
        <div>
          <label className="text-xs font-semibold text-ink-600 block mb-1">Confirm password</label>
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
        className="w-full btn-primary py-2.5 justify-center disabled:opacity-60 mt-1"
      >
        {loading
          ? (isSignup ? AUTH_COPY.creating : AUTH_COPY.signingIn)
          : (isSignup ? AUTH_COPY.createAccountButton : AUTH_COPY.signIn)}
      </button>
    </form>
  )

  if (isSignup) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex flex-col lg:flex-row bg-white safe-top safe-bottom">
        <SignupPlanPanelAside planId={signupPlanId} />

        <div className="flex-1 flex flex-col lg:justify-center px-5 py-6 sm:px-10 lg:px-12 xl:px-16 lg:py-12 overflow-y-auto">
          <div className="w-full max-w-md sm:max-w-xl mx-auto pb-6">
            <header className="flex items-center justify-between gap-4 mb-6 lg:mb-10">
              <AppLogo size="md" className="w-[140px] sm:w-[160px]" onClick={onGoHome} />
              {onGoHome && (
                <button
                  type="button"
                  onClick={onGoHome}
                  className="text-sm font-medium text-ink-500 hover:text-brand-700 shrink-0"
                >
                  Back to site
                </button>
              )}
            </header>

            <SignupPlanPanelCompact planId={signupPlanId} />

            <div className="mt-6 lg:mt-0">
              <h1 className="text-xl sm:text-2xl font-bold text-ink-900 tracking-tight text-center lg:text-left">
                Create your account
              </h1>
              <p className="mt-2 text-sm text-ink-500 text-center lg:text-left">
                Set up your organization in a minute. You can invite teammates after signup.
              </p>
              {onGoHome && (
                <p className="mt-3 text-center lg:text-left">
                  <PricingCompareLink />
                </p>
              )}
            </div>

            <div className="mt-6">{authForm}</div>
            <div className="text-center">{modeToggle}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center p-4 sm:p-6 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <AppLogo size="lg" className="w-[min(280px,80vw)]" onClick={onGoHome} />
          <p className="text-xs text-ink-400 mt-3">{APP_TAGLINE}</p>
          {onGoHome && (
            <button
              type="button"
              onClick={onGoHome}
              className="mt-4 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              ← Back to home
            </button>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-base font-bold text-ink-800 mb-1">{AUTH_COPY.signIn}</h2>
          <p className="text-sm text-ink-400 mb-5">
            Enter your credentials to access the dashboard.
          </p>
          {authForm}
        </div>

        <div className="text-center mt-4">{modeToggle}</div>
      </div>
    </div>
  )
}

export default LoginPage
