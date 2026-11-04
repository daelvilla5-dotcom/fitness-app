import { NavLink } from 'react-router-dom'

function Navbar() {
const navItems = [
  { path: '/', label: 'Panoramica', icon: '📊' },
  { path: '/alimentazione', label: 'Alimentazione', icon: '🍎' }, // ← AGGIUNTA ICONA
  { path: '/allenamento', label: 'Allenamento', icon: '💪' },
  { path: '/dati', label: 'Dati', icon: '📏' },
]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-2">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center p-2 rounded-lg transition-all ${
                isActive
                  ? 'text-electric bg-electric/10'
                  : 'text-gray-400 hover:text-white'
              }`
            }
          >
            <span className="text-xl mb-1">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default Navbar