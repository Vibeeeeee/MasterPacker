'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';

type ThemeContextType = {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  toggleTheme: () => void;
  setThemePreference: (theme: 'light' | 'dark' | 'system') => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, resolvedTheme, toggleTheme, setThemePreference } = useTheme();

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, toggleTheme, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}
