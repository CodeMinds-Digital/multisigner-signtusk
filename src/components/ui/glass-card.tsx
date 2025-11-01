import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./card"

export type GlassVariant = 'subtle' | 'medium' | 'strong';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glassVariant?: GlassVariant;
  withGradientBorder?: boolean;
  hoverEffect?: boolean;
  lightMode?: boolean; // For light backgrounds, use solid white instead of transparent
}

const glassVariantsDark: Record<GlassVariant, string> = {
  subtle: 'bg-white/5 backdrop-blur-sm border-white/10',
  medium: 'bg-white/10 backdrop-blur-md border-white/20',
  strong: 'bg-white/20 backdrop-blur-lg border-white/30',
};

const glassVariantsLight: Record<GlassVariant, string> = {
  subtle: 'bg-white border-gray-200',
  medium: 'bg-white border-gray-200',
  strong: 'bg-white border-gray-300',
};

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, glassVariant = 'medium', withGradientBorder = false, hoverEffect = true, lightMode = false, ...props }, ref) => {
    const glassClasses = lightMode ? glassVariantsLight[glassVariant] : glassVariantsDark[glassVariant];
    const gradientBorderClass = withGradientBorder
      ? 'border-2 border-transparent bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-border'
      : '';
    const hoverClasses = hoverEffect
      ? lightMode
        ? 'hover:shadow-xl hover:scale-105 transition-all duration-300'
        : 'hover:bg-white/20 hover:shadow-xl hover:scale-105 transition-all duration-300'
      : '';

    return (
      <div
        ref={ref}
        className={cn(
          'relative rounded-lg',
          lightMode ? 'shadow-lg' : 'shadow-glass',
          glassClasses,
          gradientBorderClass,
          hoverClasses,
          className
        )}
        {...props}
      />
    );
  }
);
GlassCard.displayName = "GlassCard";

const GlassCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
));
GlassCardHeader.displayName = "GlassCardHeader";

const GlassCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight text-white",
      className
    )}
    {...props}
  />
));
GlassCardTitle.displayName = "GlassCardTitle";

const GlassCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-blue-100", className)}
    {...props}
  />
));
GlassCardDescription.displayName = "GlassCardDescription";

const GlassCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
GlassCardContent.displayName = "GlassCardContent";

const GlassCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
));
GlassCardFooter.displayName = "GlassCardFooter";

export {
  GlassCard,
  GlassCardHeader,
  GlassCardFooter,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
};

