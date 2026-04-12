import SoloGame from '@/components/SoloGame'
import Link from 'next/link'

export default function PlayPage() {
  return (
    <main className="min-h-screen bg-[#0a0a1a] flex flex-col items-center py-8">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Back</Link>
        <h1 className="text-cyan-400 font-bold text-2xl tracking-widest"
          style={{ textShadow: '0 0 10px #00f5ff' }}>
          TETRIS
        </h1>
      </div>
      <SoloGame />
      <p className="mt-6 text-gray-600 text-xs text-center">
        ← → Move &nbsp;|&nbsp; ↑/X Rotate &nbsp;|&nbsp; Z Counter-rotate &nbsp;|&nbsp; Space Hard Drop &nbsp;|&nbsp; C Hold
      </p>
    </main>
  )
}
