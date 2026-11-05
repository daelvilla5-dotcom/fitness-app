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

// Chiave per salvare l'utente approvato in localStorage
const APPROVED_USER_KEY = 'fitness_app_approved_user'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const initApp = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      // Se offline, usa il fallback da localStorage
      if (!navigator.onLine) {
        console.log('📡 Offline: controllo fallback locale')
        const savedUser = localStorage.getItem(APPROVED_USER_KEY)
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser)
            console.log('✅ Utente ripristinato da localStorage:', parsed.email)
            if (isMounted) setUser(parsed)
          } catch (e) {
            console.error('Errore parsing utente salvato:', e)
          }
        } else {
          console.log('⚠️ Nessun utente salvato in locale, serve login online')
        }
        if (isMounted) setLoading(false)
        return
      }
      
      // Se online, comportamento normale
      if (session) {
        const { data: approvedUser } = await supabase
          .from('approved_users')
          .select('*')
          .eq('email', session.user.email)
          .eq('attivo', true)
          .maybeSingle()

        if (approvedUser) {
          // Salva l'utente in localStorage per uso offline futuro
          localStorage.setItem(APPROVED_USER_KEY, JSON.stringify(session.user))
          if (isMounted) setUser(session.user)
          migrateLocalStorageToSupabase(session.user)
          syncPendingOperations(session.user)
        } else {
          await supabase.auth.signOut()
          localStorage.removeItem(APPROVED_USER_KEY)
          if (isMounted) setUser(null)
        }
      }
      if (isMounted) setLoading(false)
    }

    initApp()

    // Ascolta i cambiamenti di stato auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event)
        
        if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setUser(null)
            localStorage.removeItem(APPROVED_USER_KEY)
          }
          return
        }
        
        if (session) {
          if (!navigator.onLine) {
            console.log('📡 Offline: mantieni sessione locale')
            localStorage.setItem(APPROVED_USER_KEY, JSON.stringify(session.user))
            if (isMounted) setUser(session.user)
          } else {
            const { data: approvedUser } = await supabase
              .from('approved_users')
              .select('*')
              .eq('email', session.user.email)
              .eq('attivo', true)
              .maybeSingle()

            if (approvedUser) {
              localStorage.setItem(APPROVED_USER_KEY, JSON.stringify(session.user))
              if (isMounted) setUser(session.user)
              migrateLocalStorageToSupabase(session.user)
              syncPendingOperations(session.user)
            } else {
              await supabase.auth.signOut()
              localStorage.removeItem(APPROVED_USER_KEY)
              if (isMounted) setUser(null)
            }
          }
        }
      }
    )

    // Listener per la riconnessione automatica
    const handleOnline = async () => {
      console.log('🌐 Connessione ripristinata, verifico sessione...')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        const { data: approvedUser } = await supabase
          .from('approved_users')
          .select('*')
          .eq('email', session.user.email)
          .eq('attivo', true)
          .maybeSingle()

        if (approvedUser) {
          localStorage.setItem(APPROVED_USER_KEY, JSON.stringify(session.user))
          if (isMounted) setUser(session.user)
          const result = await syncPendingOperations(session.user)
          if (result.success > 0) {
            console.log(`✅ Sincronizzate con successo ${result.success} operazioni`)
          }
        } else {
          await supabase.auth.signOut()
          localStorage.removeItem(APPROVED_USER_KEY)
          if (isMounted) setUser(null)
        }
      } else {
        // Nessun session, controlla localStorage
        const savedUser = localStorage.getItem(APPROVED_USER_KEY)
        if (savedUser) {
          try {
            if (isMounted) setUser(JSON.parse(savedUser))
          } catch (e) {}
        }
      }
    }
    
    window.addEventListener('online', handleOnline)

    // Cleanup
    return () => {
      isMounted = false
      subscription.unsubscribe()
      window.removeEventListener('online', handleOnline)
    }
  }, []) // ← RIMOSSO [user] per evitare loop

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