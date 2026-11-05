import { 
  saveFoodDB,
  saveWeightLogDB,
  saveMeasurementDB,
  saveRoutineDB,
  saveWorkoutLogDB,
  saveUserProfileDB,
  deleteFoodDB,
  deleteWeightLogDB,
  deleteMeasurementDB,
  deleteRoutineDB,
  deleteWorkoutLogDB
} from './supabaseData'
import {
  getPendingOperations,
  removeFromQueue,
  updateLastSyncTime,
  isOnline
} from './offlineQueue'

// Mappa le operazioni alle funzioni corrispondenti
const operationHandlers = {
  // CREATE
  'CREATE_FOOD': (op, userId) => saveFoodDB(userId, op.data),
  'CREATE_WEIGHT': (op, userId) => saveWeightLogDB(userId, op.data.weight, op.data.date),
  'CREATE_MEASUREMENT': (op, userId) => saveMeasurementDB(userId, op.data),
  'CREATE_ROUTINE': (op, userId) => saveRoutineDB(userId, op.data),
  'CREATE_WORKOUT': (op, userId) => saveWorkoutLogDB(userId, op.data),
  'CREATE_PROFILE': (op, userId) => saveUserProfileDB(userId, op.data),
  
  // DELETE
  'DELETE_FOOD': (op) => deleteFoodDB(op.data.id),
  'DELETE_WEIGHT': (op) => deleteWeightLogDB(op.data.id),
  'DELETE_MEASUREMENT': (op) => deleteMeasurementDB(op.data.id),
  'DELETE_ROUTINE': (op) => deleteRoutineDB(op.data.id),
  'DELETE_WORKOUT': (op) => deleteWorkoutLogDB(op.data.id),
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