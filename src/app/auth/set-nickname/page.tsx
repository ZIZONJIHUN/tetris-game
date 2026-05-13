'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/contexts/LanguageContext'
import TetrisBackground from '@/components/TetrisBackground'

export default function SetNicknamePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = nickname.trim()
    if (trimmed.length < 3) {
      setError(t('nicknameMinError'))
      return
    }
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, nickname: trimmed, is_guest: false })
      if (profileError) throw new Error(profileError.message)

      router.push('/menu')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorOccurred'))
    } finally {
      setLoading(false)
    }
  }

  const tooShort = nickname.trim().length > 0 && nickname.trim().length < 3

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <TetrisBackground />
      <div className="text-center">
        <h1
          className="text-6xl font-bold tracking-widest text-cyan-400"
          style={{ textShadow: '0 0 30px #00f5ff, 0 0 60px #00f5ff44' }}
        >
          TETRIS
        </h1>
        <p className="text-gray-500 mt-2 tracking-widest text-sm">CYBERPUNK EDITION</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-72">
        <p className="text-purple-400 text-sm text-center tracking-widest">{t('setNickname')}</p>
        <p className="text-gray-500 text-xs text-center">{t('setNicknameSub')}</p>
        <input
          type="text"
          placeholder={t('nickname')}
          maxLength={16}
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          className="bg-transparent border border-purple-500/50 text-purple-300 px-4 py-2 outline-none focus:border-purple-400 placeholder:text-gray-600 tracking-widest text-center"
          autoFocus
        />
        <p
          className="text-xs text-center tracking-widest"
          style={{ color: tooShort ? '#fbbf24' : '#4b5563' }}
        >
          {nickname.trim().length}/16 {t('nicknameCount')}
        </p>
        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading || nickname.trim().length < 3}
          className="py-3 border border-cyan-500 text-cyan-400 font-bold tracking-widest hover:bg-cyan-500/20 transition disabled:opacity-40"
          style={{ boxShadow: '0 0 12px rgba(0,245,255,0.2)' }}
        >
          {loading ? '...' : t('start')}
        </button>
      </form>
    </main>
  )
}
