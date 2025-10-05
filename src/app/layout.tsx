import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SecureAuthProvider } from "@/components/providers/secure-auth-provider";
import { ConsoleFilterProvider } from "@/components/providers/console-filter-provider";
import { ToastProvider } from "@/components/ui/toast";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

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
      </body>
    </html>
  );
}
