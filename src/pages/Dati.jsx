import { useState, useEffect } from 'react'
import {
  getUserProfile,
  saveUserProfile,
  calculateAge,
  getWeightLog,
  addWeightEntry,
  deleteWeightEntry,
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

function Dati() {
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
  const [editingMeasurement, setEditingMeasurement] = useState(null) // { area, date, value }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    const savedProfile = getUserProfile()
    if (savedProfile) setProfile(savedProfile)
    setWeightLog(getWeightLog())
    setMeasurements(getMeasurements())
  }

  const handleSaveProfile = () => {
    if (!profile.dataNascita || !profile.altezza) {
      alert('Compila tutti i campi!')
      return
    }
    const profileWithAge = {
      ...profile,
      eta: calculateAge(profile.dataNascita),
    }
    saveUserProfile(profileWithAge)
    setProfile(profileWithAge)
    alert('Profilo salvato!')
  }

  const handleAddWeight = () => {
    if (!newWeight) {
      alert('Inserisci il peso!')
      return
    }
    setWeightLog(addWeightEntry(newWeight))
    setNewWeight('')
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

  const handleSaveMeasurement = (data) => {
    const newMeasurement = {
      [editingMeasurement.area]: data.value,
      date: data.date,
    }
    setMeasurements(saveMeasurements(newMeasurement))
    setShowMeasurementInput(false)
    setEditingMeasurement(null)
  }

  const averageWeight = getAverageWeight()

  const tabs = [
    { id: 'anagrafica', label: 'Anagrafica', icon: '' },
    { id: 'peso', label: 'Peso', icon: '⚖️' },
    { id: 'misure', label: 'Misure', icon: '📏' },
    { id: 'backup', label: 'Backup', icon: '💾' },
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
      <h2 className="text-2xl font-bold text-electric mb-6 mt-2">📏 Dati Personali</h2>

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
                onClick={handleAddWeight}
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
                      onClick={() => {
                        if (confirm('Eliminare questa pesata?')) {
                          setWeightLog(deleteWeightEntry(entry.id))
                        }
                      }}
                      className="text-red-500 hover:text-red-400"
                    >
                      🗑
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
          {/* Toggle Genere */}
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
              👆 Clicca su un punto della sagoma o su un pulsante per inserire/modificare la misura
            </p>
          </div>

          {/* Storico grafico per ogni area misurata */}
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

          {/* Lista misurazioni complete */}
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
                        onClick={() => {
                          if (confirm('Eliminare questa misurazione?')) {
                            setMeasurements(deleteMeasurements(m.id))
                          }
                        }}
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