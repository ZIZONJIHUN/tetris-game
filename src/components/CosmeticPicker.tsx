// src/components/CosmeticPicker.tsx
'use client'
import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

type Cosmetic = { id: string; label: string }

type Props = {
  kind: 'badge' | 'skin'
  owned: Cosmetic[]
  activeId: string | null
  onChange: () => void
}

export default function CosmeticPicker({ kind, owned, activeId, onChange }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const setActive = (id: string | null) => {
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.rpc('set_active_cosmetic', { p_kind: kind, p_achievement_id: id })
      if (error) setError(error.message)
      else onChange()
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        disabled={pending}
        onClick={() => setActive(null)}
        className={`px-2 py-1 text-xs border ${activeId === null ? 'border-cyan-400 text-cyan-400' : 'border-gray-700 text-gray-500'}`}
      >
        None
      </button>
      {owned.map(c => (
        <button
          key={c.id}
          disabled={pending}
          onClick={() => setActive(c.id)}
          className={`px-2 py-1 text-xs border ${activeId === c.id ? 'border-yellow-400 text-yellow-400' : 'border-gray-700 text-gray-300'}`}
        >
          {c.label}
        </button>
      ))}
      {error && <p className="text-xs text-red-400 w-full">{error}</p>}
    </div>
  )
}
