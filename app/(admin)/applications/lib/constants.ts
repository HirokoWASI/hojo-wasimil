export const C = {
  bg: '#f5f4f0', surface: '#ffffff', surfaceAlt: '#faf9f6',
  border: '#e5e2da', borderMid: '#d0cdc4',
  ink: '#1a1814', inkMid: '#5a5650', inkFaint: '#9b9890',
  accent: '#c45c1a', accentBg: '#fdf0e8', accentBorder: '#f0c8a4',
  green: '#2d7a47', greenBg: '#edf7f1', greenBorder: '#a8d9b8',
  blue: '#1a5fa8', blueBg: '#eaf2fc', blueBorder: '#a4c8f0',
  red: '#b83232', redBg: '#fdf0f0', redBorder: '#f0b8b8',
  yellow: '#7a5c00', yellowBg: '#fdf8e8', yellowBorder: '#e8d490',
  purple: '#6a3fa0', purpleBg: '#f5f0fc', purpleBorder: '#c8a8e8',
} as const

export const STATUS_ORDER = ['適格審査中', '書類準備中', '申請中', '採択待ち', '採択済', '不採択'] as const

export const APP_STATUS_CFG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  '適格審査中': { color: C.yellow,  bg: C.yellowBg,  border: C.yellowBorder,  icon: '◐' },
  '書類準備中': { color: C.blue,    bg: C.blueBg,    border: C.blueBorder,    icon: '◑' },
  '申請中':     { color: C.accent,  bg: C.accentBg,  border: C.accentBorder,  icon: '◕' },
  '採択待ち':   { color: C.purple,  bg: C.purpleBg,  border: C.purpleBorder,  icon: '◔' },
  '採択済':     { color: C.green,   bg: C.greenBg,   border: C.greenBorder,   icon: '●' },
  '不採択':     { color: C.red,     bg: C.redBg,     border: C.redBorder,     icon: '○' },
}

export const POST_GRANT_STEPS = ['交付決定', '事業実施', '実績報告', '補助金入金', '効果報告1年目', '効果報告2年目', '効果報告3年目', '完了'] as const

export type UrgencyLevel = 'critical' | 'warning' | 'attention' | 'normal'
