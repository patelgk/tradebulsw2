/**
 * Microsoft Clarity Analytics Utility
 * 
 * The main Clarity script is now injected in src/main.tsx BEFORE React renders.
 * This ensures it initializes immediately in production.
 * 
 * This file provides utility functions for:
 * - Custom event tracking
 * - User identification
 * - Consent management
 * 
 * Direct API Usage:
 * - Use window.clarity('event', {...}) for events
 * - Use window.clarity('identify', userId) for user ID
 */

declare global {
  interface Window {
    clarity?: (command: string, ...args: any[]) => void;
  }
}

// Utility: Track custom events via Clarity
export function trackClarityEvent(eventName: string, properties?: Record<string, any>) {
  if (!window.clarity) {
    return;
  }
  
  try {
    window.clarity('event', {
      eventType: 'Custom',
      eventName,
      eventProperties: {
        ...properties,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.debug(`[Clarity] Event tracking error for ${eventName}:`, error);
  }
}

// Utility: Identify user in Clarity (non-sensitive ID only)
export function identifyClarityUser(userId: string) {
  if (!window.clarity) {
    return;
  }
  
  try {
    window.clarity('identify', userId);
  } catch (error) {
    console.debug('[Clarity] User identification error:', error);
  }
}

export default {
  trackEvent: trackClarityEvent,
  identifyUser: identifyClarityUser,
};
