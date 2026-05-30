'use client'
import { useEffect } from 'react'
import { initSentry } from '../lib/monitoring'
import { initAnalytics } from '../lib/analytics'

export default function MonitoringInit() {
  useEffect(() => {
    initSentry()
    initAnalytics()
  }, [])
  return null
}
