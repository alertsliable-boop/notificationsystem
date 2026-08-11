import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import { Inter, Playfair_Display } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-serif', weight: ['400'] });

export const metadata: Metadata = {
  title: { default: 'Liable Alerts', template: '%s | Liable Alerts' },
  description: 'Turn any equipment email into an instant SMS alert. No code, no complexity.',
  keywords: ['SMS alerts', 'email to SMS', 'equipment monitoring', 'facility alerts'],
  openGraph: {
    title: 'Liable Alerts',
    description: 'Turn any equipment email into an instant SMS alert.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
