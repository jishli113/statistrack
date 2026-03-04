import { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

// Ensure prisma is defined and properly initialized before creating adapter
if (!prisma) {
  console.error('❌ Prisma client is undefined! Cannot create PrismaAdapter.')
  throw new Error('Prisma client is not initialized')
}

if (!prisma.user) {
  console.error('❌ Prisma user model is undefined! Check Prisma schema generation.')
  throw new Error('Prisma user model is not available')
}

console.log('✅ Prisma client loaded:', !!prisma, typeof prisma, 'User model:', !!prisma.user)

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }
        console.log("credentials", credentials)
        if (!prisma) {
          console.error('❌ Prisma is undefined in authorize function')
          return null
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.password || !user.email) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🔐 SignIn callback called:', { 
        hasUser: !!user, 
        userId: user?.id, 
        provider: account?.provider,
        hasAccount: !!account 
      })
      
      // Handle OAuth sign-ins
      if (account?.provider === 'google' || account?.provider === 'github') {
        console.log('✅ Allowing OAuth sign-in for:', account.provider)
        
        // Check if account is already linked
        if (account?.providerAccountId) {
          const existingAccount = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId
              }
            }
          })
          
          if (existingAccount) {
            console.log('✅ Account already linked')
            return true
          }
        }
        
        // If user exists but account isn't linked, link it manually
        if (user?.email && account) {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: { accounts: true }
          })
          
          if (existingUser) {
            // Update user object to use existing user's ID
            user.id = existingUser.id
            
            // Check if account is already linked
            const accountExists = existingUser.accounts.some(
              acc => acc.provider === account.provider && acc.providerAccountId === account.providerAccountId
            )
            
            if (!accountExists) {
              // Link the account
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  refresh_token: account.refresh_token,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state,
                }
              })
              console.log('✅ Linked OAuth account to existing user:', existingUser.id)
            }
          }
        }
        
        return true
      }
      
      // For credentials, user is already verified in authorize()
      console.log('✅ Allowing credentials sign-in')
      return true
    },
    async jwt({ token, user, account }) {
      console.log('🔄 JWT callback called:', { 
        hasUser: !!user, 
        userId: user?.id, 
        hasAccount: !!account,
        provider: account?.provider,
        hasToken: !!token
      })
      
      // Initialize token if it doesn't exist (first call)
      if (!token) {
        token = {} as any
      }
      
      // On sign-in (when user and account are present)
      if (user) {
        token.id = user.id
        token.email = user.email
        console.log('✅ Added user ID to token:', user.id)
      }
      
      if (account) {
        token.accessToken = account.access_token
        console.log('✅ Added access token for provider:', account.provider)
      }
      
      return token
    },
    async session({ session, token }) {
      console.log('🔄 Session callback called:', { 
        hasToken: !!token, 
        tokenId: token.id,
        sessionEmail: session.user?.email 
      })
      if (session.user && token.id) {
        session.user.id = token.id as string
        console.log('✅ Session created with user ID:', token.id)
      } else {
        console.warn('⚠️ Session missing user ID:', { hasUser: !!session.user, hasTokenId: !!token.id })
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      console.log('🔄 Redirect callback called:', { url, baseUrl })
      
      // After OAuth sign-in, always redirect to home page
      // The home page (app/page.tsx) will check session and show dashboard if authenticated
      
      // If url is a callback URL or sign-in page, go to home
      if (!url || url.includes('/api/auth/callback') || url.includes('/api/auth/signin')) {
        console.log('✅ OAuth callback/signin detected, redirecting to home:', baseUrl)
        return baseUrl
      }
      
      // If url is provided and is a relative path, use it
      if (url.startsWith('/')) {
        const redirectUrl = `${baseUrl}${url}`
        console.log('✅ Redirecting to relative path:', redirectUrl)
        return redirectUrl
      }
      
      // If url is a full URL with same origin, use it
      try {
        const urlObj = new URL(url)
        if (urlObj.origin === baseUrl) {
          console.log('✅ Redirecting to same-origin URL:', url)
          return url
        }
      } catch (e) {
        // Invalid URL, fall through to default
      }
      
      // Default: redirect to home page
      console.log('✅ Default redirect to baseUrl:', baseUrl)
      return baseUrl
    },
  },
}
