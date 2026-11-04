const USER_PROFILE_KEY = 'fitness_app_user_profile'
const WEIGHT_LOG_KEY = 'fitness_app_weight_log'
const MEASUREMENTS_KEY = 'fitness_app_measurements'

// Profilo utente
export function getUserProfile() {
  const stored = localStorage.getItem(USER_PROFILE_KEY)
  return stored ? JSON.parse(stored) : null
}

export function saveUserProfile(profile) {
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile))
  return profile
}

// Calcola età dalla data di nascita
export function calculateAge(birthDate) {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  return age
}

// Peso corporeo
export function getWeightLog() {
  const stored = localStorage.getItem(WEIGHT_LOG_KEY)
  return stored ? JSON.parse(stored) : []
}

export function addWeightEntry(weight, date = new Date().toISOString().split('T')[0]) {
  const log = getWeightLog()
  log.push({ weight: Number(weight), date, id: Date.now() })
  log.sort((a, b) => new Date(b.date) - new Date(a.date)) // Ordina per data decrescente
  localStorage.setItem(WEIGHT_LOG_KEY, JSON.stringify(log))
  return log
}

export function deleteWeightEntry(id) {
  const log = getWeightLog().filter(entry => entry.id !== id)
  localStorage.setItem(WEIGHT_LOG_KEY, JSON.stringify(log))
  return log
}

// Media ultime 7 pesate
export function getAverageWeight() {
  const log = getWeightLog()
  const last7 = log.slice(0, 7)
  if (last7.length === 0) return null
  
  const sum = last7.reduce((acc, entry) => acc + entry.weight, 0)
  return Math.round((sum / last7.length) * 10) / 10 // Arrotonda a 1 decimale
}

// Misure corporee - struttura aggiornata
// Ogni misurazione ha: { id, date, braccioDestro, braccioSinistro, torace, vita, glutei, cosciaDestra, cosciaSinistra, polpaccioDestro, polpaccioSinistro }

export function getMeasurements() {
  const stored = localStorage.getItem(MEASUREMENTS_KEY)
  return stored ? JSON.parse(stored) : []
}

export function saveMeasurements(measurement) {
  const allMeasurements = getMeasurements()
  measurement.id = Date.now()
  allMeasurements.push(measurement)
  allMeasurements.sort((a, b) => new Date(b.date) - new Date(a.date))
  localStorage.setItem(MEASUREMENTS_KEY, JSON.stringify(allMeasurements))
  return allMeasurements
}

export function deleteMeasurements(id) {
  const measurements = getMeasurements().filter(m => m.id !== id)
  localStorage.setItem(MEASUREMENTS_KEY, JSON.stringify(measurements))
  return measurements
}

// Ottieni lo storico di una singola area
export function getAreaHistory(areaKey) {
  const allMeasurements = getMeasurements()
  return allMeasurements
    .filter(m => m[areaKey] !== undefined && m[areaKey] !== '')
    .map(m => ({ date: m.date, value: m[areaKey] }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
}

// Ottieni l'ultima misura di un'area
export function getLatestAreaValue(areaKey) {
  const history = getAreaHistory(areaKey)
  if (history.length === 0) return null
  return history[history.length - 1]
}

// --- TARGET GIORNALIERI ---
const TARGETS_KEY = 'fitness_app_targets'

export function getTargets() {
  const stored = localStorage.getItem(TARGETS_KEY)
  return stored ? JSON.parse(stored) : {
    calories: 2500,
    pro: 150,
    carb: 250,
    gra: 80,
    fib: 30,
  }
}

export function saveTargets(targets) {
  localStorage.setItem(TARGETS_KEY, JSON.stringify(targets))
  return targets
}

// --- PRESET ALIMENTAZIONE ---
const PRESETS_KEY = 'fitness_app_presets'

const defaultPresets = {
  mantenimento: { pro: 1.6, gra: 0.9, fib: 30 },
  massa: { pro: 2.0, gra: 1.0, fib: 30 },
  definizione: { pro: 2.2, gra: 0.8, fib: 35 },
  ricomposizione: { pro: 1.8, gra: 0.9, fib: 30 },
}

export function getPresets() {
  const stored = localStorage.getItem(PRESETS_KEY)
  if (!stored) {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(defaultPresets))
    return defaultPresets
  }
  return JSON.parse(stored)
}

export function savePresets(presets) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets))
  return presets
}

export function updatePreset(presetName, values) {
  const presets = getPresets()
  presets[presetName] = values
  savePresets(presets)
  return presets
}