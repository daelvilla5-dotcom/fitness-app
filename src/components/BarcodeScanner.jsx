import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

function BarcodeScanner({ onProductFound, onClose }) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [searching, setSearching] = useState(false)
  const scannerRef = useRef(null)
  const html5QrCodeRef = useRef(null)

  useEffect(() => {
    return () => {
      // Cleanup: ferma la fotocamera quando il componente viene smontato
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(err => console.log('Cleanup error:', err))
      }
    }
  }, [])

  const startScanner = async () => {
    setError('')
    setScanning(true)

    try {
      const html5QrCode = new Html5Qrcode("barcode-reader")
      html5QrCodeRef.current = html5QrCode

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.0,
      }

      await html5QrCode.start(
        { facingMode: "environment" }, // Usa la fotocamera posteriore
        config,
        onScanSuccess,
        onScanFailure
      )
    } catch (err) {
      console.error('Errore scanner:', err)
      setError('Impossibile accedere alla fotocamera. Controlla i permessi.')
      setScanning(false)
    }
  }

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop()
      } catch (err) {
        console.log('Stop error:', err)
      }
    }
    setScanning(false)
  }

  const onScanSuccess = async (decodedText) => {
    // Ferma lo scanner dopo aver letto il codice
    await stopScanner()
    
    setSearching(true)
    setError('')

    try {
      // Chiamata all'API di OpenFoodFacts
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${decodedText}.json`
      )
      const data = await response.json()

      if (data.status === 1 && data.product) {
        const product = data.product
        
        // Estrai i dati nutrizionali per 100g
        const nutriments = product.nutriments || {}
        
        // OpenFoodFacts restituisce i valori in varie unità, normalizziamo
        const calories = nutriments['energy-kcal_100g'] || 
                        (nutriments['energy_100g'] ? Math.round(nutriments['energy_100g'] / 4.184) : null)
        
        const nutritionData = {
          name: product.product_name || 'Prodotto sconosciuto',
          barcode: decodedText,
          calories: calories ? Math.round(calories) : 0,
          pro: nutriments.proteins_100g || 0,
          carb: nutriments.carbohydrates_100g || 0,
          gra: nutriments.fat_100g || 0,
          fib: nutriments.fiber_100g || 0,
        }

        onProductFound(nutritionData)
      } else {
        setError(`Codice a barre trovato: ${decodedText}\nMa il prodotto non è nel database OpenFoodFacts.`)
      }
    } catch (err) {
      console.error('Errore API:', err)
      setError('Errore durante la ricerca del prodotto. Riprova.')
    } finally {
      setSearching(false)
    }
  }

  const onScanFailure = (error) => {
    // Silenzioso: continua a scansionare
  }

  const handleManualInput = () => {
    const barcode = prompt('Inserisci il codice a barre (13 cifre):')
    if (barcode && barcode.trim()) {
      onScanSuccess(barcode.trim())
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-electric">📷 Scanner Codice a Barre</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Area scanner */}
          <div className="bg-gray-900 rounded-lg overflow-hidden border border-border">
            {scanning ? (
              <div id="barcode-reader" className="w-full"></div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-6xl mb-4">📷</p>
                <p className="text-gray-400 mb-4">
                  La fotocamera si aprirà per inquadrare il codice a barre
                </p>
                <button
                  onClick={startScanner}
                  className="bg-electric text-black font-bold px-6 py-3 rounded-lg active:scale-95 transition-transform"
                >
                  Avvia Fotocamera
                </button>
              </div>
            )}
          </div>

          {/* Stato ricerca */}
          {searching && (
            <div className="bg-electric/10 border border-electric rounded-lg p-3 text-center">
              <p className="text-electric font-semibold">🔍 Ricerca prodotto in corso...</p>
            </div>
          )}

          {/* Errore */}
          {error && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-3">
              <p className="text-red-400 text-sm whitespace-pre-wrap">{error}</p>
            </div>
          )}

          {/* Input manuale */}
          <button
            onClick={handleManualInput}
            disabled={scanning}
            className="w-full bg-gray-800 border border-border text-white py-2 rounded-lg text-sm hover:border-electric transition-colors disabled:opacity-50"
          >
            ✏️ Inserisci codice manualmente
          </button>

          <p className="text-xs text-gray-500 text-center">
            💡 Inquadra il codice a barre del prodotto. I dati verranno presi dal database OpenFoodFacts.
          </p>
        </div>
      </div>
    </div>
  )
}

export default BarcodeScanner