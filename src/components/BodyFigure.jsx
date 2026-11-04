import { useState } from 'react'

function BodyFigure({ gender, onSelectArea, selectedArea }) {
  const [hoveredArea, setHoveredArea] = useState(null)

  // Coordinate dei punti cliccabili (percentuali relative all'SVG)
  const areas = [
  { id: 'braccioDestro', label: 'Braccio DX', x: 78, y: 32 },      // era 22
  { id: 'braccioSinistro', label: 'Braccio SX', x: 22, y: 32 },    // era 78
  { id: 'torace', label: 'Torace', x: 50, y: 30 },
  { id: 'vita', label: 'Vita', x: 50, y: 45 },
  { id: 'glutei', label: 'Glutei', x: 50, y: 58 },
  { id: 'cosciaDestra', label: 'Coscia DX', x: 57, y: 68 },        // era 43
  { id: 'cosciaSinistra', label: 'Coscia SX', x: 43, y: 68 },      // era 57
  { id: 'polpaccioDestro', label: 'Polpaccio DX', x: 57, y: 82 },  // era 43
  { id: 'polpaccioSinistro', label: 'Polpaccio SX', x: 43, y: 82 },// era 57
]

  const handleAreaClick = (area) => {
    onSelectArea(area.id)
  }

  return (
    <div className="relative w-full max-w-xs mx-auto">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Sagoma stilizzata */}
        {gender === 'M' ? (
          // Sagoma maschile - più squadrata
          <g fill="#1F2937" stroke="#00BFFF" strokeWidth="0.5">
            {/* Testa */}
            <circle cx="50" cy="10" r="6" />
            {/* Collo */}
            <rect x="47" y="16" width="6" height="4" />
            {/* Torace/Spalle */}
            <path d="M 30 22 L 70 22 L 65 40 L 35 40 Z" />
            {/* Braccia */}
            <path d="M 30 22 L 20 25 L 18 40 L 22 42 L 25 30 L 30 28 Z" />
            <path d="M 70 22 L 80 25 L 82 40 L 78 42 L 75 30 L 70 28 Z" />
            {/* Avambracci */}
            <path d="M 18 40 L 15 55 L 19 56 L 22 42 Z" />
            <path d="M 82 40 L 85 55 L 81 56 L 78 42 Z" />
            {/* Vita/Fianchi */}
            <path d="M 35 40 L 65 40 L 62 55 L 38 55 Z" />
            {/* Glutei */}
            <path d="M 38 55 L 62 55 L 63 65 L 37 65 Z" />
            {/* Cosce */}
            <path d="M 37 65 L 50 65 L 48 82 L 40 82 Z" />
            <path d="M 50 65 L 63 65 L 60 82 L 52 82 Z" />
            {/* Polpacci */}
            <path d="M 40 82 L 48 82 L 47 95 L 41 95 Z" />
            <path d="M 52 82 L 60 82 L 59 95 L 53 95 Z" />
          </g>
        ) : (
          // Sagoma femminile - più curva
          <g fill="#1F2937" stroke="#00BFFF" strokeWidth="0.5">
            {/* Testa */}
            <circle cx="50" cy="10" r="6" />
            {/* Capelli */}
            <path d="M 44 8 Q 50 4 56 8 Q 58 12 56 14 Q 50 10 44 14 Q 42 12 44 8" />
            {/* Collo */}
            <rect x="48" y="16" width="4" height="4" />
            {/* Torace/Spalle (più strette) */}
            <path d="M 35 22 L 65 22 L 62 38 L 38 38 Z" />
            {/* Seno (curva) */}
            <path d="M 38 38 Q 44 42 50 38 Q 56 42 62 38 L 60 42 L 40 42 Z" />
            {/* Braccia */}
            <path d="M 35 22 L 25 25 L 23 40 L 27 42 L 30 30 L 35 28 Z" />
            <path d="M 65 22 L 75 25 L 77 40 L 73 42 L 70 30 L 65 28 Z" />
            {/* Avambracci */}
            <path d="M 23 40 L 20 55 L 24 56 L 27 42 Z" />
            <path d="M 77 40 L 80 55 L 76 56 L 73 42 Z" />
            {/* Vita (più stretta) */}
            <path d="M 38 42 L 62 42 L 58 52 L 42 52 Z" />
            {/* Fianchi (più larghi) */}
            <path d="M 42 52 L 58 52 L 64 62 L 36 62 Z" />
            {/* Glutei */}
            <path d="M 36 62 L 64 62 L 63 70 L 37 70 Z" />
            {/* Cosce */}
            <path d="M 37 70 L 50 70 L 48 85 L 40 85 Z" />
            <path d="M 50 70 L 63 70 L 60 85 L 52 85 Z" />
            {/* Polpacci */}
            <path d="M 40 85 L 48 85 L 47 95 L 41 95 Z" />
            <path d="M 52 85 L 60 85 L 59 95 L 53 95 Z" />
          </g>
        )}

        {/* Punti cliccabili */}
        {areas.map((area) => {
          const isSelected = selectedArea === area.id
          const isHovered = hoveredArea === area.id
          
          return (
            <g
              key={area.id}
              onClick={() => handleAreaClick(area)}
              onMouseEnter={() => setHoveredArea(area.id)}
              onMouseLeave={() => setHoveredArea(null)}
              className="cursor-pointer"
            >
              {/* Cerchio esterno (alone) */}
              <circle
                cx={area.x}
                cy={area.y}
                r={isSelected ? 3.5 : 3}
                fill={isSelected ? '#00BFFF' : isHovered ? '#00BFFF' : 'transparent'}
                opacity={0.3}
              />
              {/* Punto centrale */}
              <circle
                cx={area.x}
                cy={area.y}
                r={isSelected ? 2 : 1.5}
                fill={isSelected ? '#00BFFF' : '#FFFFFF'}
                stroke="#00BFFF"
                strokeWidth="0.3"
              />
              {/* Label al hover */}
              {isHovered && (
                <g>
                  <rect
                    x={area.x - 10}
                    y={area.y - 6}
                    width="20"
                    height="4"
                    fill="#000000"
                    opacity="0.8"
                    rx="1"
                  />
                  <text
                    x={area.x}
                    y={area.y - 3}
                    textAnchor="middle"
                    fontSize="2.5"
                    fill="#00BFFF"
                    fontWeight="bold"
                  >
                    {area.label}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>

      {/* Legenda aree */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {areas.map((area) => (
          <button
            key={area.id}
            onClick={() => handleAreaClick(area)}
            className={`text-xs py-1 px-2 rounded transition-all ${
              selectedArea === area.id
                ? 'bg-electric text-black font-bold'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {area.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default BodyFigure