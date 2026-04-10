import type { UrgencyLevel } from './constants'
import { STATUS_ORDER } from './constants'

interface FilterableApp {
  id: string
  status: string
  clients: { name: string }
  cs_name: string | null
  deadline: string | null
  docs: { required: boolean; status: string }[]
  daysLeft: number | null
}

export function getUrgencyLevel(app: FilterableApp): UrgencyLevel {
  const d = app.daysLeft
  const hasDifference = app.docs.some(doc => doc.status === '差し戻し')
  const unsubmitted = app.docs.filter(doc => doc.required && doc.status === '未提出').length

  if (d !== null && d <= 7 && unsubmitted > 0) return 'critical'
  if (hasDifference) return 'critical'
  if (d !== null && d <= 14) return 'warning'
  if (d !== null && d <= 28 && unsubmitted > app.docs.filter(d2 => d2.required).length / 2) return 'attention'
  return 'normal'
}

export function filterBySearch<T extends FilterableApp>(apps: T[], query: string): T[] {
  if (!query.trim()) return apps
  const q = query.toLowerCase()
  return apps.filter(a => a.clients.name.toLowerCase().includes(q) || (a.cs_name ?? '').toLowerCase().includes(q))
}

export function filterByStatus<T extends FilterableApp>(apps: T[], statuses: string[]): T[] {
  if (statuses.length === 0) return apps
  return apps.filter(a => statuses.includes(a.status))
}

export function groupByStatus<T extends FilterableApp>(apps: T[]): { status: string; apps: T[] }[] {
  const groups: { status: string; apps: T[] }[] = []
  for (const status of STATUS_ORDER) {
    const matching = apps.filter(a => a.status === status).sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999))
    if (matching.length > 0) groups.push({ status, apps: matching })
  }
  return groups
}
