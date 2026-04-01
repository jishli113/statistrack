'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoginPage from '@/components/LoginPage'
import Dashboard from '@/components/Dashboard'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    if (status === 'authenticated' && session) {
      const params = new URLSearchParams(window.location.search)
      if (params.toString()) {
        router.replace('/')
      }
    }
  }, [session, status, router])
  
  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>
  }
  
  if (!session) {
    return <LoginPage />
  }
  
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }
  
  return <Dashboard onSignOut={handleSignOut} />
}
