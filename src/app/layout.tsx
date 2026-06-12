import type { Metadata } from 'next';
import '../index.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Prode - Vacas Locas',
  description: 'Predicciones y estadísticas de fútbol',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased bg-bg-base text-text-primary">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
