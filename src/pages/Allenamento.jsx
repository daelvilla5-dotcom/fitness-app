import { useState } from 'react'
import ExerciseManager from '../components/ExerciseManager'
import RoutineBuilder from '../components/RoutineBuilder'
import WorkoutLogger from '../components/WorkoutLogger'

function Allenamento({ user }) {
  const [activeTab, setActiveTab] = useState('schede')
  const [loggingSession, setLoggingSession] = useState(null) // { routine, dayIndex }

  const tabs = [
    { id: 'schede', label: 'Schede', icon: '📋' },
    { id: 'esercizi', label: 'Esercizi', icon: '🏋️' },
  ]

  const handleStartWorkout = (routine, dayIndex) => {
    setLoggingSession({ routine, dayIndex })
  }

  return (
    <div className="p-4 pb-24">
      <h2 className="text-2xl font-bold text-electric mb-6 mt-2">💪 Allenamento</h2>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm ${
              activeTab === tab.id
                ? 'bg-electric text-black'
                : 'bg-card text-white border border-border'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Contenuto Tab */}
      {activeTab === 'esercizi' && <ExerciseManager />}
      {activeTab === 'schede' && (
        <RoutineBuilder user={user} onStartWorkout={handleStartWorkout} />
      )}

      {/* Modale Logger Allenamento */}
      {loggingSession && (
        <WorkoutLogger
          user={user}
          routine={loggingSession.routine}
          dayIndex={loggingSession.dayIndex}
          onClose={() => setLoggingSession(null)}
        />
      )}
    </div>
  )
}

export default Allenamento