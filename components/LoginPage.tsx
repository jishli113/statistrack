'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import statisTrackLogo from '@/static/statis_track.png'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  
  useEffect(() => {
    console.log("login page loaded")
  }, [])

  /** App Router: redirect:true often lands before SessionProvider sees the cookie — refresh RSC + client session. */
  const signInWithCredentials = async () => {
    setAuthError(null)
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl: '/',
    })
    if (result?.error) {
      console.error('Sign in failed:', result.error)
      setAuthError(
        result.error === 'CredentialsSignin'
          ? 'Sign-in failed. Use the same email/password as signup, or use Google/GitHub if you created the account with OAuth.'
          : result.error
      )
      return
    }
    if (result?.ok) router.refresh()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSignUp) {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        const data = await res.json()
        console.log(data)
        await signInWithCredentials()
      }
      else {
        console.error('Signup failed')
      }
    } else {
      await signInWithCredentials()
    }
  }

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    console.log("oauth sign in", provider)
    await signIn(provider, { callbackUrl: '/', redirect: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 p-10 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="flex justify-center mb-3">
            <Image
              src={statisTrackLogo}
              alt="StatisTrack"
              className="h-12 sm:h-14 w-auto object-contain"
              priority
            />
          </h1>
          <p className="text-lg font-bold tracking-tight text-gray-200">StatisTrack</p>
        </div>
        
        <h2 className="text-xl font-semibold text-center mb-8 text-white">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h2>

        {authError && (
          <p className="mb-4 rounded-lg border border-red-500/50 bg-red-950/40 px-3 py-2 text-center text-sm text-red-200">
            {authError}
          </p>
        )}

        {/* OAuth Buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleOAuthSignIn('google')}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-all duration-200 font-medium shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <button
            onClick={() => handleOAuthSignIn('github')}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 font-medium border border-gray-700"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
            </svg>
            Continue with GitHub
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-900/80 text-gray-400">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white placeholder-gray-500 transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white placeholder-gray-500 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200 font-medium shadow-lg shadow-orange-500/20 mt-6"
          >
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-gray-400 hover:text-orange-400 text-sm transition-colors"
          >
            {isSignUp
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  )
}
