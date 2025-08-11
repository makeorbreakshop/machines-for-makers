// Google Analytics configuration and utilities
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Track page views
export const trackPageView = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag && GA_MEASUREMENT_ID) {
    console.log('GA tracking page view:', url, GA_MEASUREMENT_ID);
    window.gtag('config', GA_MEASUREMENT_ID);
    window.gtag('event', 'page_view', {
      page_location: url,
    });
  } else {
    console.log('GA not available:', { 
      hasWindow: typeof window !== 'undefined',
      hasGtag: typeof window !== 'undefined' && !!window.gtag,
      hasMeasurementId: !!GA_MEASUREMENT_ID 
    });
  }
};

// Track custom events
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};