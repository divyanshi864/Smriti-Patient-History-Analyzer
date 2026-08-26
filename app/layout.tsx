import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Smriti — Patient Portal',
  description: 'AI-Powered Patient History & Emergency Treatment System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>
      <body className="bg-slate-50 min-h-screen">{children}</body>
    </html>
  )
}
