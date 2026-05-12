import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NavBar } from "@/components/layout/nav-bar";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/providers/query-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scheduler App",
  description: "Manage client schedules efficiently",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 relative">
          <div
            className="fixed inset-0 z-[-1] pointer-events-none opacity-40 dark:opacity-20"
            style={{
              backgroundImage: 'url("/lawn.png")',
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
          <Providers>
            <NavBar />
            <main className="flex-1 flex flex-col">{children}</main>
            <Footer />
            <Toaster />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
