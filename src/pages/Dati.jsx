import { useState, useEffect } from 'react'
import {
  getUserProfile,
  saveUserProfile,
  calculateAge,
  getWeightLog,
  getAverageWeight,
  getMeasurements,
  saveMeasurements,
  deleteMeasurements,
  getAreaHistory,
  getLatestAreaValue,
} from '../utils/userData'
import BodyFigure from '../components/BodyFigure'
import MeasurementInput from '../components/MeasurementInput'
import MeasurementChart from '../components/MeasurementChart'
import DataBackup from '../components/DataBackup'
import { supabase } from '../supabaseClient'
import { 
  loadWeightLogs as loadWeightLogsDB, 
  saveWeightLog as saveWeightLogDB, 
  deleteWeightLog as deleteWeightLogDB,
  loadMeasurements as loadMeasurementsDB,
  saveMeasurement as saveMeasurementDB,
  deleteMeasurement as deleteMeasurementDB,
  saveUserProfile as saveUserProfileDB,
} from '../utils/supabaseData'
import { addToQueue } from '../utils/offlineQueue'

function Dati({ user }) {
  const [activeTab, setActiveTab] = useState('anagrafica')
  const [profile, setProfile] = useState({
    genere: 'M',
    dataNascita: '',
    altezza: '',
  })
  const [weightLog, setWeightLog] = useState([])
  const [newWeight, setNewWeight] = useState('')
  const [measurements, setMeasurements] = useState([])
  
  // Stato per la sagoma
  const [selectedArea, setSelectedArea] = useState(null)
  const [showMeasurementInput, setShowMeasurementInput] = useState(false)
  const [editingMeasurement, setEditingMeasurement] = useState(null)

useEffect(() => {
  if (user) {
    const loadFromSupabase = async () => {
      // Se offline, carica solo da localStorage
      if (!navigator.onLine) {
        console.log('📡 Offline: carica dati da localStorage')
        const savedProfile = getUserProfile()
        if (savedProfile) setProfile(savedProfile)
        setWeightLog(getWeightLog())
        setMeasurements(getMeasurements())
        return
      }
      
      // Se online, prova a caricare da Supabase
      try {
        const savedProfile = getUserProfile()
        if (savedProfile) setProfile(savedProfile)
        
        const dbWeights = await loadWeightLogsDB(user.id)
        setWeightLog(dbWeights.length > 0 ? dbWeights : getWeightLog())

        const dbMeasurements = await loadMeasurementsDB(user.id)
        setMeasurements(dbMeasurements.length > 0 ? dbMeasurements : getMeasurements())
        
      } catch (err) {
        console.error('Errore caricamento da Supabase:', err)
        // Fallback su localStorage
        setWeightLog(getWeightLog())
        setMeasurements(getMeasurements())
      }
    }
    loadFromSupabase()
  }
}, [user])

  const handleLogout = async () => {
    if (!confirm('Sei sicuro di voler uscire dall\'account?')) return
    
    try {
      await supabase.auth.signOut()
      window.location.reload()
    } catch (err) {
      console.error('Errore logout:', err)
      alert('Errore durante il logout: ' + err.message)
    }
  }

  const handleSaveProfile = async () => {
    if (!profile.dataNascita || !profile.altezza) {
      alert('Compila tutti i campi!')
      return
    }
    const profileWithAge = {
      ...profile,
      eta: calculateAge(profile.dataNascita),
      email: user?.email
    }
    
    try {
      await saveUserProfileDB(user.id, profileWithAge)
      saveUserProfile(profileWithAge)
      setProfile(profileWithAge)
      alert('Profilo salvato! ✅')
    } catch (err) {
      console.error('Errore salvataggio profilo:', err)
      saveUserProfile(profileWithAge)
      setProfile(profileWithAge)
      alert('Profilo salvato localmente (errore cloud)')
    }
  }

  const handleAddWeight = async (weight, date) => {
    const cleanWeightData = {
      weight: parseFloat(weight),
      date: date
    }
    
    // Se offline, aggiungi alla coda e aggiorna UI localmente
    if (!navigator.onLine) {
      addToQueue({
        type: 'CREATE_WEIGHT',
        data: cleanWeightData
      })
      
      // Aggiorna UI localmente
      const savedLog = {
        id: `pending_${Date.now()}`,
        weight: cleanWeightData.weight,
        date: cleanWeightData.date
      }
      const updatedLog = [savedLog, ...weightLog]
      setWeightLog(updatedLog)
      localStorage.setItem('fitness_app_weight_log', JSON.stringify(updatedLog))
      
      alert('⚠️ Offline: pesata salvata in locale e verrà sincronizzata quando torni online')
      return
    }
    
    // Se online, procedi normalmente
    try {
      const newLog = await saveWeightLogDB(user.id, cleanWeightData.weight, cleanWeightData.date)
      
      const savedLog = {
        id: newLog.id || Date.now().toString(),
        weight: cleanWeightData.weight,
        date: cleanWeightData.date
      }
      
      const updatedLog = [savedLog, ...weightLog]
      setWeightLog(updatedLog)
      localStorage.setItem('fitness_app_weight_log', JSON.stringify(updatedLog))
      
      console.log('✅ Pesata salvata su Supabase')
    } catch (err) {
      console.error('Errore salvataggio pesata:', err)
      alert('Errore nel salvataggio della pesata')
    }
  }

  const handleDeleteWeight = async (entryId) => {
    if (!confirm('Eliminare questa pesata?')) return
    
    // Se offline, aggiungi alla coda
    if (!navigator.onLine) {
      addToQueue({
        type: 'DELETE_WEIGHT',
        data: { id: entryId }
      })
      
      // Aggiorna UI localmente
      const updatedLog = weightLog.filter(entry => entry.id !== entryId)
      setWeightLog(updatedLog)
      localStorage.setItem('fitness_app_weight_log', JSON.stringify(updatedLog))
      
      alert('⚠️ Offline: eliminazione salvata in locale e verrà sincronizzata quando torni online')
      return
    }
    
    // Se online, procedi normalmente
    try {
      await deleteWeightLogDB(entryId)
      const updatedLog = weightLog.filter(entry => entry.id !== entryId)
      setWeightLog(updatedLog)
      localStorage.setItem('fitness_app_weight_log', JSON.stringify(updatedLog))
      console.log('✅ Pesata eliminata da Supabase')
    } catch (err) {
      console.error('Errore eliminazione pesata:', err)
      alert('Errore nell\'eliminazione della pesata')
    }
  }

  const handleSelectArea = (areaId) => {
    setSelectedArea(areaId)
    const latest = getLatestAreaValue(areaId)
    setEditingMeasurement({
      area: areaId,
      date: latest?.date || new Date().toISOString().split('T')[0],
      value: latest?.value || '',
    })
    setShowMeasurementInput(true)
  }

  const mapAreaToDb = (area) => {
    const map = {
      braccioDestro: 'braccio_destro',
      braccioSinistro: 'braccio_sinistro',
      torace: 'torace',
      vita: 'vita',
      glutei: 'glutei',
      cosciaDestra: 'coscia_destra',
      cosciaSinistra: 'coscia_sinistra',
      polpaccioDestro: 'polpaccio_destro',
      polpaccioSinistro: 'polpaccio_sinistro'
    }
    return map[area] || area
  }

  const handleSaveMeasurement = async (data) => {
    const existing = measurements.find(m => m.date === data.date)
    const dbArea = mapAreaToDb(editingMeasurement.area)

    const updatedMeasurement = {
      date: data.date,
      braccio_destro: existing?.braccio_destro || null,
      braccio_sinistro: existing?.braccio_sinistro || null,
      torace: existing?.torace || null,
      vita: existing?.vita || null,
      glutei: existing?.glutei || null,
      coscia_destra: existing?.coscia_destra || null,
      coscia_sinistra: existing?.coscia_sinistra || null,
      polpaccio_destro: existing?.polpaccio_destro || null,
      polpaccio_sinistro: existing?.polpaccio_sinistro || null,
      [dbArea]: parseFloat(data.value)
    }
    
    // Se offline, aggiungi alla coda e aggiorna UI localmente
    if (!navigator.onLine) {
      addToQueue({
        type: 'CREATE_MEASUREMENT',
        data: updatedMeasurement
      })
      
      // Aggiorna UI localmente
      let newMeasurementsList
      if (existing) {
        newMeasurementsList = measurements.map(m => m.date === data.date ? { ...m, ...updatedMeasurement } : m)
      } else {
        newMeasurementsList = [{ id: `pending_${Date.now()}`, ...updatedMeasurement }, ...measurements]
      }
      setMeasurements(newMeasurementsList)
      localStorage.setItem('fitness_app_measurements', JSON.stringify(newMeasurementsList))
      
      setShowMeasurementInput(false)
      setEditingMeasurement(null)
      alert('️ Offline: misura salvata in locale e verrà sincronizzata quando torni online')
      return
    }
    
    // Se online, procedi normalmente
    try {
      const saved = await saveMeasurementDB(user.id, updatedMeasurement)
      
      let newMeasurementsList
      if (existing) {
        newMeasurementsList = measurements.map(m => m.date === data.date ? { ...m, ...saved } : m)
      } else {
        newMeasurementsList = [saved, ...measurements]
      }
      setMeasurements(newMeasurementsList)
      localStorage.setItem('fitness_app_measurements', JSON.stringify(newMeasurementsList))
      
      setShowMeasurementInput(false)
      setEditingMeasurement(null)
      console.log('✅ Misura salvata su Supabase')
    } catch (err) {
      console.error('Errore salvataggio misura:', err)
      alert('Errore nel salvataggio della misura')
    }
  }

  const handleDeleteMeasurement = async (mId) => {
    if (!confirm('Eliminare questa misurazione?')) return
    
    // Se offline, aggiungi alla coda
    if (!navigator.onLine) {
      addToQueue({
        type: 'DELETE_MEASUREMENT',
        data: { id: mId }
      })
      
      // Aggiorna UI localmente
      const updated = measurements.filter(m => m.id !== mId)
      setMeasurements(updated)
      localStorage.setItem('fitness_app_measurements', JSON.stringify(updated))
      
      alert('️ Offline: eliminazione salvata in locale e verrà sincronizzata quando torni online')
      return
    }
    
    // Se online, procedi normalmente
    try {
      await deleteMeasurementDB(mId)
      const updated = measurements.filter(m => m.id !== mId)
      setMeasurements(updated)
      localStorage.setItem('fitness_app_measurements', JSON.stringify(updated))
      console.log('✅ Misura eliminata da Supabase')
    } catch (err) {
      console.error('Errore eliminazione misura:', err)
      alert('Errore nell\'eliminazione della misura')
    }
  }

  const averageWeight = getAverageWeight()

  const tabs = [
    { id: 'anagrafica', label: 'Anagrafica', icon: '' },
    { id: 'peso', label: 'Peso', icon: '⚖️' },
    { id: 'misure', label: 'Misure', icon: '📏' },
    { id: 'backup', label: 'Backup', icon: '💾' },
    { id: 'account', label: 'Account', icon: '' },
  ]

  const areaLabels = {
    braccioDestro: 'Braccio Destro',
    braccioSinistro: 'Braccio Sinistro',
    torace: 'Torace',
    vita: 'Vita',
    glutei: 'Glutei',
    cosciaDestra: 'Coscia Destra',
    cosciaSinistra: 'Coscia Sinistra',
    polpaccioDestro: 'Polpaccio Destro',
    polpaccioSinistro: 'Polpaccio Sinistro',
  }

  return (
    <div className="p-4 pb-24">
      <h2 className="text-2xl font-bold text-electric mb-6 mt-2"> Dati Personali</h2>

      {/* Tab navigation */}
      <div className="flex gap-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm ${
              activeTab === tab.id
                ? 'bg-electric text-black'
                : 'bg-card text-white border border-border'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Anagrafica */}
      {activeTab === 'anagrafica' && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">I tuoi dati</h3>

          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Genere</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setProfile({ ...profile, genere: 'M' })}
                  className={`flex-1 py-2 rounded-lg font-semibold ${
                    profile.genere === 'M' ? 'bg-electric text-black' : 'bg-gray-800 text-white'
                  }`}
                >
                  M
                </button>
                <button
                  onClick={() => setProfile({ ...profile, genere: 'F' })}
                  className={`flex-1 py-2 rounded-lg font-semibold ${
                    profile.genere === 'F' ? 'bg-electric text-black' : 'bg-gray-800 text-white'
                  }`}
                >
                  F
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Data di nascita</label>
              <input
                type="date"
                value={profile.dataNascita}
                onChange={(e) => setProfile({ ...profile, dataNascita: e.target.value })}
                className="w-full bg-gray-800 border border-border text-white rounded-lg px-3 py-2 focus:outline-none focus:border-electric"
              />
              {profile.dataNascita && (
                <p className="text-sm text-electric mt-1">
                  Età: {calculateAge(profile.dataNascita)} anni
                </p>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Altezza (cm)</label>
              <input
                type="number"
                value={profile.altezza}
                onChange={(e) => setProfile({ ...profile, altezza: e.target.value })}
                className="w-full bg-gray-800 border border-border text-white rounded-lg px-3 py-2 focus:outline-none focus:border-electric"
                placeholder="175"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              className="w-full bg-electric text-black font-bold py-3 rounded-lg mt-4 active:scale-95 transition-transform"
            >
              Salva Profilo
            </button>
          </div>
        </div>
      )}

      {/* Tab Peso */}
      {activeTab === 'peso' && (
        <div className="space-y-4">
          <div className="bg-electric/10 border border-electric rounded-lg p-4 text-center">
            <p className="text-sm text-gray-400 mb-1">Media ultime 7 pesate</p>
            <p className="text-4xl font-bold text-electric">
              {averageWeight ? `${averageWeight} kg` : '--'}
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Nuova pesata</h3>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.1"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                className="flex-1 bg-gray-800 border border-border text-white rounded-lg px-3 py-2 focus:outline-none focus:border-electric"
                placeholder="78.5"
              />
              <button
                onClick={() => {
                  if (!newWeight) {
                    alert('Inserisci il peso!')
                    return
                  }
                  handleAddWeight(newWeight, new Date().toISOString().split('T')[0])
                }}
                className="bg-electric text-black font-bold px-6 py-2 rounded-lg active:scale-95 transition-transform"
              >
                +
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Storico pesate</h3>
            {weightLog.length === 0 ? (
              <p className="text-gray-400 text-center">Nessuna pesata registrata</p>
            ) : (
              <div className="space-y-2">
                {weightLog.map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center bg-gray-800 rounded-lg p-3">
                    <div>
                      <p className="text-white font-semibold">{entry.weight} kg</p>
                      <p className="text-xs text-gray-400">{new Date(entry.date).toLocaleDateString('it-IT')}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteWeight(entry.id)}
                      className="text-red-500 hover:text-red-400"
                    >
                      
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Misure */}
      {activeTab === 'misure' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Sagoma</h3>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setProfile({ ...profile, genere: 'M' })}
                className={`flex-1 py-2 rounded-lg font-semibold ${
                  profile.genere === 'M' ? 'bg-electric text-black' : 'bg-gray-800 text-white'
                }`}
              >
                ♂️ Maschio
              </button>
              <button
                onClick={() => setProfile({ ...profile, genere: 'F' })}
                className={`flex-1 py-2 rounded-lg font-semibold ${
                  profile.genere === 'F' ? 'bg-electric text-black' : 'bg-gray-800 text-white'
                }`}
              >
                ♀️ Femmina
              </button>
            </div>

            <BodyFigure
              gender={profile.genere}
              onSelectArea={handleSelectArea}
              selectedArea={selectedArea}
            />

            <p className="text-xs text-gray-400 text-center mt-3">
               Clicca su un punto della sagoma o su un pulsante per inserire/modificare la misura
            </p>
          </div>

          {Object.keys(areaLabels).map((areaKey) => {
            const history = getAreaHistory(areaKey)
            if (history.length === 0) return null
            
            return (
              <MeasurementChart
                key={areaKey}
                areaName={areaLabels[areaKey]}
                data={history}
                color="#00BFFF"
              />
            )
          })}

          {measurements.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Storico completo</h3>
              <div className="space-y-2">
                {measurements.slice(0, 10).map((m) => (
                  <div key={m.id} className="bg-gray-800 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-electric font-semibold text-sm">
                        {new Date(m.date).toLocaleDateString('it-IT')}
                      </p>
                      <button
                        onClick={() => handleDeleteMeasurement(m.id)}
                        className="text-red-500 text-xs"
                      >
                        🗑
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      {Object.entries(areaLabels).map(([key, label]) => {
                        if (m[key] === undefined || m[key] === '') return null
                        return (
                          <div key={key} className="bg-gray-900 rounded px-2 py-1">
                            <span className="text-gray-400">{label.split(' ')[0]}:</span>
                            <span className="text-white ml-1">{m[key]}cm</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Backup */}
      {activeTab === 'backup' && <DataBackup />}

      {/* Tab Account */}
      {activeTab === 'account' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">👤 Il tuo account</h3>
            
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-400 mb-1">Email</p>
              <p className="text-electric font-semibold">{user?.email || 'Non disponibile'}</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-400 mb-1">Stato</p>
              <p className="text-green-400 font-semibold">✓ Utente approvato</p>
            </div>

            <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-3">
                ⚠️ Il logout ti riporterà alla schermata di accesso. Dovrai fare nuovamente il login con Google per entrare.
              </p>
              <button
                onClick={handleLogout}
                className="w-full bg-red-500 text-white font-bold py-3 rounded-lg hover:bg-red-600 active:scale-95 transition-all"
              >
                 Esci dall'account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal inserimento misura */}
      {showMeasurementInput && editingMeasurement && (
        <MeasurementInput
          areaName={areaLabels[editingMeasurement.area]}
          initialValue={editingMeasurement.value}
          initialDate={editingMeasurement.date}
          onSave={handleSaveMeasurement}
          onClose={() => {
            setShowMeasurementInput(false)
            setEditingMeasurement(null)
          }}
        />
      )}
    </div>
  )
}

export default Dati