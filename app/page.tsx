import { redirect } from 'next/navigation'

export default function Home() {
  // Redirigir al dashboard
  redirect('/dashboard')
}
