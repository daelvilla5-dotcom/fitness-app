import { useState, useEffect } from 'react'
import { getExercises, saveExercise, deleteExercise } from '../utils/workoutDatabase'

function ExerciseManager({ onSelectExercise }) {
  const [exercises, setExercises] = useState([])
  const [newExercise, setNewExercise] = useState({ name: '', muscle: '' })

  useEffect(() => {
    setExercises(getExercises())
  }, [])

  const handleAdd = () => {
    if (!newExercise.name) return alert('Inserisci il nome dell\'esercizio!')
    setExercises(saveExercise(newExercise))
    setNewExercise({ name: '', muscle: '' })
  }

  const handleDelete = (id) => {
    if (confirm('Eliminare esercizio?')) {
      setExercises(deleteExercise(id))
    }
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
            <div key={ex.id} className="flex justify-between items-center bg-gray-800 rounded-lg p-3">
              <div 
                className="flex-1 cursor-pointer"
                onClick={() => onSelectExercise && onSelectExercise(ex)}
              >
                <p className="text-white font-semibold">{ex.name}</p>
                <p className="text-xs text-electric">{ex.muscle}</p>
              </div>
              <button
                onClick={() => handleDelete(ex.id)}
                className="text-red-500 hover:text-red-400 text-sm"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ExerciseManager