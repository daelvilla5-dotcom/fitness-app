import { useState, useEffect } from 'react'
import FoodItem from '../components/FoodItem'
import AddFoodModal from '../components/AddFoodModal'
import { 
  loadFoods as loadFoodsDB, 
  saveFood as saveFoodDB, 
  deleteFood as deleteFoodDB,
  loadActiveDailyLog as loadActiveDailyLogDB,
  saveDailyLog as saveDailyLogDB,
  loadTargets as loadTargetsDB,
  saveTargets as saveTargetsDB,
  loadUserProfile as loadUserProfileDB
} from '../utils/supabaseData'
import {
  getFoods,
  getTodayLog,
  addToDailyLog,
  removeFromDailyLog,
  updateFoodGrams,
  getActiveDay,
  startNewDay,
  endCurrentDay,
} from '../utils/foodDatabase'
import {
  getUserProfile,
  getAverageWeight,
  getTargets,
  saveTargets,
  getPresets,
  updatePreset,
} from '../utils/userData'

function Alimentazione({ user }) {
  const [activeTab, setActiveTab] = useState('pasti')
  const [showAddFoodModal, setShowAddFoodModal] = useState(false)
  const [editingFood, setEditingFood] = useState(null)
  const [foods, setFoods] = useState([])
  const [dailyLog, setDailyLog] = useState([])
  const [dailyTotals, setDailyTotals] = useState({ calories: 0, pro: 0, carb: 0, gra: 0, fib: 0 })
  const [activeDay, setActiveDay] = useState(null)
  
  const [profile, setProfile] = useState(null)
  const [averageWeight, setAverageWeight] = useState(null)

  const [attivita, setAttivita] = useState('moderata')
  const [obiettivo, setObiettivo] = useState('mantenimento')
  
  const [multipliers, setMultipliers] = useState({
    pro: 1.6,
    gra: 0.9,
    fib: 30,
  })

  const [targets, setTargets] = useState(getTargets())
  const [editingGrams, setEditingGrams] = useState(null)

  // Funzione helper per calcolare i totali direttamente dall'array dailyLog (per evitare dipendenze dal localStorage)
  const calculateTotals = (log) => {
    return log.reduce((acc, entry) => {
      const multiplier = entry.grams / 100
      return {
        calories: acc.calories + (entry.calories * multiplier),
        pro: acc.pro + (entry.pro * multiplier),
        carb: acc.carb + (entry.carb * multiplier),
        gra: acc.gra + (entry.gra * multiplier),
        fib: acc.fib + (entry.fib * multiplier),
      }
    }, { calories: 0, pro: 0, carb: 0, gra: 0, fib: 0 })
  }

  // Sostituisci l'intero useEffect di inizializzazione con questo:
useEffect(() => {
  if (!user) return

  const initApp = async () => {
    try {
      // 1. Carica Profilo da Supabase
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
        setProfile(getUserProfile())
      }

      // 2. Carica Peso Medio
      setAverageWeight(getAverageWeight())

      // 3. Carica Giorno Attivo da Supabase SOLO se siamo nella tab pasti
      if (activeTab === 'pasti') {
        const dbLog = await loadActiveDailyLogDB(user.id)
        if (dbLog && dbLog.is_active) {
          const syncedDay = {
            id: dbLog.id,
            startDate: dbLog.start_date,
            endDate: dbLog.end_date,
            isActive: true,
            entries: dbLog.entries || []
          }
          setActiveDay(syncedDay)
          setDailyLog(syncedDay.entries)
          setDailyTotals(calculateTotals(syncedDay.entries))
        } else {
          const localDay = getActiveDay()
          if (localDay && localDay.isActive) {
            setActiveDay(localDay)
            const localLog = getTodayLog()
            setDailyLog(localLog)
            setDailyTotals(calculateTotals(localLog))
          }
        }
      }

      // 4. Carica Obiettivi da Supabase
      const dbTargets = await loadTargetsDB(user.id)
      if (dbTargets) {
        setTargets(dbTargets)
        localStorage.setItem('fitness_app_targets', JSON.stringify(dbTargets))
      } else {
        setTargets(getTargets())
      }

      // 5. Carica Alimenti da Supabase
      const supabaseFoods = await loadFoodsDB(user.id)
      if (supabaseFoods.length > 0) {
        setFoods(supabaseFoods)
      } else {
        setFoods(getFoods())
      }

    } catch (err) {
      console.error('Errore caricamento iniziale da Supabase:', err)
      setProfile(getUserProfile())
      setAverageWeight(getAverageWeight())
      setActiveDay(getActiveDay())
      setDailyLog(getTodayLog())
      setDailyTotals(calculateTotals(getTodayLog()))
      setTargets(getTargets())
      setFoods(getFoods())
    }
  }

  initApp()
}, [user, activeTab]) // ← AGGIUNTO activeTab nelle dipendenze

  // Salva automaticamente il diario su Supabase quando cambia (Debounce)
  useEffect(() => {
    if (user && activeDay && activeDay.isActive) {
      const saveTimer = setTimeout(async () => {
        try {
          await saveDailyLogDB(user.id, {
            start_date: activeDay.startDate,
            end_date: activeDay.endDate || null,
            is_active: true,
            entries: dailyLog
          })
        } catch (err) {
          console.error('Errore salvataggio automatico diario:', err)
        }
      }, 1000)
      return () => clearTimeout(saveTimer)
    }
  }, [user, activeDay, dailyLog])

    const handleStartNewDay = async () => {
    if (!user) {
      alert("⚠️ ERRORE: Nessun utente loggato!")
      return
    }

    if (activeDay && activeDay.isActive) {
      if (!confirm('Concludere il giorno attuale e iniziarne uno nuovo?')) return
      
      try {
        await saveDailyLogDB(user.id, {
          start_date: activeDay.startDate,
          end_date: new Date().toISOString(),
          is_active: false,
          entries: dailyLog
        })
        console.log("✅ Vecchio giorno chiuso su Supabase")
      } catch (err) {
        alert(`❌ ERRORE nel chiudere il giorno su Supabase:\n${err.message}`)
        console.error(err)
        return // Blocca l'esecuzione se fallisce
      }
      
      endCurrentDay() // Fallback locale
    }

    const newDayData = {
      start_date: new Date().toISOString().split('T')[0],
      end_date: null,
      is_active: true,
      entries: []
    }

    try {
      const saved = await saveDailyLogDB(user.id, newDayData)
      alert(`✅ SUCCESSO! Nuovo giorno creato su Supabase.\nID: ${saved.id}`)
      
      const newActiveDay = {
        id: saved.id,
        startDate: saved.start_date,
        endDate: saved.end_date,
        isActive: true,
        entries: []
      }
      setActiveDay(newActiveDay)
      setDailyLog([])
      setDailyTotals({ calories: 0, pro: 0, carb: 0, gra: 0, fib: 0 })
    } catch (err) {
      alert(`❌ ERRORE CRITICO nel salvare su Supabase:\n${err.message}`)
      console.error("ERRORE DETTAGLIATO:", err)
    }
  }

  const calcolaFabbisogno = async () => {
    if (!profile) {
      alert('Completa prima la sezione Dati → Anagrafica!')
      return
    }
    if (!averageWeight) {
      alert('Inserisci almeno una pesata nella sezione Dati → Peso!')
      return
    }

    const { eta, altezza, genere } = profile
    const peso = averageWeight

    let bmr
    if (genere === 'M') {
      bmr = 10 * peso + 6.25 * altezza - 5 * eta + 5
    } else {
      bmr = 10 * peso + 6.25 * altezza - 5 * eta - 161
    }

    const fattori = {
      sedentaria: 1.2,
      leggera: 1.375,
      moderata: 1.55,
      intensa: 1.725,
      moltoIntensa: 1.9,
    }

    let tdee = bmr * (fattori[attivita] || 1.55)

    if (obiettivo === 'massa') tdee += 300
    else if (obiettivo === 'definizione') tdee -= 500
    else if (obiettivo === 'ricomposizione') tdee -= 200

    const calorieTotali = Math.round(tdee)
    const proteine = Math.ceil(multipliers.pro * peso)
    const grassi = Math.ceil(multipliers.gra * peso)
    const fibre = multipliers.fib

    const caloriePro = proteine * 4
    const calorieGra = grassi * 9
    const calorieFib = fibre * 2
    const calorieRimanenti = calorieTotali - caloriePro - calorieGra - calorieFib
    const carboidrati = Math.max(0, Math.round(calorieRimanenti / 4))

    const newTargets = {
      calories: calorieTotali,
      pro: proteine,
      gra: grassi,
      carb: carboidrati,
      fib: fibre,
    }

    setTargets(newTargets)
    
    // Salva SU SUPABASE e in locale
    try {
      await saveTargetsDB(user.id, newTargets)
    } catch (err) {
      console.error('Errore salvataggio obiettivi:', err)
    }
    saveTargets(newTargets) // Fallback locale
    
    updatePreset(obiettivo, multipliers)
    alert(`Obiettivi salvati e sincronizzati! Preset "${obiettivo}" aggiornato.`)
  }

  const applyPreset = (presetName) => {
    const presets = getPresets()
    const preset = presets[presetName]
    setMultipliers(preset)
    setObiettivo(presetName)
  }

  const handleMultiplierChange = (field, value) => {
    const newMultipliers = { ...multipliers, [field]: Number(value) }
    setMultipliers(newMultipliers)
    updatePreset(obiettivo, newMultipliers)
  }

  const handleSaveFood = async (foodData) => {
    try {
      const savedFood = await saveFoodDB(user.id, foodData)
      const updatedFoods = [...foods, savedFood]
      setFoods(updatedFoods)
      localStorage.setItem('fitness_app_foods', JSON.stringify(updatedFoods))
      setShowAddFoodModal(false)
    } catch (err) {
      console.error('Errore salvataggio su Supabase:', err)
      alert('Errore nel salvataggio dell\'alimento')
    }
  }

  const handleDeleteFood = async (foodId) => {
    if (!confirm('Eliminare questo alimento?')) return
    try {
      await deleteFoodDB(foodId)
      const updatedFoods = foods.filter(f => f.id !== foodId)
      setFoods(updatedFoods)
      localStorage.setItem('fitness_app_foods', JSON.stringify(updatedFoods))
    } catch (err) {
      console.error('Errore eliminazione da Supabase:', err)
    }
  }

  const handleEditFood = (food) => {
    setEditingFood(food)
    setShowAddFoodModal(true)
  }

  const handleAddToDailyLog = (food, grams) => {
    if (!activeDay || !activeDay.isActive) {
      alert('Inizia un nuovo giorno prima di aggiungere alimenti!')
      return
    }
    const newLog = addToDailyLog(food, grams)
    setDailyLog(newLog)
    setDailyTotals(calculateTotals(newLog))
  }

  const handleRemoveFromDailyLog = (entryId) => {
    const newLog = removeFromDailyLog(entryId)
    setDailyLog(newLog)
    setDailyTotals(calculateTotals(newLog))
  }

  const handleUpdateGrams = (entryId, newGrams) => {
    if (newGrams <= 0) {
      alert('Inserisci una quantità valida!')
      return
    }
    const newLog = updateFoodGrams(entryId, newGrams)
    setDailyLog(newLog)
    setDailyTotals(calculateTotals(newLog))
    setEditingGrams(null)
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const round1 = (val) => Math.round(val * 10) / 10

  const tabs = [
    { id: 'pasti', label: 'Pasti', icon: '🍽️' },
    { id: 'calcolo', label: 'Calcola', icon: '📊' },
  ]

  return (
    <div className="p-4 pb-24">
      <h2 className="text-2xl font-bold text-electric mb-6 mt-2">🍎 Alimentazione</h2>

      <div className="flex gap-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm ${
              activeTab === tab.id ? 'bg-electric text-black' : 'bg-card text-white border border-border'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'pasti' && (
        <>
          <div className="bg-card border border-border rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-white mb-2">Giorno Attivo</h3>
            <div className="flex justify-between items-center">
              <div>
                {activeDay && activeDay.isActive ? (
                  <p className="text-sm text-electric font-semibold">
                    Iniziato: {formatDate(activeDay.startDate)}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">Nessun giorno attivo</p>
                )}
              </div>
              <button
                onClick={handleStartNewDay}
                className="bg-electric text-black font-bold px-4 py-2 rounded-lg text-sm active:scale-95 transition-transform"
              >
                {activeDay && activeDay.isActive ? '🔄 Nuovo Giorno' : '▶️ Inizia Giorno'}
              </button>
            </div>
          </div>

          {(!profile || !averageWeight) && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-4">
              <p className="text-red-400 text-sm font-semibold mb-1">⚠️ Dati mancanti</p>
              <p className="text-gray-400 text-sm">
                {!profile && 'Completa la sezione Dati → Anagrafica. '}
                {!averageWeight && 'Inserisci almeno una pesata in Dati → Peso.'}
              </p>
            </div>
          )}

          <div className="bg-card border border-border rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-white mb-3">Oggi</h3>
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-white">
                🔥 {Math.round(dailyTotals.calories)} <span className="text-lg text-gray-400">/ {targets.calories} kcal</span>
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {targets.calories - dailyTotals.calories > 0 
                  ? `${Math.round(targets.calories - dailyTotals.calories)} kcal rimanenti`
                  : `${Math.round(dailyTotals.calories - targets.calories)} kcal in eccesso`}
              </p>
            </div>

            <div className="space-y-3">
              {[
                { name: 'Pro', current: dailyTotals.pro, target: targets.pro, color: '#00BFFF' },
                { name: 'Carbo', current: dailyTotals.carb, target: targets.carb, color: '#4ECDC4' },
                { name: 'Grassi', current: dailyTotals.gra, target: targets.gra, color: '#FF6B6B' },
                { name: 'Fibre', current: dailyTotals.fib, target: targets.fib, color: '#95E1D3' },
              ].map((macro) => {
                const percentage = Math.min((macro.current / macro.target) * 100, 100)
                return (
                  <div key={macro.name}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-white">{macro.name}</span>
                      <span className="text-sm text-gray-400">
                        {round1(macro.current)}g / {macro.target}g
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%`, backgroundColor: macro.color }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-white mb-3">Oggi ({dailyLog.length} alimenti)</h3>
            {dailyLog.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Nessun alimento aggiunto oggi</p>
            ) : (
              <div className="space-y-2">
                {dailyLog.map((entry) => (
                  <div key={entry.id} className="bg-gray-800 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="text-white font-semibold text-lg">{entry.name}</p>
                        <p className="text-sm text-gray-400">
                          🔥 {Math.round(entry.calories)} kcal • Pro: {round1(entry.pro)}g • Carbo: {round1(entry.carb)}g • Grassi: {round1(entry.gra)}g • Fibre: {round1(entry.fib)}g
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveFromDailyLog(entry.id)}
                        className="text-red-500 hover:text-red-400 text-sm ml-2"
                        title="Rimuovi"
                      >
                        🗑
                      </button>
                    </div>
                    
                    {editingGrams?.entryId === entry.id ? (
                      <div className="flex gap-2 mt-2">
                        <input
                          type="number"
                          value={editingGrams.grams}
                          onChange={(e) => setEditingGrams({ ...editingGrams, grams: Number(e.target.value) })}
                          className="flex-1 bg-gray-900 border border-electric text-white rounded px-2 py-1 text-sm focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateGrams(entry.id, editingGrams.grams)}
                          className="bg-electric text-black font-bold px-3 py-1 rounded text-sm"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingGrams(null)}
                          className="bg-gray-700 text-white px-3 py-1 rounded text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingGrams({ entryId: entry.id, grams: entry.grams })}
                        className="text-xs text-electric hover:underline mt-1"
                      >
                        ✎ Modifica: {entry.grams}g
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setEditingFood(null)
              setShowAddFoodModal(true)
            }}
            className="w-full bg-electric text-black font-bold py-3 rounded-lg mb-4 active:scale-95 transition-transform"
          >
            + Alimento
          </button>

          <h3 className="text-lg font-semibold text-white mb-3">Alimenti Salvati ({foods.length})</h3>
          {foods.map((food) => (
            <FoodItem
              key={food.id}
              food={food}
              onEdit={handleEditFood}
              onDelete={handleDeleteFood}
              onAdd={handleAddToDailyLog}
            />
          ))}
        </>
      )}

      {activeTab === 'calcolo' && (
        <>
          <div className="bg-card border border-border rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-white mb-3">Profilo</h3>
            {profile && averageWeight ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Genere</span>
                  <span className="text-white font-semibold">{profile.genere === 'M' ? '♂️ Maschio' : '♀️ Femmina'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Età</span>
                  <span className="text-white font-semibold">{profile.eta} anni</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Altezza</span>
                  <span className="text-white font-semibold">{profile.altezza} cm</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Peso medio (7d)</span>
                  <span className="text-electric font-bold text-lg">{averageWeight} kg</span>
                </div>
              </div>
            ) : (
              <div className="bg-red-500/10 border border-red-500 rounded-lg p-3">
                <p className="text-red-400 text-sm">
                  {!profile && 'Completa la sezione Dati → Anagrafica. '}
                  {!averageWeight && 'Inserisci almeno una pesata in Dati → Peso.'}
                </p>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-white mb-4">Calcolo Fabbisogno</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Preset rapido</label>
                <div className="grid grid-cols-4 gap-2">
                  {['mantenimento', 'massa', 'definizione', 'ricomposizione'].map((obj) => (
                    <button
                      key={obj}
                      onClick={() => applyPreset(obj)}
                      className={`py-2 rounded-lg text-xs font-semibold capitalize ${
                        obiettivo === obj ? 'bg-electric text-black' : 'bg-gray-800 text-white'
                      }`}
                    >
                      {obj}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Livello attività</label>
                <select
                  value={attivita}
                  onChange={(e) => setAttivita(e.target.value)}
                  className="w-full bg-gray-800 border border-border text-white rounded-lg px-3 py-2 focus:outline-none focus:border-electric"
                >
                  <option value="sedentaria">Sedentario</option>
                  <option value="leggera">Leggera (1-3)</option>
                  <option value="moderata">Moderata (3-5)</option>
                  <option value="intensa">Intensa (5-6)</option>
                  <option value="moltoIntensa">Molto intensa</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Obiettivo</label>
                <select
                  value={obiettivo}
                  onChange={(e) => {
                    setObiettivo(e.target.value)
                    applyPreset(e.target.value)
                  }}
                  className="w-full bg-gray-800 border border-border text-white rounded-lg px-3 py-2 focus:outline-none focus:border-electric"
                >
                  <option value="mantenimento">Mantenimento</option>
                  <option value="massa">Massa (+300 kcal)</option>
                  <option value="definizione">Definizione (-500 kcal)</option>
                  <option value="ricomposizione">Ricomposizione (-200 kcal)</option>
                </select>
              </div>

              <div className="border-t border-border pt-4">
                <label className="text-sm text-electric mb-3 block font-semibold">
                  Configurazione macro (per kg di peso)
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                      Proteine: {multipliers.pro} g/kg → {Math.ceil(multipliers.pro * (averageWeight || 0))}g
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={multipliers.pro}
                      onChange={(e) => handleMultiplierChange('pro', e.target.value)}
                      className="w-full bg-gray-800 border border-border text-white rounded-lg px-3 py-2 focus:outline-none focus:border-electric"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                      Grassi: {multipliers.gra} g/kg → {Math.ceil(multipliers.gra * (averageWeight || 0))}g
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={multipliers.gra}
                      onChange={(e) => handleMultiplierChange('gra', e.target.value)}
                      className="w-full bg-gray-800 border border-border text-white rounded-lg px-3 py-2 focus:outline-none focus:border-electric"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Fibre (grammi fissi)</label>
                    <input
                      type="number"
                      value={multipliers.fib}
                      onChange={(e) => handleMultiplierChange('fib', e.target.value)}
                      className="w-full bg-gray-800 border border-border text-white rounded-lg px-3 py-2 focus:outline-none focus:border-electric"
                    />
                  </div>
                  <div className="bg-electric/10 border border-electric rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Carboidrati (calcolati automaticamente)</p>
                    <p className="text-sm text-white">= (Calorie totali - Pro×4 - Gra×9 - Fib×2) ÷ 4</p>
                  </div>
                </div>
              </div>

              <button
                onClick={calcolaFabbisogno}
                className="w-full bg-electric text-black font-bold py-3 rounded-lg active:scale-95 transition-transform"
              >
                Calcola e Salva Obiettivi
              </button>
            </div>
          </div>

          <div className="bg-electric/10 border border-electric rounded-lg p-4">
            <h3 className="text-lg font-semibold text-electric mb-3">Obiettivi Attuali</h3>
            <div className="text-center mb-3">
              <p className="text-3xl font-bold text-white">🔥 {targets.calories} <span className="text-lg text-gray-400">kcal</span></p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400">Pro</p>
                <p className="text-xl font-bold text-white">{targets.pro}g</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400">Carbo</p>
                <p className="text-xl font-bold text-white">{targets.carb}g</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400">Grassi</p>
                <p className="text-xl font-bold text-white">{targets.gra}g</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400">Fibre</p>
                <p className="text-xl font-bold text-white">{targets.fib}g</p>
              </div>
            </div>
          </div>
        </>
      )}

      {showAddFoodModal && (
        <AddFoodModal
          onSave={handleSaveFood}
          onClose={() => {
            setShowAddFoodModal(false)
            setEditingFood(null)
          }}
          editFood={editingFood}
        />
      )}
    </div>
  )
}

export default Alimentazione