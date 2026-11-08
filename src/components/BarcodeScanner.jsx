import { useState, useRef, useEffect } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

function BarcodeScanner({ onProductFound, onClose }) {
  const [mode, setMode] = useState('choice')
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [lastScannedCode, setLastScannedCode] = useState('')
  const [foundProduct, setFoundProduct] = useState(null)
  const html5QrCodeRef = useRef(null)
  const fileInputRef = useRef(null)

  // ✅ FORMATI SUPPORTATI: Fondamentale per i codici a barre dei prodotti alimentari
  const formatsToSupport = [
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.QR_CODE // Fallback
  ]

  useEffect(() => {
    return () => {
      const scanner = html5QrCodeRef.current
      if (scanner) {
        scanner.stop().catch(() => {}).finally(() => {
          scanner.clear().catch(() => {})
        })
      }
    }
  }, [])

  const startCamera = async () => {
    setError('')
    setMode('camera')
    setSearching(false)
    setFoundProduct(null)

    try {
      const html5QrCode = new Html5Qrcode("barcode-reader")
      html5QrCodeRef.current = html5QrCode

      // ✅ FIX IPHONE: Richiedi risoluzione più alta e forza i formati 1D
      await html5QrCode.start(
        { 
          facingMode: "environment",
          width: { ideal: 1280 }, // Risoluzione più alta per una migliore messa a fuoco
          height: { ideal: 720 }
        },
        {
          fps: 10,
          qrbox: { width: 280, height: 150 }, // Rettangolare, meglio per codici a barre
          aspectRatio: 1.77,
          formatsToSupport: formatsToSupport, // ← FONDAMENTALE
          disableFlip: false,
        },
        onScanSuccess,
        () => {} // Silenzia errori di scansione continua
      )
    } catch (err) {
      console.error('Errore fotocamera:', err)
      let msg = 'Errore nell\'accesso alla fotocamera.'
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Permesso fotocamera negato.\n\nSu iPhone: Impostazioni → Safari → Fotocamera → Consenti'
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Nessuna fotocamera trovata.'
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Fotocamera occupata. Chiudi altre app e riprova.'
      }
      
      setError(msg)
      setMode('choice')
    }
  }

  const stopCamera = async () => {
    const scanner = html5QrCodeRef.current
    if (scanner) {
      try {
        await scanner.stop()
      } catch (err) {
        if (!err.message?.toLowerCase().includes('not running') && 
            !err.message?.toLowerCase().includes('not paused')) {
          console.warn('Errore stop scanner:', err)
        }
      } finally {
        try {
          scanner.clear()
        } catch (e) {}
        html5QrCodeRef.current = null
      }
    }
  }

  const onScanSuccess = async (decodedText) => {
    if (searching) return
    
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
    setFoundProduct(null)

    try {
      const html5QrCode = new Html5Qrcode("barcode-reader-hidden")
      
      // ✅ Anche per le foto, forza i formati corretti
      const decodedText = await html5QrCode.scanFile(file, true, {
        formatsToSupport: formatsToSupport
      })
      
      if (decodedText) {
        setLastScannedCode(decodedText)
        await lookupProduct(decodedText)
      } else {
        setError('Nessun codice a barre trovato.\nAssicurati che sia ben illuminato e a fuoco.')
        setSearching(false)
      }
    } catch (err) {
      console.error('Errore scan file:', err)
      setError('Impossibile leggere il codice. Prova con una foto più nitida o usa la fotocamera live.')
      setSearching(false)
    }
    
    e.target.value = ''
  }

  const lookupProduct = async (barcode) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
        { signal: controller.signal }
      )
      
      clearTimeout(timeoutId)

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

        await stopCamera()
        setSearching(false)
        setFoundProduct(nutritionData)
      } else {
        await stopCamera()
        setError(`Codice: ${barcode}\nProdotto non trovato nel database OpenFoodFacts.\nProva l'inserimento manuale.`)
        setSearching(false)
        setMode('choice')
      }
    } catch (err) {
      clearTimeout(timeoutId)
      console.error('Errore API:', err)
      
      let msg = ''
      if (err.name === 'AbortError') {
        msg = 'Timeout: la richiesta ha impiegato troppo tempo.'
      } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        msg = 'Errore di rete. Controlla la connessione internet.'
      } else {
        msg = `Errore: ${err.message}`
      }
      
      await stopCamera()
      setError(msg)
      setSearching(false)
      setMode('choice')
    }
  }

  const handleManualInput = () => {
    const barcode = prompt('Inserisci il codice a barre (13 cifre):')
    if (barcode && barcode.trim()) {
      setLastScannedCode(barcode.trim())
      setSearching(true)
      setFoundProduct(null)
      lookupProduct(barcode.trim())
    }
  }

  const handleConfirmProduct = () => {
    if (foundProduct) {
      onProductFound(foundProduct)
    }
  }

  const handleBackToChoice = async () => {
    await stopCamera()
    setMode('choice')
    setSearching(false)
    setError('')
    setLastScannedCode('')
    setFoundProduct(null)
  }

  const handleClose = async () => {
    await stopCamera()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-electric">📷 Scanner Codice a Barre</h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-white text-2xl">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {mode === 'choice' && !searching && !foundProduct && (
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
                💡 Consiglio: Assicurati che il codice sia ben illuminato e piatto.
              </p>
            </>
          )}

          {mode === 'camera' && (
            <div className="space-y-3">
              <div className="bg-gray-900 rounded-lg overflow-hidden border border-border relative">
                <div id="barcode-reader" className="w-full min-h-[300px]"></div>
                
                {searching && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                    <div className="text-center p-6">
                      <p className="text-4xl mb-3">🔍</p>
                      <p className="text-electric font-semibold mb-2">Ricerca prodotto...</p>
                      {lastScannedCode && (
                        <p className="text-xs text-gray-400 mb-3">Codice: {lastScannedCode}</p>
                      )}
                      <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                        <div className="bg-electric h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                      </div>
                      <p className="text-xs text-gray-500">Tempo massimo: 10 secondi</p>
                    </div>
                  </div>
                )}
              </div>
              
              {!searching && !foundProduct && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 text-center">
                    💡 Avvicina il telefono al codice e assicurati che ci sia buona luce.
                  </p>
                  <button
                    onClick={handleBackToChoice}
                    className="w-full bg-gray-800 border border-border text-white py-2 rounded-lg"
                  >
                    ✕ Torna alla scelta
                  </button>
                </div>
              )}
            </div>
          )}

          {foundProduct && (
            <div className="bg-green-500/10 border border-green-500 rounded-lg p-4">
              <p className="text-green-400 font-semibold mb-3 text-center">✅ Prodotto trovato!</p>
              
              <div className="bg-gray-800 rounded-lg p-3 mb-3">
                <p className="text-white font-bold text-lg mb-2">{foundProduct.name}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-900 rounded p-2 text-center">
                    <p className="text-gray-400 text-xs">Calorie</p>
                    <p className="text-electric font-bold">{foundProduct.calories} kcal</p>
                  </div>
                  <div className="bg-gray-900 rounded p-2 text-center">
                    <p className="text-gray-400 text-xs">Proteine</p>
                    <p className="text-white font-bold">{foundProduct.pro}g</p>
                  </div>
                  <div className="bg-gray-900 rounded p-2 text-center">
                    <p className="text-gray-400 text-xs">Carboidrati</p>
                    <p className="text-white font-bold">{foundProduct.carb}g</p>
                  </div>
                  <div className="bg-gray-900 rounded p-2 text-center">
                    <p className="text-gray-400 text-xs">Grassi</p>
                    <p className="text-white font-bold">{foundProduct.gra}g</p>
                  </div>
                  <div className="bg-gray-900 rounded p-2 text-center col-span-2">
                    <p className="text-gray-400 text-xs">Fibre</p>
                    <p className="text-white font-bold">{foundProduct.fib}g</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">per 100g</p>
              </div>

              <button
                onClick={handleConfirmProduct}
                className="w-full bg-electric text-black font-bold py-3 rounded-lg active:scale-95 transition-transform mb-2"
              >
                ✓ Usa questi dati
              </button>
              
              <button
                onClick={handleBackToChoice}
                className="w-full bg-gray-800 border border-border text-white py-2 rounded-lg text-sm"
              >
                ✕ Scansiona un altro prodotto
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