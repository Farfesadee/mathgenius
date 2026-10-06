import { Mail } from 'lucide-react'

export default function ContactFab() {
  return (
    <a
      href="mailto:help@mathgenius.guru"
      title="Contact us: help@mathgenius.guru"
      aria-label="Contact us by email"
      className="fixed left-6 bottom-6 z-50 w-12 h-12 rounded-full
                 bg-[var(--color-gold)] text-white
                 flex items-center justify-center shadow-lg
                 hover:bg-[var(--color-ink)] hover:-translate-y-0.5
                 transition-all">
      <Mail size={20} />
    </a>
  )
}
