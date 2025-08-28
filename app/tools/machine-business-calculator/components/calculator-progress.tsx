'use client';

interface CalculatorProgressProps {
  currentLevel: number;
  completedLevels: number[];
  onLevelClick: (level: number) => void;
}

const LEVELS = [
  { number: 1, title: 'Setup', description: 'Goals & Products' },
  { number: 2, title: 'Price Optimization', description: 'Pricing Strategy' },
  { number: 3, title: 'Business Costs', description: 'Hidden Expenses' },
  { number: 4, title: 'Solutions', description: 'Action Plan' }
];

export function CalculatorProgress({ currentLevel, completedLevels, onLevelClick }: CalculatorProgressProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            Machine Business Calculator
          </h1>
          
          <div className="text-sm text-gray-500">
            Level {currentLevel} of 4
          </div>
        </div>
        
        <div className="mt-6">
          <div className="flex items-center justify-between">
            {LEVELS.map((level, index) => {
              const isCompleted = completedLevels.includes(level.number);
              const isCurrent = currentLevel === level.number;
              const isAccessible = isCompleted || isCurrent || completedLevels.includes(level.number - 1) || level.number === 1;
              
              return (
                <div key={level.number} className="flex items-center">
                  <button
                    onClick={() => isAccessible && onLevelClick(level.number)}
                    disabled={!isAccessible}
                    className={`
                      flex flex-col items-center p-3 rounded-lg transition-colors
                      ${isCurrent 
                        ? 'bg-gray-100 text-gray-900' 
                        : isCompleted 
                        ? 'text-gray-700 hover:bg-gray-50' 
                        : isAccessible
                        ? 'text-gray-500 hover:bg-gray-50'
                        : 'text-gray-300 cursor-not-allowed'
                      }
                    `}
                  >
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold mb-2
                      ${isCurrent 
                        ? 'bg-gray-900 text-white' 
                        : isCompleted 
                        ? 'bg-gray-200 text-gray-700' 
                        : isAccessible
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-gray-50 text-gray-300'
                      }
                    `}>
                      {isCompleted ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        level.number
                      )}
                    </div>
                    
                    <div className="text-center">
                      <div className={`
                        text-xs font-medium
                        ${isCurrent ? 'text-gray-900' : isCompleted ? 'text-gray-700' : 'text-gray-500'}
                      `}>
                        {level.title}
                      </div>
                      <div className={`
                        text-xs mt-1
                        ${isCurrent ? 'text-gray-600' : isCompleted ? 'text-gray-500' : 'text-gray-400'}
                      `}>
                        {level.description}
                      </div>
                    </div>
                  </button>
                  
                  {index < LEVELS.length - 1 && (
                    <div className={`
                      w-8 h-0.5 mx-2
                      ${completedLevels.includes(level.number) ? 'bg-gray-300' : 'bg-gray-100'}
                    `} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}