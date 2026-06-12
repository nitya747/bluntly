import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: "bluntly — AI Resume Analyser & Candidate Matcher",
  description: "An open-source AI-powered resume matching dashboard for CS students. Redact PII, analyze skills, and incorporate GitHub portfolios with BYOK security.",
  openGraph: {
    title: "bluntly — AI Resume Analyser & Candidate Matcher",
    description: "An open-source AI-powered resume matching dashboard for CS students. Redact PII, analyze skills, and incorporate GitHub portfolios with BYOK security.",
    url: "https://github.com/your-username/bluntly",
    siteName: "bluntly",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "bluntly — Premium AI Resume Analyser & Matcher",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "bluntly — AI Resume Analyser & Candidate Matcher",
    description: "An open-source AI-powered resume matching dashboard for CS students. Redact PII, analyze skills, and incorporate GitHub portfolios with BYOK security.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
