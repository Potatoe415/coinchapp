import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { I18nProvider } from "@/lib/client/i18n";
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
  title: "Coinchapp — Coinche et la Bouilla",
  description: "Jouez à la Coinche et à la Bouilla dans votre navigateur.",
};

export const viewport = {
  themeColor: "#ffedd8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider>
          <LanguageSwitcher />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
