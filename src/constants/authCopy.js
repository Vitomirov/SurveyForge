/** Auth UI copy — preserves existing casing per surface (heading vs button vs link). */

export const AUTH_COPY = {
  signIn:              'Sign in',
  signOut:             'Sign out',
  createOrgHeading:    'Create your organization',
  createOrgButton:     'Create organization',
  createOrgLink:       'Create an organization',
  signingIn:           'Signing in…',
  creating:            'Creating…',
}

export const AUTH_VALIDATION = {
  orgRequired:         'Please enter an organization name.',
  nameRequired:        'Please enter your full name.',
  credentialsRequired: 'Please enter a username and password.',
  passwordMinLength:   'Password must be at least 8 characters.',
  passwordsMismatch:   'Passwords do not match.',
  loginRequired:       'Please enter both username and password.',
}

export const AUTH_ERRORS = {
  invalidCredentials:  'Invalid username or password.',
  signupFailed:        'Could not create the organization.',
  usernameTakenSignup: 'That username is already taken.',
  usernameTakenAdmin:  'Username already exists.',
  sessionExpired:      'Session expired. Please sign in again.',
  sessionInvalid:      'Session is no longer valid. Please sign in again.',
  forbidden:           'You don\'t have permission to do that.',
}

export const AUTH_TEAM = {
  heading:             'Team performance',
  subtitle:            'Survey activity by employee',
  surveysBuilt:        'Surveys built',
  responses:           'Responses',
  completion:          'Completion',
  lastActive:          'Last active',
  noActivity:          'No activity yet',
  credentialsOnce:     'Copy these credentials now — the password will not be shown again.',
  passwordResetOnce:   'New password set — copy it now. It will not be shown again.',
}

export const AUTH_BILLING = {
  heading:             'Billing',
  subtitle:            'Subscription and invoices for your organization',
  plan:                'Current plan',
  status:              'Status',
  seats:               'Seats',
  periodEnd:           'Renews / trial ends',
  invoices:            'Invoices',
  noInvoices:          'No invoices yet.',
  supportHeading:      'Support',
  supportSubtitle:     'Message the SurveyForge team',
  supportPlaceholder:  'Describe your question or issue…',
  send:                'Send message',
  platformHeading:     'Platform console',
  platformSubtitle:    'Manage subscriptions and support across organizations',
  organizations:       'Organizations',
  selectOrg:           'Select an organization to manage billing',
}
