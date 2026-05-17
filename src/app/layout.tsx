import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Meridian — Goal Setting & Tracking Portal',
  description:
    'Enterprise performance management portal for goal setting, quarterly check-ins, and achievement tracking.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="bottom-right"
          className="app-toast"
          richColors
          closeButton
        />
      </body>
    </html>
  );
}
