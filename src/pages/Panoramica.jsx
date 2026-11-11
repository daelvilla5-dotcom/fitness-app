import { useState, useEffect } from 'react'
import { 
  loadTargets as loadTargetsDB, 
  loadLast7CompletedLogs 
} from '../utils/supabaseData'

function Panoramica({ user }) {
  const [targets, setTargets] = useState(() => {
    const saved = localStorage.getItem('fitness_app_targets')
    return saved ? JSON.parse(saved) : { calories: 2000, pro: 150, carb: 250, gra: 70, fib: 30 }
  })
  
  const [weeklyAverage, setWeeklyAverage] = useState({ calories: 0, pro: 0, carb: 0, gra: 0, fib: 0 })
  const [daysCount, setDaysCount] = useState(0)

  useEffect(() => {
    if (!user) return

    const loadData = async () => {
      try {
        // 1. Carica target
        const dbTargets = await loadTargetsDB(user.id)
        if (dbTargets && dbTargets.calories > 0) {
          setTargets(dbTargets)
          localStorage.setItem('fitness_app_targets', JSON.stringify(dbTargets))
        }

        // 2. Carica ultimi 7 giorni conclusi
        const completedLogs = await loadLast7CompletedLogs(user.id)
        setDaysCount(completedLogs.length)
        
        if (completedLogs.length > 0) {
          // Somma i totali di tutti i giorni recuperati
          const totals = completedLogs.reduce((acc, log) => {
            const dailyTotals = (log.entries || []).reduce((dayAcc, entry) => ({
              calories: dayAcc.calories + (entry.calories || 0),
              pro: dayAcc.pro + (entry.pro || 0),
              carb: dayAcc.carb + (entry.carb || 0),
              gra: dayAcc.gra + (entry.gra || 0),
              fib: dayAcc.fib + (entry.fib || 0),
            }), { calories: 0, pro: 0, carb: 0, gra: 0, fib: 0 })

            return {
              calories: acc.calories + dailyTotals.calories,
              pro: acc.pro + dailyTotals.pro,
              carb: acc.carb + dailyTotals.carb,
              gra: acc.gra + dailyTotals.gra,
              fib: acc.fib + dailyTotals.fib,
            }
          }, { calories: 0, pro: 0, carb: 0, gra: 0, fib: 0 })

          // Calcola la media dividendo per il numero effettivo di giorni trovati (1-7)
          const count = completedLogs.length
          setWeeklyAverage({
            calories: Math.round(totals.calories / count),
            pro: Math.round((totals.pro / count) * 10) / 10,
            carb: Math.round((totals.carb / count) * 10) / 10,
            gra: Math.round((totals.gra / count) * 10) / 10,
            fib: Math.round((totals.fib / count) * 10) / 10,
          })
        }
      } catch (err) {
        console.error('Errore sincronizzazione Panoramica:', err)
      }
    }

    loadData()
  }, [user])

  const round1 = (val) => Math.round(val * 10) / 10
  const remainingCalories = targets.calories - weeklyAverage.calories

  return (
    <div className="p-4 pb-24">
      <h2 className="text-2xl font-bold text-electric mb-2 mt-2">📊 Panoramica</h2>
      <p className="text-sm text-gray-400 mb-6">
        {daysCount > 0 
          ? `Media degli ultimi ${daysCount} giorn${daysCount === 1 ? 'o' : 'i'} conclusi` 
          : 'Completa almeno un giorno per vedere la media'}
      </p>

      <div className="bg-card border border-border rounded-lg p-6 mb-4">
        <h3 className="text-lg font-semibold text-white mb-6 text-center">Calorie Medie</h3>
        
        <div className="flex flex-col items-center">
          <div className="relative w-56 h-56 mb-4">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1e293b" strokeWidth="3" />
              <path 
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                fill="none" 
                stroke="#00BFFF" 
                strokeWidth="3" 
                strokeDasharray={`${Math.min((weeklyAverage.calories / targets.calories) * 100, 100)}, 100`} 
                className="transition-all duration-500" 
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-3xl font-bold text-white">🔥 {weeklyAverage.calories}</p>
              <p className="text-lg text-gray-400">/ {targets.calories} kcal</p>
            </div>
          </div>
          <p className="text-sm text-gray-400 text-center">
            {remainingCalories > 0 
              ? `${Math.round(remainingCalories)} kcal medie rimanenti` 
              : `${Math.round(Math.abs(remainingCalories))} kcal medie in eccesso`}
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Macro Nutrienti Medi</h3>
        <div className="space-y-4">
          {[
            { name: 'Pro', current: weeklyAverage.pro, target: targets.pro, color: '#00BFFF' },
            { name: 'Carbo', current: weeklyAverage.carb, target: targets.carb, color: '#4ECDC4' },
            { name: 'Grassi', current: weeklyAverage.gra, target: targets.gra, color: '#FF6B6B' },
            { name: 'Fibre', current: weeklyAverage.fib, target: targets.fib, color: '#95E1D3' },
          ].map((macro) => (
            <div key={macro.name}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-white">{macro.name}</span>
                <span className="text-sm text-gray-400">{round1(macro.current)}g / {macro.target}g</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min((macro.current / macro.target) * 100, 100)}%`, backgroundColor: macro.color }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Panoramica