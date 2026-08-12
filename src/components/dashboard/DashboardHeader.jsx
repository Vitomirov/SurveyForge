import { useState, useRef, useEffect } from 'react'
import {
  Plus, Settings, LogOut, Users, CreditCard, Building2, Layers, ChevronDown, User,
} from 'lucide-react'
import { APP_NAME } from '@/constants/branding'
import { AUTH_COPY } from '@/constants/authCopy'
import { roleLabel, canManagePlatform, canViewBilling, canManageBilling } from '@/utils/platform/permissions'
import { prefetchBuilder } from '@/utils/routing/routePrefetch'
import { UserAvatar } from './UserAvatar.jsx'

function HeaderNavButton({ icon: Icon, label, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title || label}
      className="inline-flex items-center gap-2 text-sm font-medium text-ink-600 hover:text-ink-900 hover:bg-ink-50 px-3 py-2 rounded-lg transition-colors"
    >
      <Icon size={16} className="text-ink-400" />
      <span className="hidden xl:inline">{label}</span>
    </button>
  )
}

function UserMenu({
  session,
  onLogout,
  onOpenAccount,
  onOpenSettings,
  onOpenTeam,
  onOpenBilling,
  onOpenPlatform,
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const close = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (!session) return null

  const isAdmin = canManagePlatform(session)
  const showBilling = canViewBilling(session)
  const showPlatform = canManageBilling(session)

  const menuItem = (label, Icon, onClick) => (
    <button
      type="button"
      onClick={() => { setOpen(false); onClick?.() }}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50 rounded-lg transition-colors text-left"
    >
      <Icon size={15} className="text-ink-400 shrink-0" />
      {label}
    </button>
  )

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-xl border transition-all ${
          open
            ? 'border-brand-200 bg-brand-50/50 shadow-sm'
            : 'border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50/80'
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <UserAvatar user={session} size="sm" className="ring-2 ring-white" />
        <div className="hidden md:block text-left min-w-0 max-w-[140px] lg:max-w-[180px]">
          <p className="text-sm font-semibold text-ink-800 truncate leading-tight">
            {session.name || session.username}
          </p>
          <p className="text-[11px] text-ink-400 truncate leading-tight">
            {session.organizationName || roleLabel(session.role)}
          </p>
        </div>
        <ChevronDown
          size={14}
          className={`text-ink-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] w-64 bg-white border border-ink-200 rounded-2xl shadow-xl shadow-ink-900/10 p-2 z-50"
        >
          <div className="flex items-center gap-3 px-2 py-2.5 mb-1">
            <UserAvatar user={session} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-800 truncate">
                {session.name || session.username}
              </p>
              <p className="text-xs text-ink-400 truncate">@{session.username}</p>
              {session.organizationName && (
                <p className="text-xs text-ink-500 truncate mt-0.5">{session.organizationName}</p>
              )}
            </div>
          </div>
          <div className="px-2 pb-2">
            <span className="inline-flex text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-full">
              {roleLabel(session.role)}
            </span>
          </div>

          <div className="border-t border-ink-100 my-1.5 pt-1.5 space-y-0.5">
            {menuItem('My account', User, onOpenAccount)}
            {isAdmin && menuItem('Platform settings', Settings, onOpenSettings)}
            {isAdmin && menuItem('Team performance', Users, onOpenTeam)}
            {showBilling && menuItem('Billing', CreditCard, onOpenBilling)}
            {showPlatform && menuItem('Platform console', Building2, onOpenPlatform)}
          </div>

          {onLogout && (
            <>
              <div className="border-t border-ink-100 my-1.5" />
              <button
                type="button"
                onClick={() => { setOpen(false); onLogout() }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-left"
              >
                <LogOut size={15} />
                {AUTH_COPY.signOut}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function DashboardHeader({
  session,
  onNewSurvey,
  onLogout,
  onOpenAccount,
  onOpenSettings,
  onOpenTeam,
  onOpenBilling,
  onOpenPlatform,
}) {
  const showAdminNav = canManagePlatform(session)
  const showBilling = canViewBilling(session)
  const showPlatform = canManageBilling(session)

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-ink-200/80 sticky top-0 z-30 safe-top">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="min-h-[4.25rem] py-3 flex items-center gap-4 lg:gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3 min-w-0 shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl flex items-center justify-center shadow-sm shadow-brand-600/20">
              <Layers size={18} className="text-white" />
            </div>
            <div className="min-w-0 hidden sm:block">
              <p className="font-bold text-ink-900 tracking-tight leading-tight">{APP_NAME}</p>
              <p className="text-xs text-ink-400 leading-tight truncate">
                {session?.organizationName || 'Survey workspace'}
              </p>
            </div>
          </div>

          {/* Page context */}
          <div className="hidden lg:flex items-center min-w-0">
            <div className="h-8 w-px bg-ink-200 mr-5 shrink-0" />
            <div>
              <h1 className="text-sm font-semibold text-ink-800 leading-tight">Surveys</h1>
              <p className="text-xs text-ink-400 leading-tight">Manage, publish, and track responses</p>
            </div>
          </div>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-2 sm:gap-3 min-w-0">
            <nav className="hidden md:flex items-center gap-0.5 p-1 rounded-xl bg-ink-50/80 border border-ink-100">
              {showAdminNav && (
                <>
                  <HeaderNavButton
                    icon={Users}
                    label="Team"
                    onClick={onOpenTeam}
                    title="Team performance"
                  />
                  <HeaderNavButton
                    icon={Settings}
                    label="Settings"
                    onClick={onOpenSettings}
                    title="Platform settings"
                  />
                </>
              )}
              {showBilling && (
                <HeaderNavButton
                  icon={CreditCard}
                  label="Billing"
                  onClick={onOpenBilling}
                  title="Subscription and invoices"
                />
              )}
              {showPlatform && (
                <HeaderNavButton
                  icon={Building2}
                  label="Platform"
                  onClick={onOpenPlatform}
                  title="Platform console"
                />
              )}
            </nav>

            <button
              type="button"
              onClick={onNewSurvey}
              onMouseEnter={prefetchBuilder}
              onFocus={prefetchBuilder}
              className="btn-primary px-4 py-2.5 text-sm font-semibold shadow-sm shadow-brand-600/15 shrink-0"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">New survey</span>
              <span className="sm:hidden">New</span>
            </button>

            <div className="hidden sm:block h-8 w-px bg-ink-200 shrink-0" />

            <UserMenu
              session={session}
              onLogout={onLogout}
              onOpenAccount={onOpenAccount}
              onOpenSettings={onOpenSettings}
              onOpenTeam={onOpenTeam}
              onOpenBilling={onOpenBilling}
              onOpenPlatform={onOpenPlatform}
            />
          </div>
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader
