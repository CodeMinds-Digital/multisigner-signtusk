import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { AuthErrorHandler } from "@/components/auth-error-handler";

// Import auth recovery utilities to make them globally available
import "@/utils/auth-recovery";

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
        <AuthErrorHandler />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
