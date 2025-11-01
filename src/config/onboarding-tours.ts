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
      target: '[data-tour="unified-sidebar"]',
      content: 'Switch between modules and navigate features from this single sidebar. Click module icons at the top to switch contexts.',
      title: 'Unified Navigation',
      placement: 'right',
    },
    {
      target: '[data-tour="user-actions"]',
      content: 'Access notifications and your account menu here. The collapse button is below your profile.',
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

