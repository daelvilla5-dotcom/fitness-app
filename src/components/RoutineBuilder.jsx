import { useState, useEffect } from 'react'
import { 
  loadRoutines as loadRoutinesDB,
  saveRoutine as saveRoutineDB,
  updateRoutine as updateRoutineDB,
  deleteRoutine as deleteRoutineDB,
  getOrCreateShareCode,
  loadExercises,
  loadWorkoutLogs as loadWorkoutLogsDB
} from '../utils/supabaseData'

function RoutineBuilder({ user, onStartWorkout }) {
  const [routines, setRoutines] = useState([])
  const [exercises, setExercises] = useState([])
  const [allWorkoutLogs, setAllWorkoutLogs] = useState([]) // ✅ Nuovo stato per lo storico
  const [activeRoutine, setActiveRoutine] = useState(null)
  const [newRoutineName, setNewRoutineName] = useState('')
  const [editingDayId, setEditingDayId] = useState(null)
  const [editingDayName, setEditingDayName] = useState('')
  
  const [selectedExerciseIds, setSelectedExerciseIds] = useState({})
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [sharingRoutine, setSharingRoutine] = useState(null)

  useEffect(() => {
    if (user) {
      loadExercises(user.id).then(dbExercises => {
        if (dbExercises.length > 0) {
          setExercises(dbExercises)
        } else {
          const local = JSON.parse(localStorage.getItem('fitness_app_exercises') || '[]')
          setExercises(local)
        }
      }).catch(err => console.error('Errore caricamento esercizi:', err))

      loadRoutinesDB(user.id).then(dbRoutines => {
        setRoutines(dbRoutines)
      }).catch(err => console.error('Errore caricamento schede:', err))

      // ✅ Carica anche lo storico per mostrare gli ultimi dati
      loadWorkoutLogsDB(user.id).then(logs => {
        setAllWorkoutLogs(logs)
      }).catch(err => console.error('Errore caricamento storico:', err))
    }
  }, [user])

  // ✅ Funzione helper per trovare l'ultimo dato di un esercizio
  const getLastExerciseLog = (exerciseId, exerciseName) => {
    const allExercises = allWorkoutLogs.flatMap(log => 
      (log.exercises || []).map(ex => ({
        ...ex,
        date: log.date
      }))
    )
    
    const matching = allExercises.filter(ex => 
      (exerciseId && ex.exerciseId === exerciseId) || (!exerciseId && ex.name === exerciseName)
    )
    
    if (matching.length === 0) return null
    matching.sort((a, b) => new Date(b.date) - new Date(a.date))
    return matching[0]
  }

  const createRoutine = async () => {
    if (!newRoutineName || !user) return
    try {
      const saved = await saveRoutineDB(user.id, { name: newRoutineName, days: [] })
      setRoutines([...routines, saved])
      setActiveRoutine(saved)
      setNewRoutineName('')
    } catch (err) {
      console.error('Errore creazione scheda:', err)
      alert('Errore nel salvataggio della scheda')
    }
  }

  const updateActiveRoutine = async (updatedRoutine) => {
    setActiveRoutine(updatedRoutine)
    try {
      const saved = await updateRoutineDB(updatedRoutine.id, {
        name: updatedRoutine.name,
        days: updatedRoutine.days
      })
      setRoutines(routines.map(r => r.id === saved.id ? saved : r))
    } catch (err) {
      console.error('Errore aggiornamento scheda:', err)
      alert('Errore nell\'aggiornamento della scheda')
    }
  }

  const handleDeleteRoutine = async (id) => {
    if (confirm('Eliminare questa scheda?')) {
      try {
        await deleteRoutineDB(id)
        const updated = routines.filter(r => r.id !== id)
        setRoutines(updated)
        if (activeRoutine?.id === id) setActiveRoutine(null)
      } catch (err) {
        console.error('Errore eliminazione scheda:', err)
        alert('Errore nell\'eliminazione della scheda')
      }
    }
  }

  const handleShareRoutine = async (routine) => {
    try {
      const code = await getOrCreateShareCode(routine.id)
      const baseUrl = window.location.origin + window.location.pathname
      const link = `${baseUrl}?importa=${code}`
      setShareLink(link)
      setSharingRoutine(routine)
      setShareModalOpen(true)
    } catch (err) {
      console.error('Errore condivisione:', err)
      alert('Errore nella generazione del link di condivisione')
    }
  }

  const addDay = () => {
    if (!activeRoutine) return
    const newDay = { id: Date.now(), name: `Giorno ${activeRoutine.days.length + 1}`, exercises: [] }
    updateActiveRoutine({ ...activeRoutine, days: [...activeRoutine.days, newDay] })
  }

  const duplicateDay = (dayIndex) => {
    if (!activeRoutine) return
    const dayToCopy = activeRoutine.days[dayIndex]
    const newDay = { ...dayToCopy, id: Date.now(), name: `${dayToCopy.name} (Copia)` }
    const newDays = [...activeRoutine.days]
    newDays.splice(dayIndex + 1, 0, newDay)
    updateActiveRoutine({ ...activeRoutine, days: newDays })
  }

  const startEditDayName = (day) => {
    setEditingDayId(day.id)
    setEditingDayName(day.name)
  }

  const saveDayName = (dayIndex) => {
    if (!editingDayName.trim()) return
    const newDays = [...activeRoutine.days]
    newDays[dayIndex].name = editingDayName
    updateActiveRoutine({ ...activeRoutine, days: newDays })
    setEditingDayId(null)
    setEditingDayName('')
  }

  const deleteDay = (dayIndex) => {
    if (!confirm(`Eliminare "${activeRoutine.days[dayIndex].name}"?`)) return
    const newDays = activeRoutine.days.filter((_, idx) => idx !== dayIndex)
    updateActiveRoutine({ ...activeRoutine, days: newDays })
  }

  const addExerciseToDay = (dayIndex, exercise) => {
    if (!activeRoutine || !exercise) return
    
    const newDays = [...activeRoutine.days]
    const currentDay = { ...newDays[dayIndex] }
    
    const alreadyExists = currentDay.exercises.some(ex => ex.exerciseId === exercise.id)
    
    if (alreadyExists) {
      alert('Esercizio già presente in questo giorno!')
      return
    }
    
    currentDay.exercises = [
      ...currentDay.exercises,
      {
        exerciseId: exercise.id,
        name: exercise.name,
        targetSets: 3,
        targetReps: '8-12',
        restTime: '1\'30"'
      }
    ]
    
    newDays[dayIndex] = currentDay
    updateActiveRoutine({ ...activeRoutine, days: newDays })
    setSelectedExerciseIds(prev => ({ ...prev, [dayIndex]: '' }))
  }

  const updateExerciseTarget = (dayIndex, exIndex, field, value) => {
    const newDays = [...activeRoutine.days]
    const currentDay = { ...newDays[dayIndex] }
    const currentExercises = [...currentDay.exercises]
    
    currentExercises[exIndex] = { ...currentExercises[exIndex], [field]: value }
    
    currentDay.exercises = currentExercises
    newDays[dayIndex] = currentDay
    updateActiveRoutine({ ...activeRoutine, days: newDays })
  }

  const removeExerciseFromDay = (dayIndex, exIndex) => {
    const newDays = [...activeRoutine.days]
    const currentDay = { ...newDays[dayIndex] }
    currentDay.exercises = currentDay.exercises.filter((_, idx) => idx !== exIndex)
    newDays[dayIndex] = currentDay
    updateActiveRoutine({ ...activeRoutine, days: newDays })
  }

  const handleExerciseSelect = (dayIndex, exerciseId) => {
    if (!exerciseId) return
    const ex = exercises.find(ex => ex.id === exerciseId)
    if (ex) {
      addExerciseToDay(dayIndex, ex)
    }
  }

  return (
    <div className="space-y-4">
      {!activeRoutine ? (
        <>
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Le tue Schede</h3>
            {routines.length === 0 ? (
              <p className="text-gray-400 text-sm">Nessuna scheda creata.</p>
            ) : (
              <div className="space-y-2">
                {routines.map((r) => (
                  <div key={r.id} className="flex justify-between items-center bg-gray-800 rounded-lg p-3">
                    <button
                      onClick={() => setActiveRoutine(r)}
                      className="flex-1 text-left text-white font-semibold hover:text-electric"
                    >
                      {r.name} <span className="text-xs text-gray-400">({r.days.length} giorni)</span>
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => handleShareRoutine(r)} className="text-blue-400 hover:text-blue-300 text-sm" title="Condividi">🔗</button>
                      <button onClick={() => handleDeleteRoutine(r.id)} className="text-red-500 hover:text-red-400" title="Elimina">🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Crea Nuova Scheda</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newRoutineName}
                onChange={(e) => setNewRoutineName(e.target.value)}
                className="flex-1 bg-gray-800 border border-border text-white rounded-lg px-3 py-2 focus:outline-none focus:border-electric"
                placeholder="Nome scheda (es. Push Pull Legs)"
              />
              <button onClick={createRoutine} className="bg-electric text-black font-bold px-4 py-2 rounded-lg">Crea</button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-2">
            <button onClick={() => setActiveRoutine(null)} className="text-electric text-sm font-semibold">← Torna alle schede</button>
            <h3 className="text-lg font-bold text-white">{activeRoutine.name}</h3>
          </div>

          {activeRoutine.days.map((day, dayIndex) => (
            <div key={day.id} className="bg-card border border-border rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-3">
                {editingDayId === day.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editingDayName}
                      onChange={(e) => setEditingDayName(e.target.value)}
                      className="flex-1 bg-gray-800 border border-electric text-white rounded px-2 py-1 text-sm focus:outline-none"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && saveDayName(dayIndex)}
                    />
                    <button onClick={() => saveDayName(dayIndex)} className="text-electric text-xs font-bold">✓</button>
                    <button onClick={() => setEditingDayId(null)} className="text-gray-400 text-xs">✕</button>
                  </div>
                ) : (
                  <h4 className="text-electric font-bold cursor-pointer hover:underline flex-1" onClick={() => startEditDayName(day)} title="Clicca per rinominare">
                    {day.name} ✎
                  </h4>
                )}
                <div className="flex gap-2">
                  <button onClick={() => deleteDay(dayIndex)} className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/30">🗑 Elimina</button>
                  <button onClick={() => duplicateDay(dayIndex)} className="text-xs bg-gray-700 text-white px-2 py-1 rounded">Duplica</button>
                  <button onClick={() => onStartWorkout && onStartWorkout(activeRoutine, dayIndex)} className="text-xs bg-electric text-black font-bold px-3 py-1 rounded">Inizia</button>
                </div>
              </div>

              <div className="space-y-3 mb-3">
                {day.exercises.map((ex, exIndex) => {
                  // ✅ Trova l'ultimo log per mostrare un'anteprima
                  const lastLog = getLastExerciseLog(ex.exerciseId, ex.name)
                  const lastSet = lastLog?.sets?.[0] // Prende la prima serie come riferimento rapido

                  return (
                    <div key={exIndex} className="bg-gray-800 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-white font-semibold block">{ex.name}</span>
                          {/* ✅ Pillola con ultimo dato registrato */}
                          {lastSet && (lastSet.weight || lastSet.reps) ? (
                            <span className="text-[10px] bg-electric/20 text-electric px-2 py-0.5 rounded mt-1 inline-block">
                              Ultimo: {lastSet.weight || '-'}kg × {lastSet.reps || '-'} reps
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-500 mt-1 inline-block">Nessuno storico</span>
                          )}
                        </div>
                        <button onClick={() => removeExerciseFromDay(dayIndex, exIndex)} className="text-red-500 text-sm">✕</button>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-gray-400">Serie</label>
                          <input 
                            type="number" 
                            value={ex.targetSets || 3} 
                            onChange={(e) => updateExerciseTarget(dayIndex, exIndex, 'targetSets', e.target.value)} 
                            className="w-full bg-gray-900 border border-border text-white rounded px-2 py-1 text-sm" 
                            placeholder="3"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Reps (es. 5-9)</label>
                          <input 
                            type="text" 
                            value={ex.targetReps || '8-12'} 
                            onChange={(e) => updateExerciseTarget(dayIndex, exIndex, 'targetReps', e.target.value)} 
                            className="w-full bg-gray-900 border border-border text-white rounded px-2 py-1 text-sm" 
                            placeholder="8-12"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Riposo</label>
                          <input 
                            type="text" 
                            value={ex.restTime || '1\'30"'} 
                            onChange={(e) => updateExerciseTarget(dayIndex, exIndex, 'restTime', e.target.value)} 
                            className="w-full bg-gray-900 border border-border text-white rounded px-2 py-1 text-sm" 
                            placeholder="1'30&quot;"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <select
                value={selectedExerciseIds[dayIndex] || ''}
                onChange={(e) => handleExerciseSelect(dayIndex, e.target.value)}
                className="w-full bg-gray-800 border border-border text-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-electric"
              >
                <option value="">+ Aggiungi esercizio...</option>
                {exercises.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>
            </div>
          ))}

          <button onClick={addDay} className="w-full bg-gray-800 border border-dashed border-border text-electric font-semibold py-3 rounded-lg">+ Aggiungi Giorno</button>
        </>
      )}

      {shareModalOpen && sharingRoutine && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-white mb-4">Condividi "{sharingRoutine.name}"</h3>
            <p className="text-sm text-gray-400 mb-3">Chiunque abbia questo link può importare questa scheda.</p>
            <div className="bg-gray-800 p-3 rounded-lg border border-border mb-4 break-all text-electric text-sm">{shareLink}</div>
            <div className="flex gap-2">
              <button onClick={() => { navigator.clipboard.writeText(shareLink); alert('Link copiato! 📋') }} className="flex-1 bg-electric text-black font-bold py-2 rounded-lg">Copia Link</button>
              <button onClick={() => setShareModalOpen(false)} className="flex-1 bg-gray-700 text-white font-bold py-2 rounded-lg">Chiudi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoutineBuilder