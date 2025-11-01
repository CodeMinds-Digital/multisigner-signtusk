import Link from 'next/link';
import { cn } from '@/lib/utils';

interface AppLogoProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function AppLogo({ variant = 'compact', className }: AppLogoProps) {
  const logoText = variant === 'compact' ? 'in' : 'intotni';
  const textSize = variant === 'compact' ? 'text-lg' : 'text-xl';

  return (
    <Link
      href="/sign"
      className={cn('block', className)}
      aria-label="Application logo"
      title="SignTusk"
    >
      <span
        className={cn(
          'font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent',
          textSize
        )}
      >
        {logoText}
      </span>
    </Link>
  );
}

