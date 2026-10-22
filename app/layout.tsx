import type { Metadata } from 'next'
import NextTopLoader from 'nextjs-toploader'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ostrick Social',
  description: 'Plataforma de gestão para igrejas e projetos sociais',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        <NextTopLoader color="#1e40af" height={3} showSpinner={false} />
        {children}
      </body>
    </html>
  )
}
