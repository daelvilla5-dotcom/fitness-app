import { useState, useEffect } from 'react'
import { 
  loadExercises, 
  saveExercise, 
  deleteExercise, 
  updateExercise 
} from '../utils/supabaseData'

function ExerciseManager({ user, onSelectExercise }) {
  const [exercises, setExercises] = useState([])
  const [newExercise, setNewExercise] = useState({ name: '', muscle: '' })
  const [editingExercise, setEditingExercise] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Carica gli esercizi da Supabase all'avvio
  useEffect(() => {
    if (user) {
      loadExercises(user.id).then(dbExercises => {
        if (dbExercises.length > 0) {
          setExercises(dbExercises)
        } else {
          // Fallback: se non c'è nulla su Supabase, carica i default/locali
          const local = JSON.parse(localStorage.getItem('fitness_app_exercises') || '[]')
          setExercises(local)
        }
        setIsLoading(false)
      })
    }
  }, [user])

  const handleAdd = async () => {
    if (!newExercise.name.trim()) return alert('Inserisci il nome dell\'esercizio!')
    if (!user) return alert('Devi essere loggato!')
    
    try {
      const saved = await saveExercise(user.id, newExercise)
      const updatedList = [...exercises, saved]
      setExercises(updatedList)
      localStorage.setItem('fitness_app_exercises', JSON.stringify(updatedList)) // Backup locale
      setNewExercise({ name: '', muscle: '' })
    } catch (err) {
      alert('Errore nel salvataggio dell\'esercizio')
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Eliminare esercizio?')) {
      try {
        await deleteExercise(id)
        const updatedList = exercises.filter(ex => ex.id !== id)
        setExercises(updatedList)
        localStorage.setItem('fitness_app_exercises', JSON.stringify(updatedList))
      } catch (err) {
        alert('Errore nell\'eliminazione')
      }
    }
  }

  const startEdit = (ex) => {
    setEditingExercise({ ...ex })
  }

  const saveEdit = async () => {
    if (!editingExercise.name.trim()) return alert('Il nome non può essere vuoto!')
    if (!user) return
    
    try {
      const updated = await updateExercise(user.id, editingExercise)
      const updatedList = exercises.map(ex => ex.id === updated.id ? updated : ex)
      setExercises(updatedList)
      localStorage.setItem('fitness_app_exercises', JSON.stringify(updatedList))
      setEditingExercise(null)
    } catch (err) {
      alert('Errore nell\'aggiornamento')
    }
  }

  if (isLoading) return <p className="text-center text-gray-400">Caricamento esercizi...</p>

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
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingExercise.name}
                      onChange={(e) => setEditingExercise({ ...editingExercise, name: e.target.value })}
                      className="flex-1 bg-gray-900 border border-electric text-white rounded px-2 py-1 text-sm focus:outline-none"
                    />
                    <input
                      type="text"
                      value={editingExercise.muscle}
                      onChange={(e) => setEditingExercise({ ...editingExercise, muscle: e.target.value })}
                      className="w-1/3 bg-gray-900 border border-electric text-white rounded px-2 py-1 text-sm focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={saveEdit} className="text-electric text-xs font-bold bg-gray-900 px-3 py-1 rounded">✓ Salva</button>
                    <button onClick={() => setEditingExercise(null)} className="text-gray-400 text-xs bg-gray-900 px-3 py-1 rounded">✕</button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div className="flex-1 cursor-pointer" onClick={() => onSelectExercise && onSelectExercise(ex)}>
                    <p className="text-white font-semibold">{ex.name}</p>
                    <p className="text-xs text-electric">{ex.muscle}</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => startEdit(ex)} className="text-blue-400 hover:text-blue-300 text-sm">✎</button>
                    <button onClick={() => handleDelete(ex.id)} className="text-red-500 hover:text-red-400 text-sm">🗑</button>
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