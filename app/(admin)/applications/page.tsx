import { createClient } from '@/lib/supabase/server'
import ProcessClient, { type AppRow } from './ProcessClient'

export default async function ApplicationsPage() {
  const supabase = createClient()

  const { data: applications } = await supabase
    .from('applications')
    .select('*, clients(id, name, email, contact_name, portal_token, token_expires_at, phone, facility_name, room_count, employee_count, capital_amount, industry, corporate_number, gbiz_id, representative_name, address, revenue, current_system, subsidy_history, wage_raise_plan)')
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
      clients: app.clients ?? { name: '—', email: '', contact_name: null, portal_token: null, token_expires_at: null, phone: null, facility_name: null, room_count: null, employee_count: null, capital_amount: null, industry: null, corporate_number: null, gbiz_id: null, representative_name: null, address: null },
      docs: (documents ?? []).filter(d => d.application_id === app.id),
      alerts: (emailLogs ?? []).filter(e => e.application_id === app.id),
      daysLeft: daysLeft !== null && daysLeft >= 0 ? daysLeft : null,
    }
  })

  return <ProcessClient initialApps={apps} />
}
