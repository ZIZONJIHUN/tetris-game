import Link from 'next/link'
import MatchmakingLobby from '@/components/MatchmakingLobby'

export default function LobbyPage() {
  return (
    <main className="min-h-screen bg-[#0a0a1a] flex flex-col items-center py-12">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Back</Link>
        <h1 className="text-purple-400 font-bold text-2xl tracking-widest"
          style={{ textShadow: '0 0 10px #ff00ff' }}>
          BATTLE LOBBY
        </h1>
      </div>
      <MatchmakingLobby />
    </main>
  )
}
