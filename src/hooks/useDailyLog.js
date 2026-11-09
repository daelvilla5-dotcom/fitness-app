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
        console.log('🔄 [useDailyLog] Caricamento diretto da Supabase...')
        console.log('👤 [useDailyLog] User ID:', user.id)
        
        // Query DIRETTA a Supabase (bypassa supabaseData.js)
        const { data, error } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single()

        console.log('📋 [useDailyLog] Risposta Supabase:', { data, error })
        
        if (error) {
          console.error(' [useDailyLog] Errore Supabase:', error)
          if (error.code === 'PGRST116') {
            console.log('ℹ️ [useDailyLog] Nessun record trovato (normale)')
          }
        }
        
        if (data && data.is_active) {
          console.log('✅ [useDailyLog] Diario attivo trovato! Entries:', data.entries?.length)
          
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
          // Fallback a localStorage
          const savedLog = localStorage.getItem(DAILY_LOG_KEY)
          const savedDay = localStorage.getItem(ACTIVE_DAY_KEY)
          if (savedLog) setDailyLogState(JSON.parse(savedLog))
          if (savedDay) setActiveDayState(JSON.parse(savedDay))
        }
      } catch (err) {
        console.error(' [useDailyLog] Errore eccezione:', err)
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

  // Salvataggio diretto su Supabase
  useEffect(() => {
    if (!user || !activeDay || !activeDay.isActive || !isLoaded) return

    const saveTimer = setTimeout(async () => {
      try {
        console.log(' [useDailyLog] Salvataggio su Supabase...', dailyLog.length, 'entries')
        
        // Prima cerca se esiste già
        const { data: existing } = await supabase
          .from('daily_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('start_date', activeDay.startDate)
          .single()

        let result
        if (existing) {
          // Aggiorna
          console.log('🔄 [useDailyLog] Aggiorno record esistente:', existing.id)
          const { data, error } = await supabase
            .from('daily_logs')
            .update({
              end_date: activeDay.endDate || null,
              is_active: true,
              entries: dailyLog
            })
            .eq('id', existing.id)
            .select()
            .single()
          
          if (error) throw error
          result = data
        } else {
          // Crea nuovo
          console.log('➕ [useDailyLog] Creo nuovo record')
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
            .single()
          
          if (error) throw error
          result = data
        }
        
        console.log('✅ [useDailyLog] Salvataggio completato:', result)
      } catch (err) {
        console.error(' [useDailyLog] Errore salvataggio:', err)
      }
    }, 1500)

    return () => clearTimeout(saveTimer)
  }, [user, activeDay, dailyLog, isLoaded])

  const setDailyLog = useCallback((newLog) => {
    console.log(' [useDailyLog] Update locale:', newLog.length, 'entries')
    setDailyLogState(newLog)
    localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(newLog))
  }, [])

  const setActiveDay = useCallback((newDay) => {
    console.log(' [useDailyLog] Update activeDay:', newDay)
    setActiveDayState(newDay)
    localStorage.setItem(ACTIVE_DAY_KEY, JSON.stringify(newDay))
  }, [])

  return { dailyLog, setDailyLog, activeDay, setActiveDay, isLoaded }
}