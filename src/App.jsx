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

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Controlla se c'è una sessione attiva all'avvio
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Verifica se l'email è approvata
        const { data: approvedUser } = await supabase
          .from('approved_users')
          .select('*')
          .eq('email', session.user.email)
          .eq('attivo', true)
          .single()

        if (approvedUser) {
          setUser(session.user)
        } else {
          // Email non approvata → logout
          await supabase.auth.signOut()
          setUser(null)
        }
      }
      setLoading(false)
    })

    // Ascolta i cambiamenti di stato auth (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
                if (session) {
          console.log('App: Sessione trovata', session.user.email)
          
          const { data: approvedUser } = await supabase
            .from('approved_users')
            .select('*')
            .eq('email', session.user.email)
            .eq('attivo', true)
            .maybeSingle()

          if (approvedUser) {
            setUser(session.user)
            
            // 🚀 AVVIA LA MIGRAZIONE IN BACKGROUND
            migrateLocalStorageToSupabase(session.user)
            
          } else {
            console.log('App: Utente non approvato')
            await supabase.auth.signOut()
          }
        } else {
          setUser(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

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