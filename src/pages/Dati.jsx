import { useState, useEffect } from 'react'
import {
  getUserProfile,
  saveUserProfile,
  calculateAge,
  getWeightLog,
  getMeasurements,
} from '../utils/userData'
import BodyFigure from '../components/BodyFigure'
import MeasurementInput from '../components/MeasurementInput'
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
  loadUserProfile as loadUserProfileDB,
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
  
  const [selectedArea, setSelectedArea] = useState(null)
  const [showMeasurementInput, setShowMeasurementInput] = useState(false)
  const [editingMeasurement, setEditingMeasurement] = useState(null)

  // ✅ MAPPING UNIFICATO: Chiave Database (snake_case) -> Nome Visualizzato
  const measurementLabels = {
    braccio_destro: 'Braccio DX',
    braccio_sinistro: 'Braccio SX',
    torace: 'Torace',
    vita: 'Vita',
    glutei: 'Glutei',
    coscia_destra: 'Coscia DX',
    coscia_sinistra: 'Coscia SX',
    polpaccio_destro: 'Polpaccio DX',
    polpaccio_sinistro: 'Polpaccio SX',
  }

  useEffect(() => {
    if (!user) return

    const loadAllData = async () => {
      if (!navigator.onLine) {
        const savedProfile = getUserProfile()
        if (savedProfile) setProfile(savedProfile)
        setWeightLog(getWeightLog() || [])
        setMeasurements(getMeasurements() || [])
        return
      }
      
      try {
        const dbProfile = await loadUserProfileDB(user.id)
        if (dbProfile) {
          const p = { 
            genere: dbProfile.genere || 'M', 
            eta: dbProfile.eta, 
            altezza: dbProfile.altezza,
            dataNascita: dbProfile.data_nascita
          }
          setProfile(p)
          localStorage.setItem('fitness_app_user_profile', JSON.stringify(p))
        } else {
          const localProfile = getUserProfile()
          if (localProfile) setProfile(localProfile)
        }

        const dbWeights = await loadWeightLogsDB(user.id)
        setWeightLog(dbWeights || [])
        localStorage.setItem('fitness_app_weight_log', JSON.stringify(dbWeights || []))

        const dbMeasurements = await loadMeasurementsDB(user.id)
        setMeasurements(dbMeasurements || [])
        localStorage.setItem('fitness_app_measurements', JSON.stringify(dbMeasurements || []))
        
      } catch (err) {
        console.error('Errore caricamento da Supabase:', err)
        const localProfile = getUserProfile()
        if (localProfile) setProfile(localProfile)
        setWeightLog(getWeightLog() || [])
        setMeasurements(getMeasurements() || [])
      }
    }

    loadAllData()
  }, [user, activeTab])

  const averageWeight = (() => {
    if (!weightLog || weightLog.length === 0) return null
    const sorted = [...weightLog].sort((a, b) => new Date(b.date) - new Date(a.date))
    const last7 = sorted.slice(0, 7)
    const sum = last7.reduce((acc, curr) => acc + parseFloat(curr.weight), 0)
    return (sum / last7.length).toFixed(1)
  })()

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

  const handleDeleteWeight = async (entryId) => {
    if (!confirm('Eliminare questa pesata?')) return
    try {
      await deleteWeightLogDB(entryId)
    } catch (err) {
      console.log('Pesata eliminata solo da locale')
    }
    const updatedLog = weightLog.filter(entry => entry.id !== entryId)
    setWeightLog(updatedLog)
    localStorage.setItem('fitness_app_weight_log', JSON.stringify(updatedLog))
  }

  const handleEditWeight = async (entryId, currentWeight) => {
    const newWeightStr = prompt('Modifica peso (kg):', currentWeight)
    if (newWeightStr === null) return 
    
    const newWeight = parseFloat(newWeightStr)
    if (!newWeight || newWeight <= 0) {
      alert('Inserisci un peso valido!')
      return
    }
    
    try {
      const { error } = await supabase
        .from('weight_logs')
        .update({ weight: newWeight })
        .eq('id', entryId)
      if (error) throw error
      
      const updatedLog = weightLog.map(entry => 
        entry.id === entryId ? { ...entry, weight: newWeight } : entry
      )
      setWeightLog(updatedLog)
      localStorage.setItem('fitness_app_weight_log', JSON.stringify(updatedLog))
    } catch (err) {
      console.error('Errore aggiornamento pesata:', err)
      alert('Errore nell\'aggiornamento della pesata')
    }
  }

  const handleAddWeight = async (weight, date) => {
    const cleanWeightData = { weight: parseFloat(weight), date: date }
    
    if (!navigator.onLine) {
      addToQueue({ type: 'CREATE_WEIGHT', data: cleanWeightData })
      const savedLog = { id: `pending_${Date.now()}`, weight: cleanWeightData.weight, date: cleanWeightData.date }
      const updatedLog = [savedLog, ...weightLog]
      setWeightLog(updatedLog)
      localStorage.setItem('fitness_app_weight_log', JSON.stringify(updatedLog))
      alert('⚠️ Offline: pesata salvata in locale')
      return
    }
    
    try {
      const newLog = await saveWeightLogDB(user.id, cleanWeightData.weight, cleanWeightData.date)
      const savedLog = { id: newLog.id || Date.now().toString(), weight: cleanWeightData.weight, date: cleanWeightData.date }
      const updatedLog = [savedLog, ...weightLog]
      setWeightLog(updatedLog)
      localStorage.setItem('fitness_app_weight_log', JSON.stringify(updatedLog))
    } catch (err) {
      console.error('Errore salvataggio pesata:', err)
      alert('Errore nel salvataggio')
    }
  }

  const handleSelectArea = (areaId) => {
    setSelectedArea(areaId)
    
    // Mappa l'ID camelCase del componente BodyFigure nel snake_case del database
    const map = {
      braccioDestro: 'braccio_destro', braccioSinistro: 'braccio_sinistro',
      torace: 'torace', vita: 'vita', glutei: 'glutei',
      cosciaDestra: 'coscia_destra', cosciaSinistra: 'coscia_sinistra',
      polpaccioDestro: 'polpaccio_destro', polpaccioSinistro: 'polpaccio_sinistro'
    }
    const dbArea = map[areaId] || areaId

    setEditingMeasurement({
      area: areaId,
      dbArea: dbArea,
      date: new Date().toISOString().split('T')[0],
      value: '',
    })
    setShowMeasurementInput(true)
  }

  const handleSaveMeasurement = async (data) => {
    const existing = measurements.find(m => m.date === data.date)
    const dbArea = editingMeasurement.dbArea

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
    
    if (!navigator.onLine) {
      addToQueue({ type: 'CREATE_MEASUREMENT', data: updatedMeasurement })
      let newMeasurementsList = existing 
        ? measurements.map(m => m.date === data.date ? { ...m, ...updatedMeasurement } : m)
        : [{ id: `pending_${Date.now()}`, ...updatedMeasurement }, ...measurements]
      
      setMeasurements(newMeasurementsList)
      localStorage.setItem('fitness_app_measurements', JSON.stringify(newMeasurementsList))
      setShowMeasurementInput(false)
      setEditingMeasurement(null)
      alert('⚠️ Offline: misura salvata in locale')
      return
    }
    
    try {
      const saved = await saveMeasurementDB(user.id, updatedMeasurement)
      let newMeasurementsList = existing 
        ? measurements.map(m => m.date === data.date ? { ...m, ...saved } : m)
        : [saved, ...measurements]
      
      setMeasurements(newMeasurementsList)
      localStorage.setItem('fitness_app_measurements', JSON.stringify(newMeasurementsList))
      setShowMeasurementInput(false)
      setEditingMeasurement(null)
    } catch (err) {
      console.error('Errore salvataggio misura:', err)
      alert('Errore nel salvataggio della misura')
    }
  }

  const handleDeleteMeasurement = async (mId) => {
    if (!confirm('Eliminare questa misurazione?')) return
    
    if (!navigator.onLine) {
      addToQueue({ type: 'DELETE_MEASUREMENT', data: { id: mId } })
      const updated = measurements.filter(m => m.id !== mId)
      setMeasurements(updated)
      localStorage.setItem('fitness_app_measurements', JSON.stringify(updated))
      alert('⚠️ Offline: eliminazione salvata in locale')
      return
    }
    
    try {
      await deleteMeasurementDB(mId)
      const updated = measurements.filter(m => m.id !== mId)
      setMeasurements(updated)
      localStorage.setItem('fitness_app_measurements', JSON.stringify(updated))
    } catch (err) {
      console.error('Errore eliminazione misura:', err)
      alert('Errore nell\'eliminazione della misura')
    }
  }

  const tabs = [
    { id: 'anagrafica', label: 'Anagrafica', icon: '👤' },
    { id: 'peso', label: 'Peso', icon: '⚖️' },
    { id: 'misure', label: 'Misure', icon: '📏' },
    { id: 'backup', label: 'Backup', icon: '💾' },
    { id: 'account', label: 'Account', icon: '⚙️' },
  ]

  return (
    <div className="p-4 pb-24">
      <h2 className="text-2xl font-bold text-electric mb-6 mt-2">📏 Dati Personali</h2>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg font-semibold text-sm ${
              activeTab === tab.id ? 'bg-electric text-black' : 'bg-card text-white border border-border'
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
                <button onClick={() => setProfile({ ...profile, genere: 'M' })} className={`flex-1 py-2 rounded-lg font-semibold ${profile.genere === 'M' ? 'bg-electric text-black' : 'bg-gray-800 text-white'}`}>Maschio</button>
                <button onClick={() => setProfile({ ...profile, genere: 'F' })} className={`flex-1 py-2 rounded-lg font-semibold ${profile.genere === 'F' ? 'bg-electric text-black' : 'bg-gray-800 text-white'}`}>Femmina</button>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Data di nascita</label>
              <input type="date" value={profile.dataNascita || ''} onChange={(e) => setProfile({ ...profile, dataNascita: e.target.value })} className="w-full bg-gray-800 border border-border text-white rounded-lg px-3 py-2 focus:outline-none focus:border-electric" />
              {profile.dataNascita && <p className="text-sm text-electric mt-1">Età: {calculateAge(profile.dataNascita)} anni</p>}
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Altezza (cm)</label>
              <input type="number" value={profile.altezza || ''} onChange={(e) => setProfile({ ...profile, altezza: e.target.value })} className="w-full bg-gray-800 border border-border text-white rounded-lg px-3 py-2 focus:outline-none focus:border-electric" placeholder="175" />
            </div>
            <button onClick={handleSaveProfile} className="w-full bg-electric text-black font-bold py-3 rounded-lg mt-4 active:scale-95 transition-transform">Salva Profilo</button>
          </div>
        </div>
      )}

      {/* Tab Peso */}
      {activeTab === 'peso' && (
        <div className="space-y-4">
          <div className="bg-electric/10 border border-electric rounded-lg p-4 text-center">
            <p className="text-sm text-gray-400 mb-1">Media ultime 7 pesate</p>
            <p className="text-4xl font-bold text-electric">{averageWeight ? `${averageWeight} kg` : '--'}</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Nuova pesata</h3>
            <div className="flex gap-2">
              <input type="number" step="0.1" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} className="flex-1 bg-gray-800 border border-border text-white rounded-lg px-3 py-2 focus:outline-none focus:border-electric" placeholder="78.5" />
              <button onClick={() => {
                if (!newWeight) { alert('Inserisci il peso!'); return }
                handleAddWeight(newWeight, new Date().toISOString().split('T')[0])
                setNewWeight('')
              }} className="bg-electric text-black font-bold px-6 py-2 rounded-lg active:scale-95 transition-transform">+</button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Storico pesate</h3>
            {weightLog.length === 0 ? (
              <p className="text-gray-400 text-center py-4">Nessuna pesata registrata</p>
            ) : (
              <div className="space-y-2">
                {weightLog.map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center bg-gray-800 rounded-lg p-3">
                    <div>
                      <p className="text-white font-semibold">{entry.weight} kg</p>
                      <p className="text-xs text-gray-400">{new Date(entry.date).toLocaleDateString('it-IT')}</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => handleEditWeight(entry.id, entry.weight)} className="text-blue-400 hover:text-blue-300 text-sm" title="Modifica">✎</button>
                      <button onClick={() => handleDeleteWeight(entry.id)} className="text-red-500 hover:text-red-400" title="Elimina">🗑</button>
                    </div>
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
              <button onClick={() => setProfile({ ...profile, genere: 'M' })} className={`flex-1 py-2 rounded-lg font-semibold ${profile.genere === 'M' ? 'bg-electric text-black' : 'bg-gray-800 text-white'}`}>♂️ Maschio</button>
              <button onClick={() => setProfile({ ...profile, genere: 'F' })} className={`flex-1 py-2 rounded-lg font-semibold ${profile.genere === 'F' ? 'bg-electric text-black' : 'bg-gray-800 text-white'}`}>♀️ Femmina</button>
            </div>
            <BodyFigure gender={profile.genere} onSelectArea={handleSelectArea} selectedArea={selectedArea} />
            <p className="text-xs text-gray-400 text-center mt-3">👆 Clicca su un punto della sagoma o sui pulsanti sotto per inserire la misura</p>
          </div>

          {measurements.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Storico completo</h3>
              <div className="space-y-3">
                {measurements.slice(0, 15).map((m) => {
                  // ✅ FILTRA E MAPPA CORRETTAMENTE: Mostra solo le parti del corpo misurate quel giorno
                  const activeMeasurements = Object.entries(measurementLabels)
                    .filter(([dbKey]) => m[dbKey] !== null && m[dbKey] !== undefined && m[dbKey] !== '')
                    .map(([dbKey, label]) => ({ label, value: m[dbKey] }))

                  if (activeMeasurements.length === 0) return null

                  return (
                    <div key={m.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-700">
                        <p className="text-electric font-bold text-sm">📅 {new Date(m.date).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                        <button onClick={() => handleDeleteMeasurement(m.id)} className="text-red-400 hover:text-red-300 text-xs bg-red-500/10 px-2 py-1 rounded transition-colors">🗑 Elimina</button>
                      </div>
                      
                      {/* ✅ GRIGLIA A 2 COLONNE: Molto più leggibile su smartphone */}
                      <div className="grid grid-cols-2 gap-2">
                        {activeMeasurements.map(({ label, value }) => (
                          <div key={label} className="bg-gray-900 rounded px-3 py-2 flex justify-between items-center border border-gray-800">
                            <span className="text-gray-400 text-xs">{label}</span>
                            <span className="text-white font-semibold text-sm">{value} cm</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
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
              <p className="text-electric font-semibold break-all">{user?.email || 'Non disponibile'}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-400 mb-1">Stato</p>
              <p className="text-green-400 font-semibold">✓ Utente approvato</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-3">⚠️ Il logout ti riporterà alla schermata di accesso.</p>
              <button onClick={handleLogout} className="w-full bg-red-500 text-white font-bold py-3 rounded-lg hover:bg-red-600 active:scale-95 transition-all">🚪 Esci dall'account</button>
            </div>
          </div>
        </div>
      )}

      {showMeasurementInput && editingMeasurement && (
        <MeasurementInput
          areaName={measurementLabels[editingMeasurement.dbArea] || editingMeasurement.area}
          initialValue={editingMeasurement.value}
          initialDate={editingMeasurement.date}
          onSave={handleSaveMeasurement}
          onClose={() => { setShowMeasurementInput(false); setEditingMeasurement(null); setSelectedArea(null) }}
        />
      )}
    </div>
  )
}

export default Dati