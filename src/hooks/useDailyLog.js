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
        console.log('🔄 [useDailyLog] Sincronizzazione da Supabase...')
        
        const { data, error } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        console.log('📋 [useDailyLog] Risposta Supabase:', { 
          hasData: !!data, 
          entriesCount: data?.entries?.length,
          error 
        })
        
        if (error) {
          console.error(' [useDailyLog] Errore Supabase:', error)
        }
        
        // ✅ SEMPRE Supabase come fonte di verità
        if (data && data.is_active) {
          console.log('✅ [useDailyLog] Diario attivo trovato:', data.entries?.length || 0, 'entries')
          
          const entries = data.entries || []
          setDailyLogState(entries)
          localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(entries))
          
          const newActiveDay = { 
            id: data.id, 
            startDate: data.start_date, 
            endDate: data.end_date, 
            isActive: true 
          }
          setActiveDayState(newActiveDay)
          localStorage.setItem(ACTIVE_DAY_KEY, JSON.stringify(newActiveDay))
        } else {
          console.log('⚠️ [useDailyLog] Nessun diario attivo su Supabase')
          // Solo se Supabase non ha nulla, usa localStorage
          const savedLog = localStorage.getItem(DAILY_LOG_KEY)
          const savedDay = localStorage.getItem(ACTIVE_DAY_KEY)
          if (savedLog) setDailyLogState(JSON.parse(savedLog))
          if (savedDay) setActiveDayState(JSON.parse(savedDay))
        }
      } catch (err) {
        console.error(' [useDailyLog] Errore eccezione:', err)
      } finally {
        setIsLoaded(true)
      }
    }

    syncFromSupabase()
  }, [user])

  // Salvataggio su Supabase
  const saveToSupabase = useCallback(async (logToSave, dayToSave) => {
    if (!user || !dayToSave || !dayToSave.isActive) return

    try {
      console.log(' [useDailyLog] Salvataggio su Supabase:', logToSave.length, 'entries')
      
      const { data: existing } = await supabase
        .from('daily_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('start_date', dayToSave.startDate)
        .maybeSingle()

      let result
      if (existing) {
        console.log('🔄 [useDailyLog] Aggiorno esistente:', existing.id)
        const { data, error } = await supabase
          .from('daily_logs')
          .update({
            end_date: dayToSave.endDate || null,
            is_active: true,
            entries: logToSave
          })
          .eq('id', existing.id)
          .select()
          .maybeSingle()
        
        if (error) throw error
        result = data
      } else {
        console.log('➕ [useDailyLog] Creo nuovo giorno')
        const { data, error } = await supabase
          .from('daily_logs')
          .insert({
            user_id: user.id,
            start_date: dayToSave.startDate,
            end_date: dayToSave.endDate || null,
            is_active: true,
            entries: logToSave
          })
          .select()
          .maybeSingle()
        
        if (error) throw error
        result = data
      }
      
      console.log('✅ [useDailyLog] Salvataggio completato')
    } catch (err) {
      console.error(' [useDailyLog] Errore salvataggio:', err)
    }
  }, [user])

  useEffect(() => {
    if (!user || !activeDay || !activeDay.isActive || !isLoaded) return

    const saveTimer = setTimeout(() => {
      saveToSupabase(dailyLog, activeDay)
    }, 1500)

    return () => clearTimeout(saveTimer)
  }, [user, activeDay, dailyLog, isLoaded, saveToSupabase])

  const setDailyLog = useCallback((newLog) => {
    console.log('📝 [useDailyLog] Update dailyLog:', newLog.length, 'entries')
    setDailyLogState(newLog)
    localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(newLog))
  }, [])

  const setActiveDay = useCallback((newDay) => {
    console.log(' [useDailyLog] Update activeDay')
    setActiveDayState(newDay)
    localStorage.setItem(ACTIVE_DAY_KEY, JSON.stringify(newDay))
  }, [])

  return { dailyLog, setDailyLog, activeDay, setActiveDay, isLoaded }
}