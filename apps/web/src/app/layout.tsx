import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Brutal Ads',
  description: 'Turn a brief into high-converting, easy-to-edit LinkedIn ads.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
