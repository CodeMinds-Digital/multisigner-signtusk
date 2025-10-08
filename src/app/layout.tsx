import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SecureAuthProvider } from "@/components/providers/secure-auth-provider";
import { ConsoleFilterProvider } from "@/components/providers/console-filter-provider";
import { ToastProvider } from "@/components/ui/toast";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  display: "swap", // Prevent FOIT (Flash of Invisible Text)
  preload: true,
});

export const metadata: Metadata = {
  title: "SignTusk - Digital Document Signing Platform",
  description: "Secure digital document signing and management platform",
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Performance: Preconnect to external domains */}
        <link rel="preconnect" href="https://gzxfsojbbfipzvjxucci.supabase.co" />
        <link rel="dns-prefetch" href="https://cdn.segment.com" />
        <link rel="dns-prefetch" href="https://app.netlify.com" />
      </head>
      <body className={inter.className} suppressHydrationWarning={true}>
        <div id="root">
          <ConsoleFilterProvider>
            <SecureAuthProvider>
              <ToastProvider>
                {children}
                <Toaster />
              </ToastProvider>
            </SecureAuthProvider>
          </ConsoleFilterProvider>
        </div>

        {/* Performance: Load third-party scripts after page is interactive */}
        {process.env.NODE_ENV === 'production' && (
          <>
            <Script
              src="https://cdn.segment.com/analytics.min.js"
              strategy="lazyOnload"
              id="segment-analytics"
            />
            <Script
              src="https://app.netlify.com/scripts/cdp"
              strategy="lazyOnload"
              id="netlify-cdp"
            />
          </>
        )}
      </body>
    </html>
  );
}
