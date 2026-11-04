import { useState } from 'react'
import { saveWorkoutLog, getWorkoutLogs } from '../utils/workoutDatabase'

function WorkoutLogger({ routine, dayIndex, onClose }) {
  const day = routine.days[dayIndex]
  const allLogs = getWorkoutLogs()

  // Trova l'ultimo allenamento con gli stessi esercizi
  const findLastSession = () => {
    const matchingLogs = allLogs.filter(log => 
      log.routineName === routine.name && log.dayName === day.name
    )
    
    if (matchingLogs.length === 0) return null
    
    const lastLog = matchingLogs.sort((a, b) => b.id - a.id)[0]
    return lastLog
  }

  const lastSession = findLastSession()

  // Stato per i dati inseriti - CAMPI VUOTI
  const [logData, setLogData] = useState(() => {
    const initial = {}
    day.exercises.forEach((ex, idx) => {
      // Inizializza con righe vuote
      initial[idx] = Array.from({ length: ex.targetSets }, () => ({ weight: '', reps: '' }))
    })
    return initial
  })

  const updateSet = (exIndex, setIndex, field, value) => {
    const newLogData = { ...logData }
    newLogData[exIndex][setIndex][field] = value
    setLogData(newLogData)
  }

  const addSet = (exIndex) => {
    const newLogData = { ...logData }
    newLogData[exIndex].push({ weight: '', reps: '' })
    setLogData(newLogData)
  }

  const removeSet = (exIndex, setIndex) => {
    const newLogData = { ...logData }
    newLogData[exIndex].splice(setIndex, 1)
    setLogData(newLogData)
  }

  const finishWorkout = () => {
    const log = {
      routineName: routine.name,
      dayName: day.name,
      exercises: day.exercises.map((ex, idx) => ({
        name: ex.name,
        sets: logData[idx]
      }))
    }
    saveWorkoutLog(log)
    alert('Allenamento salvato nello storico! 💪')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-bg z-50 overflow-y-auto pb-24">
      <div className="sticky top-0 bg-card border-b border-border p-4 flex justify-between items-center z-10">
        <button onClick={onClose} className="text-electric font-semibold">✕ Annulla</button>
        <h2 className="text-lg font-bold text-white">{day.name}</h2>
        <button onClick={finishWorkout} className="bg-electric text-black font-bold px-4 py-1 rounded-lg text-sm">
          Salva
        </button>
      </div>

      <div className="p-4 space-y-6">
        {day.exercises.map((ex, exIndex) => {
          // Trova dati ultima sessione per questo esercizio
          const lastExData = lastSession?.exercises?.find(e => e.name === ex.name)
          
          return (
            <div key={exIndex} className="bg-card border border-border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-electric font-bold text-lg">{ex.name}</h3>
                <p className="text-xs text-gray-400">Target: {ex.targetSets}x{ex.targetReps}</p>
              </div>

              {/* Info ultimo allenamento */}
              {lastExData && lastExData.sets && lastExData.sets.length > 0 && (
                <div className="bg-electric/10 border border-electric/30 rounded-lg p-2 mb-3">
                  <p className="text-xs text-electric font-semibold mb-1">📊 Ultimo allenamento:</p>
                  <div className="flex flex-wrap gap-2">
                    {lastExData.sets.map((s, i) => (
                      <span key={i} className="text-xs text-white bg-gray-800 px-2 py-1 rounded">
                        Serie {i + 1}: {s.weight}kg × {s.reps}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Serie attuali - CAMPI VUOTI */}
              <div className="space-y-2">
                {logData[exIndex].map((set, setIndex) => (
                  <div key={setIndex} className="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
                    <span className="text-gray-400 text-sm w-6 font-bold">#{setIndex + 1}</span>
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 block">Peso (kg)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={set.weight}
                        onChange={(e) => updateSet(exIndex, setIndex, 'weight', e.target.value)}
                        className="w-full bg-gray-900 border border-border text-white rounded px-2 py-1 text-sm focus:border-electric focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 block">Reps</label>
                      <input
                        type="number"
                        value={set.reps}
                        onChange={(e) => updateSet(exIndex, setIndex, 'reps', e.target.value)}
                        className="w-full bg-gray-900 border border-border text-white rounded px-2 py-1 text-sm focus:border-electric focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                    <button
                      onClick={() => removeSet(exIndex, setIndex)}
                      className="text-red-500 text-sm px-2"
                      title="Rimuovi serie"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Pulsanti serie */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => addSet(exIndex)}
                  className="flex-1 bg-gray-700 text-white text-sm py-2 rounded-lg"
                >
                  + Aggiungi serie
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default WorkoutLogger