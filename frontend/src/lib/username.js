// Auto-generated usernames: slug of the user's name + random 4-digit suffix.
// e.g. "Ada Obi" -> "adaobi-4821". Users can change it later in Profile.

export function generateUsername(fullName) {
  const base = (fullName || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 12) || 'student'
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `${base}-${rand}`
}

// 3-20 chars, lowercase letters/digits, may contain . _ - inside, must
// start and end with a letter or digit.
export function isValidUsername(value) {
  return /^[a-z0-9](?:[a-z0-9._-]{1,18}[a-z0-9])?$/.test(value || '')
}
