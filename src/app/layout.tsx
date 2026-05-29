import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Footer } from "@/components/layout/footer";
import { NavBar } from "@/components/layout/nav-bar";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/providers/query-provider";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Landscape Friend",
    default: "Landscape Friend - Lawn Care & Landscaping Management",
  },
  description:
    "Manage your landscaping clients, plan routes, and schedule repetitive cuts efficiently with Landscape Friend. The ultimate CRM for lawn care professionals.",
  keywords: [
    "landscaping scheduling",
    "lawn care crm",
    "route planning",
    "landscape friend",
    "client management",
    "landscaping software",
  ],
  openGraph: {
    title: "Landscape Friend - Lawn Care Scheduling Made Simple",
    description:
      "Manage your landscaping business, plan routes, and schedule services with ease.",
    url: "https://landscapefriend.com",
    siteName: "Landscape Friend",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Landscape Friend - Lawn Care Management",
    description:
      "The ultimate tool for landscaping professionals to manage clients and routes.",
  },
};

export default function RootLayout({
  children,
  searchParams,
}: Readonly<{
  children: React.ReactNode;
  searchParams?: Promise<{
    date?: string;
  }>;
}>) {
  const datePromise: Promise<string | null> = searchParams
    ? searchParams.then((p) =>
        Array.isArray(p.date) ? p.date[0] : (p.date ?? null),
      )
    : Promise.resolve(null);

  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 dark:bg-slate-950`}
      >
        <body className="min-h-svh flex flex-col relative">
          <div
            className="fixed inset-0 z-[-1] pointer-events-none opacity-60 dark:opacity-25"
            style={{
              backgroundImage: 'url("/lawn.png")',
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
          <Providers>
            <Suspense>
              <NavBar datePromise={datePromise} />
            </Suspense>
            <main className="flex-1 flex flex-col">{children}</main>
            <Analytics />
            <Footer />
            <Toaster />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
