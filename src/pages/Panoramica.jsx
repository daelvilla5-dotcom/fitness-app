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
        const dbTargets = await loadTargetsDB(user.id)
        if (dbTargets && dbTargets.calories > 0) {
          setTargets(dbTargets)
          localStorage.setItem('fitness_app_targets', JSON.stringify(dbTargets))
        }

        const completedLogs = await loadLast7CompletedLogs(user.id)
        console.log('📊 [Panoramica] Giorni conclusi trovati:', completedLogs.length)
        
        setDaysCount(completedLogs.length)
        
        if (completedLogs.length > 0) {
          const dailyTotalsArray = completedLogs.map(log => {
            const totals = (log.entries || []).reduce((acc, entry) => ({
              calories: acc.calories + (entry.calories || 0),
              pro: acc.pro + (entry.pro || 0),
              carb: acc.carb + (entry.carb || 0),
              gra: acc.gra + (entry.gra || 0),
              fib: acc.fib + (entry.fib || 0),
            }), { calories: 0, pro: 0, carb: 0, gra: 0, fib: 0 })
            
            console.log(`📅 [Panoramica] Giorno ${log.start_date} →`, totals)
            return totals
          })
          
          const grandTotal = dailyTotalsArray.reduce((acc, daily) => ({
            calories: acc.calories + daily.calories,
            pro: acc.pro + daily.pro,
            carb: acc.carb + daily.carb,
            gra: acc.gra + daily.gra,
            fib: acc.fib + daily.fib,
          }), { calories: 0, pro: 0, carb: 0, gra: 0, fib: 0 })
          
          console.log('📊 [Panoramica] Totale complessivo dei giorni:', grandTotal)
          
          const count = completedLogs.length
          const average = {
            calories: Math.round(grandTotal.calories / count),
            pro: Math.round((grandTotal.pro / count) * 10) / 10,
            carb: Math.round((grandTotal.carb / count) * 10) / 10,
            gra: Math.round((grandTotal.gra / count) * 10) / 10,
            fib: Math.round((grandTotal.fib / count) * 10) / 10,
          }
          
          console.log('📊 [Panoramica] MEDIA FINALE:', average)
          setWeeklyAverage(average)
        } else {
          setWeeklyAverage({ calories: 0, pro: 0, carb: 0, gra: 0, fib: 0 })
        }
      } catch (err) {
        console.error('Errore sincronizzazione Panoramica:', err)
      }
    }

    loadData()
  }, [user])

  const round1 = (val) => Math.round(val * 10) / 10

  // Calcola differenze (media - obiettivo)
  const calorieDiff = weeklyAverage.calories - targets.calories
  const proDiff = round1(weeklyAverage.pro - targets.pro)
  const carbDiff = round1(weeklyAverage.carb - targets.carb)
  const graDiff = round1(weeklyAverage.gra - targets.gra)
  const fibDiff = round1(weeklyAverage.fib - targets.fib)

  // ✅ Determina il colore della ciambella in base alla differenza calorica
  const getDonutColor = () => {
    const absDiff = Math.abs(calorieDiff)
    if (absDiff <= 25) return '#00BFFF' // Blu elettrico (entro ±25 kcal)
    if (calorieDiff < 0) return '#FF6B6B' // Rosso (sotto obiettivo)
    return '#4ECDC4' // Verde (sopra obiettivo)
  }

  // ✅ Componente StatusMessage: solo icona 🎯 quando centrato, altrimenti +/- con colore
  const StatusMessage = ({ diff, unit }) => {
    if (Math.abs(diff) < 0.1) {
      return <span>🎯</span>
    }
    
    if (diff > 0) {
      return <span className="text-green-400 font-bold">+{round1(diff)} {unit}</span>
    } else {
      return <span className="text-red-400 font-bold">-{Math.abs(round1(diff))} {unit}</span>
    }
  }

  const donutColor = getDonutColor()

  return (
    <div className="p-4 pb-24">
      <h2 className="text-2xl font-bold text-electric mb-2 mt-2">📊 Panoramica</h2>
      
      <div className="flex items-center gap-2 mb-6">
        <p className="text-sm text-gray-400">
          {daysCount > 0 
            ? `Media degli ultimi ${daysCount} giorn${daysCount === 1 ? 'o' : 'i'} conclusi` 
            : 'Completa almeno un giorno per vedere la media'}
        </p>
        {daysCount > 0 && daysCount < 7 && (
          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded border border-yellow-500/30">
            ⚠️ Servono 7 giorni per la media settimanale completa
          </span>
        )}
      </div>

      {/* Grafico a ciambella - Calorie */}
      <div className="bg-card border border-border rounded-lg p-6 mb-4">
        <h3 className="text-lg font-semibold text-white mb-6 text-center">Calorie Medie</h3>
        
        <div className="flex flex-col items-center">
          <div className="relative w-56 h-56 mb-4">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1e293b" strokeWidth="3" />
              <path 
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                fill="none" 
                stroke={donutColor}
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
          
          <div className="text-center mt-2">
            {daysCount > 0 ? (
              <StatusMessage diff={calorieDiff} unit="kcal" />
            ) : (
              <p className="text-gray-400 text-sm">Nessun dato disponibile</p>
            )}
          </div>
        </div>
      </div>

      {/* Grafici a barre - Macro Nutrienti */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Macro Nutrienti Medi</h3>
        <div className="space-y-4">
          {[
            { name: 'Pro', current: weeklyAverage.pro, target: targets.pro, diff: proDiff, color: '#00BFFF' },
            { name: 'Carbo', current: weeklyAverage.carb, target: targets.carb, diff: carbDiff, color: '#4ECDC4' },
            { name: 'Grassi', current: weeklyAverage.gra, target: targets.gra, diff: graDiff, color: '#FF6B6B' },
            { name: 'Fibre', current: weeklyAverage.fib, target: targets.fib, diff: fibDiff, color: '#95E1D3' },
          ].map((macro) => (
            <div key={macro.name}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-white">{macro.name}</span>
                <div className="flex items-center gap-3">
                  {/* Mostra media / obiettivo */}
                  <span className="text-sm text-gray-400">
                    {round1(macro.current)}g / {macro.target}g
                  </span>
                  {daysCount > 0 && (
                    <StatusMessage diff={macro.diff} unit="g" />
                  )}
                </div>
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