import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { UiVariantProvider } from "@/hooks/ui-variant";
import { Toaster } from "sonner";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Everything Converter",
  description: "Convert anything into anything",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased font-[family-name:var(--font-geist-mono)]`}>
        <UiVariantProvider>
          {children}
          <Toaster richColors theme="dark" position="top-right" />
        </UiVariantProvider>
      </body>
    </html>
  );
}
