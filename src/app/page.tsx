'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInAsGuest, signIn, signUp, signInWithOAuth } from '@/lib/auth'
import { useLanguage } from '@/contexts/LanguageContext'

type Mode = 'home' | 'guest' | 'login' | 'signup'

function OAuthButton({ provider, label, icon }: { provider: 'google' | 'facebook'; label: string; icon: React.ReactNode }) {
  const [loading, setLoading] = useState(false)
  async function handle() {
    setLoading(true)
    try { await signInWithOAuth(provider) } catch { setLoading(false) }
  }
  return (
    <button
      onClick={handle}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 py-3 text-base font-bold rounded border transition hover:bg-[var(--bg)] disabled:opacity-40"
      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
    >
      {icon}
      {loading ? '...' : label}
    </button>
  )
}

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
    ? '닉네임은 3글자 이상이어야 합니다.' : ''

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

  const inputClass = "w-full border border-[var(--border)] bg-white px-4 py-3 text-base text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] placeholder:text-[var(--text-muted)] rounded"

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black tracking-widest" style={{ color: 'var(--text)' }}>TETRIS</h1>
          <p className="text-sm mt-2 tracking-widest" style={{ color: 'var(--text-muted)' }}>CLASSIC GAME</p>
        </div>

        <div className="bg-white border border-[var(--border)] rounded-lg shadow-sm p-8">
          {mode === 'home' && (
            <div className="flex flex-col gap-3">
              {/* OAuth */}
              <OAuthButton provider="google" label="Google로 로그인" icon={GoogleIcon} />
              <OAuthButton provider="facebook" label="Facebook으로 로그인" icon={FacebookIcon} />

              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>또는</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>

              {/* 이메일 */}
              <button onClick={() => setMode('login')}
                className="w-full py-3 text-base font-bold rounded border transition hover:bg-[var(--bg)]"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                {t('login')}
              </button>
              <button onClick={() => setMode('signup')}
                className="w-full py-3 text-base font-bold rounded border transition hover:bg-[var(--bg)]"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                {t('signUp')}
              </button>

              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>게스트</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>

              <button onClick={() => setMode('guest')}
                className="w-full py-3 text-base font-bold rounded transition"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                {t('guestPlay')}
              </button>
            </div>
          )}

          {mode === 'guest' && (
            <form onSubmit={handleGuest} className="flex flex-col gap-3">
              <p className="text-base font-bold" style={{ color: 'var(--text)' }}>{t('guestPlay')}</p>
              <div>
                <input type="text" placeholder={`${t('nickname')} (최소 3글자)`} maxLength={16}
                  value={nickname} onChange={e => setNickname(e.target.value)}
                  className={inputClass} autoFocus />
                {nicknameError && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{nicknameError}</p>}
              </div>
              {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
              <button type="submit" disabled={loading || nickname.trim().length < 3}
                className="w-full py-3 text-base font-bold rounded transition disabled:opacity-40"
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
              <p className="text-base font-bold" style={{ color: 'var(--text)' }}>{t('login')}</p>
              <input type="email" placeholder={t('email')}
                value={email} onChange={e => setEmail(e.target.value)}
                className={inputClass} autoFocus />
              <input type="password" placeholder={t('password')}
                value={password} onChange={e => setPassword(e.target.value)}
                className={inputClass} />
              {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 text-base font-bold rounded transition disabled:opacity-40"
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
              <p className="text-base font-bold" style={{ color: 'var(--text)' }}>{t('signUp')}</p>
              <div>
                <input type="text" placeholder={`${t('nickname')} (최소 3글자)`} maxLength={16}
                  value={nickname} onChange={e => setNickname(e.target.value)}
                  className={inputClass} autoFocus />
                {nicknameError && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{nicknameError}</p>}
              </div>
              <input type="email" placeholder={t('email')}
                value={email} onChange={e => setEmail(e.target.value)}
                className={inputClass} />
              <input type="password" placeholder={t('password')}
                value={password} onChange={e => setPassword(e.target.value)}
                className={inputClass} />
              {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
              <button type="submit" disabled={loading || nickname.trim().length < 3}
                className="w-full py-3 text-base font-bold rounded transition disabled:opacity-40"
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
