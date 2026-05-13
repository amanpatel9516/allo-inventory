import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
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
  title: "Allo Health | Inventory System",
  description: "Production-grade inventory reservation system for Allo Health.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans selection:bg-primary selection:text-primary-foreground`}>
        <div className="relative flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-white/80 backdrop-blur dark:border-slate-800/50 dark:bg-slate-950/80">
            <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
              <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                  <span className="text-xl leading-none -mt-0.5">a</span>
                </div>
                <span>allo<span className="text-primary font-normal">health</span></span>
              </div>
            </div>
          </header>
          <main className="flex-1 pb-16">{children}</main>
          <footer className="fixed bottom-0 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-800/50 py-3 z-50">
            <div className="container mx-auto px-4 flex justify-between items-center text-xs text-slate-500">
               <p>© 2026 Allo Health</p>
               <div className="flex gap-4">
                  <a href="/admin/inventory" className="hover:text-primary font-bold uppercase tracking-widest flex items-center gap-1 transition-colors">
                     Inventory Admin
                  </a>
               </div>
            </div>
          </footer>
        </div>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
