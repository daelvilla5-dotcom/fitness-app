import { useState, useRef } from 'react'
import { downloadBackup, loadBackupFromFile, getDataSize, getDataStats } from '../utils/dataManager'

function DataBackup() {
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' | 'error'
  const fileInputRef = useRef(null)

  const handleExport = () => {
    try {
      downloadBackup()
      setMessage('✅ Backup scaricato con successo!')
      setMessageType('success')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Errore durante il backup: ' + err.message)
      setMessageType('error')
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      await loadBackupFromFile(file)
      setMessage('✅ Dati ripristinati con successo! Ricarica la pagina per vedere le modifiche.')
      setMessageType('success')
      
      // Ricarica la pagina dopo 2 secondi
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err) {
      setMessage('❌ ' + err.message)
      setMessageType('error')
    }

    // Reset input
    e.target.value = ''
  }

  const stats = getDataStats()
  const dataSize = getDataSize()

  return (
    <div className="space-y-4">
      {/* Statistiche dati */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">📊 I tuoi dati</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-400 text-xs">Alimenti salvati</p>
            <p className="text-electric font-bold text-xl">{stats.foods}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-400 text-xs">Pesate registrate</p>
            <p className="text-electric font-bold text-xl">{stats.weightEntries}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-400 text-xs">Misurazioni</p>
            <p className="text-electric font-bold text-xl">{stats.measurements}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-400 text-xs">Schede allenamento</p>
            <p className="text-electric font-bold text-xl">{stats.routines}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3 text-center">
          Spazio utilizzato: {dataSize} KB
        </p>
      </div>

      {/* Esporta */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-2">💾 Esporta Backup</h3>
        <p className="text-sm text-gray-400 mb-3">
          Scarica un file con tutti i tuoi dati. Salvalo su Google Drive, email o cloud personale.
        </p>
        <button
          onClick={handleExport}
          className="w-full bg-electric text-black font-bold py-3 rounded-lg active:scale-95 transition-transform"
        >
          📥 Scarica Backup JSON
        </button>
      </div>

      {/* Importa */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-2">📤 Ripristina Backup</h3>
        <p className="text-sm text-gray-400 mb-3">
          Carica un file di backup precedentemente esportato. <strong>Attenzione:</strong> sovrascriverà i dati attuali.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full bg-gray-800 border border-border text-white font-semibold py-3 rounded-lg hover:border-electric transition-colors"
        >
          📂 Seleziona File Backup
        </button>
      </div>

      {/* Messaggio */}
      {message && (
        <div className={`rounded-lg p-3 ${
          messageType === 'success' 
            ? 'bg-green-500/10 border border-green-500' 
            : 'bg-red-500/10 border border-red-500'
        }`}>
          <p className={`text-sm ${
            messageType === 'success' ? 'text-green-400' : 'text-red-400'
          }`}>
            {message}
          </p>
        </div>
      )}

      {/* Info sicurezza */}
      <div className="bg-gray-800/50 border border-border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-2">🔒 Sicurezza dei dati</h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• I dati sono salvati solo sul tuo dispositivo</li>
          <li>• Il backup è un file JSON leggibile</li>
          <li>• Nessun dato viene inviato a server esterni</li>
          <li>• Fai backup regolari per non perdere i progressi</li>
        </ul>
      </div>
    </div>
  )
}

export default DataBackup