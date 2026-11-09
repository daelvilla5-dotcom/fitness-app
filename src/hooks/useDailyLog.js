import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

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
        console.log('🔄 [useDailyLog] Caricamento da Supabase...')
        
        // Usa .maybeSingle() invece di .single() per gestire 0 o 1 riga
        const { data, error } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        console.log('📋 [useDailyLog] Risposta:', { data, error })
        
        if (error) {
          console.error('❌ [useDailyLog] Errore:', error)
        }
        
        if (data && data.is_active) {
          console.log('✅ [useDailyLog] Diario attivo trovato:', data.entries?.length, 'entries')
          
          setDailyLogState(data.entries || [])
          localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(data.entries || []))
          
          const newActiveDay = { 
            id: data.id, 
            startDate: data.start_date, 
            endDate: data.end_date, 
            isActive: true 
          }
          setActiveDayState(newActiveDay)
          localStorage.setItem(ACTIVE_DAY_KEY, JSON.stringify(newActiveDay))
          
        } else {
          console.log('⚠️ [useDailyLog] Nessun diario attivo')
          const savedLog = localStorage.getItem(DAILY_LOG_KEY)
          const savedDay = localStorage.getItem(ACTIVE_DAY_KEY)
          if (savedLog) setDailyLogState(JSON.parse(savedLog))
          if (savedDay) setActiveDayState(JSON.parse(savedDay))
        }
      } catch (err) {
        console.error('❌ [useDailyLog] Errore eccezione:', err)
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

  // Salvataggio con chiusura del vecchio giorno
  useEffect(() => {
    if (!user || !activeDay || !activeDay.isActive || !isLoaded) return

    const saveTimer = setTimeout(async () => {
      try {
        console.log('💾 [useDailyLog] Salvataggio...', dailyLog.length, 'entries')
        
        // Prima cerca se esiste già un giorno con la stessa start_date
        const { data: existing } = await supabase
          .from('daily_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('start_date', activeDay.startDate)
          .maybeSingle()

        let result
        if (existing) {
          console.log('🔄 [useDailyLog] Aggiorno:', existing.id)
          const { data, error } = await supabase
            .from('daily_logs')
            .update({
              end_date: activeDay.endDate || null,
              is_active: true,
              entries: dailyLog
            })
            .eq('id', existing.id)
            .select()
            .maybeSingle()
          
          if (error) throw error
          result = data
        } else {
          console.log('➕ [useDailyLog] Creo nuovo')
          const { data, error } = await supabase
            .from('daily_logs')
            .insert({
              user_id: user.id,
              start_date: activeDay.startDate,
              end_date: activeDay.endDate || null,
              is_active: true,
              entries: dailyLog
            })
            .select()
            .maybeSingle()
          
          if (error) throw error
          result = data
        }
        
        console.log('✅ [useDailyLog] Salvato:', result)
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