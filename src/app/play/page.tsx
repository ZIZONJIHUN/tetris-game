import SoloGame from '@/components/SoloGame'
import Link from 'next/link'

export default function PlayPage() {
  return (
    <main className="min-h-screen flex flex-col items-center py-8" style={{ background: 'var(--bg)' }}>
      <nav className="mb-6 flex items-center gap-1 self-start px-6">
        <Link href="/menu"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-[var(--border)] hover:bg-white transition"
          style={{ color: 'var(--text-secondary)' }}>
          ← Menu
        </Link>
      </nav>
      <SoloGame />
      <p className="mt-6 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
        ← → Move &nbsp;|&nbsp; ↑/X Rotate &nbsp;|&nbsp; Z Counter-rotate &nbsp;|&nbsp; Space Hard Drop &nbsp;|&nbsp; C Hold
      </p>
    </main>
  )
}
