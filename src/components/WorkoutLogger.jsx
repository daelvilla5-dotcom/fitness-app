import { useState, useEffect } from 'react'
import { 
  loadWorkoutLogs as loadWorkoutLogsDB,
  saveWorkoutLog as saveWorkoutLogDB
} from '../utils/supabaseData'
import { getWorkoutLogs as getLocalWorkoutLogs } from '../utils/workoutDatabase'

function WorkoutLogger({ user, routine, dayIndex, onClose }) {
  const day = routine.days[dayIndex]
  const [allLogs, setAllLogs] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (user) {
      loadWorkoutLogsDB(user.id).then(logs => {
        setAllLogs(logs.length > 0 ? logs : getLocalWorkoutLogs())
        setIsLoaded(true)
      }).catch(err => {
        console.error('Errore caricamento logs:', err)
        setAllLogs(getLocalWorkoutLogs())
        setIsLoaded(true)
      })
    }
  }, [user])

  // ✅ NUOVA LOGICA: Trova l'ultima volta che questo specifico esercizio è stato fatto
  const getLastExerciseData = (exerciseId, exerciseName) => {
    if (!isLoaded) return null

    // Appiattisce tutti gli esercizi da tutti gli allenamenti salvati
    const allExercises = allLogs.flatMap(log => 
      (log.exercises || []).map(ex => ({
        ...ex,
        date: log.date,
        routineName: log.routine_name,
        dayName: log.day_name
      }))
    )

    // Filtra per exerciseId (più preciso) o per nome (fallback)
    const matchingExercises = allExercises.filter(ex => 
      (exerciseId && ex.exerciseId === exerciseId) || (!exerciseId && ex.name === exerciseName)
    )

    if (matchingExercises.length === 0) return null

    // Ordina per data decrescente e prendi il più recente
    matchingExercises.sort((a, b) => new Date(b.date) - new Date(a.date))
    return matchingExercises[0]
  }

  const [logData, setLogData] = useState(() => {
    const initial = {}
    day.exercises.forEach((ex, idx) => {
      const lastData = getLastExerciseData(ex.exerciseId, ex.name)
      let sets = []

      if (lastData && lastData.sets && lastData.sets.length > 0) {
        // Usa i dati dell'ultima sessione, ma assicurati di avere almeno targetSets serie
        const numSets = Math.max(ex.targetSets || 3, lastData.sets.length)
        for (let i = 0; i < numSets; i++) {
          sets.push({
            weight: lastData.sets[i]?.weight || '',
            reps: lastData.sets[i]?.reps || ''
          })
        }
      } else {
        // Nessuno storico: crea serie vuote
        sets = Array.from({ length: ex.targetSets || 3 }, () => ({ weight: '', reps: '' }))
      }
      initial[idx] = sets
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

  const finishWorkout = async () => {
    if (!user) return
    
    const logPayload = {
      routine_name: routine.name,
      day_name: day.name,
      exercises: day.exercises.map((ex, idx) => ({
        exerciseId: ex.exerciseId, // ✅ Salviamo anche l'ID per ricerche future precise
        name: ex.name,
        sets: logData[idx] || []
      })),
      date: new Date().toISOString().split('T')[0]
    }
    
    try {
      await saveWorkoutLogDB(user.id, logPayload)
      alert('Allenamento salvato nello storico! 💪')
      onClose()
    } catch (err) {
      console.error('Errore salvataggio allenamento:', err)
      alert('Errore nel salvataggio dell\'allenamento')
    }
  }

  if (!isLoaded) {
    return (
      <div className="fixed inset-0 bg-bg z-50 flex items-center justify-center">
        <p className="text-electric animate-pulse">Caricamento storico...</p>
      </div>
    )
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
          const lastExData = getLastExerciseData(ex.exerciseId, ex.name)
          
          return (
            <div key={exIndex} className="bg-card border border-border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-electric font-bold text-lg">{ex.name}</h3>
                <p className="text-xs text-gray-400">Target: {ex.targetSets}x{ex.targetReps}</p>
              </div>

              {/* ✅ Mostra l'ultimo allenamento con contesto (Data e Giorno) */}
              {lastExData && lastExData.sets && lastExData.sets.length > 0 && (
                <div className="bg-electric/10 border border-electric/30 rounded-lg p-2 mb-3">
                  <p className="text-xs text-electric font-semibold mb-1">
                    📊 Ultimo: {new Date(lastExData.date).toLocaleDateString('it-IT')} ({lastExData.dayName})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {lastExData.sets.map((s, i) => (
                      <span key={i} className="text-xs text-white bg-gray-800 px-2 py-1 rounded border border-gray-700">
                        S{i + 1}: {s.weight || '-'}kg × {s.reps || '-'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

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

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => addSet(exIndex)}
                  className="flex-1 bg-gray-700 text-white text-sm py-2 rounded-lg hover:bg-gray-600 transition-colors"
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