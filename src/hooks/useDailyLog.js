import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const DAILY_LOG_KEY = 'fitness_app_daily_log'
const ACTIVE_DAY_KEY = 'fitness_app_active_day'

export function useDailyLog(user) {
  const [dailyLog, setDailyLogState] = useState([])
  const [activeDay, setActiveDayState] = useState(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!user) {
      setIsLoaded(true)
      return
    }

    const syncFromSupabase = async () => {
      try {
        console.log('🔄 [useDailyLog] Sincronizzazione da Supabase...')
        
        // Prendi il giorno attivo più recente da Supabase
        const { data: supabaseData, error } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        console.log('📋 [useDailyLog] Supabase:', { 
          hasData: !!supabaseData, 
          startDate: supabaseData?.start_date,
          entriesCount: supabaseData?.entries?.length,
          error 
        })

        // Prendi il giorno attivo da localStorage
        const localLog = localStorage.getItem(DAILY_LOG_KEY)
        const localDay = localStorage.getItem(ACTIVE_DAY_KEY)
        const localData = localDay ? JSON.parse(localDay) : null
        const localEntries = localLog ? JSON.parse(localLog) : []

        console.log(' [useDailyLog] LocalStorage:', { 
          hasData: !!localData, 
          startDate: localData?.startDate,
          entriesCount: localEntries.length
        })

        // ✅ LOGICA INTELLIGENTE: Chi è più recente?
        let useSupabase = true
        
        if (supabaseData && localData) {
          const supabaseDate = new Date(supabaseData.start_date || supabaseData.created_at)
          const localDate = new Date(localData.startDate || localData.created_at)
          
          console.log('⏰ [useDailyLog] Confronto date:', {
            supabase: supabaseDate.toISOString(),
            local: localDate.toISOString(),
            diff: (supabaseDate - localDate) / 1000, 'seconds'
          })
          
          // Se localStorage è più recente (entro ultime 2 ore), usa quello
          const timeDiff = localDate - supabaseDate
          if (timeDiff > 0 && timeDiff < 2 * 60 * 60 * 1000) { // 2 ore
            console.log('✅ [useDailyLog] LocalStorage più recente, uso locale')
            useSupabase = false
          } else {
            console.log('✅ [useDailyLog] Supabase più recente o uguale, uso Supabase')
            useSupabase = true
          }
        } else if (localData && !supabaseData) {
          console.log('✅ [useDailyLog] Solo localStorage disponibile, uso locale')
          useSupabase = false
        } else if (supabaseData && !localData) {
          console.log('✅ [useDailyLog] Solo Supabase disponibile, uso Supabase')
          useSupabase = true
        }

        // Applica la scelta
        if (useSupabase && supabaseData) {
          const entries = supabaseData.entries || []
          setDailyLogState(entries)
          localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(entries))
          
          const newActiveDay = { 
            id: supabaseData.id, 
            startDate: supabaseData.start_date, 
            endDate: supabaseData.end_date, 
            isActive: true 
          }
          setActiveDayState(newActiveDay)
          localStorage.setItem(ACTIVE_DAY_KEY, JSON.stringify(newActiveDay))
          
          console.log('📥 [useDailyLog] Dati applicati da Supabase')
          
        } else if (localData) {
          setDailyLogState(localEntries)
          
          const newActiveDay = { 
            id: localData.id, 
            startDate: localData.startDate, 
            endDate: localData.endDate, 
            isActive: true 
          }
          setActiveDayState(newActiveDay)
          
          // Se localStorage è più recente, aggiorna Supabase
          if (localEntries.length > 0) {
            console.log('💾 [useDailyLog] Aggiorno Supabase con dati locali più recenti')
            await saveToSupabase(localEntries, newActiveDay)
          }
        }

      } catch (err) {
        console.error('❌ [useDailyLog] Errore eccezione:', err)
      } finally {
        setIsLoaded(true)
      }
    }

    syncFromSupabase()
  }, [user])

  // Salvataggio immediato su Supabase
  const saveToSupabase = useCallback(async (logToSave, dayToSave) => {
    if (!user || !dayToSave || !dayToSave.isActive || isSaving) {
      return
    }

    setIsSaving(true)

    try {
      console.log('💾 [useDailyLog] SALVATAGGIO:', logToSave.length, 'entries')
      
      // Cerca il giorno attivo più recente su Supabase
      const { data: existing } = await supabase
        .from('daily_logs')
        .select('id, start_date')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      let result
      if (existing) {
        // Controlla se è lo stesso giorno (stessa data)
        const existingDate = existing.start_date?.split('T')[0]
        const newDate = dayToSave.startDate?.split('T')[0]
        
        if (existingDate === newDate) {
          // Stesso giorno → aggiorna
          console.log('🔄 [useDailyLog] Aggiorno giorno esistente:', existing.id)
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
          // Giorno diverso → crea nuovo
          console.log('➕ [useDailyLog] Giorno diverso, creo nuovo record')
          const { data, error } = await supabase
            .from('daily_logs')
            .insert({
              user_id: user.id,
              start_date: dayToSave.startDate || new Date().toISOString(),
              end_date: dayToSave.endDate || null,
              is_active: true,
              entries: logToSave
            })
            .select()
            .maybeSingle()
          
          if (error) throw error
          result = data
          
          // Aggiorna activeDay con il nuovo ID
          if (result) {
            const updatedDay = { ...dayToSave, id: result.id }
            setActiveDayState(updatedDay)
            localStorage.setItem(ACTIVE_DAY_KEY, JSON.stringify(updatedDay))
          }
        }
      } else {
        // Nessun giorno attivo → crea nuovo
        console.log('➕ [useDailyLog] Creo nuovo giorno')
        const { data, error } = await supabase
          .from('daily_logs')
          .insert({
            user_id: user.id,
            start_date: dayToSave.startDate || new Date().toISOString(),
            end_date: dayToSave.endDate || null,
            is_active: true,
            entries: logToSave
          })
          .select()
          .maybeSingle()
        
        if (error) throw error
        result = data
        
        if (result) {
          const updatedDay = { ...dayToSave, id: result.id }
          setActiveDayState(updatedDay)
          localStorage.setItem(ACTIVE_DAY_KEY, JSON.stringify(updatedDay))
        }
      }
      
      console.log('✅ [useDailyLog] Salvataggio completato')
    } catch (err) {
      console.error('❌ [useDailyLog] Errore salvataggio:', err)
    } finally {
      setIsSaving(false)
    }
  }, [user, isSaving])

  const setDailyLog = useCallback((newLog) => {
    console.log('📝 [useDailyLog] Update dailyLog:', newLog.length, 'entries')
    setDailyLogState(newLog)
    localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(newLog))
    
    // Salvataggio immediato
    if (activeDay) {
      saveToSupabase(newLog, activeDay)
    }
  }, [activeDay, saveToSupabase])

  const setActiveDay = useCallback((newDay) => {
    console.log(' [useDailyLog] Update activeDay')
    setActiveDayState(newDay)
    localStorage.setItem(ACTIVE_DAY_KEY, JSON.stringify(newDay))
  }, [])

  return { dailyLog, setDailyLog, activeDay, setActiveDay, isLoaded }
}