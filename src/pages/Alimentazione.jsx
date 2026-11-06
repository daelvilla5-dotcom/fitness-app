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
  const [editingGrams, setEditingGrams] = useState(null)

  // 🚀 INIZIALIZZAZIONE ISTANTANEA DA LOCALSTORAGE (Niente più glitch a zero!)
  const [foods, setFoods] = useState(() => {
    const saved = localStorage.getItem('fitness_app_foods')
    return saved ? JSON.parse(saved) : getFoods()
  })
  
  const [dailyLog, setDailyLog] = useState(() => {
    const saved = localStorage.getItem('fitness_app_daily_log')
    return saved ? JSON.parse(saved) : getTodayLog()
  })

  const [targets, setTargets] = useState(() => {
    const saved = localStorage.getItem('fitness_app_targets')
    return saved ? JSON.parse(saved) : getTargets()
  })

  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('fitness_app_user_profile')
    return saved ? JSON.parse(saved) : getUserProfile()
  })

  const [averageWeight, setAverageWeight] = useState(() => getAverageWeight() || 0)
  const [activeDay, setActiveDay] = useState(() => getActiveDay())
  
  const [attivita, setAttivita] = useState('moderata')
  const [obiettivo, setObiettivo] = useState('mantenimento')
  const [multipliers, setMultipliers] = useState({ pro: 1.6, gra: 0.9, fib: 30 })

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

  const [dailyTotals, setDailyTotals] = useState(() => calculateTotals(dailyLog))

  // Aggiorna i totali quando il log cambia
  useEffect(() => {
    setDailyTotals(calculateTotals(dailyLog))
    localStorage.setItem('fitness_app_daily_log', JSON.stringify(dailyLog))
  }, [dailyLog])

  // Caricamento silenzioso da Supabase (SOVRASCRIVE sempre i dati locali quando online)
