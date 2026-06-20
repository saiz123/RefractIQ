import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RefractIQ',
  description: 'Open-source self-hosted AI software team platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.className} bg-gray-950 text-gray-100 min-h-screen`}>
        <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6">
          <a href="/" className="text-white font-semibold text-lg tracking-tight">
            RefractIQ
          </a>
          <a href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
            Runs
          </a>
          <a href="/providers" className="text-gray-400 hover:text-white text-sm transition-colors">
            Providers
          </a>
        </nav>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
