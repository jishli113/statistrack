'use client'

import { useSession } from 'next-auth/react'
import LoginPage from '@/components/LoginPage'
import Dashboard from '@/components/Dashboard'

export default function Home() {
  const { data: session, status } = useSession()
  
  if (status === 'loading') {
    return <div>Loading...</div>
  }
  
  if (!session) {
    return <LoginPage />  // No onSignIn prop needed!
  }
  
  return <Dashboard />
}