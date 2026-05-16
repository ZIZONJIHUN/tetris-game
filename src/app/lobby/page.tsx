import AppShell from '@/components/AppShell'
import MatchmakingLobby from '@/components/MatchmakingLobby'

export default function LobbyPage() {
  return (
    <AppShell>
      <h1
        className="text-purple-400 font-bold text-2xl tracking-widest mb-8"
        style={{ textShadow: '0 0 10px #ff00ff' }}
      >
        BATTLE LOBBY
      </h1>
      <MatchmakingLobby />
    </AppShell>
  )
}
