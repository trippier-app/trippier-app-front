import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import AuthProvider from '@/components/AuthProvider';
import CircleTransition from '@/components/CircleTransition';
import I18nProvider from '@/components/I18nProvider';
import MapsProvider from '@/components/MapsProvider';

const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Trippier',
  description: 'Plan your next adventure',
};

/**
 * Mobile-first viewport: the app is laid out edge to edge and the map owns the
 * whole screen, so pinch-zooming the document itself would fight the map's own
 * gesture handling.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#eef2f0',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" data-theme="light">
      <body className={`${bricolage.variable} ${jetbrainsMono.variable} antialiased`}>
        <I18nProvider>
          <AuthProvider>
            <MapsProvider>
              <CircleTransition>{children}</CircleTransition>
            </MapsProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
