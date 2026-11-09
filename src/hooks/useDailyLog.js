import { useState, useEffect, useCallback } from 'react'
import { 
  loadActiveDailyLog, 
  saveDailyLog 
} from '../utils/supabaseData'

const DAILY_LOG_KEY = 'fitness_app_daily_log'
const ACTIVE_DAY_KEY = 'fitness_app_active_day'

export function useDailyLog(user) {
  // Carica i dati da localStorage all'avvio
  const [dailyLog, setDailyLogState] = useState(() => {
    const saved = localStorage.getItem(DAILY_LOG_KEY)
    return saved ? JSON.parse(saved) : []
  })

  const [activeDay, setActiveDayState] = useState(() => {
    const saved = localStorage.getItem(ACTIVE_DAY_KEY)
    return saved ? JSON.parse(saved) : null
  })

  // Sincronizza con Supabase all'avvio e quando cambia user
  useEffect(() => {
    if (!user) return

    const syncFromSupabase = async () => {
      try {
        console.log('🔄 [useDailyLog] Sincronizzazione da Supabase...')
        const dbLog = await loadActiveDailyLog(user.id)
        
        if (dbLog && dbLog.is_active) {
          console.log('✅ [useDailyLog] Diario attivo trovato:', dbLog.entries?.length || 0, 'entries')
          
          // Aggiorna solo se Supabase ha dati più recenti o se localStorage è vuoto
          const localLog = JSON.parse(localStorage.getItem(DAILY_LOG_KEY) || '[]')
          const localDay = JSON.parse(localStorage.getItem(ACTIVE_DAY_KEY) || 'null')
          
          // Se localStorage è vuoto o il giorno è diverso, usa Supabase
          if (localLog.length === 0 || !localDay || localDay.id !== dbLog.id) {
            console.log('📥 [useDailyLog] Aggiorno localStorage da Supabase')
            setDailyLogState(dbLog.entries || [])
            localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(dbLog.entries || []))
            
            const newActiveDay = { 
              id: dbLog.id, 
              startDate: dbLog.start_date, 
              endDate: dbLog.end_date, 
              isActive: true 
            }
            setActiveDayState(newActiveDay)
            localStorage.setItem(ACTIVE_DAY_KEY, JSON.stringify(newActiveDay))
          } else {
            console.log('💾 [useDailyLog] Mantengo dati locali (più recenti)')
          }
        } else {
          console.log('⚠️ [useDailyLog] Nessun diario attivo su Supabase')
        }
      } catch (err) {
        console.error('❌ [useDailyLog] Errore sincronizzazione:', err)
      }
    }

    syncFromSupabase()
  }, [user])

  // Salva su Supabase quando il diario cambia (con debounce)
  useEffect(() => {
    if (!user || !activeDay || !activeDay.isActive) return

    const saveTimer = setTimeout(async () => {
      try {
        console.log('💾 [useDailyLog] Salvataggio su Supabase:', dailyLog.length, 'entries')
        await saveDailyLog(user.id, {
          start_date: activeDay.startDate,
          end_date: activeDay.endDate || null,
          is_active: true,
          entries: dailyLog
        })
        console.log('✅ [useDailyLog] Salvato su Supabase')
      } catch (err) {
        console.error('❌ [useDailyLog] Errore salvataggio:', err)
      }
    }, 1500)

    return () => clearTimeout(saveTimer)
  }, [user, activeDay, dailyLog])

  const setDailyLog = useCallback((newLog) => {
    setDailyLogState(newLog)
    localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(newLog))
  }, [])

  const setActiveDay = useCallback((newDay) => {
    setActiveDayState(newDay)
    localStorage.setItem(ACTIVE_DAY_KEY, JSON.stringify(newDay))
  }, [])

  return { dailyLog, setDailyLog, activeDay, setActiveDay }
}