'use client'

import { useState } from 'react'
import type { Client } from '@/types/database'

interface ClientWithApps extends Client {
  applications: Array<{ id: string; subsidy_type: string; status: string }>
}

export function LinksClient({ clients }: { clients: ClientWithApps[] }) {
  const [generating, setGenerating] = useState<string | null>(null)
  const [generatedUrls, setGeneratedUrls] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [expiryDays, setExpiryDays] = useState(30)

  async function generateToken(clientId: string) {
    setGenerating(clientId)
    try {
      const res = await fetch('/api/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, expiryDays }),
      })
      const data = await res.json()
      if (data.url) {
        setGeneratedUrls((prev) => ({ ...prev, [clientId]: data.url }))
      }
    } catch {
      alert('トークン生成に失敗しました')
    } finally {
      setGenerating(null)
    }
  }

  async function copyUrl(clientId: string, url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(clientId)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">ポータルURL管理</h1>
          <p className="text-sm text-neutral-500 mt-1">顧客ごとにセキュアなポータルURLを発行します</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-neutral-600">有効期限</label>
          <select
            value={expiryDays}
            onChange={(e) => setExpiryDays(Number(e.target.value))}
            className="input w-auto text-sm"
          >
            <option value={7}>7日間</option>
            <option value={14}>14日間</option>
            <option value={30}>30日間</option>
            <option value={60}>60日間</option>
            <option value={90}>90日間</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {clients.map((client) => {
          const generatedUrl = generatedUrls[client.id]
          const currentUrl = client.portal_token
            ? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://hojo.wasimil.jp'}/portal/${client.portal_token}`
            : null
          const displayUrl = generatedUrl ?? currentUrl
          const isExpired = client.token_expires_at
            ? new Date(client.token_expires_at) < new Date()
            : false

          return (
            <div key={client.id} className="card p-5">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-neutral-800">{client.name}</h3>
                    {client.token_expires_at && (
                      <span className={`badge text-xs ${isExpired ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                        {isExpired ? '期限切れ' : `有効 〜${new Date(client.token_expires_at).toLocaleDateString('ja-JP')}`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400">{client.email}</p>

                  {client.applications.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {client.applications.map((app) => (
                        <span key={app.id} className="badge bg-neutral-100 text-neutral-600 text-xs">
                          {app.subsidy_type}
                        </span>
                      ))}
                    </div>
                  )}

                  {displayUrl && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="text"
                        value={displayUrl}
                        readOnly
                        className="input flex-1 text-xs text-neutral-500 bg-neutral-50"
                      />
                      <button
                        onClick={() => copyUrl(client.id, displayUrl)}
                        className="btn-secondary text-xs whitespace-nowrap"
                      >
                        {copied === client.id ? 'コピー済み ✓' : 'コピー'}
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => generateToken(client.id)}
                  disabled={generating === client.id}
                  className="btn-primary text-sm whitespace-nowrap"
                >
                  {generating === client.id ? '生成中...' : generatedUrl ? '再発行' : isExpired ? '再発行' : 'URL発行'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
