import { useState } from 'react'

function MeasurementInput({ areaName, onSave, onClose, initialValue = '', initialDate = '' }) {
  const [value, setValue] = useState(initialValue)
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0])

  const handleSave = () => {
    if (!value || isNaN(value)) {
      alert('Inserisci un valore valido!')
      return
    }
    onSave({
      value: Number(value),
      date: date,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-electric">{areaName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Data misurazione</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-800 border border-border text-white rounded-lg px-3 py-2 focus:outline-none focus:border-electric"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Circonferenza (cm)</label>
            <input
              type="number"
              step="0.1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full bg-gray-800 border border-border text-white rounded-lg px-3 py-2 focus:outline-none focus:border-electric text-2xl font-bold text-center"
              placeholder="0.0"
              autoFocus
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-electric text-black font-bold py-3 rounded-lg active:scale-95 transition-transform"
          >
            Salva Misura
          </button>
        </div>
      </div>
    </div>
  )
}

export default MeasurementInput