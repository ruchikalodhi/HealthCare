import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ClientSessionProvider from '@/components/shared/ClientSessionProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Healthcare Appointment Platform',
  description: 'Phase 1 - RBAC, Doctor Management and Foundations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientSessionProvider>
          {children}
        </ClientSessionProvider>
      </body>
    </html>
  );
}
