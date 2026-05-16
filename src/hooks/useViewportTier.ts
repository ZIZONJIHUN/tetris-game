'use client'
import { useEffect, useState } from 'react'
import type { Tier } from '@/lib/tierSizes'

function heightToTier(h: number): Tier {
  if (h <= 900) return 'sm'
  if (h <= 1200) return 'md'
  return 'lg'
}

export function useViewportTier(): Tier {
  // Always 'md' on first render so server and client HTML match.
  // The effect below corrects it to the real viewport tier after mount.
  const [tier, setTier] = useState<Tier>('md')

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
