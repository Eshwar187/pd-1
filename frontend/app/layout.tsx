import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Misconception + IRT Analyzer",
  description: "Sleek Next.js UI powered by FastAPI — analyze answers, predict misconceptions, estimate difficulty.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased`}>
        <Script id="theme-init" strategy="beforeInteractive">{`
          (function(){
            try {
              var key='theme';
              var stored = localStorage.getItem(key);
              var prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
              var dark = stored ? stored === 'dark' : prefers;
              var el = document.documentElement;
              if (dark) { el.classList.add('dark'); el.setAttribute('data-theme','dark'); el.style.colorScheme='dark'; }
              else { el.classList.remove('dark'); el.setAttribute('data-theme','light'); el.style.colorScheme='light'; }
            } catch (e) {}
          })();
        `}</Script>
        {children}
      </body>
    </html>
  );
}
