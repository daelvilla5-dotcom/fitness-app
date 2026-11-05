import { 
  saveFood,
  saveWeightLog,
  saveMeasurement,
  saveRoutine,
  saveWorkoutLog,
  saveUserProfile,
  deleteFood,
  deleteWeightLog,
  deleteMeasurement,
  deleteRoutine,
  deleteWorkoutLog
} from './supabaseData'
import {
  getPendingOperations,
  removeFromQueue,
  updateLastSyncTime,
  isOnline
} from './offlineQueue'

// Mappa le operazioni alle funzioni corrispondenti (nomi originali senza DB)
const operationHandlers = {
  // CREATE
  'CREATE_FOOD': (op, userId) => saveFood(userId, op.data),
  'CREATE_WEIGHT': (op, userId) => saveWeightLog(userId, op.data.weight, op.data.date),
  'CREATE_MEASUREMENT': (op, userId) => saveMeasurement(userId, op.data),
  'CREATE_ROUTINE': (op, userId) => saveRoutine(userId, op.data),
  'CREATE_WORKOUT': (op, userId) => saveWorkoutLog(userId, op.data),
  'CREATE_PROFILE': (op, userId) => saveUserProfile(userId, op.data),
  
  // DELETE
  'DELETE_FOOD': (op) => deleteFood(op.data.id),
  'DELETE_WEIGHT': (op) => deleteWeightLog(op.data.id),
  'DELETE_MEASUREMENT': (op) => deleteMeasurement(op.data.id),
  'DELETE_ROUTINE': (op) => deleteRoutine(op.data.id),
  'DELETE_WORKOUT': (op) => deleteWorkoutLog(op.data.id),
}

// Sincronizza tutte le operazioni in coda
export async function syncPendingOperations(user) {
  if (!isOnline() || !user) {
    console.log('⏸️ Sincronizzazione saltata: offline o utente non loggato')
    return { success: 0, failed: 0 }
  }

  const queue = getPendingOperations()
  if (queue.length === 0) {
    console.log('✅ Coda vuota, niente da sincronizzare')
    return { success: 0, failed: 0 }
  }

  console.log(`🔄 Inizio sincronizzazione di ${queue.length} operazioni...`)
  let successCount = 0
  let failedCount = 0

  for (const operation of queue) {
    try {
      const handler = operationHandlers[operation.type]
      if (handler) {
        await handler(operation, user.id)
        removeFromQueue(operation.id)
        successCount++
      } else {
        console.warn(`⚠️ Handler non trovato per: ${operation.type}`)
        removeFromQueue(operation.id)
      }
    } catch (err) {
      console.error(`❌ Errore sincronizzazione ${operation.type}:`, err)
      failedCount++
      // Non rimuoviamo dalla coda, riproveremo la prossima volta
    }
  }

  if (failedCount === 0) {
    updateLastSyncTime()
  }

  console.log(`✅ Sincronizzazione completata: ${successCount} succeed, ${failedCount} failed`)
  return { success: successCount, failed: failedCount }
}