import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import statisTrackIcon from '@/static/statis_track.png'

const manrope = Manrope({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-manrope',
})

export const metadata: Metadata = {
  title: 'StatisTrack',
  description: 'Track your job applications and their status with StatisTrack',
  icons: {
    icon: statisTrackIcon.src,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={manrope.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
