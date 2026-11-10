import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const DAILY_LOG_KEY = 'fitness_app_daily_log'
const ACTIVE_DAY_KEY = 'fitness_app_active_day'

export function useDailyLog(user) {
  const [dailyLog, setDailyLogState] = useState([])
  const [activeDay, setActiveDayState] = useState(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasLocalData, setHasLocalData] = useState(false)

  // Carica dati locali all'avvio
  useEffect(() => {
    const savedLog = localStorage.getItem(DAILY_LOG_KEY)
    const savedDay = localStorage.getItem(ACTIVE_DAY_KEY)
    
    if (savedLog && savedDay) {
      const log = JSON.parse(savedLog)
      const day = JSON.parse(savedDay)
      
      if (log.length > 0) {
        console.log('💾 [useDailyLog] Dati locali trovati:', log.length, 'entries')
        setDailyLogState(log)
        setActiveDayState(day)
        setHasLocalData(true)
      }
    }
  }, [])

  // Sincronizza con Supabase
  useEffect(() => {
    if (!user) {
      setIsLoaded(true)
      return
    }

    const syncFromSupabase = async () => {
      try {
        console.log('🔄 [useDailyLog] Sincronizzazione da Supabase...')
        
        // Cerca il giorno attivo più recente
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
        
        if (data && data.is_active && data.entries && data.entries.length > 0) {
          console.log('✅ [useDailyLog] Diario attivo trovato da Supabase:', data.entries.length, 'entries')
          
          // ✅ IMPORTANTE: Merge intelligente
          // Se i dati locali hanno PIÙ entries di Supabase, mantieni i locali
          const localLog = JSON.parse(localStorage.getItem(DAILY_LOG_KEY) || '[]')
          
          if (localLog.length > data.entries.length) {
            console.log('️ [useDailyLog] Dati locali più recenti, mantengo locali')
            // Mantieni i dati locali ma aggiorna l'ID del giorno da Supabase
            const mergedDay = { 
              id: data.id, 
              startDate: data.start_date, 
              endDate: data.end_date, 
              isActive: true 
            }
            setActiveDayState(mergedDay)
            localStorage.setItem(ACTIVE_DAY_KEY, JSON.stringify(mergedDay))
            // Non sovrascrivere dailyLog!
          } else {
            console.log('📥 [useDailyLog] Uso dati da Supabase')
            setDailyLogState(data.entries)
            localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(data.entries))
            
            const newActiveDay = { 
              id: data.id, 
              startDate: data.start_date, 
              endDate: data.end_date, 
              isActive: true 
            }
            setActiveDayState(newActiveDay)
            localStorage.setItem(ACTIVE_DAY_KEY, JSON.stringify(newActiveDay))
          }
        } else {
          console.log('⚠️ [useDailyLog] Nessun diario attivo su Supabase, uso localStorage')
          // Se Supabase non ha dati, mantieni SEMPRE i dati locali
          if (hasLocalData) {
            console.log(' [useDailyLog] Mantengo dati locali esistenti')
          }
        }
      } catch (err) {
        console.error('❌ [useDailyLog] Errore eccezione:', err)
        // In caso di errore, mantieni SEMPRE i dati locali
        console.log('💾 [useDailyLog] Errore, mantengo dati locali')
      } finally {
        setIsLoaded(true)
      }
    }

    syncFromSupabase()
  }, [user])

  // Salvataggio IMMEDIATO su Supabase (senza debounce quando aggiungi alimenti)
  const saveToSupabase = useCallback(async (logToSave, dayToSave) => {
    if (!user || !dayToSave || !dayToSave.isActive) {
      console.log('⏸️ [useDailyLog] Salvataggio skip:', { 
        hasUser: !!user, 
        hasDay: !!dayToSave, 
        isActive: dayToSave?.isActive 
      })
      return
    }

    try {
      console.log('💾 [useDailyLog] SALVATAGGIO IMMEDIATO:', logToSave.length, 'entries')
      
      // Cerca se esiste già un giorno con questa start_date
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
      
      console.log('✅ [useDailyLog] Salvataggio completato:', result)
    } catch (err) {
      console.error('❌ [useDailyLog] Errore salvataggio:', err)
      console.error('❌ [useDailyLog] Dettagli:', err.message)
    }
  }, [user])

  // Salvataggio automatico con debounce SOLO per modifiche minori
  useEffect(() => {
    if (!user || !activeDay || !activeDay.isActive || !isLoaded) return

    const saveTimer = setTimeout(() => {
      saveToSupabase(dailyLog, activeDay)
    }, 2000)

    return () => clearTimeout(saveTimer)
  }, [user, activeDay, dailyLog, isLoaded, saveToSupabase])

  // Funzione pubblica per impostare il daily log con salvataggio immediato
  const setDailyLog = useCallback((newLog) => {
    console.log('📝 [useDailyLog] Update dailyLog:', newLog.length, 'entries')
    setDailyLogState(newLog)
    localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(newLog))
    
    // Salvataggio immediato quando cambia il log
    if (activeDay) {
      saveToSupabase(newLog, activeDay)
    }
  }, [activeDay, saveToSupabase])

  const setActiveDay = useCallback((newDay) => {
    console.log('📅 [useDailyLog] Update activeDay:', newDay)
    setActiveDayState(newDay)
    localStorage.setItem(ACTIVE_DAY_KEY, JSON.stringify(newDay))
    
    // Se cambio giorno, salvo immediatamente
    if (newDay && newDay.isActive && dailyLog.length > 0) {
      saveToSupabase(dailyLog, newDay)
    }
  }, [dailyLog, saveToSupabase])

  return { dailyLog, setDailyLog, activeDay, setActiveDay, isLoaded }
}