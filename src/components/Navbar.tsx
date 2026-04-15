'use client'

import Link from 'next/link'
import { useState } from 'react'

const NAV_LINKS = [
  { href: '/market-terminal', label: 'Market Terminal' },
  { href: '/city-benchmarks', label: 'City Benchmarks' },
  { href: '/dvf-explorer',    label: 'DVF Explorer'    },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b-2 border-ink bg-paper">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
          aria-label="ImmoRank — Accueil"
        >
          <span className="font-display text-lg font-bold text-ink tracking-tight group-hover:text-accent transition-colors">
            ImmoRank
          </span>
          <span className="font-mono text-[9px] tracking-widest uppercase border-2 border-ink bg-ink text-paper px-1.5 py-0.5 leading-none">
            BETA
          </span>
        </Link>

        {/* Desktop nav */}
        <nav
          className="hidden md:flex items-stretch border-2 border-ink divide-x-2 divide-ink"
          aria-label="Navigation principale"
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="font-mono text-[11px] tracking-wider uppercase px-4 py-2 text-ink-muted hover:bg-ink hover:text-paper transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden border-2 border-ink px-3 py-1.5 font-mono text-sm text-ink hover:bg-ink hover:text-paper transition-colors"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Menu"
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <nav
          className="md:hidden border-t-2 border-ink bg-paper"
          aria-label="Navigation mobile"
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block font-mono text-xs tracking-wider uppercase px-6 py-3 text-ink-muted hover:bg-ink hover:text-paper transition-colors border-b border-ink-muted last:border-b-0"
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
