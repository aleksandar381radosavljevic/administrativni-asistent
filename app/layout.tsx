import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Administrativni Asistent',
  description:
    'Jednostavna objašnjenja administrativnih procedura za građane Srbije.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sr">
      <body>{children}</body>
    </html>
  );
}
