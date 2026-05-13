'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInAsGuest, signIn, signUp, signInWithOAuth } from '@/lib/auth'
import { useLanguage } from '@/contexts/LanguageContext'
import TetrisBackground from '@/components/TetrisBackground'

type Mode = 'home' | 'guest' | 'login' | 'signup'

const GoogleIcon = (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
)

const FacebookIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

function OAuthButton({
  provider, label, icon, borderClass, glow,
}: {
  provider: 'google' | 'facebook'
  label: string
  icon: React.ReactNode
  borderClass: string
  glow: string
}) {
  const [loading, setLoading] = useState(false)
  async function handle() {
    setLoading(true)
    try { await signInWithOAuth(provider) } catch { setLoading(false) }
  }
  return (
    <button
      onClick={handle}
      disabled={loading}
      className={`flex items-center justify-center gap-3 py-3 border ${borderClass} font-bold tracking-widest transition disabled:opacity-40 hover:bg-white/5`}
      style={{ boxShadow: `0 0 12px ${glow}` }}
    >
      {icon}
      <span>{loading ? '...' : label}</span>
    </button>
  )
}

export default function HomePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [mode, setMode] = useState<Mode>('home')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const nicknameError = nickname.trim().length > 0 && nickname.trim().length < 3
    ? t('nicknameMinError') : ''

  async function handleGuest(e: React.FormEvent) {
    e.preventDefault()
    if (nickname.trim().length < 3) return
    setLoading(true); setError('')
    try {
      await signInAsGuest(nickname.trim())
      router.push('/menu')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally { setLoading(false) }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await signIn(email, password)
      router.push('/menu')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally { setLoading(false) }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (nickname.trim().length < 3) return
    setLoading(true); setError('')
    try {
      await signUp(email, password, nickname.trim())
      router.push('/menu')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally { setLoading(false) }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <TetrisBackground />
      {/* 타이틀 */}
      <div className="text-center">
        <h1
          className="text-6xl font-bold tracking-widest text-cyan-400"
          style={{ textShadow: '0 0 30px #00f5ff, 0 0 60px #00f5ff44' }}
        >
          TETRIS
        </h1>
        <p className="text-gray-500 mt-2 tracking-widest text-sm">CYBERPUNK EDITION</p>
      </div>

      {/* 홈 — 모드 선택 */}
      {mode === 'home' && (
        <div className="flex flex-col gap-3 w-72">
          {/* OAuth */}
          <OAuthButton
            provider="google"
            label="GOOGLE"
            icon={GoogleIcon}
            borderClass="border-pink-500 text-pink-300"
            glow="rgba(255,0,128,0.25)"
          />
          <OAuthButton
            provider="facebook"
            label="FACEBOOK"
            icon={FacebookIcon}
            borderClass="border-blue-500 text-blue-300"
            glow="rgba(24,119,242,0.3)"
          />

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-gray-700" />
            <span className="text-xs text-gray-600 tracking-widest">{t('or')}</span>
            <div className="flex-1 h-px bg-gray-700" />
          </div>

          <button
            onClick={() => setMode('guest')}
            className="py-3 border border-cyan-500 text-cyan-400 font-bold tracking-widest hover:bg-cyan-500/20 transition"
            style={{ boxShadow: '0 0 12px rgba(0,245,255,0.2)' }}
          >
            {t('guestPlay')}
          </button>
          <button
            onClick={() => setMode('login')}
            className="py-3 border border-purple-500 text-purple-400 font-bold tracking-widest hover:bg-purple-500/20 transition"
            style={{ boxShadow: '0 0 12px rgba(255,0,255,0.2)' }}
          >
            {t('login')}
          </button>
          <button
            onClick={() => setMode('signup')}
            className="py-3 border border-gray-600 text-gray-400 font-bold tracking-widest hover:bg-gray-700/30 transition"
          >
            {t('signUp')}
          </button>
        </div>
      )}

      {/* 게스트 플레이 */}
      {mode === 'guest' && (
        <form onSubmit={handleGuest} className="flex flex-col gap-3 w-72">
          <p className="text-gray-400 text-sm text-center">{t('enterNickname')}</p>
          <input
            type="text"
            placeholder={t('nickname')}
            maxLength={16}
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            className="bg-transparent border border-cyan-500/50 text-cyan-300 px-4 py-2 outline-none focus:border-cyan-400 placeholder:text-gray-600 tracking-widest text-center"
            autoFocus
          />
          {nicknameError && <p className="text-yellow-400 text-xs text-center">{nicknameError}</p>}
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || nickname.trim().length < 3}
            className="py-3 border border-cyan-500 text-cyan-400 font-bold tracking-widest hover:bg-cyan-500/20 transition disabled:opacity-40"
          >
            {loading ? '...' : t('start')}
          </button>
          <button type="button" onClick={() => setMode('home')} className="text-gray-600 text-xs hover:text-gray-400">
            {t('back')}
          </button>
        </form>
      )}

      {/* 로그인 */}
      {mode === 'login' && (
        <form onSubmit={handleLogin} className="flex flex-col gap-3 w-72">
          <p className="text-gray-400 text-sm text-center">{t('login')}</p>
          <input
            type="email"
            placeholder={t('email')}
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="bg-transparent border border-purple-500/50 text-purple-300 px-4 py-2 outline-none focus:border-purple-400 placeholder:text-gray-600 tracking-widest"
            autoFocus
          />
          <input
            type="password"
            placeholder={t('password')}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="bg-transparent border border-purple-500/50 text-purple-300 px-4 py-2 outline-none focus:border-purple-400 placeholder:text-gray-600 tracking-widest"
          />
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="py-3 border border-purple-500 text-purple-400 font-bold tracking-widest hover:bg-purple-500/20 transition disabled:opacity-40"
          >
            {loading ? '...' : t('login')}
          </button>
          <button type="button" onClick={() => setMode('home')} className="text-gray-600 text-xs hover:text-gray-400">
            {t('back')}
          </button>
        </form>
      )}

      {/* 회원가입 */}
      {mode === 'signup' && (
        <form onSubmit={handleSignUp} className="flex flex-col gap-3 w-72">
          <p className="text-gray-400 text-sm text-center">{t('signUp')}</p>
          <input
            type="text"
            placeholder={`${t('nickname')} ${t('nicknameMin')}`}
            maxLength={16}
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            className="bg-transparent border border-gray-600 text-gray-300 px-4 py-2 outline-none focus:border-gray-400 placeholder:text-gray-600 tracking-widest"
            autoFocus
          />
          {nicknameError && <p className="text-yellow-400 text-xs text-center">{nicknameError}</p>}
          <input
            type="email"
            placeholder={t('email')}
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="bg-transparent border border-gray-600 text-gray-300 px-4 py-2 outline-none focus:border-gray-400 placeholder:text-gray-600 tracking-widest"
          />
          <input
            type="password"
            placeholder={t('password')}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="bg-transparent border border-gray-600 text-gray-300 px-4 py-2 outline-none focus:border-gray-400 placeholder:text-gray-600 tracking-widest"
          />
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || nickname.trim().length < 3}
            className="py-3 border border-gray-500 text-gray-300 font-bold tracking-widest hover:bg-gray-700/30 transition disabled:opacity-40"
          >
            {loading ? '...' : t('signUp')}
          </button>
          <button type="button" onClick={() => setMode('home')} className="text-gray-600 text-xs hover:text-gray-400">
            {t('back')}
          </button>
        </form>
      )}

      {/* 하단 메뉴 */}
      {mode === 'home' && (
        <div className="flex gap-6 text-xs text-gray-600">
          <a href="/leaderboard" className="hover:text-gray-400 tracking-widest">LEADERBOARD</a>
          <a href="/lobby" className="hover:text-gray-400 tracking-widest">BATTLE</a>
        </div>
      )}
    </main>
  )
}
