'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read persisted theme or default to dark
    const storedTheme = localStorage.getItem('alphawire-theme') || 'dark';
    setTheme(storedTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    const body = document.body;
    
    // Remove existing theme classes
    root.classList.remove('dark-theme', 'light-theme');
    body.classList.remove('dark-theme', 'light-theme');
    
    // Add current theme class
    root.classList.add(`${theme}-theme`);
    body.classList.add(`${theme}-theme`);
    
    localStorage.setItem('alphawire-theme', theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Avoid hydrations mismatch by using a mounted flag or default structure
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <body className={mounted ? `${theme}-theme` : 'dark-theme'}>
        {children}
      </body>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
