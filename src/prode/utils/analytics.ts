/**
 * Safe Google Analytics 4 (gtag) wrapper for the Prode.
 *
 * Rules:
 * - No PII is ever sent (email, phone, name, alias, user_id, exact predictions).
 * - Gracefully degrades if gtag is blocked by ad blockers or not loaded.
 * - SSR-safe: checks for window before touching the DOM.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type GtagCommand = 'config' | 'event' | 'js' | 'set';

type GtagFunction = {
  (command: GtagCommand, targetId: string, config?: Record<string, any>): void;
  (command: GtagCommand, eventName: string, eventParams?: Record<string, any>): void;
};

declare global {
  interface Window {
    gtag?: GtagFunction;
    dataLayer?: any[];
  }
}

function getGtag(): GtagFunction | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.gtag;
}

function safeGtag(
  command: GtagCommand,
  targetOrEvent: string,
  params?: Record<string, any>
) {
  const gtag = getGtag();
  if (!gtag) return;
  try {
    gtag(command, targetOrEvent, params);
  } catch {
    // Silently fail if gtag throws (e.g. ad blocker)
  }
}

/** Page title map for SPA routes inside /prode */
const PRODE_PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/login': 'Login',
  '/signup': 'Signup',
  '/onboarding': 'Onboarding',
  '/fixture': 'Fixture',
  '/predicciones': 'Predicciones',
  '/ranking': 'Ranking',
  '/reglas': 'Reglas',
  '/admin': 'Admin',
  '/reset-password': 'Reset Password',
};

/**
 * Track a page_view event manually.
 * Use this inside the Prode SPA on every route change.
 */
export function trackPageView(pagePath: string, pageTitle?: string) {
  const title = pageTitle ?? PRODE_PAGE_TITLES[pagePath] ?? 'Prode';
  safeGtag('event', 'page_view', {
    page_path: `/prode${pagePath}`,
    page_title: `Prode · ${title}`,
    page_location: typeof window !== 'undefined' ? window.location.href : undefined,
  });
}

/**
 * Track any custom GA4 event.
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean | undefined>
) {
  // Strip undefined values to keep payloads clean
  const cleanParams: Record<string, string | number | boolean> = {};
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        cleanParams[key] = value;
      }
    }
  }
  safeGtag('event', eventName, cleanParams);
}

/* ─── Specific event helpers (encourage consistent naming) ─── */

/** User clicked the login button (any method). */
export function trackLoginClick(method: 'google' | 'email') {
  trackEvent('prode_login_click', { method });
}

/** User clicked the signup / create-account button. */
export function trackSignupClick() {
  trackEvent('prode_signup_click');
}

/** User completed onboarding and created a profile. */
export function trackOnboardingCompleted() {
  trackEvent('prode_onboarding_completed');
}

/** User successfully saved one or more predictions. */
export function trackPredictionSaved(count: number) {
  trackEvent('prode_prediction_saved', { count });
}

/** User clicked the bug-report button. */
export function trackBugReportClick() {
  trackEvent('prode_bug_report_click');
}
