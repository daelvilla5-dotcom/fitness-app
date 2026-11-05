import { supabase } from '../supabaseClient'

// ============================================
// ALIMENTI (foods)
// ============================================

// Carica tutti gli alimenti dell'utente
export async function loadFoods(userId) {
  try {
    const { data, error } = await supabase
      .from('foods')
      .select('*')
      .eq('user_id', userId)
      .order('name')

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Errore caricamento alimenti:', err)
    return []
  }
}

// Salva un nuovo alimento
export async function saveFood(userId, foodData) {
  try {
    const { data, error } = await supabase
      .from('foods')
      .insert({
        user_id: userId,
        name: foodData.name,
        calories: foodData.calories || 0,
        pro: foodData.pro || 0,
        carb: foodData.carb || 0,
        gra: foodData.gra || 0,
        fib: foodData.fib || 0,
        portion: foodData.portion || 100,
        portion_unit: foodData.portion_unit || 'g'
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Errore salvataggio alimento:', err)
    throw err
  }
}

// Aggiorna un alimento esistente
export async function updateFood(foodId, foodData) {
  try {
    const { data, error } = await supabase
      .from('foods')
      .update({
        name: foodData.name,
        calories: foodData.calories,
        pro: foodData.pro,
        carb: foodData.carb,
        gra: foodData.gra,
        fib: foodData.fib,
        portion: foodData.portion,
        portion_unit: foodData.portion_unit
      })
      .eq('id', foodId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Errore aggiornamento alimento:', err)
    throw err
  }
}

// Elimina un alimento
export async function deleteFood(foodId) {
  try {
    const { error } = await supabase
      .from('foods')
      .delete()
      .eq('id', foodId)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Errore eliminazione alimento:', err)
    throw err
  }
}

// ============================================
// PESATE (weight_logs)
// ============================================

export async function loadWeightLogs(userId) {
  try {
    const { data, error } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Errore caricamento pesate:', err)
    return []
  }
}

export async function saveWeightLog(userId, weight, date) {
  try {
    const { data, error } = await supabase
      .from('weight_logs')
      .insert({
        user_id: userId,
        weight: weight,
        date: date
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Errore salvataggio pesata:', err)
    throw err
  }
}

export async function deleteWeightLog(logId) {
  try {
    const { error } = await supabase
      .from('weight_logs')
      .delete()
      .eq('id', logId)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Errore eliminazione pesata:', err)
    throw err
  }
}

// ============================================
// MISURE (measurements)
// ============================================

export async function loadMeasurements(userId) {
  try {
    const { data, error } = await supabase
      .from('measurements')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Errore caricamento misure:', err)
    return []
  }
}

export async function saveMeasurement(userId, measurementData) {
  try {
    const { data, error } = await supabase
      .from('measurements')
      .insert({
        user_id: userId,
        date: measurementData.date,
        braccio_destro: measurementData.braccio_destro || null,
        braccio_sinistro: measurementData.braccio_sinistro || null,
        torace: measurementData.torace || null,
        vita: measurementData.vita || null,
        glutei: measurementData.glutei || null,
        coscia_destra: measurementData.coscia_destra || null,
        coscia_sinistra: measurementData.coscia_sinistra || null,
        polpaccio_destro: measurementData.polpaccio_destro || null,
        polpaccio_sinistro: measurementData.polpaccio_sinistro || null
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Errore salvataggio misura:', err)
    throw err
  }
}

export async function deleteMeasurement(measurementId) {
  try {
    const { error } = await supabase
      .from('measurements')
      .delete()
      .eq('id', measurementId)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Errore eliminazione misura:', err)
    throw err
  }
}

// ============================================
// PROFILI UTENTE (user_profiles)
// ============================================

export async function loadUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Errore caricamento profilo:', err)
    return null
  }
}

export async function saveUserProfile(userId, profileData) {
  try {
    // Controlla se esiste già (usando email invece di user_id)
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', profileData.email)
      .single()

    if (existing) {
      // Aggiorna
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          genere: profileData.genere,
          data_nascita: profileData.data_nascita,
          altezza: profileData.altezza,
          eta: profileData.eta
        })
        .eq('email', profileData.email)  // ← Usa email invece di user_id
        .select()
        .single()

      if (error) throw error
      return data
    } else {
      // Crea nuovo
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          email: profileData.email,
          genere: profileData.genere,
          data_nascita: profileData.data_nascita,
          altezza: profileData.altezza,
          eta: profileData.eta
        })
        .select()
        .single()

      if (error) throw error
      return data
    }
  } catch (err) {
    console.error('Errore salvataggio profilo:', err)
    throw err
  }
}

// ============================================
// OBIETTIVI (targets)
// ============================================

export async function loadTargets(userId) {
  try {
    // Prima ottieni l'email dell'utente
    const { data: { user } } = await supabase.auth.getUser()
    const email = user?.email
    
    if (!email) {
      console.warn('Nessuna email trovata per loadTargets')
      return null
    }

    const { data, error } = await supabase
      .from('targets')
      .select('*')
      .eq('email', email)  // ← Usa email invece di user_id
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = nessuna riga
    return data || null
  } catch (err) {
    console.error('Errore caricamento obiettivi:', err)
    return null
  }
}

export async function saveTargets(userId, targetsData) {
  try {
    // Prima ottieni l'email dell'utente
    const { data: { user } } = await supabase.auth.getUser()
    const email = user?.email
    
    if (!email) {
      throw new Error('Nessuna email trovata per saveTargets')
    }

    // Controlla se esiste già
    const { data: existing } = await supabase
      .from('targets')
      .select('*')
      .eq('email', email)  // ← Usa email invece di user_id
      .single()

    if (existing) {
      // Aggiorna
      const { data, error } = await supabase
        .from('targets')
        .update({
          calories: targetsData.calories,
          pro: targetsData.pro,
          carb: targetsData.carb,
          gra: targetsData.gra,
          fib: targetsData.fib,
          attivita: targetsData.attivita,
          obiettivo: targetsData.obiettivo
        })
        .eq('email', email)  // ← Usa email invece di user_id
        .select()
        .single()

      if (error) throw error
      return data
    } else {
      // Crea nuovo
      const { data, error } = await supabase
        .from('targets')
        .insert({
          email: email,  // ← Aggiungi email
          calories: targetsData.calories || 2000,
          pro: targetsData.pro || 150,
          carb: targetsData.carb || 250,
          gra: targetsData.gra || 70,
          fib: targetsData.fib || 30,
          attivita: targetsData.attivita || 'moderata',
          obiettivo: targetsData.obiettivo || 'mantenimento'
        })
        .select()
        .single()

      if (error) throw error
      return data
    }
  } catch (err) {
    console.error('Errore salvataggio obiettivi:', err)
    throw err
  }
}

// ============================================
// SCHEDE ALLENAMENTO (routines)
// ============================================

export async function loadRoutines(userId) {
  try {
    const { data, error } = await supabase
      .from('routines')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Errore caricamento schede:', err)
    return []
  }
}

export async function saveRoutine(userId, routineData) {
  try {
    const { data, error } = await supabase
      .from('routines')
      .insert({
        user_id: userId,
        name: routineData.name,
        days: routineData.days || []
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Errore salvataggio scheda:', err)
    throw err
  }
}

export async function updateRoutine(routineId, routineData) {
  try {
    const { data, error } = await supabase
      .from('routines')
      .update({
        name: routineData.name,
        days: routineData.days
      })
      .eq('id', routineId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Errore aggiornamento scheda:', err)
    throw err
  }
}

export async function deleteRoutine(routineId) {
  try {
    const { error } = await supabase
      .from('routines')
      .delete()
      .eq('id', routineId)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Errore eliminazione scheda:', err)
    throw err
  }
}

// ============================================
// ALLENAMENTI SVOLTI (workout_logs)
// ============================================

export async function loadWorkoutLogs(userId) {
  try {
    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Errore caricamento workout logs:', err)
    return []
  }
}

export async function saveWorkoutLog(userId, logData) {
  try {
    const { data, error } = await supabase
      .from('workout_logs')
      .insert({
        user_id: userId,
        routine_name: logData.routine_name,
        day_name: logData.day_name,
        exercises: logData.exercises || [],
        date: logData.date
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Errore salvataggio workout log:', err)
    throw err
  }
}

export async function deleteWorkoutLog(logId) {
  try {
    const { error } = await supabase
      .from('workout_logs')
      .delete()
      .eq('id', logId)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Errore eliminazione workout log:', err)
    throw err
  }
}

// ============================================
// DIARIO ALIMENTARE GIORNALIERO (daily_logs)
// ============================================

// Carica il giorno attivo (o l'ultimo giorno registrato)
export async function loadActiveDailyLog(userId) {
  try {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = nessuna riga trovata
    return data || null
  } catch (err) {
    console.error('Errore caricamento diario attivo:', err)
    return null
  }
}

// Salva o aggiorna il giorno corrente (Upsert)
export async function saveDailyLog(userId, logData) {
  try {
    // Controlla se esiste già un log per questa data
    const { data: existing } = await supabase
      .from('daily_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('start_date', logData.start_date)
      .single()

    if (existing) {
      // Aggiorna
      const { data, error } = await supabase
        .from('daily_logs')
        .update({
          entries: logData.entries,
          is_active: logData.is_active,
          end_date: logData.end_date
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return data
    } else {
      // Inserisci nuovo
      const { data, error } = await supabase
        .from('daily_logs')
        .insert({
          user_id: userId,
          start_date: logData.start_date,
          end_date: logData.end_date,
          is_active: logData.is_active,
          entries: logData.entries
        })
        .select()
        .single()

      if (error) throw error
      return data
    }
  } catch (err) {
    console.error('Errore salvataggio diario:', err)
    throw err
  }
}

// Carica lo storico dei giorni passati
export async function loadDailyLogsHistory(userId) {
  try {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', false)
      .order('start_date', { ascending: false })
      .limit(30) // Ultimi 30 giorni

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Errore caricamento storico diario:', err)
    return []
  }
}