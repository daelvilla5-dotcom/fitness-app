import { useState, useEffect } from 'react'
import { isOnline, onConnectionChange } from '../utils/offlineQueue'

function ConnectionStatus() {
  const [online, setOnline] = useState(isOnline())

  useEffect(() => {
    const unsubscribe = onConnectionChange((status) => {
      setOnline(status)
    })
    return () => {
      window.removeEventListener('online', () => {})
      window.removeEventListener('offline', () => {})
    }
  }, [])

  if (online) return null // Non mostrare nulla se online

  return (
    <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white text-center py-2 text-sm font-semibold z-50 animate-pulse">
      📡 Modalità Offline - Le modifiche verranno sincronizzate automaticamente
    </div>
  )
}

export default ConnectionStatus