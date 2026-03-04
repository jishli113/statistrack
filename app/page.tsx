'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoginPage from '@/components/LoginPage'
import Dashboard from '@/components/Dashboard'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Handle OAuth callback - check for session after redirect
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    if (status === 'authenticated' && session) {
      console.log('✅ Session authenticated, user:', session.user?.email)
      // Clean up any OAuth callback params from URL
      const params = new URLSearchParams(window.location.search)
      if (params.toString()) {
        console.log('🧹 Cleaning up URL params:', params.toString())
        router.replace('/')
      }
    }
    else{
      console.log(session, status, "session, status")
    }
  }, [session, status, router])
  
  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>
  }
  
  if (!session) {
    console.log("no session, redirecting to login")
    return <LoginPage />
  }
  
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }
  
  return <Dashboard onSignOut={handleSignOut} />
}
