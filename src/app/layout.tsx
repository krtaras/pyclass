import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { AuthNav } from "@/components/AuthNav";
import { getSession } from "@/lib/auth/session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PyClass — Python українською",
  description: "Шкільний курс Python: уроки, вправи й квізи українською.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  const user = session
    ? { name: session.name, role: session.role }
    : null;

  return (
    <html
      lang="uk"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <header className="sticky top-0 z-10 border-b border-zinc-200/80 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link href="/" className="text-base font-semibold tracking-tight">
              PyClass
            </Link>
            <AuthNav user={user} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
          {children}
        </main>
        <footer className="border-t border-zinc-200 py-4 text-center text-xs text-zinc-500">
          PyClass · уроки українською
        </footer>
      </body>
    </html>
  );
}
