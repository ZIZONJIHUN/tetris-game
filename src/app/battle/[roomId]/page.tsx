import AppShell from '@/components/AppShell'
import BattleGame from '@/components/BattleGame'

export default async function BattlePage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params
  return (
    <AppShell>
      <BattleGame roomId={roomId} />
      <p className="mt-6 text-gray-600 text-xs text-center">
        ← → Move &nbsp;|&nbsp; ↑/X Rotate &nbsp;|&nbsp; Z Counter-rotate &nbsp;|&nbsp; Space Hard Drop &nbsp;|&nbsp; C Hold
      </p>
    </AppShell>
  )
}
