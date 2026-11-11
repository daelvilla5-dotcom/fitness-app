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
    const lastSync = localStorage.getItem(LAST_SYNC_KEY)
    
    if (savedLog && savedDay) {
      const log = JSON.parse(savedLog)
      const day = JSON.parse(savedDay)
      setDailyLogState(log)
      setActiveDayState(day)
      console.log('💾 [useDailyLog] Dati locali caricati:', log.length, 'entries, lastSync:', lastSync)
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
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        console.log('📋 [useDailyLog] Risposta Supabase:', { 
          hasData: !!data, 
          entriesCount: data?.entries?.length,
          updatedAt: data?.updated_at || data?.created_at,
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
          
          // ✅ Se Supabase è più recente o non c'è timestamp locale, usa Supabase
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
            console.log('💾 [useDailyLog] Locale più recente, mantengo locale (ma aggiorno ID giorno)')
            // Mantieni i dati locali ma aggiorna l'ID del giorno se necessario
            const savedDay = JSON.parse(localStorage.getItem(ACTIVE_DAY_KEY) || 'null')
            if (savedDay && savedDay.id !== data.id) {
              savedDay.id = data.id
              localStorage.setItem(ACTIVE_DAY_KEY, JSON.stringify(savedDay))
              setActiveDayState(savedDay)
            }
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
  }, [user])

  // Salvataggio immediato con timestamp
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
      
      // Cerca il giorno attivo più recente
      const { data: existing } = await supabase
        .from('daily_logs')
        .select('id, created_at, updated_at')
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
            entries: logToSave,
            updated_at: new Date().toISOString() // ✅ Aggiorna timestamp
          })
          .eq('id', existing.id)
          .select()
          .maybeSingle()
        
        if (error) throw error
        result = data
      } else {
        console.log('➕ [useDailyLog] Creo nuovo giorno')
        const now = new Date().toISOString()
        const { data, error } = await supabase
          .from('daily_logs')
          .insert({
            user_id: user.id,
            start_date: dayToSave.startDate || now,
            end_date: dayToSave.endDate || null,
            is_active: true,
            entries: logToSave,
            updated_at: now // ✅ Imposta timestamp
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
      
      // ✅ Aggiorna timestamp locale
      const syncTimestamp = result?.updated_at || result?.created_at || new Date().toISOString()
      localStorage.setItem(LAST_SYNC_KEY, syncTimestamp)
      
      console.log('✅ [useDailyLog] Salvataggio completato, timestamp:', syncTimestamp)
    } catch (err) {
      console.error('❌ [useDailyLog] Errore salvataggio:', err)
      console.error('❌ [useDailyLog] Dettagli:', err.message)
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
    console.log('📅 [useDailyLog] Update activeDay')
    setActiveDayState(newDay)
    localStorage.setItem(ACTIVE_DAY_KEY, JSON.stringify(newDay))
  }, [])

  return { dailyLog, setDailyLog, activeDay, setActiveDay, isLoaded }
}