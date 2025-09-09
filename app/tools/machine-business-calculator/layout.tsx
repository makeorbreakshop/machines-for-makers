import { ReactNode } from 'react';
import './calculator.css';

interface CalculatorLayoutProps {
  children: ReactNode;
}

export default function CalculatorLayout({ children }: CalculatorLayoutProps) {
  return (
    // Force dark mode for calculator - override any parent theme settings
    <div className="calculator-app dark" data-theme="dark" style={{ colorScheme: 'dark' }}>
      {children}
    </div>
  );
}