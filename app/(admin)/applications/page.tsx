import { createClient } from '@/lib/supabase/server'
import ProcessClient, { type AppRow } from './ProcessClient'

export default async function ApplicationsPage() {
  const supabase = createClient()

  const { data: applications } = await supabase
    .from('applications')
    .select('*, clients(id, name, email, contact_name, portal_token, token_expires_at)')
    .order('created_at', { ascending: false })

  const appIds = (applications ?? []).map(a => a.id)

  const [{ data: documents }, { data: emailLogs }] = await Promise.all([
    appIds.length > 0
      ? supabase.from('documents').select('*').in('application_id', appIds).order('updated_at', { ascending: true })
      : Promise.resolve({ data: [] }),
    appIds.length > 0
      ? supabase.from('email_logs').select('*').in('application_id', appIds).order('sent_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  const today = new Date()

  const apps: AppRow[] = (applications ?? []).map(app => {
    const daysLeft = app.deadline
      ? Math.ceil((new Date(app.deadline).getTime() - today.getTime()) / 86400000)
      : null
    return {
      ...app,
      clients: app.clients ?? { name: '—', email: '', contact_name: null, portal_token: null, token_expires_at: null },
      docs: (documents ?? []).filter(d => d.application_id === app.id),
      alerts: (emailLogs ?? []).filter(e => e.application_id === app.id),
      daysLeft: daysLeft !== null && daysLeft >= 0 ? daysLeft : null,
    }
  })

  return <ProcessClient initialApps={apps} />
}
