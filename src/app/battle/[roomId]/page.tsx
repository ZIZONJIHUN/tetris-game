import AppShell from '@/components/AppShell'
import BattleGame from '@/components/BattleGame'

export default async function BattlePage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params
  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center gap-2 min-h-[calc(100vh-4rem)] w-full">
        <BattleGame roomId={roomId} />
        <p className="mt-6 text-gray-600 text-xs text-center">
          ← → Move &nbsp;|&nbsp; ↑/X Rotate &nbsp;|&nbsp; Z Counter-rotate &nbsp;|&nbsp; Space Hard Drop &nbsp;|&nbsp; C Hold
        </p>
      </div>
    </AppShell>
  )
}
