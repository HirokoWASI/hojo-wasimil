import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ApplicationDetailClient } from './ApplicationDetailClient'

export default async function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [
    { data: application },
    { data: documents },
    { data: messages },
    { data: screeningLogs },
    { data: emailLogs },
  ] = await Promise.all([
    supabase
      .from('applications')
      .select('*, clients(*)')
      .eq('id', params.id)
      .single(),
    supabase
      .from('documents')
      .select('*')
      .eq('application_id', params.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('messages')
      .select('*')
      .eq('application_id', params.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('screening_logs')
      .select('*')
      .eq('application_id', params.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('email_logs')
      .select('*')
      .eq('application_id', params.id)
      .order('sent_at', { ascending: false })
      .limit(20),
  ])

  if (!application) return notFound()

  return (
    <ApplicationDetailClient
      application={application}
      documents={documents ?? []}
      initialMessages={messages ?? []}
      screeningLogs={screeningLogs ?? []}
      emailLogs={emailLogs ?? []}
    />
  )
}
