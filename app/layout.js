import './globals.css'
import MonitoringInit from './MonitoringInit'

export const metadata = {
  title: {
    default: 'Karthikey AI — AI Agent Platform for Sales & CRM Teams',
    template: '%s | Karthikey AI',
  },
  description: '52 pre-built AI agents for CRM and sales teams. Lead scoring, pipeline management, email drafting, forecasting and more. Works with any Excel or CRM data. Any industry. Start free.',
  keywords: ['AI agents', 'CRM automation', 'lead scoring AI', 'sales automation India', 'AI platform India', 'Karthikey AI', 'pipeline management AI', 'email drafting AI'],
  metadataBase: new URL('https://agents.karthikey.in'),
  verification: {
    google: 'uMPXPlaDhVvpYs5GxfMdCDtJE4a0Ce6LAqhK9nRscKU',
  },
  openGraph: {
    siteName: 'Karthikey AI',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@karthikeyai',
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: '/icon.svg',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body>
        <MonitoringInit />
        {children}
      </body>
    </html>
  )
}
