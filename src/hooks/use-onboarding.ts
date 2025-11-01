'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/secure-auth-provider';

interface UseOnboardingReturn {
  shouldShowTour: boolean;
  startTour: () => void;
  completeTour: () => void;
  skipTour: () => void;
  isTourActive: boolean;
}

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';
const ONBOARDING_SKIPPED_KEY = 'onboarding_skipped';

export function useOnboarding(): UseOnboardingReturn {
  const { user, setUser } = useAuth();
  const [isTourActive, setIsTourActive] = useState(false);
  const [shouldShowTour, setShouldShowTour] = useState(false);

  // Check onboarding status on mount
  useEffect(() => {
    if (!user) {
      setShouldShowTour(false);
      return;
    }

    // Check if user has completed or skipped onboarding
    const hasCompleted = user.onboarding_completed;
    const hasSkipped = localStorage.getItem(ONBOARDING_SKIPPED_KEY) === 'true';
    const hasCompletedLocal = localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';

    if (!hasCompleted && !hasSkipped && !hasCompletedLocal) {
      setShouldShowTour(true);

      // Auto-start tour after 2 seconds to allow UI to settle
      const timer = setTimeout(() => {
        setIsTourActive(true);
      }, 2000);

      return () => clearTimeout(timer);
    } else {
      setShouldShowTour(false);
    }
  }, [user]);

  const startTour = () => {
    setIsTourActive(true);
  };

  const completeTour = async () => {
    setIsTourActive(false);
    setShouldShowTour(false);

    // Update localStorage as backup
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');

    // Update user profile via API
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          onboarding_completed: true,
        }),
      });

      if (response.ok) {
        // Handle 204 No Content (no body to parse)
        if (response.status === 204) {
          // Update local user state without parsing response
          if (setUser && user) {
            setUser({
              ...user,
              onboarding_completed: true,
            });
          }
        } else {
          // Handle 200 OK with JSON body
          try {
            const updatedUser = await response.json();
            // Update local user state
            if (setUser && user) {
              setUser({
                ...user,
                onboarding_completed: true,
              });
            }
          } catch (parseError) {
            console.error('Error parsing response:', parseError);
            // Still update local state even if parsing fails
            if (setUser && user) {
              setUser({
                ...user,
                onboarding_completed: true,
              });
            }
          }
        }
      } else {
        console.error('Failed to update onboarding status');
      }
    } catch (error) {
      console.error('Error updating onboarding status:', error);
      // Don't block user experience on API failure
    }
  };

  const skipTour = () => {
    setIsTourActive(false);
    setShouldShowTour(false);
    localStorage.setItem(ONBOARDING_SKIPPED_KEY, 'true');
  };

  return {
    shouldShowTour,
    startTour,
    completeTour,
    skipTour,
    isTourActive,
  };
}

