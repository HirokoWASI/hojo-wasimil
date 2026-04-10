'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const C = {
  ink: '#1a1814',
  inkMid: '#5a5650',
  accent: '#c45c1a',
  accentBg: '#fdf0e8',
  border: '#e5e2da',
} as const

const NAV = [
  { href: '/dashboard',    icon: '▤',  label: 'ダッシュボード' },
  { href: '/applications', icon: '📋', label: '顧客プロセス管理' },
  { href: '/screening',    icon: '⚡', label: 'AI適格審査' },
  { href: '/draft',        icon: '✦',  label: '書類ドラフト生成' },
  { href: '/chat',           icon: '💬', label: 'チャット管理' },
  { href: '/subsidy-lookup', icon: '🔍', label: '補助金管理' },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <>
      {NAV.map(n => {
        const active = pathname === n.href || pathname.startsWith(n.href + '/')
        return (
          <Link
            key={n.href}
            href={n.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: active ? 700 : 500,
              color: active ? C.accent : C.inkMid,
              textDecoration: 'none',
              borderLeft: `3px solid ${active ? C.accent : 'transparent'}`,
              background: active ? C.accentBg : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            <span>{n.icon}</span>
            {n.label}
          </Link>
        )
      })}
    </>
  )
}
