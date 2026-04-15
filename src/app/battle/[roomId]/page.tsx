import BattleGame from '@/components/BattleGame'

export default async function BattlePage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params
  return (
    <main className="min-h-screen bg-[#0a0a1a] flex flex-col items-center py-8">
      <div className="mb-6">
        <h1 className="text-purple-400 font-bold text-xl tracking-widest"
          style={{ textShadow: '0 0 10px #ff00ff' }}>
          BATTLE — {roomId}
        </h1>
      </div>
      <BattleGame roomId={roomId} />
      <p className="mt-6 text-gray-600 text-xs text-center">
        ← → Move &nbsp;|&nbsp; ↑/X Rotate &nbsp;|&nbsp; Z Counter-rotate &nbsp;|&nbsp; Space Hard Drop &nbsp;|&nbsp; C Hold
      </p>
    </main>
  )
}
