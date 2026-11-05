import { useState, useEffect } from 'react'
import { 
  loadRoutines as loadRoutinesDB,
  saveRoutine as saveRoutineDB,
  updateRoutine as updateRoutineDB,
  deleteRoutine as deleteRoutineDB,
  getOrCreateShareCode
} from '../utils/supabaseData'
import { getExercises } from '../utils/workoutDatabase'

function RoutineBuilder({ user, onStartWorkout }) {
  const [routines, setRoutines] = useState([])
  const [exercises, setExercises] = useState([])
  const [activeRoutine, setActiveRoutine] = useState(null)
  const [newRoutineName, setNewRoutineName] = useState('')
  const [editingDayId, setEditingDayId] = useState(null)
  const [editingDayName, setEditingDayName] = useState('')
  
  // Stati per la condivisione
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [sharingRoutine, setSharingRoutine] = useState(null)

  useEffect(() => {
    setExercises(getExercises())
    if (user) {
      loadRoutinesDB(user.id).then(dbRoutines => {
        setRoutines(dbRoutines)
      }).catch(err => console.error('Errore caricamento schede:', err))
    }
  }, [user])

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
    if (!activeRoutine) return
    const newDays = [...activeRoutine.days]
    newDays[dayIndex].exercises.push({
      exerciseId: exercise.id,
      name: exercise.name,
      targetSets: 3,
      targetReps: 12
    })
    updateActiveRoutine({ ...activeRoutine, days: newDays })
  }

  const updateExerciseTarget = (dayIndex, exIndex, field, value) => {
    const newDays = [...activeRoutine.days]
    newDays[dayIndex].exercises[exIndex][field] = Number(value)
    updateActiveRoutine({ ...activeRoutine, days: newDays })
  }

  const removeExerciseFromDay = (dayIndex, exIndex) => {
    const newDays = [...activeRoutine.days]
    newDays[dayIndex].exercises.splice(exIndex, 1)
    updateActiveRoutine({ ...activeRoutine, days: newDays })
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
                      <button
                        onClick={() => handleShareRoutine(r)}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                        title="Condividi scheda"
                      >
                        🔗
                      </button>
                      <button
                        onClick={() => handleDeleteRoutine(r.id)}
                        className="text-red-500 hover:text-red-400"
                        title="Elimina scheda"
                      >
                        🗑
                      </button>
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
              <button
                onClick={createRoutine}
                className="bg-electric text-black font-bold px-4 py-2 rounded-lg"
              >
                Crea
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-2">
            <button onClick={() => setActiveRoutine(null)} className="text-electric text-sm font-semibold">
              ← Torna alle schede
            </button>
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
                  <h4
                    className="text-electric font-bold cursor-pointer hover:underline flex-1"
                    onClick={() => startEditDayName(day)}
                    title="Clicca per rinominare"
                  >
                    {day.name} ✎
                  </h4>
                )}
                <div className="flex gap-2">
                  <button onClick={() => deleteDay(dayIndex)} className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/30">🗑 Elimina</button>
                  <button onClick={() => duplicateDay(dayIndex)} className="text-xs bg-gray-700 text-white px-2 py-1 rounded">Duplica</button>
                  <button onClick={() => onStartWorkout && onStartWorkout(activeRoutine, dayIndex)} className="text-xs bg-electric text-black font-bold px-3 py-1 rounded">Inizia</button>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                {day.exercises.map((ex, exIndex) => (
                  <div key={exIndex} className="bg-gray-800 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-semibold">{ex.name}</span>
                      <button onClick={() => removeExerciseFromDay(dayIndex, exIndex)} className="text-red-500 text-sm">✕</button>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-gray-400">Serie</label>
                        <input type="number" value={ex.targetSets} onChange={(e) => updateExerciseTarget(dayIndex, exIndex, 'targetSets', e.target.value)} className="w-full bg-gray-900 border border-border text-white rounded px-2 py-1 text-sm" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-400">Reps</label>
                        <input type="number" value={ex.targetReps} onChange={(e) => updateExerciseTarget(dayIndex, exIndex, 'targetReps', e.target.value)} className="w-full bg-gray-900 border border-border text-white rounded px-2 py-1 text-sm" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <select
                onChange={(e) => {
                  const ex = exercises.find(ex => ex.id === Number(e.target.value))
                  if (ex) {
                    addExerciseToDay(dayIndex, ex)
                    e.target.value = ''
                  }
                }}
                className="w-full bg-gray-800 border border-border text-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-electric"
              >
                <option value="">+ Aggiungi esercizio...</option>
                {exercises.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>
            </div>
          ))}

          <button onClick={addDay} className="w-full bg-gray-800 border border-dashed border-border text-electric font-semibold py-3 rounded-lg">
            + Aggiungi Giorno
          </button>
        </>
      )}

      {/* Modal Condivisione */}
      {shareModalOpen && sharingRoutine && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-white mb-4">Condividi "{sharingRoutine.name}"</h3>
            <p className="text-sm text-gray-400 mb-3">
              Chiunque abbia questo link può importare questa scheda nel proprio account.
            </p>
            <div className="bg-gray-800 p-3 rounded-lg border border-border mb-4 break-all text-electric text-sm">
              {shareLink}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareLink)
                  alert('Link copiato negli appunti! 📋')
                }}
                className="flex-1 bg-electric text-black font-bold py-2 rounded-lg"
              >
                Copia Link
              </button>
              <button
                onClick={() => setShareModalOpen(false)}
                className="flex-1 bg-gray-700 text-white font-bold py-2 rounded-lg"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoutineBuilder