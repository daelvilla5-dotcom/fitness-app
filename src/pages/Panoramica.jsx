import { useState, useEffect } from 'react'
import { loadTargets as loadTargetsDB } from '../utils/supabaseData'
import { useDailyLog } from '../hooks/useDailyLog'

function Panoramica({ user }) {
  // ✅ USA LO STESSO HOOK DI Alimentazione
  const { dailyLog } = useDailyLog(user)

  const [targets, setTargets] = useState(() => {
    const saved = localStorage.getItem('fitness_app_targets')
    return saved ? JSON.parse(saved) : { calories: 2000, pro: 150, carb: 250, gra: 70, fib: 30 }
  })

  useEffect(() => {
    if (!user) return

    const syncData = async () => {
      try {
        const dbTargets = await loadTargetsDB(user.id)
        if (dbTargets && dbTargets.calories > 0) {
          setTargets(dbTargets)
          localStorage.setItem('fitness_app_targets', JSON.stringify(dbTargets))
        }
      } catch (err) {
        console.error('Errore sincronizzazione Panoramica:', err)
      }
    }

    syncData()
  }, [user])

  // ✅ Calcola i totali usando gli stessi dati di Alimentazione
  const calculateTotals = (log) => {
    if (!log || log.length === 0) {
      return { calories: 0, pro: 0, carb: 0, gra: 0, fib: 0 }
    }
    
    return log.reduce((acc, entry) => {
      const grams = entry.grams || 0
      const multiplier = grams / 100
      
      return {
        calories: acc.calories + ((entry.calories || 0) * multiplier),
        pro: acc.pro + ((entry.pro || 0) * multiplier),
        carb: acc.carb + ((entry.carb || 0) * multiplier),
        gra: acc.gra + ((entry.gra || 0) * multiplier),
        fib: acc.fib + ((entry.fib || 0) * multiplier),
      }
    }, { calories: 0, pro: 0, carb: 0, gra: 0, fib: 0 })
  }

  const dailyTotals = calculateTotals(dailyLog)
  const round1 = (val) => Math.round(val * 10) / 10
  const remainingCalories = targets.calories - dailyTotals.calories

  return (
    <div className="p-4 pb-24">
      <h2 className="text-2xl font-bold text-electric mb-6 mt-2">📊 Panoramica</h2>

      <div className="bg-card border border-border rounded-lg p-6 mb-4">
        <h3 className="text-lg font-semibold text-white mb-6 text-center">Calorie Oggi</h3>
        
        <div className="flex flex-col items-center">
          <div className="relative w-56 h-56 mb-4">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1e293b" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#00BFFF" strokeWidth="3" strokeDasharray={`${Math.min((dailyTotals.calories / targets.calories) * 100, 100)}, 100`} className="transition-all duration-500" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-3xl font-bold text-white">🔥 {Math.round(dailyTotals.calories)}</p>
              <p className="text-lg text-gray-400">/ {targets.calories} kcal</p>
            </div>
          </div>
          <p className="text-sm text-gray-400 text-center">
            {remainingCalories > 0 ? `${Math.round(remainingCalories)} kcal rimanenti` : `${Math.round(Math.abs(remainingCalories))} kcal in eccesso`}
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Macro Nutrienti</h3>
        <div className="space-y-4">
          {[
            { name: 'Pro', current: dailyTotals.pro, target: targets.pro, color: '#00BFFF' },
            { name: 'Carbo', current: dailyTotals.carb, target: targets.carb, color: '#4ECDC4' },
            { name: 'Grassi', current: dailyTotals.gra, target: targets.gra, color: '#FF6B6B' },
            { name: 'Fibre', current: dailyTotals.fib, target: targets.fib, color: '#95E1D3' },
          ].map((macro) => (
            <div key={macro.name}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-white">{macro.name}</span>
                <span className="text-sm text-gray-400">{round1(macro.current)}g / {macro.target}g</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="h-2 rounded-full transition-all duration-300" style={{ width: `${Math.min((macro.current / macro.target) * 100, 100)}%`, backgroundColor: macro.color }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Panoramica