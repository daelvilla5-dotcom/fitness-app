import { useState, useRef } from 'react'
import Tesseract from 'tesseract.js'

function OCRScanner({ onExtract, onClose }) {
  const [image, setImage] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [extractedText, setExtractedText] = useState('')
  const fileInputRef = useRef(null)

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setImage(event.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleScan = async () => {
    if (!image) {
      alert('Seleziona prima un\'immagine!')
      return
    }

    setScanning(true)
    setProgress(0)

    try {
      const result = await Tesseract.recognize(image, 'ita+eng', {
  logger: (m) => {
    if (m.status === 'recognizing text') {
      setProgress(Math.round(m.progress * 100))
    }
  },
  // Migliora l'accuratezza
  tessedit_char_whitelist: '0123456789.,ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ',
})

      const text = result.data.text
      setExtractedText(text)
      
      // Estrai i valori nutrizionali
      const nutritionData = parseNutritionLabel(text)
      
      if (nutritionData) {
        onExtract(nutritionData)
      } else {
        alert('Non sono riuscito a estrarre i valori nutrizionali. Prova con un\'immagine più chiara.')
      }
    } catch (error) {
      console.error('OCR Error:', error)
      alert('Errore durante la scansione. Riprova.')
    } finally {
      setScanning(false)
    }
  }

  // Funzione per parsare il testo OCR ed estrarre i valori nutrizionali
  const parseNutritionLabel = (text) => {
  const lines = text.split('\n')
  
  let calories = null
  let protein = null
  let carbs = null
  let fat = null
  let fiber = null

  // Pattern più robusti
  const patterns = {
    calories: /(?:energia|calori|kcal|kj)[^\d]*(\d+(?:[.,]\d+)?)/i,
    protein: /(?:proteine?|prot\.?)[^\d]*(\d+(?:[.,]\d+)?)/i,
    carbs: /(?:carboidrati?|carb\.?|zuccheri)[^\d]*(\d+(?:[.,]\d+)?)/i,
    fat: /(?:grassi|lipidi|fat\.?)[^\d]*(\d+(?:[.,]\d+)?)/i,
    fiber: /(?:fibre?|fibra)[^\d]*(\d+(?:[.,]\d+)?)/i,
  }

  for (const line of lines) {
    // Calorie
    if (calories === null) {
      const match = line.match(patterns.calories)
      if (match) {
        calories = parseFloat(match[1].replace(',', '.'))
        // Se il valore è molto alto, potrebbe essere in kJ, converti in kcal
        if (calories > 1000) {
          calories = Math.round(calories / 4.184)
        } else {
          calories = Math.round(calories)
        }
      }
    }

    // Proteine
    if (protein === null) {
      const match = line.match(patterns.protein)
      if (match) {
        protein = parseFloat(match[1].replace(',', '.'))
      }
    }

    // Carboidrati
    if (carbs === null) {
      const match = line.match(patterns.carbs)
      if (match) {
        carbs = parseFloat(match[1].replace(',', '.'))
      }
    }

    // Grassi
    if (fat === null) {
      const match = line.match(patterns.fat)
      if (match) {
        fat = parseFloat(match[1].replace(',', '.'))
      }
    }

    // Fibre
    if (fiber === null) {
      const match = line.match(patterns.fiber)
      if (match) {
        fiber = parseFloat(match[1].replace(',', '.'))
      }
    }
  }

  // Se abbiamo trovato almeno calorie e proteine, restituiamo i dati
  if (calories !== null && protein !== null) {
    return {
      calories: Math.round(calories),
      pro: protein,
      carb: carbs || 0,
      gra: fat || 0,
      fib: fiber || 0,
    }
  }

  return null
}

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-electric">📷 Scansiona Etichetta</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Upload immagine */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current.click()}
              className="w-full bg-gray-800 border border-border text-white py-3 rounded-lg hover:border-electric transition-colors"
            >
              {image ? '📷 Cambia immagine' : '📷 Scatta foto o seleziona immagine'}
            </button>
          </div>

          {/* Preview immagine */}
          {image && (
            <div className="relative">
              <img
                src={image}
                alt="Etichetta"
                className="w-full h-48 object-cover rounded-lg border border-border"
              />
            </div>
          )}

          {/* Progress bar scansione */}
          {scanning && (
            <div>
              <p className="text-sm text-gray-400 mb-2">Scansione in corso... {progress}%</p>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-electric h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Testo estratto (debug) */}
          {extractedText && !scanning && (
            <div className="bg-gray-800 rounded-lg p-3 max-h-32 overflow-y-auto">
              <p className="text-xs text-gray-400 mb-1">Testo estratto:</p>
              <p className="text-xs text-white whitespace-pre-wrap">{extractedText}</p>
            </div>
          )}

          {/* Pulsante scansione */}
          <button
            onClick={handleScan}
            disabled={!image || scanning}
            className={`w-full font-bold py-3 rounded-lg transition-all ${
              !image || scanning
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-electric text-black active:scale-95'
            }`}
          >
            {scanning ? 'Scansione...' : '🔍 Estrai valori nutrizionali'}
          </button>

          <p className="text-xs text-gray-500 text-center">
            💡 Consiglio: fotografa l'etichetta in un ambiente ben illuminato per risultati migliori
          </p>
        </div>
      </div>
    </div>
  )
}

export default OCRScanner