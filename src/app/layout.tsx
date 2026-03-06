import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stamp Collector - 风景印打卡',
  description: '你的随身印章收集图鉴，支持风景印、御朱印、车站印打卡。',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
