import AppShell from '@/components/AppShell'
import SoloGame from '@/components/SoloGame'

export default function PlayPage() {
  return (
    <AppShell>
      <SoloGame />
      <p className="mt-6 text-gray-600 text-xs text-center">
        ← → Move &nbsp;|&nbsp; ↑/X Rotate &nbsp;|&nbsp; Z Counter-rotate &nbsp;|&nbsp; Space Hard Drop &nbsp;|&nbsp; C Hold
      </p>
    </AppShell>
  )
}
