import { useState, useEffect, useCallback } from 'react'
import { 
  loadActiveDailyLog, 
  saveDailyLog 
} from '../utils/supabaseData'

const DAILY_LOG_KEY = 'fitness_app_daily_log'
const ACTIVE_DAY_KEY = 'fitness_app_active_day'

export function useDailyLog(user) {
  const [dailyLog, setDailyLogState] = useState([])
  const [activeDay, setActiveDayState] = useState(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // ✅ FORZA SEMPRE il caricamento da Supabase all'avvio
  useEffect(() => {
    if (!user) {
      setIsLoaded(true)
      return
    }

    const syncFromSupabase = async () => {
      try {
        console.log('🔄 [useDailyLog] Sincronizzazione FORZATA da Supabase...')
        
        const dbLog = await loadActiveDailyLog(user.id)
        console.log('📋 [useDailyLog] Risposta da Supabase:', dbLog)
        
        if (dbLog && dbLog.is_active) {
          console.log('✅ [useDailyLog] Diario attivo trovato:', dbLog.entries?.length || 0, 'entries')
          
          // Aggiorna SEMPRE da Supabase (ignora localStorage)
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
          console.log('⚠️ [useDailyLog] Nessun diario attivo su Supabase')
          // Se non c'è nulla su Supabase, usa localStorage come fallback
          const saved = localStorage.getItem(DAILY_LOG_KEY)
          const savedDay = localStorage.getItem(ACTIVE_DAY_KEY)
          if (saved) setDailyLogState(JSON.parse(saved))
          if (savedDay) setActiveDayState(JSON.parse(savedDay))
        }
      } catch (err) {
        console.error('❌ [useDailyLog] Errore sincronizzazione:', err)
        // Fallback a localStorage in caso di errore
        const saved = localStorage.getItem(DAILY_LOG_KEY)
        const savedDay = localStorage.getItem(ACTIVE_DAY_KEY)
        if (saved) setDailyLogState(JSON.parse(saved))
        if (savedDay) setActiveDayState(JSON.parse(savedDay))
      } finally {
        setIsLoaded(true)
      }
    }

    syncFromSupabase()
  }, [user])

  // Salva su Supabase quando il diario cambia
  useEffect(() => {
    if (!user || !activeDay || !activeDay.isActive || !isLoaded) return

    const saveTimer = setTimeout(async () => {
      try {
        console.log(' [useDailyLog] Salvataggio su Supabase:', dailyLog.length, 'entries')
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
  }, [user, activeDay, dailyLog, isLoaded])

  const setDailyLog = useCallback((newLog) => {
    setDailyLogState(newLog)
    localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(newLog))
  }, [])

  const setActiveDay = useCallback((newDay) => {
    setActiveDayState(newDay)
    localStorage.setItem(ACTIVE_DAY_KEY, JSON.stringify(newDay))
  }, [])

  return { dailyLog, setDailyLog, activeDay, setActiveDay, isLoaded }
}