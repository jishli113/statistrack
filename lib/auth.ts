import { appendFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { type NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './prisma'

function agentDebugLog(entry: {
  runId: string
  hypothesisId: string
  location: string
  message: string
  data?: Record<string, unknown>
}) {
  const payload = {
    sessionId: '4b1014',
    timestamp: Date.now(),
    ...entry,
  }
  try {
    const dir = join(process.cwd(), '.cursor')
    mkdirSync(dir, { recursive: true })
    appendFileSync(join(dir, 'debug-4b1014.log'), `${JSON.stringify(payload)}\n`)
  } catch {
    /* ignore */
  }
  fetch('http://127.0.0.1:7743/ingest/9f8650f0-9384-477d-80f3-500190fdf14f', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '4b1014',
    },
    body: JSON.stringify(payload),
  }).catch(() => {})
}

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
          prompt: 'select_account consent',
        },
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

      const pid = String(account.providerAccountId ?? '').trim()
      const incomingRefresh =
        typeof account.refresh_token === 'string' && account.refresh_token.length > 0
          ? account.refresh_token
          : null
      if (incomingRefresh && pid) {
        const updated = await prisma.account.updateMany({
          where: {
            userId: user.id,
            provider: 'google',
            providerAccountId: pid,
          },
          data: {
            refresh_token: incomingRefresh,
            ...(account.access_token != null && { access_token: account.access_token }),
            ...(account.expires_at != null && { expires_at: account.expires_at }),
            ...(account.token_type != null && { token_type: account.token_type }),
            ...(account.scope != null && { scope: account.scope }),
            ...(account.id_token != null && { id_token: account.id_token }),
            ...(account.session_state != null && { session_state: account.session_state }),
          },
        })
        // #region agent log
        agentDebugLog({
          runId: 'post-fix',
          hypothesisId: 'E',
          location: 'lib/auth.ts:events.signIn',
          message: 'post-adapter google token sync',
          data: { rowsUpdated: updated.count },
        })
        // #endregion
      }

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
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'google') {
        return true
      }

      const profileSub =
        profile && typeof (profile as { sub?: string }).sub === 'string'
          ? (profile as { sub: string }).sub
          : ''
      const googlePid = String(account.providerAccountId || profileSub).trim()
      const incomingRefresh =
        typeof account.refresh_token === 'string' && account.refresh_token.length > 0
          ? account.refresh_token
          : null

      // #region agent log
      agentDebugLog({
        runId: 'post-fix',
        hypothesisId: 'A',
        location: 'lib/auth.ts:signIn',
        message: 'google oauth callback account shape',
        data: {
          hasIncomingRefresh: Boolean(incomingRefresh),
          refreshTokenKeyPresent: account != null && 'refresh_token' in account,
          providerAccountIdLen: googlePid.length,
          usedProfileSubFallback: !String(account.providerAccountId || '').trim() && Boolean(profileSub),
        },
      })
      // #endregion

      if (googlePid) {
        const existingAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: googlePid,
            },
          },
        })

        if (existingAccount) {
          await prisma.account.update({
            where: { id: existingAccount.id },
            data: {
              refresh_token: incomingRefresh ?? existingAccount.refresh_token,
              access_token: account.access_token ?? existingAccount.access_token,
              expires_at: account.expires_at ?? existingAccount.expires_at,
              token_type: account.token_type ?? existingAccount.token_type,
              scope: account.scope ?? existingAccount.scope,
              id_token: account.id_token ?? existingAccount.id_token,
              session_state: account.session_state ?? existingAccount.session_state,
            },
          })
          // #region agent log
          const afterRow = await prisma.account.findUnique({
            where: { id: existingAccount.id },
            select: { refresh_token: true },
          })
          agentDebugLog({
            runId: 'post-fix',
            hypothesisId: 'B-D',
            location: 'lib/auth.ts:signIn',
            message: 'after existingAccount prisma update',
            data: {
              branch: 'existingAccountUpdate',
              hadExistingRefresh: Boolean(existingAccount.refresh_token),
              hadIncomingRefresh: Boolean(incomingRefresh),
              hasDbRefreshAfter: Boolean(afterRow?.refresh_token),
            },
          })
          // #endregion
          return true
        }
      }

      if (user?.email && account && googlePid) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { accounts: true },
        })

        if (existingUser) {
          user.id = existingUser.id

          const accountExists = existingUser.accounts.some(
            (acc) =>
              acc.provider === account.provider &&
              acc.providerAccountId === googlePid
          )

          if (!accountExists) {
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: googlePid,
                refresh_token: incomingRefresh,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state,
              },
            })
            // #region agent log
            agentDebugLog({
              runId: 'post-fix',
              hypothesisId: 'B',
              location: 'lib/auth.ts:signIn',
              message: 'manual account create path',
              data: {
                branch: 'manualAccountCreate',
                hasIncomingRefresh: Boolean(incomingRefresh),
              },
            })
            // #endregion
          } else {
            // #region agent log
            agentDebugLog({
              runId: 'post-fix',
              hypothesisId: 'B',
              location: 'lib/auth.ts:signIn',
              message: 'email merge path account already linked',
              data: { branch: 'emailPathAccountExistsNoManualWrite' },
            })
            // #endregion
          }
        }
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
