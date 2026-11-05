// Coda di operazioni da sincronizzare quando torna la connessione
const QUEUE_KEY = 'fitness_app_offline_queue'
const SYNC_STATUS_KEY = 'fitness_app_last_sync'

// Ottieni tutte le operazioni in coda
export function getPendingOperations() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

// Aggiungi un'operazione alla coda
export function addToQueue(operation) {
  const queue = getPendingOperations()
  queue.push({
    ...operation,
    timestamp: Date.now(),
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  })
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  console.log('📝 Operazione aggiunta alla coda offline:', operation.type)
  return queue
}

// Rimuovi un'operazione dalla coda (dopo sincronizzazione riuscita)
export function removeFromQueue(operationId) {
  const queue = getPendingOperations().filter(op => op.id !== operationId)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  return queue
}

// Svuota completamente la coda
export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY)
}

// Ottieni il timestamp dell'ultima sincronizzazione
export function getLastSyncTime() {
  return localStorage.getItem(SYNC_STATUS_KEY)
}

// Aggiorna il timestamp dell'ultima sincronizzazione
export function updateLastSyncTime() {
  localStorage.setItem(SYNC_STATUS_KEY, new Date().toISOString())
}

// Controlla se siamo online
export function isOnline() {
  return navigator.onLine
}

// Ascolta i cambiamenti di stato della connessione
export function onConnectionChange(callback) {
  window.addEventListener('online', () => callback(true))
  window.addEventListener('offline', () => callback(false))
}