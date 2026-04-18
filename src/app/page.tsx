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
    if (!nickname.trim()) return
    setLoading(true); setError('')
    try {
      await signUp(email, password, nickname.trim())
      router.push('/menu')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally { setLoading(false) }
  }

  const inputClass = "w-full border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] placeholder:text-[var(--text-muted)] rounded"

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        {/* 타이틀 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-widest" style={{ color: 'var(--text)' }}>TETRIS</h1>
          <p className="text-xs mt-1 tracking-widest" style={{ color: 'var(--text-muted)' }}>CLASSIC GAME</p>
        </div>

        {/* 카드 */}
        <div className="bg-white border border-[var(--border)] rounded-lg shadow-sm p-6">
          {mode === 'home' && (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setMode('guest')}
                className="w-full py-2.5 text-sm font-bold tracking-wider rounded transition"
                style={{ background: 'var(--accent)', color: '#fff' }}
                onMouseOver={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
                onMouseOut={e => (e.currentTarget.style.background = 'var(--accent)')}
              >
                {t('guestPlay')}
              </button>
              <button
                onClick={() => setMode('login')}
                className="w-full py-2.5 text-sm font-bold tracking-wider rounded border border-[var(--border)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg)]"
                style={{ color: 'var(--text)' }}
              >
                {t('login')}
              </button>
              <button
                onClick={() => setMode('signup')}
                className="w-full py-2.5 text-sm font-bold tracking-wider rounded border border-[var(--border)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg)]"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('signUp')}
              </button>
            </div>
          )}

          {mode === 'guest' && (
            <form onSubmit={handleGuest} className="flex flex-col gap-3">
              <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{t('guestPlay')}</p>
              <input type="text" placeholder={t('nickname')} maxLength={16}
                value={nickname} onChange={e => setNickname(e.target.value)}
                className={inputClass} autoFocus />
              {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
              <button type="submit" disabled={loading || !nickname.trim()}
                className="w-full py-2.5 text-sm font-bold rounded transition disabled:opacity-40"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                {loading ? '...' : t('start')}
              </button>
              <button type="button" onClick={() => setMode('home')}
                className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                {t('back')}
              </button>
            </form>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{t('login')}</p>
              <input type="email" placeholder={t('email')}
                value={email} onChange={e => setEmail(e.target.value)}
                className={inputClass} autoFocus />
              <input type="password" placeholder={t('password')}
                value={password} onChange={e => setPassword(e.target.value)}
                className={inputClass} />
              {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-2.5 text-sm font-bold rounded transition disabled:opacity-40"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                {loading ? '...' : t('login')}
              </button>
              <button type="button" onClick={() => setMode('home')}
                className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                {t('back')}
              </button>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="flex flex-col gap-3">
              <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{t('signUp')}</p>
              <input type="text" placeholder={t('nickname')} maxLength={16}
                value={nickname} onChange={e => setNickname(e.target.value)}
                className={inputClass} autoFocus />
              <input type="email" placeholder={t('email')}
                value={email} onChange={e => setEmail(e.target.value)}
                className={inputClass} />
              <input type="password" placeholder={t('password')}
                value={password} onChange={e => setPassword(e.target.value)}
                className={inputClass} />
              {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
              <button type="submit" disabled={loading || !nickname.trim()}
                className="w-full py-2.5 text-sm font-bold rounded transition disabled:opacity-40"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                {loading ? '...' : t('signUp')}
              </button>
              <button type="button" onClick={() => setMode('home')}
                className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                {t('back')}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
