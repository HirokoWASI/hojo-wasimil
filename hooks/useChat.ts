'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/types/database'

export function useChat(applicationId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('messages')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as Message[])
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
      supabase.removeChannel(channel)
    }
  }, [applicationId])

  async function sendMessage(
    content: string,
    senderType: 'customer' | 'cs',
    senderName: string
  ) {
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
  }

  return { messages, sendMessage, loading }
}
