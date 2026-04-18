'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { signOut } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'

export default function SettingsButton() {
  const router = useRouter()
  const { lang, setLang, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => setIsLoggedIn(!!session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setIsLoggedIn(!!session))
    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await signOut()
    setOpen(false); setConfirmLogout(false)
    router.push('/'); router.refresh()
  }

  const langBtn = (code: 'en' | 'ko', label: string) => (
    <button
      onClick={() => setLang(code)}
      className="flex-1 py-2 text-sm rounded border transition"
      style={{
        borderColor: lang === code ? 'var(--accent)' : 'var(--border)',
        background: lang === code ? 'var(--accent-bg)' : 'white',
        color: lang === code ? 'var(--accent)' : 'var(--text-secondary)',
        fontWeight: lang === code ? '700' : '400',
      }}
    >
      {label}
    </button>
  )

  return (
    <>
      <button
        onClick={() => { setOpen(true); setConfirmLogout(false) }}
        className="fixed top-4 right-4 z-50 w-9 h-9 flex items-center justify-center rounded border border-[var(--border)] bg-white hover:bg-[var(--bg)] shadow-sm transition"
        style={{ color: 'var(--text-secondary)', fontSize: '16px' }}
        aria-label="Settings"
      >
        ⚙
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setOpen(false)}>
          <div className="bg-white border border-[var(--border)] rounded-lg shadow-lg p-5 w-72 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}>

            <h2 className="text-sm font-bold tracking-wider" style={{ color: 'var(--text)' }}>
              {t('settings')}
            </h2>

            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{t('language')}</p>
              <div className="flex gap-2">
                {langBtn('en', 'English')}
                {langBtn('ko', '한국어')}
              </div>
            </div>

            {isLoggedIn && (
              <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-4">
                {!confirmLogout ? (
                  <button onClick={() => setConfirmLogout(true)}
                    className="py-2 text-sm rounded border transition"
                    style={{ borderColor: 'var(--danger)', color: 'var(--danger)', background: 'white' }}
                    onMouseOver={e => (e.currentTarget.style.background = 'var(--danger-bg)')}
                    onMouseOut={e => (e.currentTarget.style.background = 'white')}>
                    {t('logout')}
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>{t('logoutConfirm')}</p>
                    <div className="flex gap-2">
                      <button onClick={handleLogout}
                        className="flex-1 py-2 text-sm rounded border transition"
                        style={{ borderColor: 'var(--danger)', color: 'var(--danger)', background: 'white' }}>
                        {t('logout')}
                      </button>
                      <button onClick={() => setConfirmLogout(false)}
                        className="flex-1 py-2 text-sm rounded border transition"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'white' }}>
                        {t('cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button onClick={() => setOpen(false)}
              className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  )
}
