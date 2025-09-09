import { ReactNode } from 'react';

interface CalculatorLayoutProps {
  children: ReactNode;
}

export default function CalculatorLayout({ children }: CalculatorLayoutProps) {
  return (
    // Calculator layout wrapper - dark mode is handled by ThemeProvider
    <div className="calculator-app">
      {children}
    </div>
  );
}