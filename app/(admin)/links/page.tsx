import { createClient } from '@/lib/supabase/server'
import { LinksClient } from './LinksClient'

export default async function LinksPage() {
  const supabase = createClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('*, applications(id, subsidy_type, status)')
    .order('created_at', { ascending: false })

  return <LinksClient clients={clients ?? []} />
}
