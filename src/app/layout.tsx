import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SecureAuthProvider } from "@/components/providers/secure-auth-provider";
import { ConsoleFilterProvider } from "@/components/providers/console-filter-provider";

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
      <body className={inter.className}>
        <ConsoleFilterProvider>
          <SecureAuthProvider>
            {children}
          </SecureAuthProvider>
        </ConsoleFilterProvider>
      </body>
    </html>
  );
}
