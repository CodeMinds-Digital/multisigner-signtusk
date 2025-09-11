import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SecureAuthProvider } from "@/components/providers/secure-auth-provider";
import { ConsoleFilterProvider } from "@/components/providers/console-filter-provider";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SignTusk - Digital Document Signing Platform",
  description: "Secure digital document signing and management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning={true}>
        <ConsoleFilterProvider>
          <SecureAuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </SecureAuthProvider>
        </ConsoleFilterProvider>
      </body>
    </html>
  );
}
