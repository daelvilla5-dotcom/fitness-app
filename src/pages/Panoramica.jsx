import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import ProfileSelector from '../components/ProfileSelector'
import { getTargets } from '../utils/userData'
import { getDailyTotals, getDailyHistory } from '../utils/foodDatabase'

function Panoramica() {
  const [targets, setTargets] = useState(getTargets())
  const [dailyTotals, setDailyTotals] = useState({ calories: 0, pro: 0, carb: 0, gra: 0, fib: 0 })
  const [history, setHistory] = useState([])

  useEffect(() => {
    setDailyTotals(getDailyTotals())
    setHistory(getDailyHistory())
  }, [])

  const calorieData = [
    { name: 'Assunte', value: dailyTotals.calories },
    { name: 'Rimanenti', value: Math.max(targets.calories - dailyTotals.calories, 0) },
  ]

  // Ordine uniforme: Pro, Carbo, Grassi, Fibre
  const macroData = [
    { name: 'Pro', current: dailyTotals.pro, target: targets.pro, color: '#00BFFF' },
    { name: 'Carbo', current: dailyTotals.carb, target: targets.carb, color: '#4ECDC4' },
    { name: 'Grassi', current: dailyTotals.gra, target: targets.gra, color: '#FF6B6B' },
    { name: 'Fibre', current: dailyTotals.fib, target: targets.fib, color: '#95E1D3' },
  ]

  // Formatta data per il grafico
  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div className="p-4 pb-24">
      <ProfileSelector />

      <h2 className="text-2xl font-bold text-electric mb-6 mt-2">📊 Panoramica</h2>

      {/* Grafico calorie */}
      <div className="bg-card border border-border rounded-lg p-4 mb-4">
        <h3 className="text-lg font-semibold text-white mb-3">Calorie Oggi</h3>
        
        <div className="flex items-center justify-center mb-4">
          <ResponsiveContainer width={200} height={200}>
            <PieChart>
              <Pie
                data={calorieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                <Cell fill="#00BFFF" />
                <Cell fill="#1F2937" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="text-center">
          <p className="text-3xl font-bold text-white">
            🔥 {dailyTotals.calories} <span className="text-lg text-gray-400">/ {targets.calories} kcal</span>
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {Math.max(targets.calories - dailyTotals.calories, 0)} kcal rimanenti
          </p>
        </div>
      </div>

      {/* Macro nutrienti - Ordine uniforme */}
      <div className="bg-card border border-border rounded-lg p-4 mb-4">
        <h3 className="text-lg font-semibold text-white mb-4">Macro Nutrienti</h3>
        
        <div className="space-y-4">
          {macroData.map((macro) => {
            const percentage = Math.min((macro.current / macro.target) * 100, 100)
            
            return (
              <div key={macro.name}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-white">{macro.name}</span>
                  <span className="text-sm text-gray-400">
                    {macro.current}g / {macro.target}g
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: macro.color 
                    }}
                  ></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Grafico storico calorie */}
      {history.length > 1 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">📈 Andamento Calorie</h3>
          
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                labelFormatter={(label) => `Data: ${new Date(label).toLocaleDateString('it-IT')}`}
                formatter={(value) => [`${value} kcal`, 'Calorie']}
              />
              <Line 
                type="monotone" 
                dataKey="calories" 
                stroke="#00BFFF" 
                strokeWidth={2}
                dot={{ fill: '#00BFFF', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default Panoramica