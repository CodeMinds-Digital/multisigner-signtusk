'use client';

import Joyride, { CallBackProps, STATUS } from 'react-joyride';
import { useOnboarding } from '@/hooks/use-onboarding';
import { GLOBAL_ONBOARDING_TOUR } from '@/config/onboarding-tours';

export function OnboardingTour() {
  const { shouldShowTour, isTourActive, completeTour, skipTour } = useOnboarding();

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;

    if (status === STATUS.FINISHED) {
      completeTour();
    } else if (status === STATUS.SKIPPED) {
      skipTour();
    } else if (status === STATUS.ERROR) {
      console.error('Joyride error:', data);
      skipTour();
    }
  };

  if (!shouldShowTour) {
    return null;
  }

  return (
    <Joyride
      steps={GLOBAL_ONBOARDING_TOUR.steps}
      run={isTourActive}
      continuous={GLOBAL_ONBOARDING_TOUR.options.continuous}
      showProgress={GLOBAL_ONBOARDING_TOUR.options.showProgress}
      showSkipButton={GLOBAL_ONBOARDING_TOUR.options.showSkipButton}
      disableScrolling={GLOBAL_ONBOARDING_TOUR.options.disableScrolling}
      spotlightClicks={GLOBAL_ONBOARDING_TOUR.options.spotlightClicks}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#3B82F6',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
        },
        buttonNext: {
          backgroundColor: '#3B82F6',
          borderRadius: 6,
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#6B7280',
          marginRight: 8,
        },
        buttonSkip: {
          color: '#6B7280',
        },
      }}
    />
  );
}

