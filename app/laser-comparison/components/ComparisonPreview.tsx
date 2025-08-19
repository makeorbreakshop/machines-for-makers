'use client';

export default function ComparisonPreview() {
  // Sample data for preview
  const machines = [
    {
      name: 'Glowforge Pro',
      brand: 'Glowforge',
      price: '$6,995',
      workArea: '19.5" x 11"',
      power: '45W',
      type: 'CO2',
    },
    {
      name: 'xTool P2',
      brand: 'xTool',
      price: '$4,999',
      workArea: '26" x 14"',
      power: '55W',
      type: 'CO2',
    },
    {
      name: 'OMTech AF2028-60',
      brand: 'OMTech',
      price: '$2,999',
      workArea: '20" x 28"',
      power: '60W',
      type: 'CO2',
    },
    {
      name: 'Longer Ray5',
      brand: 'Longer',
      price: '$289',
      workArea: '15.7" x 15.7"',
      power: '10W',
      type: 'Diode',
    },
    {
      name: 'Atomstack X30 Pro',
      brand: 'Atomstack',
      price: '$1,599',
      workArea: '15.7" x 15.7"',
      power: '30W',
      type: 'Diode',
    },
  ];

  return (
    <div className="relative">
      {/* Blur Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-white via-white/50 to-transparent z-10 pointer-events-none" />
      
      {/* Lock Icon */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
        <div className="bg-white rounded-full p-4 shadow-lg">
          <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* Preview Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Machine</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Brand</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Price</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 whitespace-nowrap">Work Area</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Power</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {machines.map((machine, idx) => (
                <tr 
                  key={idx} 
                  className={`hover:bg-gray-50 ${idx >= 3 ? 'opacity-40' : idx >= 2 ? 'opacity-60' : ''}`}
                >
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {machine.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{machine.brand}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{machine.price}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{machine.workArea}</td>
                  <td className="px-4 py-3 text-gray-600">{machine.power}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      machine.type === 'CO2' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {machine.type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* More indicator */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600 font-medium">
            + 152 more machines available
          </p>
        </div>
      </div>
    </div>
  );
}