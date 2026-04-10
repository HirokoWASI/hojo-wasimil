'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/types/database'

export function useChat(applicationId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const supabase = supabaseRef.current
    let cancelled = false

    supabase
      .from('messages')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('messages fetch error:', error)
          setMessages([])
        } else {
          setMessages((data ?? []) as Message[])
        }
        setLoading(false)
      })

    const channel = supabase
      .channel(`messages:${applicationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `application_id=eq.${applicationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [applicationId])

  const sendMessage = useCallback(async (
    content: string,
    senderType: 'customer' | 'cs',
    senderName: string
  ) => {
    const supabase = supabaseRef.current
    const { data, error } = await supabase
      .from('messages')
      .insert({
        application_id: applicationId,
        sender_type: senderType,
        sender_name: senderName,
        content,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }, [applicationId])

  return { messages, sendMessage, loading }
}
