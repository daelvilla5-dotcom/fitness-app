import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Panoramica from './pages/Panoramica'
import Alimentazione from './pages/Alimentazione'
import Allenamento from './pages/Allenamento'
import Dati from './pages/Dati'

function App() {
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
            <Route path="/alimentazione" element={<Alimentazione />} />
            <Route path="/allenamento" element={<Allenamento />} />
            <Route path="/dati" element={<Dati />} />
          </Routes>
        </main>

        <Navbar />
      </div>
    </Router>
  )
}

export default App