export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export const validatePassword = (password) => {
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter'
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter'
  if (!/[0-9]/.test(password)) return 'Password must contain a number'
  return null
}

export const validateMathExpression = (expr) => {
  if (!expr || expr.trim().length === 0) return 'Expression cannot be empty'
  if (expr.length > 1000) return 'Expression is too long (max 1000 chars)'
  // Prevent obviously malicious input (not comprehensive — rely on backend validation)
  if (/[<>{}[\]|\\]/gi.test(expr)) return 'Expression contains invalid characters'
  return null
}

export const validateTopic = (topic) => {
  if (!topic || topic.trim().length === 0) return 'Topic cannot be empty'
  if (topic.length > 200) return 'Topic is too long (max 200 chars)'
  return null
}

export const validateQuestion = (question) => {
  if (!question || question.trim().length === 0) return 'Question cannot be empty'
  if (question.length > 2000) return 'Question is too long (max 2000 chars)'
  return null
}

export const validateAnswer = (answer) => {
  if (!answer || answer.trim().length === 0) return 'Answer cannot be empty'
  if (answer.length > 2000) return 'Answer is too long (max 2000 chars)'
  return null
}

export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && value.trim().length === 0)) {
    return `${fieldName} is required`
  }
  return null
}

export const validateMinLength = (value, min, fieldName) => {
  if (value && value.length < min) {
    return `${fieldName} must be at least ${min} characters`
  }
  return null
}

export const validateMaxLength = (value, max, fieldName) => {
  if (value && value.length > max) {
    return `${fieldName} must not exceed ${max} characters`
  }
  return null
}

export const validateNumber = (value, fieldName) => {
  if (!Number.isInteger(Number(value))) {
    return `${fieldName} must be a valid number`
  }
  return null
}

export const validateRange = (value, min, max, fieldName) => {
  const num = Number(value)
  if (num < min || num > max) {
    return `${fieldName} must be between ${min} and ${max}`
  }
  return null
}

// Combine multiple validators
export const combineValidators = (...validators) => {
  for (const validator of validators) {
    if (validator) return validator
  }
  return null
}
