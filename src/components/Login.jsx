import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const APPROVED_USER_KEY = 'fitness_app_approved_user'

function Login({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        if (!navigator.onLine) {
          const savedUser = localStorage.getItem(APPROVED_USER_KEY)
          if (savedUser) {
            try {
              const parsed = JSON.parse(savedUser)
              console.log('Login offline riuscito con utente salvato:', parsed.email)
              onLoginSuccess(parsed)
              return
            } catch (e) {
              console.error('Errore parsing utente salvato:', e)
            }
          }
          setError('Sei offline e nessun utente e salvato in locale. Connettiti a internet per accedere.')
          return
        }

        const isApproved = await checkIfApproved(session.user.email)
        if (isApproved) {
          onLoginSuccess(session.user)
        } else {
          await supabase.auth.signOut()
          setError('Accesso negato. La tua email non e nella lista approvata.')
        }
      }
    })

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [onLoginSuccess])

  const checkIfApproved = async (email) => {
    try {
      const { data, error } = await supabase
        .from('approved_users')
        .select('*')
        .eq('email', email)
        .eq('attivo', true)
        .single()

      if (error || !data) {
        return false
      }
      return true
    } catch (err) {
      console.error('Errore controllo approvazione:', err)
      return false
    }
  }

  const handleGoogleLogin = async () => {
    if (isOffline) {
      setError('Sei offline. Connettiti a internet per effettuare il login.')
      return
    }

    try {
      setLoading(true)
      setError('')

      const redirectTo = window.location.hostname.includes('vercel.app')
        ? 'https://fitness-app-chi-bice.vercel.app'
        : 'http://localhost:5173'

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
        },
      })

      if (error) {
        console.error('Errore OAuth:', error)
        throw error
      }
    } catch (err) {
      setError('Errore durante il login: ' + err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-electric mb-2">
            Fitness App
          </h1>
          <p className="text-gray-400">
            Accedi per sincronizzare i tuoi dati
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {isOffline && !error && (
          <div className="bg-orange-500/10 border border-orange-500 rounded-lg p-3 mb-6">
            <p className="text-orange-400 text-sm">Sei offline. Connettiti a internet per accedere.</p>
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading || isOffline}
          className="w-full bg-electric text-black font-bold py-3 rounded-lg hover:bg-electric/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              Caricamento...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Accedi con Google
            </>
          )}
        </button>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Solo gli utenti approvati possono accedere
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login