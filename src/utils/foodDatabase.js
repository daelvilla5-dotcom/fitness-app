// Database locale per alimenti e tracciamento giornaliero

const FOODS_KEY = 'fitness_app_foods'
const DAILY_LOG_KEY = 'fitness_app_daily_log'
const ACTIVE_DAY_KEY = 'fitness_app_active_day'

// Helper per arrotondare a 1 decimale
const round1 = (val) => Math.round(val * 10) / 10

// Alimenti di esempio pre-caricati
const defaultFoods = [
  { id: 1, name: 'Petto di Pollo', calories: 165, pro: 31, carb: 0, gra: 3.6, fib: 0, portion: 100, portionUnit: 'g' },
  { id: 2, name: 'Riso Bianco', calories: 130, pro: 2.7, carb: 28, gra: 0.3, fib: 0.4, portion: 100, portionUnit: 'g' },
  { id: 3, name: 'Uova Intere', calories: 155, pro: 13, carb: 1.1, gra: 11, fib: 0, portion: 100, portionUnit: 'g' },
  { id: 4, name: 'Avena', calories: 389, pro: 16.9, carb: 66, gra: 6.9, fib: 10.6, portion: 100, portionUnit: 'g' },
  { id: 5, name: 'Banana', calories: 89, pro: 1.1, carb: 23, gra: 0.3, fib: 2.6, portion: 100, portionUnit: 'g' },
]

export function getFoods() {
  const stored = localStorage.getItem(FOODS_KEY)
  if (!stored) {
    localStorage.setItem(FOODS_KEY, JSON.stringify(defaultFoods))
    return defaultFoods
  }
  return JSON.parse(stored)
}

export function saveFood(food) {
  const foods = getFoods()
  food.id = Date.now()
  foods.push(food)
  localStorage.setItem(FOODS_KEY, JSON.stringify(foods))
  return foods
}

export function deleteFood(foodId) {
  const foods = getFoods().filter(f => f.id !== foodId)
  localStorage.setItem(FOODS_KEY, JSON.stringify(foods))
  return foods
}

export function updateFood(updatedFood) {
  const foods = getFoods().map(f => f.id === updatedFood.id ? updatedFood : f)
  localStorage.setItem(FOODS_KEY, JSON.stringify(foods))
  return foods
}

// --- GESTIONE GIORNO ATTIVO ---
export function getActiveDay() {
  const stored = localStorage.getItem(ACTIVE_DAY_KEY)
  return stored ? JSON.parse(stored) : null
}

export function startNewDay() {
  const activeDay = {
    startDate: new Date().toISOString(),
    endDate: null,
    isActive: true,
  }
  localStorage.setItem(ACTIVE_DAY_KEY, JSON.stringify(activeDay))
  
  const logKey = `${DAILY_LOG_KEY}_${activeDay.startDate}`
  localStorage.setItem(logKey, JSON.stringify([]))
  
  return activeDay
}

export function endCurrentDay() {
  const activeDay = getActiveDay()
  if (activeDay) {
    activeDay.endDate = new Date().toISOString()
    activeDay.isActive = false
    localStorage.setItem(ACTIVE_DAY_KEY, JSON.stringify(activeDay))
  }
  return activeDay
}

// --- TRACCIAMENTO GIORNALIERO ---
export function getCurrentLogKey() {
  const activeDay = getActiveDay()
  if (!activeDay) return null
  return `${DAILY_LOG_KEY}_${activeDay.startDate}`
}

export function getTodayLog() {
  const key = getCurrentLogKey()
  if (!key) return []
  const stored = localStorage.getItem(key)
  return stored ? JSON.parse(stored) : []
}

// Calcola i valori nutrizionali in base ai grammi effettivi
function calculateNutrition(food, grams) {
  const ratio = grams / food.portion
  
  return {
    calories: Math.round(food.calories * ratio),
    pro: round1(food.pro * ratio),
    carb: round1(food.carb * ratio),
    gra: round1(food.gra * ratio),
    fib: round1(food.fib * ratio),
  }
}

export function addToDailyLog(food, grams) {
  const key = getCurrentLogKey()
  if (!key) {
    alert('Inizia un nuovo giorno prima di aggiungere alimenti!')
    return []
  }
  
  const log = getTodayLog()
  const existingIndex = log.findIndex(entry => entry.foodId === food.id)
  
  if (existingIndex !== -1) {
    log[existingIndex].grams += grams
    const nutrition = calculateNutrition(food, log[existingIndex].grams)
    log[existingIndex] = {
      ...log[existingIndex],
      ...nutrition,
    }
  } else {
    const nutrition = calculateNutrition(food, grams)
    log.push({
      id: Date.now(),
      foodId: food.id,
      name: food.name,
      grams: grams,
      ...nutrition,
    })
  }
  
  localStorage.setItem(key, JSON.stringify(log))
  return log
}

export function updateFoodGrams(entryId, newGrams) {
  const key = getCurrentLogKey()
  if (!key) return []
  
  const log = getTodayLog()
  const entry = log.find(e => e.id === entryId)
  
  if (entry) {
    const food = getFoods().find(f => f.id === entry.foodId)
    entry.grams = newGrams
    const nutrition = calculateNutrition(food, newGrams)
    Object.assign(entry, nutrition)
  }
  
  localStorage.setItem(key, JSON.stringify(log))
  return log
}

export function removeFromDailyLog(entryId) {
  const key = getCurrentLogKey()
  if (!key) return []
  
  const log = getTodayLog().filter(e => e.id !== entryId)
  localStorage.setItem(key, JSON.stringify(log))
  return log
}

// FIX: arrotonda anche i totali finali
export function getDailyTotals() {
  const log = getTodayLog()
  const totals = log.reduce((acc, entry) => ({
    calories: acc.calories + entry.calories,
    pro: acc.pro + entry.pro,
    carb: acc.carb + entry.carb,
    gra: acc.gra + entry.gra,
    fib: acc.fib + entry.fib,
  }), { calories: 0, pro: 0, carb: 0, gra: 0, fib: 0 })
  
  // Arrotonda i totali a 1 decimale
  return {
    calories: Math.round(totals.calories),
    pro: round1(totals.pro),
    carb: round1(totals.carb),
    gra: round1(totals.gra),
    fib: round1(totals.fib),
  }
}

// --- STORICO GIORNALIERO ---
export function getDailyHistory() {
  const history = []
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('fitness_app_daily_log_')) {
      const startDate = key.replace('fitness_app_daily_log_', '')
      const log = JSON.parse(localStorage.getItem(key))
      const totals = log.reduce((acc, entry) => ({
        calories: acc.calories + entry.calories,
        pro: acc.pro + entry.pro,
        carb: acc.carb + entry.carb,
        gra: acc.gra + entry.gra,
        fib: acc.fib + entry.fib,
      }), { calories: 0, pro: 0, carb: 0, gra: 0, fib: 0 })
      
      history.push({
        date: startDate,
        calories: Math.round(totals.calories),
        pro: round1(totals.pro),
        carb: round1(totals.carb),
        gra: round1(totals.gra),
        fib: round1(totals.fib),
      })
    }
  }
  
  history.sort((a, b) => new Date(a.date) - new Date(b.date))
  
  return history
}