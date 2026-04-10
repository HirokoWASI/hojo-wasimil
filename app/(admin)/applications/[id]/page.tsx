import { redirect } from 'next/navigation'

export default function ApplicationDetailPage({ params }: { params: { id: string } }) {
  redirect(`/applications?sel=${params.id}`)
}
