import { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { BroadcastGameState } from '@/game/types'

export type PresenceUser = {
  userId: string
  nickname: string
  joinedAt: number
}

export type MatchFoundPayload = {
  roomId: string
}

// 랜덤 매칭 채널
export function createWaitingRoomChannel(
  userId: string,
  nickname: string,
  onMatchFound: (roomId: string) => void,
): RealtimeChannel {
  const supabase = createClient()
  const channel = supabase.channel('waiting_room', {
    config: { presence: { key: userId } },
  })

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresenceUser>()
      const users = Object.values(state).flat()
      if (users.length < 2) return

      // 가장 먼저 들어온 유저(joinedAt 가장 작은)가 방 생성
      const sorted = [...users].sort((a, b) => a.joinedAt - b.joinedAt)
      if (sorted[0].userId !== userId) return

      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
      channel.send({
        type: 'broadcast',
        event: 'match_found',
        payload: { roomId } as MatchFoundPayload,
      })
    })
    .on<MatchFoundPayload>('broadcast', { event: 'match_found' }, ({ payload }) => {
      onMatchFound(payload.roomId)
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ userId, nickname, joinedAt: Date.now() } as PresenceUser)
      }
    })

  return channel
}

// 배틀 채널
export function createBattleChannel(
  roomId: string,
  userId: string,
  nickname: string,
  onOpponentJoined: (opponentNickname: string) => void,
  onOpponentLeft: () => void,
  onGameState: (state: BroadcastGameState) => void,
  onGameEvent: (event: 'ready' | 'start' | 'over') => void,
): RealtimeChannel {
  const supabase = createClient()
  const channel = supabase.channel(`battle:${roomId}`, {
    config: { presence: { key: userId } },
  })

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresenceUser>()
      const users = Object.values(state).flat().filter(u => u.userId !== userId)
      if (users.length > 0) onOpponentJoined(users[0].nickname)
    })
    .on('presence', { event: 'leave' }, () => {
      onOpponentLeft()
    })
    .on<BroadcastGameState>('broadcast', { event: 'game_state' }, ({ payload }) => {
      onGameState(payload)
    })
    .on<{ event: 'ready' | 'start' | 'over' }>('broadcast', { event: 'game_event' }, ({ payload }) => {
      onGameEvent(payload.event)
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ userId, nickname, joinedAt: Date.now() } as PresenceUser)
      }
    })

  return channel
}

export function sendGameState(channel: RealtimeChannel, state: BroadcastGameState) {
  channel.send({ type: 'broadcast', event: 'game_state', payload: state })
}

export function sendGameEvent(channel: RealtimeChannel, event: 'ready' | 'start' | 'over') {
  channel.send({ type: 'broadcast', event: 'game_event', payload: { event } })
}
