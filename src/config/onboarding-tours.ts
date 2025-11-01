export interface TourStep {
  target: string; // CSS selector
  content: string; // Step description
  title?: string;
  disableBeacon?: boolean;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  spotlightClicks?: boolean;
}

export interface TourConfig {
  steps: TourStep[];
  options: {
    continuous: boolean;
    showProgress: boolean;
    showSkipButton: boolean;
    disableScrolling: boolean;
    spotlightClicks: boolean;
  };
}

export const GLOBAL_ONBOARDING_TOUR: TourConfig = {
  steps: [
    {
      target: 'body',
      content: 'This quick tour shows you where key things live. You can skip anytime.',
      title: 'Welcome to SignTusk!',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="primary-sidebar"]',
      content: 'Your main navigation. Click icons to switch between Sign and Send modules.',
      title: 'Main Navigation',
      placement: 'right',
    },
    {
      target: '[data-tour="user-actions"]',
      content: 'Access notifications and account settings here. Panels open from these icons.',
      title: 'Notifications & Account',
      placement: 'right',
    },
    {
      target: '[data-tour="search"]',
      content: 'Use the search bar to quickly find documents, requests, and other items.',
      title: 'Search / Command Bar',
      placement: 'bottom',
    },
    {
      target: '[data-tour="module-sidebar"]',
      content: 'Navigate within the current module. This sidebar shows module-specific features.',
      title: 'Module Navigation',
      placement: 'right',
    },
    {
      target: 'body',
      content: "Explore the app at your own pace. You can always access help from the menu.",
      title: "You're All Set!",
      placement: 'center',
    },
  ],
  options: {
    continuous: true,
    showProgress: true,
    showSkipButton: true,
    disableScrolling: false,
    spotlightClicks: false,
  },
};

export function getTourConfig(tourName: string): TourConfig | null {
  switch (tourName) {
    case 'global':
      return GLOBAL_ONBOARDING_TOUR;
    default:
      return null;
  }
}

