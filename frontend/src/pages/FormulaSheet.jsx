import { useState } from 'react'

const FORMULAS = {
  'Algebra': [
    { name: 'Quadratic Formula',         formula: 'x = (-b ± √(b²-4ac)) / 2a',                  note: 'For ax² + bx + c = 0' },
    { name: 'Difference of Two Squares', formula: 'a² - b² = (a+b)(a-b)',                        note: ''                      },
    { name: 'Perfect Square',            formula: '(a+b)² = a² + 2ab + b²',                      note: ''                      },
    { name: 'Sum of Cubes',              formula: 'a³ + b³ = (a+b)(a²-ab+b²)',                   note: ''                      },
    { name: 'Difference of Cubes',       formula: 'a³ - b³ = (a-b)(a²+ab+b²)',                   note: ''                      },
    { name: 'Discriminant',              formula: 'Δ = b² - 4ac',                                 note: 'Δ>0: 2 roots, Δ=0: 1 root, Δ<0: no real roots' },
    { name: 'Index Laws',                formula: 'aᵐ × aⁿ = aᵐ⁺ⁿ, aᵐ ÷ aⁿ = aᵐ⁻ⁿ, (aᵐ)ⁿ = aᵐⁿ', note: '' },
    { name: 'Partial Fractions',         formula: 'A/(x+a) + B/(x+b)',                           note: 'Split rational expressions'   },
  ],
  'Surds & Indices': [
    { name: 'Surd Simplification', formula: '√(ab) = √a × √b',              note: '' },
    { name: 'Rationalising',       formula: '1/√a = √a/a',                   note: 'Multiply top and bottom by √a' },
    { name: 'Conjugate Surd',      formula: '1/(a+√b) = (a-√b)/(a²-b)',     note: '' },
    { name: 'Negative Index',      formula: 'a⁻ⁿ = 1/aⁿ',                   note: '' },
    { name: 'Fractional Index',    formula: 'a^(m/n) = ⁿ√(aᵐ)',             note: '' },
    { name: 'Zero Index',          formula: 'a⁰ = 1 (a ≠ 0)',               note: '' },
  ],
  'Logarithms': [
    { name: 'Definition',         formula: 'logₐ(x) = y ⟺ aʸ = x',             note: '' },
    { name: 'Product Rule',       formula: 'logₐ(xy) = logₐx + logₐy',          note: '' },
    { name: 'Quotient Rule',      formula: 'logₐ(x/y) = logₐx - logₐy',         note: '' },
    { name: 'Power Rule',         formula: 'logₐ(xⁿ) = n logₐx',               note: '' },
    { name: 'Change of Base',     formula: 'logₐx = log x / log a',              note: '' },
    { name: 'Natural Log',        formula: 'ln x = logₑ x,  e ≈ 2.71828',       note: '' },
    { name: 'Log of 1',           formula: 'logₐ(1) = 0',                        note: '' },
    { name: 'Log of Base',        formula: 'logₐ(a) = 1',                        note: '' },
  ],
  'Sequences & Series': [
    { name: 'AP nth term',        formula: 'Tₙ = a + (n-1)d',                    note: 'a = first term, d = common difference' },
    { name: 'AP Sum',             formula: 'Sₙ = n/2 (2a + (n-1)d)',             note: '' },
    { name: 'GP nth term',        formula: 'Tₙ = arⁿ⁻¹',                        note: 'r = common ratio' },
    { name: 'GP Sum (finite)',    formula: 'Sₙ = a(1-rⁿ)/(1-r)',                 note: 'r ≠ 1' },
    { name: 'GP Sum (infinite)',  formula: 'S∞ = a/(1-r)',                        note: '|r| < 1 only' },
    { name: 'Arithmetic Mean',    formula: 'AM = (a+b)/2',                        note: '' },
    { name: 'Geometric Mean',     formula: 'GM = √(ab)',                          note: '' },
  ],
  'Trigonometry': [
    { name: 'SOH-CAH-TOA',        formula: 'sin θ = O/H,  cos θ = A/H,  tan θ = O/A', note: '' },
    { name: 'Pythagorean Identity', formula: 'sin²θ + cos²θ = 1',              note: '' },
    { name: 'Other Identities',   formula: '1 + tan²θ = sec²θ,  1 + cot²θ = cosec²θ', note: '' },
    { name: 'Sine Rule',          formula: 'a/sinA = b/sinB = c/sinC',          note: 'Any triangle' },
    { name: 'Cosine Rule',        formula: 'a² = b² + c² - 2bc cosA',           note: 'Any triangle' },
    { name: 'Area of Triangle',   formula: 'Area = ½ab sinC',                   note: '' },
    { name: 'Double Angle sin',   formula: 'sin 2θ = 2 sin θ cos θ',            note: '' },
    { name: 'Double Angle cos',   formula: 'cos 2θ = cos²θ - sin²θ',           note: '' },
    { name: 'Radians',            formula: 'π rad = 180°,  1 rad ≈ 57.3°',      note: '' },
    { name: 'Arc Length',         formula: 's = rθ',                             note: 'θ in radians' },
    { name: 'Sector Area',        formula: 'A = ½r²θ',                          note: 'θ in radians' },
  ],
  'Calculus': [
    { name: 'Power Rule (diff)',  formula: 'd/dx(xⁿ) = nxⁿ⁻¹',                 note: '' },
    { name: 'Chain Rule',        formula: 'd/dx[f(g(x))] = f\'(g(x))·g\'(x)',  note: '' },
    { name: 'Product Rule',      formula: 'd/dx[uv] = u\'v + uv\'',            note: '' },
    { name: 'Quotient Rule',     formula: 'd/dx[u/v] = (u\'v - uv\')/v²',     note: '' },
    { name: 'Trig Derivatives',  formula: 'd/dx(sinx)=cosx,  d/dx(cosx)=-sinx', note: '' },
    { name: 'Power Rule (int)',  formula: '∫xⁿ dx = xⁿ⁺¹/(n+1) + C',          note: 'n ≠ -1' },
    { name: 'Trig Integrals',    formula: '∫sinx dx = -cosx + C',               note: '' },
    { name: 'Integration by Parts', formula: '∫u dv = uv - ∫v du',             note: '' },
    { name: 'Definite Integral', formula: '∫[a to b] f(x)dx = F(b) - F(a)',    note: '' },
  ],
  'Statistics & Probability': [
    { name: 'Mean (ungrouped)',   formula: 'x̄ = Σx / n',                        note: '' },
    { name: 'Mean (grouped)',     formula: 'x̄ = Σfx / Σf',                      note: '' },
    { name: 'Variance',          formula: 'σ² = Σ(x-x̄)²/n = Σx²/n - x̄²',    note: '' },
    { name: 'Standard Deviation', formula: 'σ = √(Σ(x-x̄)²/n)',                note: '' },
    { name: 'Probability',       formula: 'P(A) = n(A)/n(S)',                    note: 'n(S) = sample space' },
    { name: 'Complement',        formula: 'P(A\') = 1 - P(A)',                  note: '' },
    { name: 'Addition Rule',     formula: 'P(A∪B) = P(A)+P(B)-P(A∩B)',         note: '' },
    { name: 'Independent Events', formula: 'P(A∩B) = P(A)×P(B)',               note: '' },
    { name: 'Permutation',       formula: 'nPr = n!/(n-r)!',                    note: 'Order matters' },
    { name: 'Combination',       formula: 'nCr = n!/r!(n-r)!',                  note: 'Order doesn\'t matter' },
  ],
  'Coordinate Geometry': [
    { name: 'Distance',           formula: 'd = √((x₂-x₁)² + (y₂-y₁)²)',      note: '' },
    { name: 'Midpoint',           formula: 'M = ((x₁+x₂)/2, (y₁+y₂)/2)',       note: '' },
    { name: 'Gradient',           formula: 'm = (y₂-y₁)/(x₂-x₁)',              note: '' },
    { name: 'Line Equation',      formula: 'y - y₁ = m(x - x₁)',                note: '' },
    { name: 'Parallel Lines',     formula: 'm₁ = m₂',                           note: 'Same gradient' },
    { name: 'Perpendicular',      formula: 'm₁ × m₂ = -1',                      note: '' },
    { name: 'Circle Equation',    formula: '(x-a)² + (y-b)² = r²',             note: 'Centre (a,b), radius r' },
    { name: 'General Circle',     formula: 'x² + y² + 2gx + 2fy + c = 0',      note: 'Centre (-g,-f), r=√(g²+f²-c)' },
  ],
  'Mensuration': [
    { name: 'Area — Circle',      formula: 'A = πr²',                            note: '' },
    { name: 'Area — Triangle',    formula: 'A = ½bh',                            note: '' },
    { name: 'Area — Trapezium',   formula: 'A = ½(a+b)h',                       note: '' },
    { name: 'Volume — Cylinder',  formula: 'V = πr²h',                          note: '' },
    { name: 'Volume — Cone',      formula: 'V = ⅓πr²h',                         note: '' },
    { name: 'Volume — Sphere',    formula: 'V = 4/3 πr³',                        note: '' },
    { name: 'Surface — Sphere',   formula: 'SA = 4πr²',                          note: '' },
    { name: 'Volume — Pyramid',   formula: 'V = ⅓ × base area × h',             note: '' },
    { name: 'Curved SA — Cone',   formula: 'CSA = πrl',                          note: 'l = slant height' },
  ],
}

