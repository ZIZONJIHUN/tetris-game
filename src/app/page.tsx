'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInAsGuest, signIn, signUp } from '@/lib/auth'
import { useLanguage } from '@/contexts/LanguageContext'

type Mode = 'home' | 'guest' | 'login' | 'signup'

export default function HomePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [mode, setMode] = useState<Mode>('home')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGuest(e: React.FormEvent) {
    e.preventDefault()
    if (!nickname.trim()) return
    setLoading(true)
    setError('')
    try {
      await signInAsGuest(nickname.trim())
      router.push('/play')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signIn(email, password)
      router.push('/play')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (!nickname.trim()) return
    setLoading(true)
    setError('')
    try {
      await signUp(email, password, nickname.trim())
      router.push('/play')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a1a] flex flex-col items-center justify-center gap-8 px-4">
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
        <div className="flex flex-col gap-3 w-64">
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
        <form onSubmit={handleGuest} className="flex flex-col gap-3 w-64">
          <p className="text-gray-400 text-sm text-center">닉네임을 입력하세요</p>
          <input
            type="text"
            placeholder={t('nickname')}
            maxLength={16}
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            className="bg-transparent border border-cyan-500/50 text-cyan-300 px-4 py-2 outline-none focus:border-cyan-400 placeholder:text-gray-600 tracking-widest text-center"
            autoFocus
          />
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || !nickname.trim()}
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
        <form onSubmit={handleLogin} className="flex flex-col gap-3 w-64">
          <p className="text-gray-400 text-sm text-center">로그인</p>
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
        <form onSubmit={handleSignUp} className="flex flex-col gap-3 w-64">
          <p className="text-gray-400 text-sm text-center">회원가입</p>
          <input
            type="text"
            placeholder={t('nickname')}
            maxLength={16}
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            className="bg-transparent border border-gray-600 text-gray-300 px-4 py-2 outline-none focus:border-gray-400 placeholder:text-gray-600 tracking-widest"
            autoFocus
          />
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
            disabled={loading || !nickname.trim()}
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
