import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function MeasurementChart({ areaName, data, color = '#00BFFF' }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 text-center">
        <p className="text-gray-400 text-sm">Nessuna misurazione registrata</p>
      </div>
    )
  }

  // Ordina per data crescente
  const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date))

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h4 className="text-lg font-semibold text-white mb-3">{areaName}</h4>
      
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={sortedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            stroke="#9CA3AF"
            style={{ fontSize: '11px' }}
          />
          <YAxis 
            stroke="#9CA3AF"
            style={{ fontSize: '11px' }}
            domain={['auto', 'auto']}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              border: '1px solid #374151',
              borderRadius: '8px'
            }}
            labelFormatter={(label) => `Data: ${new Date(label).toLocaleDateString('it-IT')}`}
            formatter={(value) => [`${value} cm`, areaName]}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2}
            dot={{ fill: color, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Lista misurazioni */}
      <div className="mt-4 space-y-1 max-h-40 overflow-y-auto">
        {sortedData.map((entry, idx) => (
          <div key={idx} className="flex justify-between text-sm bg-gray-800 rounded px-2 py-1">
            <span className="text-gray-400">{new Date(entry.date).toLocaleDateString('it-IT')}</span>
            <span className="text-white font-semibold">{entry.value} cm</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MeasurementChart