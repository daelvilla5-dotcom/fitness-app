const EXERCISES_KEY = 'fitness_app_exercises'
const ROUTINES_KEY = 'fitness_app_routines'
const LOGS_KEY = 'fitness_app_workout_logs'

// --- GESTIONE ESERCIZI BASE ---
export function getExercises() {
  const stored = localStorage.getItem(EXERCISES_KEY)
  if (!stored) {
    const defaultExercises = [
      { id: 1, name: 'Panca Piana', muscle: 'Petto' },
      { id: 2, name: 'Squat', muscle: 'Gambe' },
      { id: 3, name: 'Stacco da Terra', muscle: 'Schiena' },
      { id: 4, name: 'Military Press', muscle: 'Spalle' },
      { id: 5, name: 'Trazioni', muscle: 'Schiena' },
    ]
    localStorage.setItem(EXERCISES_KEY, JSON.stringify(defaultExercises))
    return defaultExercises
  }
  return JSON.parse(stored)
}

export function saveExercise(exercise) {
  const exercises = getExercises()
  exercise.id = Date.now()
  exercises.push(exercise)
  localStorage.setItem(EXERCISES_KEY, JSON.stringify(exercises))
  return exercises
}

export function deleteExercise(id) {
  const exercises = getExercises().filter(e => e.id !== id)
  localStorage.setItem(EXERCISES_KEY, JSON.stringify(exercises))
  return exercises
}

// --- GESTIONE SCHEDE (ROUTINES) ---
export function getRoutines() {
  const stored = localStorage.getItem(ROUTINES_KEY)
  return stored ? JSON.parse(stored) : []
}

export function saveRoutine(routine) {
  const routines = getRoutines()
  if (routine.id) {
    // Aggiorna
    const index = routines.findIndex(r => r.id === routine.id)
    if (index !== -1) routines[index] = routine
  } else {
    // Crea nuova
    routine.id = Date.now()
    routines.push(routine)
  }
  localStorage.setItem(ROUTINES_KEY, JSON.stringify(routines))
  return routines
}

export function deleteRoutine(id) {
  const routines = getRoutines().filter(r => r.id !== id)
  localStorage.setItem(ROUTINES_KEY, JSON.stringify(routines))
  return routines
}

// --- GESTIONE LOG ALLENAMENTI ---
export function getWorkoutLogs() {
  const stored = localStorage.getItem(LOGS_KEY)
  return stored ? JSON.parse(stored) : []
}

export function saveWorkoutLog(log) {
  const logs = getWorkoutLogs()
  log.id = Date.now()
  log.date = new Date().toISOString().split('T')[0]
  logs.push(log)
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs))
  return logs
}