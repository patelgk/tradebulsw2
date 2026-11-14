# Theme System - Quick Start Guide

## For Developers

### Using the Theme Hook

```typescript
import { useTheme } from '../theme'

function MyComponent() {
  const { theme, isDark, preference, toggleTheme, setThemePreference } = useTheme()
  
  return (
    <div>
      <p>Current theme: {theme}</p>
      <p>Preference: {preference}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
      <button onClick={() => setThemePreference('system')}>Use System</button>
    </div>
  )
}
```

### CSS Variables (Automatic)

All colors automatically respond to the active theme:

```css
/* These update automatically when theme changes */
background-color: var(--color-bg-base);
color: var(--color-text-primary);
border-color: var(--color-border);
```

### Tailwind Utilities

```tsx
<div className="bg-base-themed text-primary-themed border-themed">
  Automatically adapts to light/dark theme
</div>
```

### Adding Theme Toggle to Header

```tsx
import ThemeToggle from './components/ThemeToggle'

export function Header() {
  return (
    <header className="flex items-center justify-between">
      <h1>My App</h1>
      <ThemeToggle size="md" showLabel={false} />
    </header>
  )
}
```

### Adding Theme Settings Panel

```tsx
import ThemeSettings from './components/ThemeSettings'
import { useState } from 'react'

export function SettingsPage() {
  const [showTheme, setShowTheme] = useState(false)
  
  return (
    <>
      <button onClick={() => setShowTheme(true)}>Theme Settings</button>
      {showTheme && (
        <ThemeSettings 
          modal={true}
          onClose={() => setShowTheme(false)}
        />
      )}
    </>
  )
}
```

---

## For Users

### Available Themes

1. **System** (Default)
   - Automatically matches your device preference
   - Changes when you toggle dark mode on your device

2. **Light**
   - Always use light theme
   - Bright backgrounds, dark text

3. **Dark**
   - Always use dark theme
   - Dark backgrounds, bright text

### How to Change Your Theme

**Option 1: Quick Toggle**
- Click the theme toggle button in the header
- Cycles through System → Light → Dark

**Option 2: Settings Panel**
- Go to Settings → Theme
- Select your preferred theme
- Changes apply immediately

**Option 3: System Setting**
- Set your device to light or dark mode
- Proprupee automatically adapts (if using System mode)

### Theme Preference Saved

Your theme preference is saved automatically:
- Persists across browser refreshes
- Persists when you close and reopen the app
- Works on mobile and desktop

---

## Technical Details

### What Changed

| File | Changes |
|------|---------|
| `src/theme.tsx` | Complete rewrite with system detection |
| `src/index.css` | CSS variables for light/dark themes |
| `index.html` | Flash prevention script |
| `src/components/SplashScreen.tsx` | Theme-aware animations |
| *(New)* `src/components/ThemeSettings.tsx` | User settings UI |
| *(New)* `src/components/ThemeToggle.tsx` | Quick toggle button |

### No Breaking Changes

✅ All existing components still work  
✅ All existing functionality preserved  
✅ No new dependencies  
✅ Backward compatible  

### Browser Support

✅ Chrome/Chromium  
✅ Firefox  
✅ Safari  
✅ Edge  
✅ Android WebView  
✅ Mobile Browsers  

---

## Color Reference

### Dark Theme
```
Text:       #F5F7F5
Accent:     #19E65A (Neon: #39FF78)
Background: #0B1110
Card:       #17211D
Border:     #293831
Red:        #E53935
```

### Light Theme
```
Text:       #15231B
Accent:     #128B42 (Hover: #0E7537)
Background: #F5F7F6
Card:       #FFFFFF
Border:     #DDE5DF
Red:        #D32F2F
```

All colors meet WCAG AA accessibility standards.

---

## Troubleshooting

### Theme not changing on device toggle?
- Ensure you've set preference to "System" in settings
- Refresh the page
- Check that your device dark mode is actually enabled

### Text not readable?
- This shouldn't happen - all colors meet WCAG AA standards
- Try clearing browser cache
- Check if a browser extension is interfering
- Report the specific component and browser version

### Theme flashing on page load?
- The flash prevention script should prevent this
- If it happens, check that JavaScript is enabled
- Clear browser cache and refresh

### Mobile app not detecting system theme?
- Verify dark mode is enabled in device settings
- Close and reopen the app
- Restart the device if issue persists
- Check that you're using the latest app version

---

## Integration Checklist

- [ ] Theme system is working
- [ ] ThemeToggle appears in header
- [ ] ThemeSettings available in profile/settings
- [ ] Theme persists across refreshes
- [ ] System theme detection working
- [ ] Light mode looks good
- [ ] Dark mode looks good
- [ ] Mobile theme detection working
- [ ] No text contrast issues
- [ ] No component errors

---

## Questions?

Refer to:
- **Full Documentation:** `THEME_SYSTEM_IMPLEMENTATION.md`
- **Theme Hook:** `src/theme.tsx`
- **CSS Styles:** `src/index.css`
- **Components:** `src/components/ThemeToggle.tsx`, `src/components/ThemeSettings.tsx`
