export default function Footer() {
  return (
    <footer className="border-t-2 border-ink bg-paper">
      <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
        <p className="font-mono text-xs text-ink-muted">
          © {new Date().getFullYear()} ImmoRank — Données publiques open data
        </p>
        <p className="font-mono text-xs text-ink-muted">
          Sources : DVF · ADEME · INSEE · Géorisques
        </p>
      </div>
    </footer>
  )
}
