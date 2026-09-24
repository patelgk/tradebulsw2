import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { ThemeProvider } from './theme';

// Initialize Clarity BEFORE React renders
// This ensures it loads immediately on page load in production
if (import.meta.env.VITE_CLARITY_PROJECT_ID) {
  try {
    const projectId = import.meta.env.VITE_CLARITY_PROJECT_ID;
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://www.clarity.ms/tag/' + projectId;
    script.onload = () => {
      console.log('[Clarity] Production: Script loaded from clarity.ms');
    };
    script.onerror = () => {
      console.warn('[Clarity] Production: Failed to load script from clarity.ms');
    };
    document.head.appendChild(script);
    console.log('[Clarity] Production: Injected script tag for project ' + projectId);
  } catch (error) {
    console.error('[Clarity] Production: Error initializing Clarity', error);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
