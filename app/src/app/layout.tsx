import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { getAppConfig } from '@/lib/auth';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MasterPacker - Organization System',
  description: 'A packing and organization website for everything',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize app config if not exists
  await getAppConfig();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
