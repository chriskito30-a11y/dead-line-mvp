import './style.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dead Line',
  description: 'Outil professionnel de mentalisme par appel vocal.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
