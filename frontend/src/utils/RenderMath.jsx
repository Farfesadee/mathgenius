import { Fragment } from 'react'
import { InlineMath, BlockMath } from 'react-katex'

// ── Safe KaTeX renderers ──────────────────────────────────────────────────────
function SafeBlock({ math }) {
  if (!math?.trim()) return null
  try {
    return (
      <div className="my-4 overflow-x-auto bg-[var(--color-paper)]
                      border border-[var(--color-border)] rounded-xl p-5 text-center">
        <BlockMath math={math.trim()} />
      </div>
    )
  } catch {
    return (
      <div className="my-4 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
        <code className="text-sm text-red-500">{math}</code>
      </div>
    )
  }
}

function SafeInline({ math }) {
  const clean = (math || '')
    // A line-break inside INLINE math is meaningless (it belongs to display
    // blocks) — turn it into a comma so readers never see raw "\\".
    .replace(/\\\\/g, ', ')
    .trim()
  if (!clean) return null
  try {
    return <InlineMath math={clean} />
  } catch {
    return <code className="text-sm text-[var(--color-teal)] bg-[var(--color-cream)] px-1 rounded">{clean}</code>
  }
}

// ── Inline markdown (**bold**, `code`, *italic*) — React-safe, no innerHTML ──
function InlineMd({ text }) {
  const segs = text.split(/(\*\*.+?\*\*|`[^`]+`|\*[^*\n]+\*)/g)
  return (
    <>
      {segs.map((s, j) => {
        if (s.startsWith('**') && s.endsWith('**') && s.length > 4) {
          return <strong key={j}>{s.slice(2, -2)}</strong>
        }
        if (s.startsWith('`') && s.endsWith('`') && s.length > 2) {
          return (
            <code key={j} className="px-1.5 py-0.5 rounded-md bg-[var(--color-teal)]/10
                                    font-mono text-xs text-[var(--color-teal)]">
              {s.slice(1, -1)}
            </code>
          )
        }
        if (s.startsWith('*') && s.endsWith('*') && s.length > 2) {
          return <em key={j}>{s.slice(1, -1)}</em>
        }
        return <Fragment key={j}>{s}</Fragment>
      })}
    </>
  )
}

// ── Parse [math]...[/math] and [m]...[/m] tags ───────────────────────────────
export function RenderMath({ text }) {
  if (!text) return null

  // Split on [math]...[/math] (block) and [m]...[/m] (inline)
  const tokens = text.split(/(\[math\][\s\S]*?\[\/math\]|\[m\][^\]]*?\[\/m\])/g)

  return (
    <>
      {tokens.map((token, i) => {
        // Block math [math]...[/math]
        if (token.startsWith('[math]') && token.endsWith('[/math]')) {
          const math = token.slice(6, -7).trim()
          return <SafeBlock key={i} math={math} />
        }
        // Inline math [m]...[/m]
        if (token.startsWith('[m]') && token.endsWith('[/m]')) {
          const math = token.slice(3, -4).trim()
          return <SafeInline key={i} math={math} />
        }
        // Plain text — strip any stray $ that leaked through anyway,
        // then render inline markdown safely
        const clean = token.replace(/\$\$/g, '').replace(/\$/g, '')
        return <span key={i}><InlineMd text={clean} /></span>
      })}
    </>
  )
}

// ── Normalize every math dialect to [m]/[math] tags ─────────────────────
// Models emit \(...\), \[...\], $...$ and $$...$$ interchangeably;
// our renderers only speak [m] (inline) and [math] (display).
export function normalizeMathDelimiters(raw) {
  if (!raw) return ''
  let t = String(raw)
  // Display \[...\] (may span lines)
  t = t.replace(/\\\[([\s\S]+?)\\\]/g, (m, g) => `[math]${g}[/math]`)
  // Display $$...$$ (may span lines)
  t = t.replace(/\$\$([\s\S]+?)\$\$/g, (m, g) => `[math]${g}[/math]`)
  // Inline \(...\)
  t = t.replace(/\\\((.+?)\\\)/g, (m, g) => `[m]${g}[/m]`)
  // Inline $...$ (single line only, must look like math so that
  // currency like "$5 and $10" is left alone)
  t = t.replace(/\$([^$\n]+?)\$/g, (m, g) => {
    const c = g.replace(/\s+/g, '')
    const isVar = /^[a-zA-Z]+$/.test(c) // single variable like $y$
    const isExpr = /[\\^_{}()=+\-*/<>,|]/.test(c) && /[a-zA-Z0-9]/.test(c)
    return (isVar || isExpr) ? `[m]${g}[/m]` : m
  })
  return t
}

// ── Pre-process raw AI response ───────────────────────────────────────────────
function preprocess(raw) {
  if (!raw) return ''
  return normalizeMathDelimiters(raw)
    .replace(/\r\n/g, '\n')
    // Join [math]...[/math] pairs the model splits across lines
    .replace(/\[math\]\s*\n([\s\S]*?)\n\s*\[\/math\]/g, (m, g) => `[math]${g.trim()}[/math]`)
    // Drop orphan tag lines the model sometimes leaves behind
    .replace(/^\s*\[\/?math\]\s*$/gm, '')
    // Ensure [math] blocks always have blank lines around them
    .replace(/([^\n])\[math\]/g, '$1\n\n[math]')
    .replace(/\[\/math\]([^\n])/g, '[/math]\n\n$1')
    // Nuclear option — strip any $ that still leaked through
    .replace(/\$\$/g, '')
    .replace(/\$/g, '')
    // Collapse excess blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ── Full explanation renderer ─────────────────────────────────────────────────
export function ExplanationBody({ text }) {
  if (!text) return null

  const clean  = preprocess(text)
  const blocks = clean.split(/\n{2,}/).map(b => b.trim()).filter(Boolean)

  return (
    <div className="space-y-2 text-[15px] leading-relaxed text-[var(--color-ink)]">
      {blocks.map((block, i) => {

        // ── ### Method heading
        if (block.startsWith('###')) {
          return (
            <div key={i} className="pt-6 pb-1">
              <h3 className="font-serif font-bold text-xl text-[var(--color-teal)]
                             pb-2 border-b-2 border-[var(--color-teal)] inline-block">
                {block.replace(/^###\s*/, '')}
              </h3>
            </div>
          )
        }

        // ── ## heading
        if (block.startsWith('## ')) {
          return (
            <h2 key={i} className="font-serif font-bold text-2xl
                                   text-[var(--color-ink)] pt-5 pb-1">
              {block.replace(/^##\s*/, '')}
            </h2>
          )
        }

        // ── Horizontal rule the model emits as --- or ***
        const trimmedBlock = block.trim()
        if (trimmedBlock === '---' || trimmedBlock === '***') {
          return <hr key={i} className="border-[var(--color-border)] my-3" />
        }

        // ── Standalone [math] block
        if (block.startsWith('[math]') && block.endsWith('[/math]')) {
          return <SafeBlock key={i} math={block.slice(6, -7)} />
        }

        // ── Numbered steps: "1. ..." (also split "1. A 2. B 3. C"
        // packed onto one block so every step gets its own line)
        const stepMatch = block.match(/^(\d+)\.\s+([\s\S]+)/)
        if (stepMatch) {
          const pieces = block.split(/\s+(?=\d+\.\s+)/g)
          return (
            <div key={i} className="space-y-1">
              {pieces.map((piece, k) => {
                const m = piece.match(/^(\d+)\.\s+([\s\S]+)/)
                if (!m) return <p key={k}><RenderMath text={piece} /></p>
                return (
                  <div key={k} className="flex gap-3 items-start py-1.5">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-[var(--color-teal)]
                                     text-white text-xs font-bold flex items-center
                                     justify-center mt-0.5">
                      {m[1]}
                    </span>
                    <div className="flex-1 pt-0.5">
                      <RenderMath text={m[2]} />
                    </div>
                  </div>
                )
              })}
            </div>
          )
        }

        // ── Bullet point
        if (/^[-*•]\s/.test(block)) {
          return (
            <div key={i} className="flex gap-2 items-start py-0.5 ml-3">
              <span className="text-[var(--color-gold)] font-bold text-lg
                               leading-tight shrink-0 mt-0.5">•</span>
              <div className="flex-1">
                <RenderMath text={block.replace(/^[-*•]\s*/, '')} />
              </div>
            </div>
          )
        }

        // ── Bold **text**
        if (block.startsWith('**') && block.endsWith('**') && block.length > 4) {
          return (
            <p key={i} className="font-semibold">
              <RenderMath text={block.replace(/^\*\*|\*\*$/g, '')} />
            </p>
          )
        }

        // ── Multi-line block — render line by line
        if (block.includes('\n')) {
          return (
            <div key={i} className="space-y-2">
              {block.split('\n').map((line, j) => {
                const t = line.trim()
                if (!t) return null

                if (t.startsWith('[math]') && t.endsWith('[/math]')) {
                  return <SafeBlock key={j} math={t.slice(6, -7)} />
                }

                const stepM = t.match(/^(\d+)\.\s+([\s\S]+)/)
                if (stepM) {
                  return (
                    <div key={j} className="flex gap-3 items-start py-1">
                      <span className="shrink-0 w-7 h-7 rounded-full bg-[var(--color-teal)]
                                       text-white text-xs font-bold flex items-center
                                       justify-center mt-0.5">
                        {stepM[1]}
                      </span>
                      <div className="flex-1">
                        <RenderMath text={stepM[2]} />
                      </div>
                    </div>
                  )
                }

                if (/^[-*•]\s/.test(t)) {
                  return (
                    <div key={j} className="flex gap-2 items-start ml-3">
                      <span className="text-[var(--color-gold)] font-bold text-lg
                                       leading-tight shrink-0 mt-0.5">•</span>
                      <div className="flex-1">
                        <RenderMath text={t.replace(/^[-*•]\s*/, '')} />
                      </div>
                    </div>
                  )
                }

                return <p key={j}><RenderMath text={t} /></p>
              })}
            </div>
          )
        }

        // ── Regular paragraph
        return (
          <p key={i} className="leading-relaxed py-0.5">
            <RenderMath text={block} />
          </p>
        )
      })}
    </div>
  )
}