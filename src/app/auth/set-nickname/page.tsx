'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SetNicknamePage() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = nickname.trim()
    if (trimmed.length < 3) {
      setError('닉네임은 3글자 이상이어야 합니다.')
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
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] placeholder:text-[var(--text-muted)] rounded"

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-widest" style={{ color: 'var(--text)' }}>TETRIS</h1>
          <p className="text-xs mt-1 tracking-widest" style={{ color: 'var(--text-muted)' }}>CLASSIC GAME</p>
        </div>

        <div className="bg-white border border-[var(--border)] rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--text)' }}>닉네임 설정</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>게임에서 사용할 닉네임을 입력해주세요</p>
            </div>
            <div>
              <input
                type="text"
                placeholder="닉네임 (3글자 이상)"
                maxLength={16}
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                className={inputClass}
                autoFocus
              />
              <p className="text-xs mt-1" style={{ color: nickname.trim().length > 0 && nickname.trim().length < 3 ? 'var(--danger)' : 'var(--text-muted)' }}>
                {nickname.trim().length}/16 (최소 3글자)
              </p>
            </div>
            {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
            <button
              type="submit"
              disabled={loading || nickname.trim().length < 3}
              className="w-full py-2.5 text-sm font-bold rounded transition disabled:opacity-40"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {loading ? '...' : '시작하기'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