export default function FormulaSheet() {
  const [activeCategory, setActiveCategory] = useState('Algebra')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(null)

  const categories = Object.keys(FORMULAS)

  const displayFormulas = search
    ? Object.values(FORMULAS).flat().filter(f =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.formula.toLowerCase().includes(search.toLowerCase())
      )
    : FORMULAS[activeCategory] || []

  const handleCopy = (formula, idx) => {
    navigator.clipboard.writeText(formula)
    setCopied(idx)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="font-mono text-xs tracking-widest uppercase
                      text-[var(--color-gold)] mb-2 flex items-center gap-3">
          <span className="block w-6 h-px bg-[var(--color-gold)]" />
          Quick Reference
        </p>
        <h1 className="font-serif font-black text-5xl tracking-tight">
          Formula Sheet
        </h1>
        <p className="text-[var(--color-muted)] mt-2">
          All WAEC, NECO and JAMB formulas in one place.
        </p>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search formulas e.g. quadratic, sine rule..."
        className="w-full border-2 border-[var(--color-border)]
                   focus:border-[var(--color-teal)] rounded-2xl px-5 py-3.5
                   text-sm transition-colors mb-6 bg-white"
      />

      {!search && (
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border-2 transition-all
                ${activeCategory === cat
                  ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted)]'}`}>
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        {!search && (
          <div className="bg-[var(--color-ink)] px-6 py-4">
            <p className="font-serif font-bold text-white text-lg">
              📐 {activeCategory}
            </p>
            <p className="text-white/50 text-xs font-mono mt-0.5">
              {displayFormulas.length} formulas
            </p>
          </div>
        )}

        {search && (
          <div className="bg-[var(--color-teal)] px-6 py-4">
            <p className="font-serif font-bold text-white">
              🔍 Search results for "{search}"
            </p>
            <p className="text-white/70 text-xs mt-0.5">
              {displayFormulas.length} formula{displayFormulas.length !== 1 ? 's' : ''} found
            </p>
          </div>
        )}

        {displayFormulas.length === 0 ? (
          <div className="bg-white p-12 text-center">
            <p className="text-[var(--color-muted)]">No formulas found.</p>
          </div>
        ) : (
          <div className="bg-white divide-y divide-[var(--color-border)]">
            {displayFormulas.map((f, i) => (
              <div key={i}
                   className="px-6 py-4 flex items-start gap-4
                              hover:bg-[var(--color-cream)] transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--color-ink)] mb-1">
                    {f.name}
                  </p>
                  <div className="bg-[var(--color-paper)] border border-[var(--color-border)]
                                  rounded-xl px-4 py-2.5 font-mono text-sm
                                  text-[var(--color-teal)] inline-block max-w-full">
                    {f.formula}
                  </div>
                  {f.note && (
                    <p className="text-xs text-[var(--color-muted)] mt-1.5 italic">
                      {f.note}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleCopy(f.formula, i)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity
                             text-xs text-[var(--color-muted)] hover:text-[var(--color-teal)]
                             border border-[var(--color-border)] rounded-lg px-2 py-1"
                >
                  {copied === i ? '✅' : '📋'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}