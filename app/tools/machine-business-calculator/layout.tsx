import { ReactNode } from 'react';

interface CalculatorLayoutProps {
  children: ReactNode;
}

export default function CalculatorLayout({ children }: CalculatorLayoutProps) {
  return (
    // Dark mode only - no theme switching
    <div className="calculator-app dark">
      {children}
    </div>
  );
}