import { useState } from 'react'

function ProfileSelector() {
  const [profiles] = useState(['Profilo 1', 'Profilo 2', 'Profilo 3'])
  const [currentProfile, setCurrentProfile] = useState(0)

  return (
    <div className="fixed top-3 right-3 z-20">
      <select
        value={currentProfile}
        onChange={(e) => setCurrentProfile(Number(e.target.value))}
        className="bg-card border border-border text-white text-sm rounded-lg px-2 py-1 focus:outline-none focus:border-electric"
      >
        {profiles.map((profile, index) => (
          <option key={index} value={index}>
            {profile}
          </option>
        ))}
      </select>
    </div>
  )
}

export default ProfileSelector