'use client';

import { Calculator, Clock, TrendingDown, DollarSign, Users, AlertTriangle } from 'lucide-react';

export default function CalculatorPreview() {
  const steps = [
    {
      icon: Calculator,
      title: 'Products & Pricing',
      current: '$50 profit',
      reality: '$40 profit',
      description: 'After materials and supplies'
    },
    {
      icon: Clock,
      title: 'Time (The First Killer)',
      current: '30 min',
      reality: '2.5 hours',
      description: 'Add setup, cleanup, emails, packaging, shipping'
    },
    {
      icon: Users,
      title: 'Marketing (The Second Killer)',
      current: 'Free',
      reality: '$127/sale',
      description: 'Facebook ads, craft fairs, Etsy fees add up fast'
    },
    {
      icon: DollarSign,
      title: 'Business Costs (The Third Killer)',
      current: '$0',
      reality: '40% overhead',
      description: 'Insurance, taxes, software, maintenance, returns'
    },
    {
      icon: TrendingDown,
      title: 'Your Real Numbers',
      current: '$50/hr',
      reality: '$3.47/hr',
      description: 'The truth most makers discover too late'
    },
    {
      icon: AlertTriangle,
      title: 'Your Escape Route',
      current: 'Hope',
      reality: '3 proven models',
      description: 'Business models that actually work at scale'
    }
  ];

  return (
    <>
      {/* Table View - works on all screen sizes */}
      <div className="overflow-x-auto bg-white rounded-lg shadow-lg">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 font-semibold text-gray-900">Calculator Step</th>
              <th className="text-center py-2 px-3 font-semibold text-gray-900">What You Think</th>
              <th className="text-center py-2 px-3 font-semibold text-gray-900">Reality</th>
              <th className="text-left py-2 px-3 font-semibold text-gray-900 hidden lg:table-cell">What You'll Learn</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((step, index) => {
              const Icon = step.icon;
              
              return (
                <tr 
                  key={index} 
                  className="border-b border-gray-100"
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        index <= 3 ? 'bg-gray-100' : 'bg-red-50'
                      }`}>
                        <Icon className={`w-4 h-4 ${
                          index <= 3 ? 'text-gray-700' : 'text-red-600'
                        }`} />
                      </div>
                      <div className="font-medium text-gray-900">{step.title}</div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-green-600 font-medium">{step.current}</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-red-600 font-bold">{step.reality}</span>
                  </td>
                  <td className="py-3 px-3 text-gray-600 text-sm hidden lg:table-cell">
                    {step.description}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </>
  );
}