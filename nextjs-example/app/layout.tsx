import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PDFme Complete - Next.js Example',
  description: 'Next.js example demonstrating pdfme-complete UI components',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="app">
          <header className="header">
            <h1>PDFme Complete - Next.js Example</h1>
            <p>Demonstrating the unified pdfme functionality in Next.js</p>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
