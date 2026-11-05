import { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import Navbar from './components/Navbar'
import Panoramica from './pages/Panoramica'
import Alimentazione from './pages/Alimentazione'
import Allenamento from './pages/Allenamento'
import Dati from './pages/Dati'
import { migrateLocalStorageToSupabase } from './utils/migrateData'
import ConnectionStatus from './components/ConnectionStatus'
import { syncPendingOperations } from './utils/syncService'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Controlla se c'è una sessione attiva all'avvio
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Se offline, mantieni l'utente loggato comunque
        if (!navigator.onLine) {
          console.log('📡 Offline: mantieni sessione locale')
          setUser(session.user)
        } else {
          // Se online, verifica l'approvazione
          const { data: approvedUser } = await supabase
            .from('approved_users')
            .select('*')
            .eq('email', session.user.email)
            .eq('attivo', true)
            .maybeSingle()

          if (approvedUser) {
            setUser(session.user)
            migrateLocalStorageToSupabase(session.user)
            syncPendingOperations(session.user)
          } else {
            await supabase.auth.signOut()
            setUser(null)
          }
        }
      }
      setLoading(false)
    })

    // Ascolta i cambiamenti di stato auth (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event)
        
        if (session) {
          // LOGIN o TOKEN_REFRESHED
          if (!navigator.onLine) {
            // Se offline, mantieni comunque l'utente loggato
            console.log('📡 Offline: mantieni sessione locale')
            setUser(session.user)
          } else {
            // Se online, verifica l'approvazione
            const { data: approvedUser } = await supabase
              .from('approved_users')
              .select('*')
              .eq('email', session.user.email)
              .eq('attivo', true)
              .maybeSingle()

            if (approvedUser) {
              setUser(session.user)
              migrateLocalStorageToSupabase(session.user)
              
              // Sincronizza operazioni offline pending al login
              syncPendingOperations(session.user).then(result => {
                if (result.success > 0) {
                  console.log(`🔄 Sincronizzate ${result.success} operazioni offline al login`)
                }
              })
            } else {
              await supabase.auth.signOut()
              setUser(null)
            }
          }
        } else {
          // LOGOUT
          // Non fare logout se siamo offline (potrebbe essere un errore di rete)
          if (navigator.onLine) {
            setUser(null)
          } else {
            console.log(' Offline: ignora logout automatico')
            // Mantieni l'utente loggato localmente
          }
        }
      }
    )

    // Listener per la riconnessione automatica
    const handleOnline = async () => {
      console.log('🌐 Connessione ripristinata, verifico sessione...')
      const { data: { session } } = await supabase.auth.getSession()
      if (session && user) {
        // Verifica che l'utente sia ancora approvato
        const { data: approvedUser } = await supabase
          .from('approved_users')
          .select('*')
          .eq('email', session.user.email)
          .eq('attivo', true)
          .maybeSingle()

        if (approvedUser) {
          console.log('✅ Sessione valida, sincronizzo...')
          const result = await syncPendingOperations(session.user)
          if (result.success > 0) {
            console.log(`✅ Sincronizzate con successo ${result.success} operazioni`)
          }
        } else {
          // Utente non più approvato
          await supabase.auth.signOut()
          setUser(null)
        }
      }
    }
    
    window.addEventListener('online', handleOnline)

    // Cleanup
    return () => {
      subscription.unsubscribe()
      window.removeEventListener('online', handleOnline)
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-electric text-xl">Caricamento...</div>
      </div>
    )
  }

  if (!user) {
    return <Login onLoginSuccess={setUser} />
  }

  return (
    <Router>
      <div className="min-h-screen bg-bg pb-20">
        <header className="sticky top-0 bg-card border-b border-border px-4 py-3 z-10">
          <h1 className="text-xl font-bold text-electric text-center">
            Fitness App 🏋️
          </h1>
        </header>
        
        {/* Indicatore di stato connessione */}
        <ConnectionStatus />

        <main>
          <Routes>
            <Route path="/" element={<Panoramica />} />
            <Route path="/alimentazione" element={<Alimentazione user={user} />} />
            <Route path="/allenamento" element={<Allenamento user={user} />} />
            <Route path="/dati" element={<Dati user={user} />} />
          </Routes>
        </main>

        <Navbar />
      </div>
    </Router>
  )
}

export default App