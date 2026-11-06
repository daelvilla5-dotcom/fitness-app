import { useState, useEffect } from 'react'
import { getExercises, saveExercise, deleteExercise, updateExercise } from '../utils/workoutDatabase'

function ExerciseManager({ onSelectExercise }) {
  const [exercises, setExercises] = useState([])
  const [newExercise, setNewExercise] = useState({ name: '', muscle: '' })
  const [editingExercise, setEditingExercise] = useState(null)

  useEffect(() => {
    setExercises(getExercises())
  }, [])

  const handleAdd = () => {
    if (!newExercise.name.trim()) return alert('Inserisci il nome dell\'esercizio!')
    const updatedList = saveExercise(newExercise)
    setExercises(updatedList)
    setNewExercise({ name: '', muscle: '' })
  }

  const handleDelete = (id) => {
    if (confirm('Eliminare esercizio?')) {
      setExercises(deleteExercise(id))
    }
  }

  const startEdit = (ex) => {
    setEditingExercise({ ...ex })
  }

  const saveEdit = () => {
    if (!editingExercise.name.trim()) return alert('Il nome non può essere vuoto!')
    const updatedList = updateExercise(editingExercise)
    setExercises(updatedList)
    setEditingExercise(null)
  }

  return (
    <div className="space-y-4">
      {/* Aggiungi nuovo esercizio */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Nuovo Esercizio</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newExercise.name}
            onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
            className="flex-1 bg-gray-800 border border-border text-white rounded-lg px-3 py-2 focus:outline-none focus:border-electric"
            placeholder="Nome (es. Panca Piana)"
          />
          <input
            type="text"
            value={newExercise.muscle}
            onChange={(e) => setNewExercise({ ...newExercise, muscle: e.target.value })}
            className="w-1/3 bg-gray-800 border border-border text-white rounded-lg px-3 py-2 focus:outline-none focus:border-electric"
            placeholder="Muscolo"
          />
          <button
            onClick={handleAdd}
            className="bg-electric text-black font-bold px-4 py-2 rounded-lg active:scale-95 transition-transform"
          >
            +
          </button>
        </div>
      </div>

      {/* Lista esercizi */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">I tuoi Esercizi ({exercises.length})</h3>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {exercises.map((ex) => (
            <div key={ex.id} className="bg-gray-800 rounded-lg p-3">
              {editingExercise && editingExercise.id === ex.id ? (
                // Modalità modifica
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingExercise.name}
                      onChange={(e) => setEditingExercise({ ...editingExercise, name: e.target.value })}
                      className="flex-1 bg-gray-900 border border-electric text-white rounded px-2 py-1 text-sm focus:outline-none"
                      placeholder="Nome"
                    />
                    <input
                      type="text"
                      value={editingExercise.muscle}
                      onChange={(e) => setEditingExercise({ ...editingExercise, muscle: e.target.value })}
                      className="w-1/3 bg-gray-900 border border-electric text-white rounded px-2 py-1 text-sm focus:outline-none"
                      placeholder="Muscolo"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={saveEdit} className="text-electric text-xs font-bold bg-gray-900 px-3 py-1 rounded hover:bg-gray-700">✓ Salva</button>
                    <button onClick={() => setEditingExercise(null)} className="text-gray-400 text-xs bg-gray-900 px-3 py-1 rounded hover:bg-gray-700">✕ Annulla</button>
                  </div>
                </div>
              ) : (
                // Modalità visualizzazione
                <div className="flex justify-between items-center">
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => onSelectExercise && onSelectExercise(ex)}
                  >
                    <p className="text-white font-semibold">{ex.name}</p>
                    <p className="text-xs text-electric">{ex.muscle}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => startEdit(ex)}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                      title="Modifica"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => handleDelete(ex.id)}
                      className="text-red-500 hover:text-red-400 text-sm"
                      title="Elimina"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ExerciseManager