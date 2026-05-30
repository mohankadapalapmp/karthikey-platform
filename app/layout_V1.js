import './globals.css'

export const metadata = {
  title: 'Karthikey – AI Agent Platform',
  description: '52 AI agents for CRM-powered sales, service, marketing & ops teams. Works with any Excel, Zoho, Salesforce, or Dynamics 365 data.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
