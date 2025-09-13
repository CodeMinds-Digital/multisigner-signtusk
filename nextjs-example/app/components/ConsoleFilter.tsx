'use client';

import { useEffect } from 'react';

const ConsoleFilter: React.FC = () => {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Store original console methods
    const originalError = console.error;
    const originalWarn = console.warn;

    // Filter console.error
    console.error = function (...args) {
      const first = args[0];
      const text = typeof first === 'string' ? first : (first && (first as any).message) || '';

      // Suppress specific React 18 warnings from pdfme library and noisy React internals
      if (
        typeof text === 'string' &&
        (
          text.includes('ReactDOM.render is no longer supported') ||
          text.includes('React-rendered content of this container was removed') ||
          text.includes('switch to the new API') ||
          text.includes('Use createRoot instead') ||
          text.includes('You are calling ReactDOMClient.createRoot() on a container that has already been passed to createRoot()') ||
          text.includes('Internal React error: Expected static flag was missing')
        )
      ) {
        return; // Suppress these warnings/errors
      }

      try {
        // Keep original binding and argument list intact
        return originalError.apply(console, args as unknown as [any, ...any[]]);
      } catch {
        // Fallback to avoid throwing from logger
        return Function.prototype.apply.call(originalError, console, args as unknown as [any, ...any[]]);
      }
    };

    // Filter console.warn for pdfme deprecation warnings
    console.warn = function (...args) {
      const first = args[0];
      const text = typeof first === 'string' ? first : (first && (first as any).message) || '';

      if (
        typeof text === 'string' &&
        (
          text.includes('Viewer component is deprecated') ||
          text.includes('[@pdfme/ui]')
        )
      ) {
        return; // Suppress these warnings
      }

      try {
        return originalWarn.apply(console, args as unknown as [any, ...any[]]);
      } catch {
        return Function.prototype.apply.call(originalWarn, console, args as unknown as [any, ...any[]]);
      }
    };

    // Cleanup function to restore original console methods
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  return null; // This component doesn't render anything
};

export default ConsoleFilter;