useEffect(() => {
  if (!user) return

  const syncFromSupabase = async () => {
    try {
      console.log('🔄 [Alimentazione] Inizio sincronizzazione da Supabase...')
      
      const dbProfile = await loadUserProfileDB(user.id)
      if (dbProfile) {
        const p = { genere: dbProfile.genere || 'M', eta: dbProfile.eta, altezza: dbProfile.altezza, dataNascita: dbProfile.data_nascita }
        setProfile(p)
        localStorage.setItem('fitness_app_user_profile', JSON.stringify(p))
      }

      const avgWeight = getAverageWeight()
      if (avgWeight) setAverageWeight(avgWeight)

      // CARICA SEMPRE IL DIARIO DA SUPABASE (anche se vuoto)
      const dbLog = await loadActiveDailyLogDB(user.id)
      console.log('📋 [Alimentazione] Diario da Supabase:', dbLog)
      
      if (dbLog && dbLog.is_active) {
        console.log('✅ [Alimentazione] Diario attivo trovato, entries:', dbLog.entries?.length || 0)
        setActiveDay({ id: dbLog.id, startDate: dbLog.start_date, endDate: dbLog.end_date, isActive: true })
        setDailyLog(dbLog.entries || [])
        localStorage.setItem('fitness_app_daily_log', JSON.stringify(dbLog.entries || []))
      } else {
        console.warn('⚠️ [Alimentazione] Nessun diario attivo su Supabase')
      }

      const dbTargets = await loadTargetsDB(user.id)
      if (dbTargets && dbTargets.calories > 0) {
        setTargets(dbTargets)
        localStorage.setItem('fitness_app_targets', JSON.stringify(dbTargets))
      }

      const supabaseFoods = await loadFoodsDB(user.id)
      if (supabaseFoods.length > 0) {
        setFoods(supabaseFoods)
        localStorage.setItem('fitness_app_foods', JSON.stringify(supabaseFoods))
      }
    } catch (err) {
      console.error('❌ Errore sincronizzazione:', err)
    }
  }

  syncFromSupabase()
}, [user])

  // Salvataggio automatico in background
  useEffect(() => {
    if (user && activeDay && activeDay.isActive && dailyLog.length > 0) {
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
    if (!user) return
    if (activeDay && activeDay.isActive) {
      if (!confirm('Concludere il giorno attuale e iniziarne uno nuovo?')) return
      try {
        await saveDailyLogDB(user.id, { start_date: activeDay.startDate, end_date: new Date().toISOString(), is_active: false, entries: dailyLog })
      } catch (err) { console.error('Errore chiusura giorno:', err) }
      endCurrentDay()
    }

    const newDayData = { start_date: new Date().toISOString().split('T')[0], end_date: null, is_active: true, entries: [] }
    try {
      const saved = await saveDailyLogDB(user.id, newDayData)
      setActiveDay({ id: saved.id, startDate: saved.start_date, endDate: saved.end_date, isActive: true })
      setDailyLog([])
    } catch (err) {
      console.error("ERRORE salvataggio nuovo giorno:", err)
      startNewDay()
      setActiveDay(getActiveDay())
      setDailyLog(getTodayLog())
    }
  }

  const calcolaFabbisogno = async () => {
    if (!profile || !profile.eta || !profile.altezza) { alert('Completa prima la sezione Dati → Anagrafica!'); return }
    if (!averageWeight || averageWeight === 0) { alert('Inserisci almeno una pesata nella sezione Dati → Peso!'); return }

    const { eta, altezza, genere } = profile
    const peso = averageWeight
    let bmr = genere === 'M' ? (10 * peso + 6.25 * altezza - 5 * eta + 5) : (10 * peso + 6.25 * altezza - 5 * eta - 161)
    const fattori = { sedentaria: 1.2, leggera: 1.375, moderata: 1.55, intensa: 1.725, moltoIntensa: 1.9 }
    let tdee = bmr * (fattori[attivita] || 1.55)

    if (obiettivo === 'massa') tdee += 300
    else if (obiettivo === 'definizione') tdee -= 500
    else if (obiettivo === 'ricomposizione') tdee -= 200

    const calorieTotali = Math.round(tdee)
    const proteine = Math.ceil(multipliers.pro * peso)
    const grassi = Math.ceil(multipliers.gra * peso)
    const fibre = multipliers.fib
    const carboidrati = Math.max(0, Math.round((calorieTotali - (proteine * 4) - (grassi * 9) - (fibre * 2)) / 4))

    const newTargets = { calories: calorieTotali, pro: proteine, gra: grassi, carb: carboidrati, fib: fibre }

    // Aggiorna ISTANTANEAMENTE (Niente glitch)
    setTargets(newTargets)
    localStorage.setItem('fitness_app_targets', JSON.stringify(newTargets))
    
    try {
      await saveTargetsDB(user.id, newTargets)
    } catch (err) {
      console.error('Errore salvataggio target:', err)
      saveTargets(newTargets)
    }
    
    updatePreset(obiettivo, multipliers)
    alert(`Obiettivi salvati! Calorie: ${calorieTotali} kcal`)
  }

  const applyPreset = (presetName) => {
    const presets = getPresets()
    setMultipliers(presets[presetName])
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
      const updated = [...foods, savedFood]
      setFoods(updated)
      localStorage.setItem('fitness_app_foods', JSON.stringify(updated))
      setShowAddFoodModal(false)
    } catch (err) { alert('Errore nel salvataggio dell\'alimento') }
  }

  const handleDeleteFood = async (foodId) => {
    if (!confirm('Eliminare questo alimento?')) return
    try {
      await deleteFoodDB(foodId)
      const updated = foods.filter(f => f.id !== foodId)
      setFoods(updated)
      localStorage.setItem('fitness_app_foods', JSON.stringify(updated))
    } catch (err) { console.error('Errore eliminazione:', err) }
  }

  const handleAddToDailyLog = (food, grams) => {
  if (!activeDay || !activeDay.isActive) { 
    alert('Inizia un nuovo giorno prima di aggiungere alimenti!')
    return 
  }
  
  const newEntry = {
    id: Date.now(),
    name: food.name,
    calories: food.calories || 0,
    pro: food.pro || 0,
    carb: food.carb || 0,
    gra: food.gra || 0,
    fib: food.fib || 0,
    grams: grams
  }
  
  const newLog = [...dailyLog, newEntry]
  setDailyLog(newLog)
  localStorage.setItem('fitness_app_daily_log', JSON.stringify(newLog))
}

  const handleRemoveFromDailyLog = (entryId) => {
  console.log('🗑 Rimozione entry:', entryId)
  console.log('📋 Log prima:', dailyLog)
  
  const newLog = dailyLog.filter(entry => entry.id !== entryId)
  
  console.log('📋 Log dopo:', newLog)
  console.log('🔢 Entries rimaste:', newLog.length)
  
  setDailyLog(newLog)
  localStorage.setItem('fitness_app_daily_log', JSON.stringify(newLog))
}

  const handleUpdateGrams = (entryId, newGrams) => {
  if (newGrams <= 0) {
    alert('Inserisci una quantità valida!')
    return
  }
  
  console.log('✏️ Aggiornamento grammi:', entryId, '→', newGrams)
  
  const newLog = dailyLog.map(entry => 
    entry.id === entryId ? { ...entry, grams: newGrams } : entry
  )
  
  setDailyLog(newLog)
  localStorage.setItem('fitness_app_daily_log', JSON.stringify(newLog))
  setEditingGrams(null)
}

  const formatDate = (dateStr) => new Date(dateStr).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const round1 = (val) => Math.round(val * 10) / 10

  return (
    <div className="p-4 pb-24">
      <h2 className="text-2xl font-bold text-electric mb-6 mt-2">🍎 Alimentazione</h2>
      <div className="flex gap-2 mb-4">
        {['pasti', 'calcolo'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 rounded-lg font-semibold text-sm capitalize ${activeTab === tab ? 'bg-electric text-black' : 'bg-card text-white border border-border'}`}>
            {tab === 'pasti' ? '🍽️ Pasti' : '📊 Calcola'}
          </button>
        ))}
      </div>

      {activeTab === 'pasti' && (
        <>
          <div className="bg-card border border-border rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Giorno Attivo</h3>
                {activeDay && activeDay.isActive ? <p className="text-sm text-electric">Iniziato: {formatDate(activeDay.startDate)}</p> : <p className="text-sm text-gray-400">Nessun giorno attivo</p>}
              </div>
              <button onClick={handleStartNewDay} className="bg-electric text-black font-bold px-4 py-2 rounded-lg text-sm active:scale-95 transition-transform">
                {activeDay && activeDay.isActive ? '🔄 Nuovo Giorno' : '▶️ Inizia Giorno'}
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-white mb-3 text-center">Oggi</h3>
            <p className="text-3xl font-bold text-white text-center mb-1">🔥 {Math.round(dailyTotals.calories)} <span className="text-lg text-gray-400">/ {targets.calories} kcal</span></p>
            <p className="text-sm text-gray-400 text-center mb-4">{targets.calories - dailyTotals.calories > 0 ? `${Math.round(targets.calories - dailyTotals.calories)} kcal rimanenti` : `${Math.round(dailyTotals.calories - targets.calories)} kcal in eccesso`}</p>
            
            <div className="space-y-3">
              {[
                { name: 'Pro', current: dailyTotals.pro, target: targets.pro, color: '#00BFFF' },
                { name: 'Carbo', current: dailyTotals.carb, target: targets.carb, color: '#4ECDC4' },
                { name: 'Grassi', current: dailyTotals.gra, target: targets.gra, color: '#FF6B6B' },
                { name: 'Fibre', current: dailyTotals.fib, target: targets.fib, color: '#95E1D3' },
              ].map((macro) => (
                <div key={macro.name}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-white">{macro.name}</span>
                    <span className="text-sm text-gray-400">{round1(macro.current)}g / {macro.target}g</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all duration-300" style={{ width: `${Math.min((macro.current / macro.target) * 100, 100)}%`, backgroundColor: macro.color }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-white mb-3">Oggi ({dailyLog.length} alimenti)</h3>
            {dailyLog.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">Nessun alimento aggiunto oggi</p> : (
              <div className="space-y-2">
                {dailyLog.map((entry) => (
                  <div key={entry.id} className="bg-gray-800 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="text-white font-semibold text-lg">{entry.name}</p>
                        <p className="text-sm text-gray-400">🔥 {Math.round(entry.calories)} kcal • Pro: {round1(entry.pro)}g • Carbo: {round1(entry.carb)}g • Grassi: {round1(entry.gra)}g</p>
                      </div>
                      <button onClick={() => handleRemoveFromDailyLog(entry.id)} className="text-red-500 hover:text-red-400 text-sm ml-2">🗑</button>
                    </div>
                    {editingGrams?.entryId === entry.id ? (
                      <div className="flex gap-2 mt-2">
                        <input type="number" value={editingGrams.grams} onChange={(e) => setEditingGrams({ ...editingGrams, grams: Number(e.target.value) })} className="flex-1 bg-gray-900 border border-electric text-white rounded px-2 py-1 text-sm" autoFocus />
                        <button onClick={() => handleUpdateGrams(entry.id, editingGrams.grams)} className="bg-electric text-black font-bold px-3 py-1 rounded text-sm">✓</button>
                        <button onClick={() => setEditingGrams(null)} className="bg-gray-700 text-white px-3 py-1 rounded text-sm">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingGrams({ entryId: entry.id, grams: entry.grams })} className="text-xs text-electric hover:underline mt-1">✎ Modifica: {entry.grams}g</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => { setEditingFood(null); setShowAddFoodModal(true) }} className="w-full bg-electric text-black font-bold py-3 rounded-lg mb-4 active:scale-95 transition-transform">+ Alimento</button>

          <h3 className="text-lg font-semibold text-white mb-3">Alimenti Salvati ({foods.length})</h3>
          {foods.map((food) => (
            <FoodItem key={food.id} food={food} onEdit={(f) => { setEditingFood(f); setShowAddFoodModal(true) }} onDelete={handleDeleteFood} onAdd={handleAddToDailyLog} />
          ))}
        </>
      )}

      {activeTab === 'calcolo' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Profilo</h3>
            {profile && averageWeight ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Genere</span><span className="text-white font-semibold">{profile.genere === 'M' ? '♂️ Maschio' : '♀️ Femmina'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Età</span><span className="text-white font-semibold">{profile.eta} anni</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Altezza</span><span className="text-white font-semibold">{profile.altezza} cm</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Peso medio</span><span className="text-electric font-bold text-lg">{averageWeight} kg</span></div>
              </div>
            ) : <p className="text-red-400 text-sm">Completa la sezione Dati.</p>}
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Calcolo Fabbisogno</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {['mantenimento', 'massa', 'definizione', 'ricomposizione'].map((obj) => (
                  <button key={obj} onClick={() => applyPreset(obj)} className={`py-2 rounded-lg text-xs font-semibold capitalize ${obiettivo === obj ? 'bg-electric text-black' : 'bg-gray-800 text-white'}`}>{obj}</button>
                ))}
              </div>
              <select value={attivita} onChange={(e) => setAttivita(e.target.value)} className="w-full bg-gray-800 border border-border text-white rounded-lg px-3 py-2">
                <option value="sedentaria">Sedentario</option><option value="leggera">Leggera (1-3)</option><option value="moderata">Moderata (3-5)</option><option value="intensa">Intensa (5-6)</option>
              </select>
              <select value={obiettivo} onChange={(e) => { setObiettivo(e.target.value); applyPreset(e.target.value) }} className="w-full bg-gray-800 border border-border text-white rounded-lg px-3 py-2">
                <option value="mantenimento">Mantenimento</option><option value="massa">Massa (+300 kcal)</option><option value="definizione">Definizione (-500 kcal)</option><option value="ricomposizione">Ricomposizione (-200 kcal)</option>
              </select>
              
              <div className="space-y-3 pt-2 border-t border-border">
                <div>
                  <label className="text-xs text-gray-400">Proteine: {multipliers.pro} g/kg → {Math.ceil(multipliers.pro * (averageWeight || 0))}g</label>
                  <input type="number" step="0.1" value={multipliers.pro} onChange={(e) => handleMultiplierChange('pro', e.target.value)} className="w-full bg-gray-800 border border-border text-white rounded-lg px-3 py-2 mt-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Grassi: {multipliers.gra} g/kg → {Math.ceil(multipliers.gra * (averageWeight || 0))}g</label>
                  <input type="number" step="0.1" value={multipliers.gra} onChange={(e) => handleMultiplierChange('gra', e.target.value)} className="w-full bg-gray-800 border border-border text-white rounded-lg px-3 py-2 mt-1" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Fibre (g fissi)</label>
                  <input type="number" value={multipliers.fib} onChange={(e) => handleMultiplierChange('fib', e.target.value)} className="w-full bg-gray-800 border border-border text-white rounded-lg px-3 py-2 mt-1" />
                </div>
              </div>

              <button onClick={calcolaFabbisogno} className="w-full bg-electric text-black font-bold py-3 rounded-lg active:scale-95 transition-transform">Calcola e Salva Obiettivi</button>
            </div>
          </div>

          <div className="bg-electric/10 border border-electric rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-white mb-2">🔥 {targets.calories} <span className="text-lg text-gray-400">kcal</span></p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-800 rounded p-2"><p className="text-gray-400">Pro</p><p className="text-white font-bold">{targets.pro}g</p></div>
              <div className="bg-gray-800 rounded p-2"><p className="text-gray-400">Carbo</p><p className="text-white font-bold">{targets.carb}g</p></div>
              <div className="bg-gray-800 rounded p-2"><p className="text-gray-400">Grassi</p><p className="text-white font-bold">{targets.gra}g</p></div>
              <div className="bg-gray-800 rounded p-2"><p className="text-gray-400">Fibre</p><p className="text-white font-bold">{targets.fib}g</p></div>
            </div>
          </div>
        </div>
      )}

      {showAddFoodModal && <AddFoodModal onSave={handleSaveFood} onClose={() => { setShowAddFoodModal(false); setEditingFood(null) }} editFood={editingFood} />}
    </div>
  )
}

export default Alimentazione