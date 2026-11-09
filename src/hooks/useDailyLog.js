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

  useEffect(() => {
    if (!user) {
      setIsLoaded(true)
      return
    }

    const syncFromSupabase = async () => {
      try {
        console.log('🔄 [useDailyLog] Tentativo di caricamento da Supabase...')
        
        const dbLog = await loadActiveDailyLog(user.id)
        console.log('📋 [useDailyLog] Risposta loadActiveDailyLog:', dbLog)
        
        if (dbLog && dbLog.is_active) {
          console.log('✅ [useDailyLog] Diario attivo trovato! Entries:', dbLog.entries?.length)
          
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
          console.log('⚠️ [useDailyLog] Nessun diario attivo trovato')
          // Carica da localStorage se esiste
          const savedLog = localStorage.getItem(DAILY_LOG_KEY)
          const savedDay = localStorage.getItem(ACTIVE_DAY_KEY)
          
          if (savedLog && savedDay) {
            console.log('💾 [useDailyLog] Carico da localStorage')
            setDailyLogState(JSON.parse(savedLog))
            setActiveDayState(JSON.parse(savedDay))
          }
        }
      } catch (err) {
        console.error(' [useDailyLog] Errore nel caricamento:', err)
        console.error(' [useDailyLog] Dettagli errore:', err.message)
        
        // Fallback a localStorage
        const savedLog = localStorage.getItem(DAILY_LOG_KEY)
        const savedDay = localStorage.getItem(ACTIVE_DAY_KEY)
        if (savedLog) setDailyLogState(JSON.parse(savedLog))
        if (savedDay) setActiveDayState(JSON.parse(savedDay))
      } finally {
        setIsLoaded(true)
      }
    }

    syncFromSupabase()
  }, [user])

  // Salvataggio con logging dettagliato
  useEffect(() => {
    if (!user || !activeDay || !activeDay.isActive || !isLoaded) {
      console.log('⏸️ [useDailyLog] Salvataggio in pausa:', { user: !!user, activeDay: !!activeDay, isActive: activeDay?.isActive, isLoaded })
      return
    }

    const saveTimer = setTimeout(async () => {
      try {
        console.log(' [useDailyLog] INIZIO salvataggio su Supabase...')
        console.log('📦 [useDailyLog] Dati da salvare:', {
          userId: user.id,
          startDate: activeDay.startDate,
          entriesCount: dailyLog.length
        })
        
        const result = await saveDailyLog(user.id, {
          start_date: activeDay.startDate,
          end_date: activeDay.endDate || null,
          is_active: true,
          entries: dailyLog
        })
        
        console.log('✅ [useDailyLog] Salvataggio completato con successo:', result)
      } catch (err) {
        console.error('❌ [useDailyLog] ERRORE nel salvataggio:', err)
        console.error('❌ [useDailyLog] Errore dettagliato:', err.message)
        console.error('❌ [useDailyLog] Stack:', err.stack)
      }
    }, 1500)

    return () => clearTimeout(saveTimer)
  }, [user, activeDay, dailyLog, isLoaded])

  const setDailyLog = useCallback((newLog) => {
    console.log('📝 [useDailyLog] Aggiornamento dailyLog locale, entries:', newLog.length)
    setDailyLogState(newLog)
    localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(newLog))
  }, [])

  const setActiveDay = useCallback((newDay) => {
    console.log(' [useDailyLog] Aggiornamento activeDay locale:', newDay)
    setActiveDayState(newDay)
    localStorage.setItem(ACTIVE_DAY_KEY, JSON.stringify(newDay))
  }, [])

  return { dailyLog, setDailyLog, activeDay, setActiveDay, isLoaded }
}