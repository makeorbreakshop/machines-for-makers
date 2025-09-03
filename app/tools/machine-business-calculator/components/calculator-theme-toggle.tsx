"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CalculatorThemeToggleProps {
  isDark: boolean;
  onToggle: (isDark: boolean) => void;
}

export function CalculatorThemeToggle({ isDark, onToggle }: CalculatorThemeToggleProps) {
  return (
    <Button 
      variant="outline" 
      size="icon"
      onClick={() => onToggle(!isDark)}
      className="relative border-border bg-background hover:bg-muted text-foreground"
    >
      <Sun className={`h-[1.2rem] w-[1.2rem] transition-all ${isDark ? 'rotate-90 scale-0' : 'rotate-0 scale-100'}`} />
      <Moon className={`absolute h-[1.2rem] w-[1.2rem] transition-all ${isDark ? 'rotate-0 scale-100' : 'rotate-90 scale-0'}`} />
      <span className="sr-only">Toggle calculator theme</span>
    </Button>
  )
}