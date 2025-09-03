import { ReactNode } from 'react';

interface CalculatorLayoutProps {
  children: ReactNode;
}

export default function CalculatorLayout({ children }: CalculatorLayoutProps) {
  return (
    // No ThemeProvider here - calculator manages its own theme
    <div className="calculator-app">
      {children}
    </div>
  );
}