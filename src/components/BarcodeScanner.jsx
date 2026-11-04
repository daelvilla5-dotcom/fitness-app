import { useState, useRef, useEffect } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

function BarcodeScanner({ onProductFound, onClose }) {
  const [mode, setMode] = useState('choice') // 'choice' | 'camera' | 'upload'
  const [scanning, setScanning] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const scannerRef = useRef(null)
  const html5QrCodeRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {})
        html5QrCodeRef.current.clear()
      }
    }
  }, [])

  const startCamera = async () => {
    setError('')
    setMode('camera')
    setScanning(true)

    try {
      const html5QrCode = new Html5Qrcode("barcode-reader")
      html5QrCodeRef.current = html5QrCode

      const devices = await Html5Qrcode.getCameras()
      
      if (!devices || devices.length === 0) {
        setError('Nessuna fotocamera trovata sul dispositivo.')
        setScanning(false)
        return
      }

      // Cerca la fotocamera posteriore, altrimenti usa la prima disponibile
      const rearCamera = devices.find(d => 
        d.label.toLowerCase().includes('back') || 
        d.label.toLowerCase().includes('rear') ||
        d.label.toLowerCase().includes('environment')
      ) || devices[devices.length - 1]

      await html5QrCode.start(
        rearCamera.id,
        {
          fps: 10,
          qrbox: { width: 280, height: 150 },
          aspectRatio: 1.5,
        },
        onScanSuccess,
        () => {} // onScanFailure - silenzioso
      )
    } catch (err) {
      console.error('Errore fotocamera:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Permesso fotocamera negato. Abilitalo dalle impostazioni del browser.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('Nessuna fotocamera trovata.')
      } else {
        setError('Errore nell\'accesso alla fotocamera. Prova con l\'upload dell\'immagine.')
      }
      setScanning(false)
    }
  }

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current.clear()
      } catch (err) {}
    }
    setScanning(false)
    setMode('choice')
  }

  const onScanSuccess = async (decodedText) => {
    await stopCamera()
    await lookupProduct(decodedText)
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setSearching(true)
    setError('')

    try {
      const html5QrCode = new Html5Qrcode("barcode-reader-hidden")
      const decodedText = await html5QrCode.scanFile(file, true)
      
      if (decodedText) {
        await lookupProduct(decodedText)
      } else {
        setError('Nessun codice a barre trovato nell\'immagine. Prova con un\'immagine più nitida del codice.')
        setSearching(false)
      }
    } catch (err) {
      console.error('Errore scan file:', err)
      setError('Impossibile leggere il codice a barre dall\'immagine.')
      setSearching(false)
    }
  }

  const lookupProduct = async (barcode) => {
    setSearching(true)
    setError('')

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
      )
      const data = await response.json()

      if (data.status === 1 && data.product) {
        const product = data.product
        const nutriments = product.nutriments || {}
        
        const calories = nutriments['energy-kcal_100g'] || 
                        (nutriments['energy_100g'] ? Math.round(nutriments['energy_100g'] / 4.184) : null)
        
        const nutritionData = {
          name: product.product_name || 'Prodotto sconosciuto',
          barcode: barcode,
          calories: calories ? Math.round(calories) : 0,
          pro: nutriments.proteins_100g || 0,
          carb: nutriments.carbohydrates_100g || 0,
          gra: nutriments.fat_100g || 0,
          fib: nutriments.fiber_100g || 0,
        }

        onProductFound(nutritionData)
      } else {
        setError(`Codice trovato: ${barcode}\nProdotto non presente nel database OpenFoodFacts.\nProva con un altro prodotto o inserisci manualmente.`)
        setSearching(false)
      }
    } catch (err) {
      console.error('Errore API:', err)
      setError('Errore di connessione. Controlla la rete e riprova.')
      setSearching(false)
    }
  }

  const handleManualInput = () => {
    const barcode = prompt('Inserisci il codice a barre (13 cifre):')
    if (barcode && barcode.trim()) {
      lookupProduct(barcode.trim())
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-electric">📷 Scanner Codice a Barre</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Scelta modalità */}
          {mode === 'choice' && !searching && (
            <>
              <div className="bg-gray-900 rounded-lg p-6 text-center border border-border">
                <p className="text-6xl mb-4">📷</p>
                <p className="text-gray-400 mb-4 text-sm">
                  Scegli come acquisire il codice a barre
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={startCamera}
                    className="w-full bg-electric text-black font-bold py-3 rounded-lg active:scale-95 transition-transform"
                  >
                    📸 Usa Fotocamera
                  </button>
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-gray-800 border border-border text-white py-3 rounded-lg hover:border-electric transition-colors"
                  >
                    🖼️ Carica Immagine
                  </button>
                  
                  <button
                    onClick={handleManualInput}
                    className="w-full bg-gray-800 border border-border text-white py-3 rounded-lg hover:border-electric transition-colors"
                  >
                    ✏️ Inserisci Codice Manualmente
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              <p className="text-xs text-gray-500 text-center">
                💡 I dati verranno presi dal database OpenFoodFacts
              </p>
            </>
          )}

          {/* Modalità fotocamera */}
          {mode === 'camera' && (
            <div className="space-y-3">
              <div className="bg-gray-900 rounded-lg overflow-hidden border border-border">
                <div id="barcode-reader" className="w-full min-h-[300px]"></div>
              </div>
              
              <button
                onClick={stopCamera}
                className="w-full bg-gray-800 border border-border text-white py-2 rounded-lg"
              >
                ✕ Ferma Fotocamera
              </button>
            </div>
          )}

          {/* Div nascosto per scan da file */}
          <div id="barcode-reader-hidden" className="hidden"></div>

          {/* Stato ricerca */}
          {searching && (
            <div className="bg-electric/10 border border-electric rounded-lg p-4 text-center">
              <p className="text-electric font-semibold mb-2">🔍 Ricerca prodotto...</p>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-electric h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
            </div>
          )}

          {/* Errore */}
          {error && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-3">
              <p className="text-red-400 text-sm whitespace-pre-wrap">{error}</p>
              {mode === 'camera' && (
                <button
                  onClick={() => { setMode('choice'); setError(''); }}
                  className="mt-2 text-xs text-electric underline"
                >
                  Torna alla scelta modalità
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BarcodeScanner