const NUGGETS = [
  "Every complex problem can be broken into simpler steps. Start with what you know.",
  "The equals sign (=) was invented by Robert Recorde in 1557 because he was tired of writing 'is equal to'.",
  "π (pi) has been calculated to over 100 trillion digits — and it never repeats.",
  "Zero was formally introduced to mathematics by Brahmagupta in 628 AD.",
  "A prime number has exactly two factors: 1 and itself. There are infinitely many primes.",
  "The Fibonacci sequence appears in sunflower seeds, pinecones, and seashells.",
  "Euler's identity e^(iπ) + 1 = 0 links five fundamental constants of mathematics.",
  "The word 'algebra' comes from the Arabic 'al-jabr', meaning 'reunion of broken parts'.",
  "There are more possible iterations of a game of chess than atoms in the observable universe.",
  "A googol is 10^100. A googolplex is 10^(googol). Both are less than infinity.",
  "The sum of all angles in any triangle is always 180° — on a flat surface.",
  "Negative numbers were considered 'absurd' by many European mathematicians until the 17th century.",
  "Calculus was independently invented by both Newton and Leibniz in the 17th century.",
  "The Pythagorean theorem was known to Babylonian mathematicians over 1,000 years before Pythagoras.",
  "If you shuffle a deck of cards, the order is almost certainly unique in all of human history.",
  "The number 1 is neither prime nor composite — it is a unit.",
  "Matrix multiplication is not commutative: AB ≠ BA in general.",
  "Integration finds the area under a curve; differentiation finds the slope at a point.",
  "In a room of 23 people, there is a 50% chance two share a birthday — the Birthday Paradox.",
  "The harmonic series (1 + 1/2 + 1/3 + ...) diverges — it eventually exceeds any number.",
  "Logarithms were invented by John Napier in 1614 to simplify multiplication into addition.",
  "A quadratic equation can have 0, 1, or 2 real solutions — determined by the discriminant b²-4ac.",
  "The sine and cosine functions repeat every 2π radians — they are periodic.",
  "Standard deviation measures how spread out data is from the mean.",
  "Vectors have both magnitude and direction — unlike scalars which have magnitude only.",
  "De Morgan's Laws: NOT(A AND B) = (NOT A) OR (NOT B).",
  "The determinant of a matrix is zero if and only if the matrix is singular (non-invertible).",
  "Differentiation and integration are inverse operations — this is the Fundamental Theorem of Calculus.",
  "The natural logarithm ln(x) is the logarithm to the base e ≈ 2.71828.",
  "In probability, independent events satisfy P(A and B) = P(A) × P(B).",
]

export function getDailyNugget() {
  const day   = new Date().getDay() + new Date().getDate() + new Date().getMonth()
  const index = day % NUGGETS.length
  return NUGGETS[index]
}

export function getFormattedDate() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  })
}

export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}