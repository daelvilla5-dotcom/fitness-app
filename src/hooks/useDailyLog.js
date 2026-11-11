import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const DAILY_LOG_KEY = 'fitness_app_daily_log'
const ACTIVE_DAY_KEY = 'fitness_app_active_day'
const LAST_SYNC_KEY = 'fitness_app_last_sync'

export function useDailyLog(user) {
  const [dailyLog, setDailyLogState] = useState([])
  const [activeDay, setActiveDayState] = useState(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Carica dati locali all'avvio
  useEffect(() => {
    const savedLog = localStorage.getItem(DAILY_LOG_KEY)
    const savedDay = localStorage.getItem(ACTIVE_DAY_KEY)
    
    if (savedLog && savedDay) {
      setDailyLogState(JSON.parse(savedLog))
      setActiveDayState(JSON.parse(savedDay))
    }
  }, [])

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
          .order('updated_at', { ascending: false }) // ✅ ORDINA PER ULTIMA MODIFICA!
          .limit(1)
          .maybeSingle()

        console.log('📋 [useDailyLog] Risposta Supabase:', { 
          hasData: !!data, 
          entriesCount: data?.entries?.length,
          updatedAt: data?.updated_at,
          error 
        })
        
        if (error) {
          console.error('❌ [useDailyLog] Errore Supabase:', error)
          setIsLoaded(true)
          return
        }
        
        if (data && data.is_active) {
          const supabaseTimestamp = data.updated_at || data.created_at
          const localTimestamp = localStorage.getItem(LAST_SYNC_KEY)
          
          console.log('⏰ [useDailyLog] Confronto timestamp:', {
            supabase: supabaseTimestamp,
            local: localTimestamp,
            supabaseNewer: !localTimestamp || new Date(supabaseTimestamp) > new Date(localTimestamp)
          })
          
          // ✅ Se Supabase è più recente, sovrascrive il locale
          if (!localTimestamp || new Date(supabaseTimestamp) > new Date(localTimestamp)) {
            console.log('📥 [useDailyLog] Supabase più recente, aggiorno locale')
            
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
            localStorage.setItem(LAST_SYNC_KEY, supabaseTimestamp)
          } else {
            console.log('💾 [useDailyLog] Locale più recente, mantengo locale')
          }
        } else {
          console.log('⚠️ [useDailyLog] Nessun diario attivo su Supabase')
        }
      } catch (err) {
        console.error('❌ [useDailyLog] Errore eccezione:', err)
      } finally {
        setIsLoaded(true)
      }
    }

    syncFromSupabase()
    
    // ✅ MAGICO: Sincronizza automaticamente quando clicchi sulla finestra del browser!
    const handleFocus = () => {
      console.log('👀 [useDailyLog] Finestra in focus, controllo aggiornamenti...')
      syncFromSupabase()
    }
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [user])

  const saveToSupabase = useCallback(async (logToSave, dayToSave) => {
    if (!user || !dayToSave || !dayToSave.isActive || isSaving) {
      console.log('⏸️ [useDailyLog] Salvataggio skip')
      return
    }

    setIsSaving(true)

    try {
      console.log('💾 [useDailyLog] SALVATAGGIO:', logToSave.length, 'entries')
      
      const { data: existing } = await supabase
        .from('daily_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
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
      
      const syncTimestamp = result?.updated_at || result?.created_at || new Date().toISOString()
      localStorage.setItem(LAST_SYNC_KEY, syncTimestamp)
      
      console.log('✅ [useDailyLog] Salvataggio completato, timestamp:', syncTimestamp)
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