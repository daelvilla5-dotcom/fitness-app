import { useState } from 'react'

function FoodItem({ food, onEdit, onDelete, onAdd, showActions = true }) {
  const [grams, setGrams] = useState(100)

  const handleAdd = () => {
    if (grams <= 0) {
      alert('Inserisci una quantità valida!')
      return
    }
    onAdd(food, grams)
  }

  return (
    <div className="w-full bg-card border border-border rounded-lg p-3 mb-2">
      {/* Riga 1: Nome grande + Azioni ridotte */}
      <div className="flex items-center justify-between w-full">
        <span className="text-2xl font-bold text-white flex-1">{food.name}</span>
        {showActions && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(food)}
              className="w-4 h-4 text-electric flex items-center justify-center hover:scale-110 transition-transform"
              title="Modifica"
            >
              ✎
            </button>
            <button
              onClick={() => onDelete(food.id)}
              className="w-4 h-4 text-red-500 flex items-center justify-center hover:scale-110 transition-transform"
              title="Elimina"
            >
              🗑
            </button>
          </div>
        )}
      </div>

      {/* Riga 2: Calorie (solo fiamma) e Macro (senza icone) */}
      <div className="mt-1 text-sm text-gray-400 flex flex-wrap gap-x-3">
        <span className="text-white">🔥 {food.calories} kcal</span>
        <span>Pro: {food.pro}g</span>
        <span>Carbo: {food.carb}g</span>
        <span>Grassi: {food.gra}g</span>
        <span>Fibre: {food.fib}g</span>
      </div>

      {/* Porzione fissa */}
      <div className="mt-1 text-xs text-gray-500">
        per 100g
      </div>

      {/* Input grammi e pulsante Aggiungi */}
      {onAdd && (
        <div className="mt-3 flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Grammi</label>
            <input
              type="number"
              value={grams}
              onChange={(e) => setGrams(Number(e.target.value))}
              className="w-full bg-gray-800 border border-border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-electric"
              min="1"
            />
          </div>
          <button
            onClick={handleAdd}
            className="mt-5 bg-electric text-black font-semibold px-6 py-2 rounded-lg text-sm active:scale-95 transition-transform"
          >
            + Aggiungi
          </button>
        </div>
      )}
    </div>
  )
}

export default FoodItem