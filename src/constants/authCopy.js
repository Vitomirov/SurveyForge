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
