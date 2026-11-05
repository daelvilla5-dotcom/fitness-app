// Raccoglie tutte le chiavi localStorage dell'app
const APP_KEYS = [
  'fitness_app_foods',
  'fitness_app_active_day',
  'fitness_app_targets',
  'fitness_app_user_profile',
  'fitness_app_weight_log',
  'fitness_app_measurements',
  'fitness_app_exercises',
  'fitness_app_routines',
  'fitness_app_workout_logs',
  'fitness_app_presets',
]

// Raccoglie anche tutti i log giornalieri (hanno date diverse)
function getAllDailyLogs() {
  const logs = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('fitness_app_daily_log_')) {
      logs[key] = localStorage.getItem(key)
    }
  }
  return logs
}

// Esporta tutti i dati in un oggetto
export function exportAllData() {
  const data = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    app: 'Fitness App',
  }

  // Chiavi standard
  APP_KEYS.forEach(key => {
    const value = localStorage.getItem(key)
    if (value) {
      data[key] = JSON.parse(value)
    }
  })

  // Log giornalieri
  data.dailyLogs = getAllDailyLogs()

  return data
}

// Importa dati da un oggetto
export function importAllData(data) {
  if (!data || !data.version) {
    throw new Error('File di backup non valido')
  }

  // Chiedi conferma all'utente
  const confirm = window.confirm(
    'Questa operazione sovrascriverà tutti i dati attuali con quelli del backup. Continuare?'
  )
  
  if (!confirm) {
    throw new Error('Import annullato dall\'utente')
  }

  // Ripristina chiavi standard
  APP_KEYS.forEach(key => {
    if (data[key] !== undefined) {
      localStorage.setItem(key, JSON.stringify(data[key]))
    }
  })

  // Ripristina log giornalieri
  if (data.dailyLogs) {
    Object.entries(data.dailyLogs).forEach(([key, value]) => {
      localStorage.setItem(key, value)
    })
  }

  return true
}

// Scarica i dati come file JSON
export function downloadBackup() {
  const data = exportAllData()
  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `fitness-app-backup-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Carica dati da file JSON
export function loadBackupFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        importAllData(data)
        resolve(true)
      } catch (err) {
        reject(new Error('File non valido o corrotto'))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Errore nella lettura del file'))
    }
    
    reader.readAsText(file)
  })
}

// Calcola la dimensione totale dei dati
export function getDataSize() {
  let totalSize = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('fitness_app_')) {
      const value = localStorage.getItem(key)
      if (value) {
        totalSize += key.length + value.length
      }
    }
  }
  return (totalSize / 1024).toFixed(2) // KB
}

// Conta gli elementi per tipo
export function getDataStats() {
  const foods = JSON.parse(localStorage.getItem('fitness_app_foods') || '[]')
  const weightLog = JSON.parse(localStorage.getItem('fitness_app_weight_log') || '[]')
  const measurements = JSON.parse(localStorage.getItem('fitness_app_measurements') || '[]')
  const routines = JSON.parse(localStorage.getItem('fitness_app_routines') || '[]')
  const exercises = JSON.parse(localStorage.getItem('fitness_app_exercises') || '[]')
  
  return {
    foods: foods.length,
    weightEntries: weightLog.length,
    measurements: measurements.length,
    routines: routines.length,
    exercises: exercises.length,
  }
}