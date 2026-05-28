import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0D1B3E' }} />}>
      <LoginForm />
    </Suspense>
  )
}
