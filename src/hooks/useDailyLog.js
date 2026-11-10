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
          console.error('❌ [useDailyLog] Errore Supabase:', error)
        }
        
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
          const savedLog = localStorage.getItem(DAILY_LOG_KEY)
          const savedDay = localStorage.getItem(ACTIVE_DAY_KEY)
          if (savedLog) setDailyLogState(JSON.parse(savedLog))
          if (savedDay) setActiveDayState(JSON.parse(savedDay))
        }
      } catch (err) {
        console.error('❌ [useDailyLog] Errore eccezione:', err)
      } finally {
        setIsLoaded(true)
      }
    }

    syncFromSupabase()
  }, [user])

  // ✅ SALVATAGGIO IMMEDIATO (no debounce)
  const saveToSupabase = useCallback(async (logToSave, dayToSave) => {
    if (!user || !dayToSave || !dayToSave.isActive || isSaving) {
      console.log('⏸️ [useDailyLog] Salvataggio skip:', { 
        hasUser: !!user, 
        hasDay: !!dayToSave, 
        isActive: dayToSave?.isActive,
        isSaving
      })
      return
    }

    setIsSaving(true)

    try {
      console.log('💾 [useDailyLog] SALVATAGGIO IMMEDIATO:', logToSave.length, 'entries')
      
      // Normalizza la data per il confronto
      const startDate = dayToSave.startDate.split('T')[0]
      
      const { data: existing } = await supabase
        .from('daily_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
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
            start_date: new Date().toISOString(),
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
      
      console.log('✅ [useDailyLog] Salvataggio completato')
    } catch (err) {
      console.error('❌ [useDailyLog] Errore salvataggio:', err)
      console.error('❌ [useDailyLog] Dettagli:', err.message)
    } finally {
      setIsSaving(false)
    }
  }, [user, isSaving])

  // ✅ Rimuovi il useEffect con debounce - salviamo direttamente in setDailyLog

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
    console.log('📅 [useDailyLog] Update activeDay')
    setActiveDayState(newDay)
    localStorage.setItem(ACTIVE_DAY_KEY, JSON.stringify(newDay))
  }, [])

  return { dailyLog, setDailyLog, activeDay, setActiveDay, isLoaded }
}