import { createClient } from '@/lib/supabase/client'
import type { Provider } from '@supabase/supabase-js'

export type AuthUser = {
  id: string
  nickname: string
  isGuest: boolean
}

/**
 * 게스트 로그인: Supabase Anonymous Auth로 임시 계정 생성 후 profiles에 저장
 */
export async function signInAsGuest(nickname: string): Promise<AuthUser> {
  const supabase = createClient()

  const { data: authData, error: authError } = await supabase.auth.signInAnonymously()
  if (authError || !authData.user) throw new Error(authError?.message ?? 'Anonymous sign-in failed')

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: authData.user.id, nickname, is_guest: true })
  if (profileError) throw new Error(profileError.message)

  return { id: authData.user.id, nickname, isGuest: true }
}

/**
 * 이메일 회원가입
 */
export async function signUp(email: string, password: string, nickname: string): Promise<AuthUser> {
  const supabase = createClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
  if (authError || !authData.user) throw new Error(authError?.message ?? 'Sign-up failed')

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: authData.user.id, nickname, is_guest: false })
  if (profileError) throw new Error(profileError.message)

  return { id: authData.user.id, nickname, isGuest: false }
}

/**
 * 이메일 로그인
 */
export async function signIn(email: string, password: string): Promise<AuthUser> {
  const supabase = createClient()

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError || !authData.user) throw new Error(authError?.message ?? 'Sign-in failed')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('nickname, is_guest')
    .eq('id', authData.user.id)
    .single()
  if (profileError || !profile) throw new Error('Profile not found')

  return { id: authData.user.id, nickname: profile.nickname, isGuest: profile.is_guest }
}

/**
 * OAuth 로그인 (Google / Facebook)
 * 콜백 URL: /auth/callback
 */
export async function signInWithOAuth(provider: Provider): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error) throw new Error(error.message)
}

/**
 * 로그아웃
 */
export async function signOut(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
}

/**
 * 현재 로그인된 유저 정보 가져오기 (없으면 null)
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, is_guest')
    .eq('id', user.id)
    .single()
  if (!profile) return null

  return { id: user.id, nickname: profile.nickname, isGuest: profile.is_guest }
}
