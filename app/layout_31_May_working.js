import './globals.css'
import MonitoringInit from './MonitoringInit'

export const metadata = {
  title: 'Karthikey – AI Agent Platform',
  description: '52 AI agents for CRM-powered sales, service, marketing & ops teams. Works with any Excel, Zoho, Salesforce, or Dynamics 365 data.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icon.svg',
  }
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
