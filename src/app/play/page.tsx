import SoloGame from '@/components/SoloGame'
import Link from 'next/link'

export default function PlayPage() {
  return (
    <main className="min-h-screen bg-[#0a0a1a] flex flex-col items-center py-8">
      <nav className="mb-6 flex items-center gap-6">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Home</Link>
        <Link href="/lobby" className="text-purple-400 hover:text-purple-300 text-sm tracking-wider">
          Battle
        </Link>
        <Link href="/leaderboard" className="text-yellow-600 hover:text-yellow-400 text-sm tracking-wider">
          Leaderboard
        </Link>
        <Link href="/profile" className="text-gray-500 hover:text-gray-300 text-sm">
          Profile
        </Link>
      </nav>
      <SoloGame />
      <p className="mt-6 text-gray-600 text-xs text-center">
        ← → Move &nbsp;|&nbsp; ↑/X Rotate &nbsp;|&nbsp; Z Counter-rotate &nbsp;|&nbsp; Space Hard Drop &nbsp;|&nbsp; C Hold
      </p>
    </main>
  )
}
