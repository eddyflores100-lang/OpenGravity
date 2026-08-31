import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'OpenGravity V10 | Institutional Oracle',
  description: 'Predictive Bayesian Scoring & Agentic Due Diligence Engine',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scrollbar-hide">
      <body className="antialiased selection:bg-blue-500/20">{children}</body>
    </html>
  )
}
