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
import { loadUserProfile as loadUserProfileDB } from './utils/supabaseData'

const APPROVED_USER_KEY = 'fitness_app_approved_user'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const initApp = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!navigator.onLine) {
        console.log('📡 Offline: controllo fallback locale')
        const savedUser = localStorage.getItem(APPROVED_USER_KEY)
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser)
            console.log('✅ Utente ripristinato da localStorage:', parsed.email)
            if (isMounted) {
              setUser(parsed)
              setLoading(false)
            }
          } catch (e) {
            console.error('Errore parsing utente salvato:', e)
          }
        } else {
          console.log('⚠️ Nessun utente salvato in locale, serve login online')
        }
        if (isMounted) setLoading(false)
        return
      }
      
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
        const savedUser = localStorage.getItem(APPROVED_USER_KEY)
        if (savedUser) {
          try {
            if (isMounted) setUser(JSON.parse(savedUser))
          } catch (e) {}
        }
      }
    }
    
    window.addEventListener('online', handleOnline)

    return () => {
      isMounted = false
      subscription.unsubscribe()
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  // ✅ NUOVO useEffect: Carica i dati utente da Supabase OGNI VOLTA che l'app si avvia
  useEffect(() => {
    if (!user) {
      setDataLoading(false)
      return
    }

    const loadUserData = async () => {
      console.log('🔄 Caricamento dati utente da Supabase...')
      setDataLoading(true)
      
      try {
        // Forza il caricamento del profilo da Supabase
        const dbProfile = await loadUserProfileDB(user.id)
        if (dbProfile) {
          console.log('✅ Profilo caricato da Supabase:', dbProfile)
          const p = { 
            genere: dbProfile.genere || 'M', 
            eta: dbProfile.eta, 
            altezza: dbProfile.altezza,
            dataNascita: dbProfile.data_nascita
          }
          localStorage.setItem('fitness_app_user_profile', JSON.stringify(p))
        } else {
          console.warn('⚠️ Profilo non trovato su Supabase')
        }
      } catch (err) {
        console.error('❌ Errore caricamento dati utente:', err)
      } finally {
        setDataLoading(false)
      }
    }

    loadUserData()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-electric text-xl animate-pulse">Caricamento...</div>
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

        {/* Mostra loading mentre carica i dati utente */}
        {dataLoading && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-card border border-electric rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric mx-auto mb-4"></div>
              <p className="text-electric font-semibold">Caricamento dati...</p>
            </div>
          </div>
        )}

        <main>
          <Routes>
            <Route path="/" element={<Panoramica user={user} />} />
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