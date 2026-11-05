import {
  saveFood as saveFoodDB,
  saveWeightLog as saveWeightLogDB,
  saveMeasurement as saveMeasurementDB,
  saveRoutine as saveRoutineDB,
  saveWorkoutLog as saveWorkoutLogDB,
  saveUserProfile as saveUserProfileDB,
  saveTargets as saveTargetsDB
} from './supabaseData'

export async function migrateLocalStorageToSupabase(user) {
  // Chiave unica per sapere se questo utente ha già fatto la migrazione
  const migrationKey = `fitness_app_migrated_${user.id}`
  
  if (localStorage.getItem(migrationKey)) {
    console.log('✅ Migrazione già completata per questo utente. Skip.')
    return
  }

  console.log('🚀 Avvio migrazione dati locali su Supabase...')
  let migratedCount = 0

  try {
    // 1. Alimenti
    const localFoods = JSON.parse(localStorage.getItem('fitness_app_foods') || '[]')
    for (const food of localFoods) {
      await saveFoodDB(user.id, food)
      migratedCount++
    }

    // 2. Pesate
    const localWeights = JSON.parse(localStorage.getItem('fitness_app_weight_log') || '[]')
    for (const w of localWeights) {
      await saveWeightLogDB(user.id, w.weight, w.date)
      migratedCount++
    }

    // 3. Misure
    const localMeasurements = JSON.parse(localStorage.getItem('fitness_app_measurements') || '[]')
    for (const m of localMeasurements) {
      await saveMeasurementDB(user.id, m)
      migratedCount++
    }

    // 4. Schede Allenamento
    const localRoutines = JSON.parse(localStorage.getItem('fitness_app_routines') || '[]')
    for (const r of localRoutines) {
      await saveRoutineDB(user.id, { name: r.name, days: r.days })
      migratedCount++
    }

    // 5. Allenamenti Svolti (mappatura vecchi nomi -> nuovi nomi DB)
    const localWorkouts = JSON.parse(localStorage.getItem('fitness_app_workout_logs') || '[]')
    for (const w of localWorkouts) {
      await saveWorkoutLogDB(user.id, {
        routine_name: w.routineName || w.routine_name,
        day_name: w.dayName || w.day_name,
        exercises: w.exercises || [],
        date: w.date || new Date().toISOString().split('T')[0]
      })
      migratedCount++
    }

    // 6. Profilo Utente
    const localProfile = JSON.parse(localStorage.getItem('fitness_app_user_profile') || 'null')
    if (localProfile) {
      await saveUserProfileDB(user.id, { ...localProfile, email: user.email })
      migratedCount++
    }

    // 7. Obiettivi Nutrizionali
    const localTargets = JSON.parse(localStorage.getItem('fitness_app_targets') || 'null')
    if (localTargets) {
      await saveTargetsDB(user.id, localTargets)
      migratedCount++
    }

    // ✅ Segna la migrazione come completata per questo utente
    localStorage.setItem(migrationKey, 'true')
    
    console.log(`✅ Migrazione completata con successo! ${migratedCount} elementi trasferiti nel cloud.`)
    
    if (migratedCount > 0) {
      // Piccolo avviso non invasivo per l'utente
      setTimeout(() => {
        alert(`Benvenuto! 🎉\nAbbiamo trasferito in sicurezza ${migratedCount} dei tuoi dati storici nel cloud.\nOra sono sincronizzati su tutti i tuoi dispositivi!`)
      }, 1000)
    }

  } catch (err) {
    console.error('❌ Errore durante la migrazione:', err)
  }
}