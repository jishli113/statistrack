import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
    }
  }

  interface User {
    id: string
    email: string
    gmailLastSynced?: Date | null
  }
}

declare module 'next-auth/adapters' {
  interface AdapterUser {
    gmailLastSynced?: Date | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
  }
}
