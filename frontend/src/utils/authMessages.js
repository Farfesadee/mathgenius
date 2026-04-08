const DEFAULT_MESSAGES = {
  login: 'We could not sign you in right now. Please try again.',
  signup: 'We could not create your account right now. Please try again.',
  forgotPassword: 'We could not send the reset link right now. Please check your email address and try again.',
  resetPassword: 'We could not update your password right now. Please try the reset link again.',
  oauth: 'Google sign-in could not start right now. Please try again.',
}

export function getFriendlyAuthMessage(context, rawMessage) {
  const message = rawMessage?.toLowerCase?.() ?? ''

  if (message.includes('invalid login credentials')) {
    return 'That email or password does not look right. Try again or reset your password.'
  }

  if (message.includes('email not confirmed')) {
    return 'Please check your email and confirm your account before signing in.'
  }

  if (message.includes('user already registered')) {
    return 'An account with this email already exists. Try signing in instead.'
  }

  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Too many attempts right now. Please wait a moment and try again.'
  }

  if (message.includes('signup is disabled')) {
    return 'New account creation is not available right now. Please try again later.'
  }

  if (message.includes('same password')) {
    return 'Choose a different password from the one you used before.'
  }

  if (message.includes('password')) {
    if (context === 'resetPassword') {
      return 'Please choose a stronger password and try again.'
    }

    if (context === 'signup') {
      return 'Please choose a stronger password for your account.'
    }
  }

  return DEFAULT_MESSAGES[context] ?? 'Something went wrong. Please try again.'
}
