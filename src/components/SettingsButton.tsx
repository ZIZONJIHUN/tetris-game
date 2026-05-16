'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  ACTION_ORDER,
  formatKeyCode,
  useKeybindings,
  type GameAction,
} from '@/contexts/KeybindingsContext'
import { signOut } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'
import type { TranslationKey } from '@/lib/i18n'

const ACTION_LABEL_KEY: Record<GameAction, TranslationKey> = {
  moveLeft: 'moveLeft',
  moveRight: 'moveRight',
  softDrop: 'softDropAction',
  hardDrop: 'hardDropAction',
  rotateCW: 'rotateCW',
  rotateCCW: 'rotateCCW',
  hold: 'holdAction',
}

export default function SettingsButton() {
  const router = useRouter()
  const { lang, setLang, t } = useLanguage()
  const { bindings, resetBindings, capturingFor, startCapture, cancelCapture } = useKeybindings()
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
        className="fixed top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-md text-cyan-400 hover:text-cyan-200 border border-cyan-500/50 hover:border-cyan-400 bg-[#0a0a14]/90 backdrop-blur transition"
        style={{ fontSize: '20px', boxShadow: '0 0 12px rgba(0,245,255,0.25)' }}
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
            className="bg-[#0d0d1f] border border-gray-700 p-6 w-80 max-h-[85vh] overflow-y-auto flex flex-col gap-5"
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

            {/* 키 설정 */}
            <div className="flex flex-col gap-2 border-t border-gray-800 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-gray-500 text-xs uppercase tracking-widest">{t('controls')}</p>
                <button
                  onClick={resetBindings}
                  className="text-[10px] text-gray-600 hover:text-cyan-400 tracking-widest uppercase"
                >
                  {t('resetDefaults')}
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {ACTION_ORDER.map(action => {
                  const isCapturing = capturingFor === action
                  return (
                    <div key={action} className="flex items-center justify-between gap-2">
                      <span className="text-gray-400 text-xs tracking-wider">
                        {t(ACTION_LABEL_KEY[action])}
                      </span>
                      <button
                        onClick={() => isCapturing ? cancelCapture() : startCapture(action)}
                        className={`min-w-[70px] px-3 py-1.5 text-xs font-bold tracking-wider border transition text-center ${
                          isCapturing
                            ? 'border-pink-500 text-pink-300 bg-pink-500/10 animate-pulse'
                            : 'border-gray-700 text-cyan-400 hover:border-cyan-500 hover:bg-cyan-500/5'
                        }`}
                      >
                        {isCapturing ? t('pressKey') : formatKeyCode(bindings[action])}
                      </button>
                    </div>
                  )
                })}
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
