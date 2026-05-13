'use client'
import { useEffect, useState } from 'react'
import type { Tier } from '@/lib/tierSizes'

function heightToTier(h: number): Tier {
  if (h <= 900) return 'sm'
  if (h <= 1200) return 'md'
  return 'lg'
}

export function useViewportTier(): Tier {
  const [tier, setTier] = useState<Tier>(() =>
    typeof window === 'undefined' ? 'md' : heightToTier(window.innerHeight)
  )

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null
    const onResize = () => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => setTier(heightToTier(window.innerHeight)), 100)
    }
    window.addEventListener('resize', onResize)
    setTier(heightToTier(window.innerHeight))
    return () => {
      window.removeEventListener('resize', onResize)
      if (timeout) clearTimeout(timeout)
    }
  }, [])

  return tier
}
