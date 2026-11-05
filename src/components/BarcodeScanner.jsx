import { useState, useRef, useEffect } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

function BarcodeScanner({ onProductFound, onClose }) {
  const [mode, setMode] = useState('choice')
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [lastScannedCode, setLastScannedCode] = useState('')
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

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      stream.getTracks().forEach(track => track.stop())

      const html5QrCode = new Html5Qrcode("barcode-reader")
      html5QrCodeRef.current = html5QrCode

      const devices = await Html5Qrcode.getCameras()
      
      if (!devices || devices.length === 0) {
        setError('Nessuna fotocamera trovata.')
        setMode('choice')
        return
      }

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
        () => {}
      )
    } catch (err) {
      console.error('Errore fotocamera:', err)
      let msg = 'Errore nell\'accesso alla fotocamera.'
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Permesso fotocamera negato.\n\nPer abilitarlo:\n• Android: Impostazioni → App → Browser → Permessi → Fotocamera\n• Chrome: clicca l\'icona 🔒 nella barra indirizzi'
      } else if (err.name === 'NotFoundError') {
        msg = 'Nessuna fotocamera trovata sul dispositivo.'
      } else if (err.name === 'NotReadableError') {
        msg = 'Fotocamera occupata da un\'altra app. Chiudila e riprova.'
      }
      
      setError(msg)
      setMode('choice')
    }
  }

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current.clear()
      } catch (err) {}
    }
  }

  const onScanSuccess = async (decodedText) => {
    await stopCamera()
    setLastScannedCode(decodedText)
    setSearching(true)
    setError('')
    await lookupProduct(decodedText)
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setSearching(true)
    setError('')
    setLastScannedCode('')

    try {
      const html5QrCode = new Html5Qrcode("barcode-reader-hidden")
      const decodedText = await html5QrCode.scanFile(file, true)
      
      if (decodedText) {
        setLastScannedCode(decodedText)
        await lookupProduct(decodedText)
      } else {
        setError('Nessun codice a barre trovato nell\'immagine.\nProva con un\'immagine più nitida.')
        setSearching(false)
      }
    } catch (err) {
      console.error('Errore scan file:', err)
      setError('Impossibile leggere il codice a barre dall\'immagine.')
      setSearching(false)
    }
    
    e.target.value = ''
  }

  // FIX: funzione lookup con timeout e gestione errori migliorata
  const lookupProduct = async (barcode) => {
    setSearching(true)
    setError('')

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 secondi timeout

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
        { signal: controller.signal }
      )
      
      clearTimeout(timeoutId)

      // FIX: controlla se la risposta HTTP è ok (200-299)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

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

        await new Promise(resolve => setTimeout(resolve, 300))
        onProductFound(nutritionData)
      } else {
        setError(`Codice: ${barcode}\nProdotto non trovato nel database OpenFoodFacts.\n\nProva con:\n• Inserimento manuale\n• Scanner etichetta OCR`)
        setSearching(false)
        setMode('choice')
      }
    } catch (err) {
      clearTimeout(timeoutId)
      console.error('Errore API:', err)
      
      let msg = ''
      if (err.name === 'AbortError') {
        msg = 'Timeout: la richiesta ha impiegato troppo tempo.\n\nPossibili cause:\n• Connessione lenta\n• Server OpenFoodFacts sovraccarico\n\nProva con "Inserisci Codice Manualmente" o "Etichetta OCR".'
      } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        msg = 'Errore di rete.\n\nControlla:\n• Connessione internet attiva\n• Il sito non è bloccato dal firewall\n\nProva con "Inserisci Codice Manualmente".'
      } else {
        msg = `Errore durante la ricerca.\n\nDettagli: ${err.message}\n\nProva con "Inserisci Codice Manualmente" o "Etichetta OCR".`
      }
      
      setError(msg)
      setSearching(false)
      setMode('choice')
    }
  }

  const handleManualInput = () => {
    const barcode = prompt('Inserisci il codice a barre (13 cifre):')
    if (barcode && barcode.trim()) {
      setLastScannedCode(barcode.trim())
      lookupProduct(barcode.trim())
    }
  }

  const handleBackToChoice = async () => {
    await stopCamera()
    setMode('choice')
    setSearching(false)
    setError('')
    setLastScannedCode('')
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
          {searching && (
            <div className="bg-electric/10 border border-electric rounded-lg p-6 text-center">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-electric font-semibold mb-2">Ricerca prodotto...</p>
              {lastScannedCode && (
                <p className="text-xs text-gray-400 mb-3">Codice: {lastScannedCode}</p>
              )}
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-electric h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Tempo massimo: 10 secondi
              </p>
            </div>
          )}

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
                    📸 Usa Fotocamera (live)
                  </button>
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-gray-800 border border-border text-white py-3 rounded-lg hover:border-electric transition-colors"
                  >
                    🖼️ Carica Immagine (galleria)
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
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              <p className="text-xs text-gray-500 text-center">
                💡 I dati verranno presi dal database OpenFoodFacts
              </p>
            </>
          )}

          {mode === 'camera' && !searching && (
            <div className="space-y-3">
              <div className="bg-gray-900 rounded-lg overflow-hidden border border-border">
                <div id="barcode-reader" className="w-full min-h-[300px]"></div>
              </div>
              
              <button
                onClick={handleBackToChoice}
                className="w-full bg-gray-800 border border-border text-white py-2 rounded-lg"
              >
                ✕ Torna alla scelta
              </button>
            </div>
          )}

          <div id="barcode-reader-hidden" className="hidden"></div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-3">
              <p className="text-red-400 text-sm whitespace-pre-wrap">{error}</p>
              <button
                onClick={handleBackToChoice}
                className="mt-2 text-xs text-electric underline"
              >
                Torna alla scelta modalità
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BarcodeScanner