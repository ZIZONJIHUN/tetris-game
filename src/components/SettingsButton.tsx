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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await signOut()
    setOpen(false)
    setConfirmLogout(false)
    router.push('/')
    router.refresh()
  }

  return (
    <>
      {/* 기어 버튼 */}
      <button
        onClick={() => { setOpen(true); setConfirmLogout(false) }}
        className="fixed top-4 right-4 z-50 w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-500 bg-[#0a0a1a]/80 backdrop-blur transition"
        style={{ fontSize: '18px' }}
        aria-label="Settings"
      >
        ⚙
      </button>

      {/* 모달 오버레이 */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#0d0d1f] border border-gray-700 p-6 w-72 flex flex-col gap-5"
            style={{ boxShadow: '0 0 30px rgba(0,0,0,0.8)' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-gray-200 font-bold tracking-widest text-sm uppercase">
              {t('settings')}
            </h2>

            {/* 언어 */}
            <div className="flex flex-col gap-2">
              <p className="text-gray-500 text-xs uppercase tracking-widest">{t('language')}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setLang('en')}
                  className={`flex-1 py-2 text-sm font-bold tracking-wider border transition ${
                    lang === 'en'
                      ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10'
                      : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => setLang('ko')}
                  className={`flex-1 py-2 text-sm font-bold tracking-wider border transition ${
                    lang === 'ko'
                      ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10'
                      : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                  }`}
                >
                  한국어
                </button>
              </div>
            </div>

            {/* 로그아웃 */}
            {isLoggedIn && (
              <div className="flex flex-col gap-2 border-t border-gray-800 pt-4">
                {!confirmLogout ? (
                  <button
                    onClick={() => setConfirmLogout(true)}
                    className="py-2 border border-red-900 text-red-500 hover:bg-red-900/20 transition text-sm tracking-widest"
                  >
                    {t('logout')}
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-gray-400 text-xs text-center">{t('logoutConfirm')}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleLogout}
                        className="flex-1 py-2 border border-red-600 text-red-400 hover:bg-red-900/30 transition text-sm"
                      >
                        {t('logout')}
                      </button>
                      <button
                        onClick={() => setConfirmLogout(false)}
                        className="flex-1 py-2 border border-gray-700 text-gray-400 hover:border-gray-500 transition text-sm"
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 닫기 */}
            <button
              onClick={() => setOpen(false)}
              className="text-gray-600 text-xs hover:text-gray-400 text-center"
            >
              ✕ close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
