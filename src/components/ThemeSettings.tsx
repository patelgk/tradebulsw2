/**
 * ThemeSettings.tsx
 * 
 * Theme configuration UI for Proprupee
 * Allows users to choose between System, Light, and Dark themes
 */

import React from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme } from '../theme';

interface ThemeSettingsProps {
  /** Show as a modal/dialog */
  modal?: boolean;
  /** Close handler for modal mode */
  onClose?: () => void;
  /** Inline mode (no card wrapper) */
  inline?: boolean;
}

export default function ThemeSettings({ modal = false, onClose, inline = false }: ThemeSettingsProps) {
  const { preference, setThemePreference, theme } = useTheme();

  const options = [
    {
      value: 'system' as const,
      label: 'System',
      description: 'Automatically match device theme',
      icon: Monitor,
    },
    {
      value: 'light' as const,
      label: 'Light',
      description: 'Always use light theme',
      icon: Sun,
    },
    {
      value: 'dark' as const,
      label: 'Dark',
      description: 'Always use dark theme',
      icon: Moon,
    },
  ];

  const content = (
    <div className={inline ? '' : 'space-y-4'}>
      {!inline && (
        <div className="mb-6">
          <h3 className="text-lg font-black tracking-tight text-primary-themed">
            Theme Preference
          </h3>
          <p className="text-xs text-secondary-themed mt-1">
            Choose how Proprupee appears. System mode automatically follows your device settings.
          </p>
        </div>
      )}

      <div className="grid gap-3">
        {options.map(({ value, label, description, icon: Icon }) => {
          const isActive = preference === value;
          const isCurrentTheme = (value === 'system' && preference === 'system') || (value === theme && preference !== 'system');

          return (
            <button
              key={value}
              onClick={() => setThemePreference(value)}
              className={`
                relative flex items-start gap-4 p-4 rounded-2xl border-2 transition-all duration-300
                ${isActive 
                  ? 'border-primary bg-primary/10 scale-[1.02]' 
                  : 'border-themed bg-card-themed hover:border-primary/30 hover:scale-[1.01]'
                }
                active:scale-95
              `}
            >
              {/* Icon */}
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-xl transition-all
                ${isActive 
                  ? 'bg-primary text-white' 
                  : 'bg-elevated-themed text-secondary-themed'
                }
              `}>
                <Icon className="w-5 h-5" />
              </div>

              {/* Content */}
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className={`font-black text-sm ${isActive ? 'text-primary' : 'text-primary-themed'}`}>
                    {label}
                  </span>
                  {isCurrentTheme && preference === value && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-secondary-themed mt-0.5">
                  {description}
                </p>
              </div>

              {/* Check mark */}
              {isActive && (
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {!inline && (
        <div className="mt-6 p-4 rounded-2xl bg-elevated-themed border border-themed">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Monitor className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 text-xs">
              <p className="font-bold text-primary-themed mb-1">Current Theme</p>
              <p className="text-secondary-themed">
                {preference === 'system' 
                  ? `Following system preference (currently ${theme})` 
                  : `Using ${theme} mode`
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (modal) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div 
          className="absolute inset-0" 
          onClick={onClose}
        />
        <div className="relative w-full max-w-md bg-card-themed rounded-3xl border border-themed p-6 shadow-2xl">
          {content}
          {onClose && (
            <button
              onClick={onClose}
              className="mt-6 w-full py-3 bg-primary text-white font-black rounded-2xl hover:bg-primary-hover transition-all active:scale-95"
            >
              Done
            </button>
          )}
        </div>
      </div>
    );
  }

  if (inline) {
    return <>{content}</>;
  }

  return (
    <div className="premium-card p-6">
      {content}
    </div>
  );
}
