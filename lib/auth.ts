import { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './prisma'
import { normalizeEmail } from './email'
import bcrypt from 'bcryptjs'

if (!prisma) {
  console.error('Prisma client is undefined; cannot create PrismaAdapter.')
  throw new Error('Prisma client is not initialized')
}

if (!prisma.user) {
  console.error('Prisma user model is undefined; check schema generation.')
  throw new Error('Prisma user model is not available')
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
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
        if (!prisma) {
          console.error('Prisma is undefined in authorize')
          return null
        }
        const email = normalizeEmail(credentials.email)
        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
        })

        if (!user?.email) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[auth] credentials: no user for email')
          }
          return null
        }
        if (!user.password) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(
              '[auth] credentials: OAuth-only account; use Google/GitHub'
            )
          }
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[auth] credentials: password mismatch')
          }
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
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/',
  },
  events: {
    async signIn({ user, account }) {
      if (account?.provider !== 'google' || !user?.id) return
      const row = await prisma.user.findUnique({
        where: { id: user.id },
        select: { gmailLastSynced: true },
      })
      if (row?.gmailLastSynced != null) return
      await prisma.user.update({
        where: { id: user.id },
        data: { gmailLastSynced: new Date() },
      })
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' || account?.provider === 'github') {
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
            return true
          }
        }
        
        if (user?.email && account) {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: { accounts: true }
          })
          
          if (existingUser) {
            user.id = existingUser.id

            const accountExists = existingUser.accounts.some(
              acc => acc.provider === account.provider && acc.providerAccountId === account.providerAccountId
            )
            
            if (!accountExists) {
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
            }
          }
        }
        
        return true
      }
      
      return true
    },
    async jwt({ token, user, account }) {
      if (!token) {
        token = {} as any
      }
      
      if (user) {
        token.sub = user.id
        token.id = user.id
        token.email = user.email
      }
      
      if (account) {
        token.accessToken = account.access_token
      }
      
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      } else if (process.env.NODE_ENV === 'development') {
        console.warn('[auth] session missing user id')
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      if (!url || url.includes('/api/auth/callback') || url.includes('/api/auth/signin')) {
        return baseUrl
      }
      
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`
      }
      
      try {
        const urlObj = new URL(url)
        if (urlObj.origin === baseUrl) {
          return url
        }
      } catch {
        // invalid URL
      }
      
      return baseUrl
    },
  },
}
