import { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, useSearchParams } from 'react-router-dom'
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
import { getRoutineByShareCode, saveRoutine } from './utils/supabaseData'

const APPROVED_USER_KEY = 'fitness_app_approved_user'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Stati per la condivisione/importazione
  const [searchParams, setSearchParams] = useSearchParams()
  const [importData, setImportData] = useState(null)
  const [importLoading, setImportLoading] = useState(false)

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

  // useEffect per gestire l'importazione da link condiviso
  useEffect(() => {
    const shareCode = searchParams.get('importa')
    if (shareCode && user && !importData) {
      setImportLoading(true)
      getRoutineByShareCode(shareCode).then(routine => {
        if (routine) {
          setImportData(routine)
        } else {
          alert('Scheda non trovata o non più condivisa.')
          setSearchParams({})
        }
        setImportLoading(false)
      }).catch(() => {
        setImportLoading(false)
      })
    }
  }, [searchParams, user, importData])

  const handleImportRoutine = async () => {
    if (!importData || !user) return
    setImportLoading(true)
    try {
      const newRoutine = {
        name: `${importData.name} (Importata)`,
        days: importData.days
      }
      await saveRoutine(user.id, newRoutine)
      alert('✅ Scheda importata con successo! La trovi nella tab "Schede".')
      setImportData(null)
      setSearchParams({})
    } catch (err) {
      console.error('Errore importazione:', err)
      alert('Errore durante l\'importazione della scheda.')
    } finally {
      setImportLoading(false)
    }
  }

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

        {/* Modal Importazione Scheda */}
        {importData && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-electric rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-electric mb-2">📥 Importa Scheda</h3>
              <p className="text-white mb-1">È stata condivisa con te la scheda:</p>
              <p className="text-xl font-bold text-white mb-4">"{importData.name}"</p>
              <p className="text-sm text-gray-400 mb-6">
                Verrà creata una copia nel tuo account. Potrai modificarla come preferisci.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleImportRoutine}
                  disabled={importLoading}
                  className="flex-1 bg-electric text-black font-bold py-3 rounded-lg disabled:opacity-50"
                >
                  {importLoading ? 'Importazione...' : 'Importa Scheda'}
                </button>
                <button
                  onClick={() => {
                    setImportData(null)
                    setSearchParams({})
                  }}
                  className="flex-1 bg-gray-700 text-white font-bold py-3 rounded-lg"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

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