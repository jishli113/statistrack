'use client'

import { useState } from 'react'
import LoginPage from '@/components/LoginPage'
import Dashboard from '@/components/Dashboard'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // When user clicks sign in, just show the dashboard (no auth check)
  const handleSignIn = () => {
    setIsAuthenticated(true)
  }

  // Sign out just goes back to login page
  const handleSignOut = () => {
    setIsAuthenticated(false)
  }

  if (!isAuthenticated) {
    return <LoginPage onSignIn={handleSignIn} />
  }

  return <Dashboard onSignOut={handleSignOut} />
}
