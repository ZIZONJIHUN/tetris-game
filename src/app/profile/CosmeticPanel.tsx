// src/app/profile/CosmeticPanel.tsx
'use client'
import { useRouter } from 'next/navigation'
import CosmeticPicker from '@/components/CosmeticPicker'

type Cosmetic = { id: string; label: string }

type Props = {
  ownedBadges: Cosmetic[]
  ownedSkins: Cosmetic[]
  activeBadge: string | null
  activeSkin: string | null
}

export default function CosmeticPanel({ ownedBadges, ownedSkins, activeBadge, activeSkin }: Props) {
  const router = useRouter()
  const refresh = () => router.refresh()

  return (
    <div className="w-full max-w-2xl mb-10 flex flex-col gap-4">
      {ownedBadges.length > 0 && (
        <div>
          <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-2">Badge</h3>
          <CosmeticPicker kind="badge" owned={ownedBadges} activeId={activeBadge} onChange={refresh} />
        </div>
      )}
      {ownedSkins.length > 0 && (
        <div>
          <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-2">Skin</h3>
          <CosmeticPicker kind="skin" owned={ownedSkins} activeId={activeSkin} onChange={refresh} />
        </div>
      )}
    </div>
  )
}
