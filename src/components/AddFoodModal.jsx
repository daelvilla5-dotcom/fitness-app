import { useState, useEffect } from 'react'
import OCRScanner from './OCRScanner'

function AddFoodModal({ onSave, onClose, editFood = null }) {
  const [showOCR, setShowOCR] = useState(false)
  const [food, setFood] = useState(editFood || {
    name: '',
    calories: 0,
    pro: '',
    carb: '',
    gra: '',
    fib: '',
    portion: 100,
    portionUnit: 'g',
  })

  // Calcola automaticamente le calorie quando cambiano i macro
useEffect(() => {
  const pro = Number(food.pro) || 0
  const carb = Number(food.carb) || 0
  const gra = Number(food.gra) || 0
  const fib = Number(food.fib) || 0

  // Formula: Pro(4) + Carb(4) + Gra(9) + Fib(2)
  const calculatedCalories = (pro * 4) + (carb * 4) + (gra * 9) + (fib * 2)
  
  setFood(prev => ({
    ...prev,
    calories: Math.round(calculatedCalories)  // ← ARROTONDA ALL'INTERO
  }))
}, [food.pro, food.carb, food.gra, food.fib])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!food.name) {
      alert('Inserisci il nome dell\'alimento!')
      return
    }
    onSave({
      ...food,
      calories: Number(food.calories),
      pro: Number(food.pro),
      carb: Number(food.carb),
      gra: Number(food.gra),
      fib: Number(food.fib),
      portion: 100,
      portionUnit: 'g',
    })
  }

  const handleOCRExtract = (nutritionData) => {
  setFood({
    ...food,
    calories: nutritionData.calories,
    pro: nutritionData.pro,
    carb: nutritionData.carb,
    gra: nutritionData.gra,
    fib: nutritionData.fib,
  })
  setShowOCR(false)
}

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-electric">
            {editFood ? 'Modifica Alimento' : 'Nuovo Alimento'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Pulsante OCR */}
<button
  type="button"
  onClick={() => setShowOCR(true)}
  className="w-full bg-gray-800 border border-electric text-electric font-semibold py-3 rounded-lg mb-3 hover:bg-electric/10 transition-colors"
>
  📷 Scansiona etichetta nutrizionale
</button>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Nome</label>
            <input
              type="text"
              value={food.name}
              onChange={(e) => setFood({ ...food, name: e.target.value })}
              className="w-full bg-gray-800 border border-border text-white rounded-lg px-3 py-2 focus:outline-none focus:border-electric"
              placeholder="Es: Petto di Pollo"
            />
          </div>

          {/* Calorie calcolate automaticamente (read-only) */}
          <div className="bg-electric/10 border border-electric rounded-lg p-3">
            <label className="text-sm text-electric mb-1 block font-semibold">
              🔥 Calorie (calcolate automaticamente)
            </label>
            <p className="text-2xl font-bold text-electric">
              {food.calories} kcal
            </p>
            <p className="text-xs text-gray-400 mt-1">per 100g</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Proteine (g)</label>
              <input
                type="number"
                step="0.1"
                value={food.pro}
                onChange={(e) => setFood({ ...food, pro: e.target.value })}
                className="w-full bg-gray-800 border border-border text-white rounded-lg px-3 py-2 focus:outline-none focus:border-electric"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Carboidrati (g)</label>
              <input
                type="number"
                step="0.1"
                value={food.carb}
                onChange={(e) => setFood({ ...food, carb: e.target.value })}
                className="w-full bg-gray-800 border border-border text-white rounded-lg px-3 py-2 focus:outline-none focus:border-electric"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Grassi (g)</label>
              <input
                type="number"
                step="0.1"
                value={food.gra}
                onChange={(e) => setFood({ ...food, gra: e.target.value })}
                className="w-full bg-gray-800 border border-border text-white rounded-lg px-3 py-2 focus:outline-none focus:border-electric"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Fibre (g)</label>
              <input
                type="number"
                step="0.1"
                value={food.fib}
                onChange={(e) => setFood({ ...food, fib: e.target.value })}
                className="w-full bg-gray-800 border border-border text-white rounded-lg px-3 py-2 focus:outline-none focus:border-electric"
                placeholder="0"
              />
            </div>
          </div>

          {/* Info porzione fissa */}
          <div className="bg-gray-800 border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400">📏 Valori nutrizionali standardizzati</p>
            <p className="text-sm font-semibold text-white">per 100g di prodotto</p>
          </div>

          <button
            type="submit"
            className="w-full bg-electric text-black font-bold py-3 rounded-lg mt-4 active:scale-95 transition-transform"
          >
            {editFood ? 'Aggiorna' : 'Salva Alimento'}
          </button>
        </form>
      </div>
      {showOCR && (
  <OCRScanner
    onExtract={handleOCRExtract}
    onClose={() => setShowOCR(false)}
  />
)}
    </div>
  )
}

export default AddFoodModal