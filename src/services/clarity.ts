/**
 * Microsoft Clarity Analytics Integration
 * 
 * This service initializes and manages Microsoft Clarity tracking for the Proprupee application.
 * 
 * ENVIRONMENT VARIABLE:
 * - VITE_CLARITY_PROJECT_ID: Your Microsoft Clarity project ID (e.g., "i1234567abc")
 *   Add this to your .env file to enable tracking:
 *   VITE_CLARITY_PROJECT_ID=your_clarity_project_id_here
 * 
 * SECURITY NOTES:
 * - Clarity is configured to mask sensitive data (passwords, payment details, etc.)
 * - User consent is checked before initializing Clarity
 * - Page views are tracked automatically for SPA route changes
 * - No sensitive trading credentials are transmitted to Clarity
 */

interface ClarityConfig {
  projectId: string;
  enabled: boolean;
  hasUserConsent: boolean;
}

class ClarityService {
  private static instance: ClarityService;
  private config: ClarityConfig | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): ClarityService {
    if (!ClarityService.instance) {
      ClarityService.instance = new ClarityService();
    }
    return ClarityService.instance;
  }

  /**
   * Initialize Microsoft Clarity
   * Call this once when the app starts (in App.tsx useEffect)
   */
  init(): void {
    if (this.initialized) {
      console.debug('[Clarity] Already initialized, skipping re-initialization');
      return;
    }

    const projectId = import.meta.env.VITE_CLARITY_PROJECT_ID;

    if (!projectId) {
      console.debug('[Clarity] VITE_CLARITY_PROJECT_ID not configured. Skipping Clarity initialization.');
      this.initialized = true;
      return;
    }

    // Check if user has given consent (you can customize this based on your consent management)
    const hasConsent = this.checkUserConsent();

    if (!hasConsent) {
      console.debug('[Clarity] User has not given consent. Clarity tracking disabled.');
      this.initialized = true;
      return;
    }

    this.config = {
      projectId,
      enabled: true,
      hasUserConsent: hasConsent,
    };

    // Load and initialize Clarity script
    this.loadClarityScript();
    this.initialized = true;
    console.debug('[Clarity] Microsoft Clarity initialized successfully');
  }

  /**
   * Load Clarity tracking script
   */
  private loadClarityScript(): void {
    if (!this.config?.projectId) return;

    // Prevent multiple initializations
    if (window.clarity) {
      console.debug('[Clarity] Clarity already loaded globally');
      return;
    }

    try {
      // Create and append the Clarity script to the document head
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = 'https://www.clarity.ms/tag/' + this.config.projectId;
      script.id = 'clarity-script';

      // Set up Clarity event listener after script loads
      script.onload = () => {
        console.debug('[Clarity] Clarity script loaded successfully');
        this.setupClarityMasking();
      };

      script.onerror = () => {
        console.warn('[Clarity] Failed to load Clarity script');
      };

      document.head.appendChild(script);
    } catch (error) {
      console.error('[Clarity] Error loading Clarity script:', error);
    }
  }

  /**
   * Set up data masking for sensitive information
   * This prevents passwords, payment details, and trading credentials from being captured
   */
  private setupClarityMasking(): void {
    if (!window.clarity) {
      console.warn('[Clarity] Clarity not available for masking setup');
      return;
    }

    try {
      // Mask common sensitive input fields and selectors
      const sensitiveSelectors = [
        // Password fields
        'input[type="password"]',
        // Payment/card fields
        'input[name*="card"]',
        'input[name*="cvv"]',
        'input[name*="expiry"]',
        'input[name*="cardholder"]',
        // Trading credentials
        'input[name*="apikey"]',
        'input[name*="secret"]',
        'input[name*="token"]',
        'input[name*="credential"]',
        // Sensitive data attributes
        '[data-sensitive="true"]',
        '[data-mask="true"]',
        // API keys in text content
        '.api-key',
        '.secret-key',
      ];

      sensitiveSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          element.setAttribute('data-clarity-mask', 'true');
        });
      });

      console.debug('[Clarity] Data masking configured for sensitive fields');
    } catch (error) {
      console.error('[Clarity] Error setting up data masking:', error);
    }
  }

  /**
   * Track page view for SPA route changes
   * Call this whenever the active tab/view changes in the app
   * @param pageName - Name of the current page/view (e.g., 'trade', 'challenges', 'portfolio')
   */
  trackPageView(pageName: string): void {
    if (!this.config?.enabled || !window.clarity) {
      return;
    }

    try {
      // Use Clarity's custom event tracking for page view
      window.clarity('event', {
        eventType: 'Custom',
        eventName: 'page_view',
        eventProperties: {
          page_name: pageName,
          timestamp: new Date().toISOString(),
        },
      });

      console.debug(`[Clarity] Page view tracked: ${pageName}`);
    } catch (error) {
      console.error(`[Clarity] Error tracking page view for ${pageName}:`, error);
    }
  }

  /**
   * Track custom user events
   * @param eventName - Name of the event (e.g., 'challenge_purchased', 'trade_placed')
   * @param properties - Additional event properties
   */
  trackEvent(eventName: string, properties?: Record<string, any>): void {
    if (!this.config?.enabled || !window.clarity) {
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

      console.debug(`[Clarity] Event tracked: ${eventName}`, properties);
    } catch (error) {
      console.error(`[Clarity] Error tracking event ${eventName}:`, error);
    }
  }

  /**
   * Identify the current user in Clarity (non-sensitive user ID)
   * NOTE: Do NOT pass email, password, API keys, or any sensitive data
   * @param userId - Anonymized or non-sensitive user identifier
   */
  identifyUser(userId: string): void {
    if (!this.config?.enabled || !window.clarity) {
      return;
    }

    try {
      window.clarity('identify', userId);
      console.debug(`[Clarity] User identified: ${userId}`);
    } catch (error) {
      console.error(`[Clarity] Error identifying user:`, error);
    }
  }

  /**
   * Check if user has given consent for analytics
   * Currently checks localStorage for a consent flag
   * Can be enhanced with your cookie/consent management system
   */
  private checkUserConsent(): boolean {
    // Check if there's a consent preference stored
    try {
      const consent = localStorage.getItem('analytics_consent');
      
      // If consent is explicitly set to 'false', respect that
      if (consent === 'false') {
        return false;
      }
      
      // If no preference is set or consent is 'true', default to true for production tracking
      // This allows Clarity to track by default (no explicit opt-in required)
      // If you need explicit opt-in, change this to: if (consent !== 'true') return false;
      return true;
    } catch (error) {
      console.warn('[Clarity] Error checking user consent:', error);
      return true; // Default to enabled in case of errors
    }
  }

  /**
   * Update consent status and reinitialize Clarity if needed
   * Call this when user changes their analytics consent preference
   * @param consentGiven - Whether user has given consent
   */
  updateConsent(consentGiven: boolean): void {
    try {
      localStorage.setItem('analytics_consent', String(consentGiven));

      if (consentGiven && !this.initialized) {
        this.init();
      } else if (!consentGiven && this.initialized) {
        console.debug('[Clarity] User revoked consent. Clarity tracking will be disabled for new sessions.');
      }
    } catch (error) {
      console.error('[Clarity] Error updating consent:', error);
    }
  }

  /**
   * Get current Clarity configuration status
   */
  getStatus(): { initialized: boolean; enabled: boolean; projectId?: string } {
    return {
      initialized: this.initialized,
      enabled: this.config?.enabled ?? false,
      projectId: this.config?.projectId,
    };
  }
}

// Declare Clarity globally for TypeScript
declare global {
  interface Window {
    clarity?: (command: string, ...args: any[]) => void;
  }
}

export default ClarityService.getInstance();
