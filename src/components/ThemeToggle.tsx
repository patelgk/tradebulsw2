/**
 * ThemeToggle.tsx
 * 
 * Quick theme toggle button for headers/navigation
 * Shows current theme state and cycles through System → Light → Dark
 */

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../theme';

interface ThemeToggleProps {
  /** Show label text */
  showLabel?: boolean;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Custom className */
  className?: string;
}

export default function ThemeToggle({ showLabel = false, size = 'md', className = '' }: ThemeToggleProps) {
  const { preference, setThemePreference, theme } = useTheme();

  const handleToggle = () => {
    // Cycle: system → light → dark → system
    const cycle: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark'];
    const currentIndex = cycle.indexOf(preference);
    const nextIndex = (currentIndex + 1) % cycle.length;
    setThemePreference(cycle[nextIndex]);
  };

  const getIcon = () => {
    switch (preference) {
      case 'light':
        return Sun;
      case 'dark':
        return Moon;
      case 'system':
      default:
        return Monitor;
    }
  };

  const getLabel = () => {
    switch (preference) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
      default:
        return 'System';
    }
  };

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const Icon = getIcon();

  return (
    <button
      onClick={handleToggle}
      className={`
        rounded-full border transition-all duration-300 active:scale-95
        border-themed bg-card-themed hover:bg-elevated-themed
        ${sizeClasses[size]}
        ${showLabel ? 'px-3 flex items-center gap-2' : ''}
        ${className}
      `}
      title={`Theme: ${getLabel()} (Click to change)`}
      aria-label={`Change theme (currently ${getLabel()})`}
    >
      <Icon className={`${iconSizes[size]} text-primary`} />
      {showLabel && (
        <span className="text-xs font-bold text-primary-themed">
          {getLabel()}
        </span>
      )}
    </button>
  );
}
