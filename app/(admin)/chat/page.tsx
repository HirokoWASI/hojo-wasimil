import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminChatClient from './AdminChatClient'

export default async function ChatPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: applications } = await supabase
    .from('applications')
    .select('*, clients(name, email, contact_name)')
    .not('status', 'in', '("不採択")')
    .order('created_at', { ascending: false })

  const csName = user.email?.split('@')[0] ?? 'CS担当'

  return (
    <AdminChatClient
      applications={(applications ?? []) as any}
      csName={csName}
    />
  )
}
