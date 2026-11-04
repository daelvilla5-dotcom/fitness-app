import { useState, useEffect } from 'react'
import { getRoutines, saveRoutine, deleteRoutine as dbDeleteRoutine, getExercises, getWorkoutLogs } from '../utils/workoutDatabase'

function RoutineBuilder({ onStartWorkout }) {
  const [routines, setRoutines] = useState([])
  const [exercises, setExercises] = useState([])
  const [activeRoutine, setActiveRoutine] = useState(null)
  const [newRoutineName, setNewRoutineName] = useState('')
  const [editingDayId, setEditingDayId] = useState(null)
  const [editingDayName, setEditingDayName] = useState('')

  useEffect(() => {
    setRoutines(getRoutines())
    setExercises(getExercises())
  }, [])

  const createRoutine = () => {
    if (!newRoutineName) return
    const newRoutine = { id: null, name: newRoutineName, days: [] }
    const updated = saveRoutine(newRoutine)
    setRoutines(updated)
    setActiveRoutine(updated.find(r => r.name === newRoutineName))
    setNewRoutineName('')
  }

  const addDay = () => {
    if (!activeRoutine) return
    const newDay = { id: Date.now(), name: `Giorno ${activeRoutine.days.length + 1}`, exercises: [] }
    const updatedRoutine = { ...activeRoutine, days: [...activeRoutine.days, newDay] }
    setActiveRoutine(updatedRoutine)
    setRoutines(saveRoutine(updatedRoutine))
  }

  const duplicateDay = (dayIndex) => {
    if (!activeRoutine) return
    const dayToCopy = activeRoutine.days[dayIndex]
    const newDay = { ...dayToCopy, id: Date.now(), name: `${dayToCopy.name} (Copia)` }
    const newDays = [...activeRoutine.days]
    newDays.splice(dayIndex + 1, 0, newDay)
    const updatedRoutine = { ...activeRoutine, days: newDays }
    setActiveRoutine(updatedRoutine)
    setRoutines(saveRoutine(updatedRoutine))
  }

  // FIX: rinominata per evitare conflitto con l'import
  const handleDeleteRoutine = (id) => {
    if (confirm('Eliminare questa scheda?')) {
      const updated = dbDeleteRoutine(id)
      setRoutines(updated)
      setActiveRoutine(null)
    }
  }

  // Nuova funzione: inizia editing nome giorno
  const startEditDayName = (day) => {
    setEditingDayId(day.id)
    setEditingDayName(day.name)
  }

  // Nuova funzione: salva nome giorno modificato
  const saveDayName = (dayIndex) => {
    if (!editingDayName.trim()) return
    const newDays = [...activeRoutine.days]
    newDays[dayIndex].name = editingDayName
    const updatedRoutine = { ...activeRoutine, days: newDays }
    setActiveRoutine(updatedRoutine)
    setRoutines(saveRoutine(updatedRoutine))
    setEditingDayId(null)
    setEditingDayName('')
  }

  // Nuova funzione: cancella giorno
  const deleteDay = (dayIndex) => {
    if (!confirm(`Eliminare "${activeRoutine.days[dayIndex].name}"?`)) return
    const newDays = activeRoutine.days.filter((_, idx) => idx !== dayIndex)
    const updatedRoutine = { ...activeRoutine, days: newDays }
    setActiveRoutine(updatedRoutine)
    setRoutines(saveRoutine(updatedRoutine))
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
    const updatedRoutine = { ...activeRoutine, days: newDays }
    setActiveRoutine(updatedRoutine)
    setRoutines(saveRoutine(updatedRoutine))
  }

  const updateExerciseTarget = (dayIndex, exIndex, field, value) => {
    const newDays = [...activeRoutine.days]
    newDays[dayIndex].exercises[exIndex][field] = Number(value)
    const updatedRoutine = { ...activeRoutine, days: newDays }
    setActiveRoutine(updatedRoutine)
    setRoutines(saveRoutine(updatedRoutine))
  }

  const removeExerciseFromDay = (dayIndex, exIndex) => {
    const newDays = [...activeRoutine.days]
    newDays[dayIndex].exercises.splice(exIndex, 1)
    const updatedRoutine = { ...activeRoutine, days: newDays }
    setActiveRoutine(updatedRoutine)
    setRoutines(saveRoutine(updatedRoutine))
  }

  return (
    <div className="space-y-4">
      {!activeRoutine ? (
        <>
          {/* Lista Schede */}
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
                    <button
                      onClick={() => handleDeleteRoutine(r.id)}
                      className="text-red-500 hover:text-red-400 ml-2"
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Crea nuova scheda */}
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
          {/* Editor Scheda */}
          <div className="flex justify-between items-center mb-2">
            <button
              onClick={() => setActiveRoutine(null)}
              className="text-electric text-sm font-semibold"
            >
              ← Torna alle schede
            </button>
            <h3 className="text-lg font-bold text-white">{activeRoutine.name}</h3>
          </div>

          {activeRoutine.days.map((day, dayIndex) => (
            <div key={day.id} className="bg-card border border-border rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-3">
                {/* Nome giorno cliccabile per rinominare */}
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
                    <button
                      onClick={() => saveDayName(dayIndex)}
                      className="text-electric text-xs font-bold"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setEditingDayId(null)}
                      className="text-gray-400 text-xs"
                    >
                      ✕
                    </button>
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
                  <button
                    onClick={() => deleteDay(dayIndex)}
                    className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/30"
                  >
                    🗑 Elimina
                  </button>
                  <button
                    onClick={() => duplicateDay(dayIndex)}
                    className="text-xs bg-gray-700 text-white px-2 py-1 rounded"
                  >
                    Duplica
                  </button>
                  <button
                    onClick={() => onStartWorkout && onStartWorkout(activeRoutine, dayIndex)}
                    className="text-xs bg-electric text-black font-bold px-3 py-1 rounded"
                  >
                    Inizia
                  </button>
                </div>
              </div>

              {/* Esercizi nel giorno */}
              <div className="space-y-2 mb-3">
                {day.exercises.map((ex, exIndex) => (
                  <div key={exIndex} className="bg-gray-800 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-semibold">{ex.name}</span>
                      <button
                        onClick={() => removeExerciseFromDay(dayIndex, exIndex)}
                        className="text-red-500 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-gray-400">Serie</label>
                        <input
                          type="number"
                          value={ex.targetSets}
                          onChange={(e) => updateExerciseTarget(dayIndex, exIndex, 'targetSets', e.target.value)}
                          className="w-full bg-gray-900 border border-border text-white rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-400">Reps</label>
                        <input
                          type="number"
                          value={ex.targetReps}
                          onChange={(e) => updateExerciseTarget(dayIndex, exIndex, 'targetReps', e.target.value)}
                          className="w-full bg-gray-900 border border-border text-white rounded px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Aggiungi esercizio al giorno */}
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

          <button
            onClick={addDay}
            className="w-full bg-gray-800 border border-dashed border-border text-electric font-semibold py-3 rounded-lg"
          >
            + Aggiungi Giorno
          </button>
        </>
      )}
    </div>
  )
}

export default RoutineBuilder