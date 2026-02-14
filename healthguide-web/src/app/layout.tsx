import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'HealthGuide — Find Trusted Caregivers in Your Area',
  description:
    'Browse verified caregivers by location, skills, and ratings. Free for caregivers. Transparent reviews. NPI-verified credentials.',
  openGraph: {
    title: 'HealthGuide — Find Trusted Caregivers',
    description: 'Browse verified caregivers by location, skills, and ratings.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
