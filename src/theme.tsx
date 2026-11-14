import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

/**
 * Theme System for Proprupee
 * 
 * Supports three modes:
 * - 'system': Automatically follows device preference (default)
 * - 'light': Forces light theme
 * - 'dark': Forces dark theme
 * 
 * Automatically detects system theme changes using prefers-color-scheme media query.
 */

type ThemePreference = 'system' | 'light' | 'dark';
type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  /** Current active theme ('light' or 'dark') */
  theme: ThemeMode;
  /** User's theme preference ('system', 'light', or 'dark') */
  preference: ThemePreference;
  /** True if current theme is dark */
  isDark: boolean;
  /** Toggle between light and dark (sets manual preference) */
  toggleTheme: () => void;
  /** Set theme preference */
  setThemePreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'proprupee-theme-preference';

/**
 * Detects system color scheme preference
 */
function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

/**
 * Gets initial theme preference from localStorage or defaults to 'system'
 */
function getInitialPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch (err) {
    console.warn('Failed to read theme preference from localStorage:', err);
  }
  
  // Default to system for new users
  return 'system';
}

/**
 * Resolves the actual theme to apply based on preference
 */
function resolveTheme(preference: ThemePreference): ThemeMode {
  if (preference === 'system') {
    return getSystemTheme();
  }
  return preference;
}

/**
 * Applies theme to the document root element
 */
function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  
  // Update data-theme attribute
  root.setAttribute('data-theme', theme);
  
  // Update class
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
  
  // Update color-scheme for native browser UI
  root.style.colorScheme = theme;
  
  // Update meta theme-color for mobile browsers and PWA
  updateMetaThemeColor(theme);
}

/**
 * Updates the theme-color meta tag for mobile browser chrome
 */
function updateMetaThemeColor(theme: ThemeMode) {
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    document.head.appendChild(metaThemeColor);
  }
  
  // Use appropriate background color for each theme
  const color = theme === 'dark' ? '#0B1110' : '#F5F7F6';
  metaThemeColor.setAttribute('content', color);
}

/**
 * Prevents flash of wrong theme on initial page load
 * This script should also be in index.html for SSR/hydration scenarios
 */
function preventThemeFlash() {
  if (typeof window === 'undefined') return;
  
  try {
    const preference = window.localStorage.getItem(STORAGE_KEY) as ThemePreference || 'system';
    const theme = resolveTheme(preference);
    applyTheme(theme);
  } catch (err) {
    // If localStorage fails, apply system theme
    applyTheme(getSystemTheme());
  }
}

// Run immediately to prevent flash
if (typeof window !== 'undefined') {
  preventThemeFlash();
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(getInitialPreference);
  const [systemTheme, setSystemTheme] = useState<ThemeMode>(getSystemTheme);

  // Resolve actual theme based on preference and system theme
  const theme = useMemo<ThemeMode>(() => {
    return preference === 'system' ? systemTheme : preference;
  }, [preference, systemTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const newSystemTheme = e.matches ? 'dark' : 'light';
      setSystemTheme(newSystemTheme);
      console.log('[Theme] System theme changed to:', newSystemTheme);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      // Older browsers (deprecated but still needed for some Android WebViews)
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Apply theme whenever it changes
  useEffect(() => {
    applyTheme(theme);
    console.log('[Theme] Applied theme:', theme, '(preference:', preference + ')');
  }, [theme, preference]);

  // Persist preference to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, preference);
    } catch (err) {
      console.warn('Failed to save theme preference:', err);
    }
  }, [preference]);

  const setThemePreference = useCallback((pref: ThemePreference) => {
    console.log('[Theme] Setting preference to:', pref);
    setPreference(pref);
  }, []);

  const toggleTheme = useCallback(() => {
    // Toggle between light and dark (sets manual preference)
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setThemePreference(nextTheme);
  }, [theme, setThemePreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      preference,
      isDark: theme === 'dark',
      toggleTheme,
      setThemePreference,
    }),
    [theme, preference, toggleTheme, setThemePreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
